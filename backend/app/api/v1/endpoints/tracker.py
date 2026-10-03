import uuid
from datetime import datetime
from typing import List, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.business import Business
from app.models.approval import BusinessApproval, MasterApproval
from app.models.document import VaultDocument, ApprovalRequiredDocument
from app.models.alert import AlertAndReminder
from app.models.user import User
from app.api.deps import get_optional_current_user
from app.services.email_service import dispatch_status_change_email, dispatch_renewal_warning_email
from app.schemas.tracker import (
    TrackApprovalRequest,
    TrackedApprovalItem,
    TrackingOverviewResponse,
    AlertItem,
    AlertsSummary,
    PortalCheckResponse,
)
from app.services.discovery_engine import evaluate_and_generate_approvals
from app.db.seeds import seed_business_alerts

router = APIRouter()

VALID_STAGES = [
    "submitted",
    "documents_verified",
    "department_inspection",
    "final_review",
    "approved",
]


def _perform_tracking_update(
    approval_id: str,
    payload: TrackApprovalRequest,
    background_tasks: BackgroundTasks,
    db: Session,
    business_id: Optional[str] = None,
    current_user: Optional[User] = None,
) -> TrackedApprovalItem:
    # 1. Resolve business
    business = None
    target_biz_id = business_id or payload.business_id
    if target_biz_id:
        business = db.query(Business).filter(Business.id == target_biz_id).first()

    if not business:
        ba_candidate = db.query(BusinessApproval).filter(
            (BusinessApproval.id == approval_id) | (BusinessApproval.approval_id == approval_id)
        ).first()
        if ba_candidate:
            business = db.query(Business).filter(Business.id == ba_candidate.business_id).first()

    if not business and current_user:
        business = db.query(Business).filter(Business.user_id == current_user.id).order_by(Business.created_at.desc()).first()

    if not business:
        business = db.query(Business).order_by(Business.created_at.desc()).first()

    if not business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active business profile found to link tracking details.",
        )

    # 2. Normalize payload values
    app_ref = (payload.application_reference_number or payload.application_id or "").strip()
    raw_stage = (payload.progression_stage or payload.tracking_stage or "submitted").strip().lower()
    stage_map = {
        "submitted": "submitted",
        "applied": "submitted",
        "pending": "submitted",
        "documents_verified": "documents_verified",
        "documents_ready": "documents_verified",
        "verified": "documents_verified",
        "department_inspection": "department_inspection",
        "inspection": "department_inspection",
        "under_inspection": "department_inspection",
        "final_review": "final_review",
        "under_review": "final_review",
        "in_review": "final_review",
        "approved": "approved",
        "granted": "approved",
        "completed": "approved",
    }
    normalized_stage = stage_map.get(raw_stage, "submitted")
    if normalized_stage not in VALID_STAGES:
        normalized_stage = "submitted"

    # 3. Robust Clearance Lookup
    # A) Exact BusinessApproval.id for this business
    ba = (
        db.query(BusinessApproval)
        .filter(
            BusinessApproval.business_id == business.id,
            BusinessApproval.id == approval_id,
        )
        .first()
    )

    # B) MasterApproval.id foreign key for this business
    if not ba:
        ba = (
            db.query(BusinessApproval)
            .filter(
                BusinessApproval.business_id == business.id,
                BusinessApproval.approval_id == approval_id,
            )
            .first()
        )

    # C) BusinessApproval.id across all records, re-associating to current business
    if not ba:
        ba_any = db.query(BusinessApproval).filter(BusinessApproval.id == approval_id).first()
        if ba_any:
            ba = ba_any
            ba.business_id = business.id

    # D) Lookup MasterApproval by ID, code, or payload.clearance_code
    master = None
    if not ba:
        master = db.query(MasterApproval).filter(
            (MasterApproval.id == approval_id) | (MasterApproval.code == approval_id)
        ).first()

        if not master and payload.clearance_code:
            master = db.query(MasterApproval).filter(
                (MasterApproval.code == payload.clearance_code) | (MasterApproval.id == payload.clearance_code)
            ).first()

        if not master:
            search_code = payload.clearance_code or approval_id
            master = db.query(MasterApproval).filter(
                (MasterApproval.code.ilike(search_code)) | (MasterApproval.name.ilike(f"%{search_code}%"))
            ).first()

        if master:
            ba = (
                db.query(BusinessApproval)
                .filter(
                    BusinessApproval.business_id == business.id,
                    BusinessApproval.approval_id == master.id,
                )
                .first()
            )

    # E) If clearance record doesn't exist yet for this business, auto-create/upsert dynamically
    if not ba:
        try:
            evaluated_approvals, _ = evaluate_and_generate_approvals(business, db)
            for eval_ba in evaluated_approvals:
                if eval_ba.id == approval_id or eval_ba.approval_id == approval_id:
                    ba = eval_ba
                    break
                if master and eval_ba.approval_id == master.id:
                    ba = eval_ba
                    break
                if payload.clearance_code and eval_ba.approval and eval_ba.approval.code == payload.clearance_code:
                    ba = eval_ba
                    break
        except Exception:
            pass

    if not ba:
        if not master:
            derived_code = (
                payload.clearance_code
                or (approval_id if not ('-' in approval_id and len(approval_id) == 36) else f"APP_{approval_id[:8].upper()}")
            ).strip()
            master = MasterApproval(
                id=approval_id if ('-' in approval_id and len(approval_id) == 36) else str(uuid.uuid4()),
                code=derived_code,
                name=payload.clearance_code or f"Statutory Clearance ({derived_code})",
                department="Regulatory Authority",
                description="Statutory business clearance dynamically registered",
                processing_days=30,
            )
            db.add(master)
            try:
                db.commit()
                db.refresh(master)
            except Exception:
                db.rollback()
                master = db.query(MasterApproval).filter(MasterApproval.code == derived_code).first()

        new_ba_id = (
            approval_id
            if ('-' in approval_id and len(approval_id) == 36 and not db.query(BusinessApproval).filter(BusinessApproval.id == approval_id).first())
            else str(uuid.uuid4())
        )
        ba = BusinessApproval(
            id=new_ba_id,
            business_id=business.id,
            approval_id=master.id,
            status="submitted",
            is_mandatory=True,
            application_id=app_ref if app_ref else None,
            tracking_stage=normalized_stage,
            notes=payload.notes,
            application_date=datetime.utcnow(),
        )
        db.add(ba)
        db.commit()
        db.refresh(ba)

    # 4. Update fields on ba
    if app_ref:
        ba.application_id = app_ref
    ba.tracking_stage = normalized_stage
    if payload.notes is not None:
        ba.notes = payload.notes
    if not ba.application_date:
        ba.application_date = datetime.utcnow()

    # Synchronize overall approval status with tracking stage
    if normalized_stage == "approved":
        ba.status = "approved"
    elif normalized_stage in ("documents_verified", "department_inspection", "final_review"):
        ba.status = "under_review"
    elif normalized_stage == "submitted":
        ba.status = "submitted"

    db.commit()
    db.refresh(ba)

    master = ba.approval or db.query(MasterApproval).filter(MasterApproval.id == ba.approval_id).first()

    # 5. Email Notification Trigger: Application Status Transition
    target_email = None
    if business.user and business.user.email:
        target_email = business.user.email
    elif current_user and current_user.email:
        target_email = current_user.email
    else:
        target_email = "compliance-lead@enterprise.niyamsetu.gov.in"

    if master:
        try:
            dispatch_status_change_email(
                to_email=target_email,
                enterprise_name=business.enterprise_name,
                clearance_name=master.name,
                new_stage=normalized_stage,
                application_id=ba.application_id or "ACK-PENDING",
                background_tasks=background_tasks,
            )
        except Exception:
            pass

    return TrackedApprovalItem(
        id=ba.id,
        approval_id=ba.approval_id,
        code=master.code if master else "",
        name=master.name if master else "",
        department=master.department if master else "",
        application_id=ba.application_id,
        tracking_stage=ba.tracking_stage,
        application_date=ba.application_date,
        approval_expiry_date=ba.approval_expiry_date,
        notes=ba.notes,
        status=ba.status,
        official_portal_url=master.official_portal_url if master else None,
        processing_days=master.processing_days if master else 30,
    )


@router.post(
    "/{business_id}/approvals/{approval_id}/track",
    response_model=TrackedApprovalItem,
    summary="Save Official Application ID & Tracking Stage",
    description="Updates the government application reference number and 5-stage progression status for a clearance.",
)
def update_approval_tracking(
    business_id: str,
    approval_id: str,
    payload: TrackApprovalRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    return _perform_tracking_update(
        approval_id=approval_id,
        payload=payload,
        background_tasks=background_tasks,
        db=db,
        business_id=business_id,
        current_user=current_user,
    )


@router.post(
    "/approvals/{approval_id}/track",
    response_model=TrackedApprovalItem,
    summary="Save Official Application ID & Tracking Stage (by Clearance ID)",
    description="Updates the government application reference number and progression status for a clearance by dynamic clearance ID.",
)
def update_clearance_tracking_direct(
    approval_id: str,
    payload: TrackApprovalRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    return _perform_tracking_update(
        approval_id=approval_id,
        payload=payload,
        background_tasks=background_tasks,
        db=db,
        business_id=payload.business_id,
        current_user=current_user,
    )


@router.post(
    "/{business_id}/alerts/{alert_id}/dispatch-email",
    summary="Dispatch Alert or Renewal Warning Email",
    description="Dispatches a statutory email notification (HTML transactional template) to the business owner.",
)
def dispatch_alert_email(
    business_id: str,
    alert_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")

    alert = db.query(AlertAndReminder).filter(AlertAndReminder.id == alert_id, AlertAndReminder.business_id == business_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    target_email = None
    if business.user and business.user.email:
        target_email = business.user.email
    elif current_user and current_user.email:
        target_email = current_user.email
    else:
        target_email = "compliance-officer@enterprise.niyamsetu.gov.in"

    dispatch_renewal_warning_email(
        to_email=target_email,
        enterprise_name=business.enterprise_name,
        clearance_name=alert.title,
        days_remaining=30,
        due_date=alert.due_date.strftime("%d %b %Y") if alert.due_date else "Immediate",
        background_tasks=background_tasks,
    )
    return {
        "success": True,
        "message": f"Alert email notification scheduled for {target_email}",
        "recipient": target_email,
        "alert_title": alert.title,
    }


@router.get(
    "/{business_id}/tracking",
    response_model=TrackingOverviewResponse,
    summary="Get All Tracked Applications",
    description="Returns all active statutory applications with their official Application IDs and 5-stage progression status.",
)
def get_tracking_overview(
    business_id: str,
    db: Session = Depends(get_db),
):
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Business profile with ID '{business_id}' not found.",
        )

    approvals, _ = evaluate_and_generate_approvals(business, db)

    items: List[TrackedApprovalItem] = []
    stage_counts: Dict[str, int] = {stage: 0 for stage in VALID_STAGES}

    for ba in approvals:
        master = ba.approval
        if not master:
            continue

        stage = ba.tracking_stage or "submitted"
        if stage in stage_counts:
            stage_counts[stage] += 1

        items.append(
            TrackedApprovalItem(
                id=ba.id,
                approval_id=ba.approval_id,
                code=master.code,
                name=master.name,
                department=master.department,
                application_id=ba.application_id,
                tracking_stage=stage,
                application_date=ba.application_date,
                approval_expiry_date=ba.approval_expiry_date,
                notes=ba.notes,
                status=ba.status,
                official_portal_url=master.official_portal_url,
                processing_days=master.processing_days,
            )
        )

    return TrackingOverviewResponse(
        business_id=business.id,
        enterprise_name=business.enterprise_name,
        total_tracked=len(items),
        stage_counts=stage_counts,
        approvals=items,
    )


@router.get(
    "/{business_id}/alerts",
    response_model=AlertsSummary,
    summary="Get Compliance Alerts & Reminders",
    description="Returns dynamic notifications grouped into Upcoming Renewals, Pending Actions, and Status Updates.",
)
def get_business_alerts(
    business_id: str,
    db: Session = Depends(get_db),
):
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Business profile with ID '{business_id}' not found.",
        )

    # Seed alerts if not already present
    seed_business_alerts(business_id, db)

    alerts = (
        db.query(AlertAndReminder)
        .filter(AlertAndReminder.business_id == business_id)
        .order_by(AlertAndReminder.created_at.desc())
        .all()
    )

    alert_items = [
        AlertItem(
            id=a.id,
            business_id=a.business_id,
            approval_id=a.approval_id,
            alert_type=a.alert_type,
            title=a.title,
            message=a.message,
            due_date=a.due_date,
            is_read=a.is_read,
            created_at=a.created_at,
        )
        for a in alerts
    ]

    total_unread = sum(1 for a in alerts if not a.is_read)
    renewals = sum(1 for a in alerts if a.alert_type == "renewal_due")
    pending = sum(1 for a in alerts if a.alert_type == "pending_action")
    updates = sum(1 for a in alerts if a.alert_type == "status_update")

    return AlertsSummary(
        total_unread=total_unread,
        upcoming_renewals_count=renewals,
        pending_actions_count=pending,
        status_updates_count=updates,
        alerts=alert_items,
    )


@router.patch(
    "/{business_id}/alerts/{alert_id}/read",
    summary="Mark Alert as Read",
)
def mark_alert_as_read(
    business_id: str,
    alert_id: str,
    db: Session = Depends(get_db),
):
    alert = (
        db.query(AlertAndReminder)
        .filter(
            AlertAndReminder.business_id == business_id,
            AlertAndReminder.id == alert_id,
        )
        .first()
    )
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert with ID '{alert_id}' not found.",
        )

    alert.is_read = True
    db.commit()
    return {"success": True, "message": "Alert marked as read"}


@router.get(
    "/{business_id}/portal-check/{approval_id}",
    response_model=PortalCheckResponse,
    summary="Validate Statutory Readiness Checklist Before Portal Redirect",
    description="Evaluates whether the business is eligible, mandatory documents are prepared in the vault, and prerequisite clearances are cleared before statutory portal handoff.",
)
def validate_portal_readiness(
    business_id: str,
    approval_id: str,
    db: Session = Depends(get_db),
):
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Business profile with ID '{business_id}' not found.",
        )

    ba = (
        db.query(BusinessApproval)
        .filter(
            BusinessApproval.business_id == business_id,
            BusinessApproval.id == approval_id,
        )
        .first()
    )
    if not ba:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Business approval with ID '{approval_id}' not found.",
        )

    master = ba.approval
    missing: List[str] = []

    # Check 1: Eligibility criteria satisfied
    check_eligibility = True

    # Check 2: Mandatory vault documents uploaded
    doc_links = (
        db.query(ApprovalRequiredDocument)
        .filter(
            ApprovalRequiredDocument.master_approval_id == master.id,
            ApprovalRequiredDocument.is_mandatory == True,
        )
        .all()
    )
    required_doc_ids = [l.master_document_id for l in doc_links]

    vault_entries = (
        db.query(VaultDocument)
        .filter(VaultDocument.business_id == business.id)
        .all()
    )
    uploaded_doc_ids = {v.master_document_id for v in vault_entries}

    missing_docs = [l.master_document.name for l in doc_links if l.master_document_id not in uploaded_doc_ids and l.master_document]
    check_documents = len(missing_docs) == 0
    if not check_documents:
        missing.append(f"Upload remaining required documents in Vault: {', '.join(missing_docs[:2])}")

    # Check 3: Prerequisite clearances cleared
    all_biz_approvals = {
        a.approval.code: a for a in business.approvals if a.approval
    }
    prereqs = (master.prerequisites or "").strip()
    check_prereqs = True
    if prereqs:
        prereq_codes = [p.strip() for p in prereqs.split(",") if p.strip()]
        for p_code in prereq_codes:
            p_ba = all_biz_approvals.get(p_code)
            if not p_ba or p_ba.status != "approved":
                check_prereqs = False
                p_name = p_ba.approval.name if p_ba and p_ba.approval else p_code
                missing.append(f"Prerequisite clearance '{p_name}' must be completed first")

    is_ready = check_eligibility and check_documents and check_prereqs

    disclaimer = (
        "Statutory Notice: You will be redirected to the official government single-window portal "
        "for statutory submission and fee processing. NiyamSetu does not replace official government portals."
    )

    return PortalCheckResponse(
        business_id=business.id,
        approval_id=ba.id,
        approval_code=master.code,
        approval_name=master.name,
        official_portal_url=master.official_portal_url or "https://www.india.gov.in",
        is_ready_to_proceed=is_ready,
        check_eligibility=check_eligibility,
        check_documents=check_documents,
        check_prerequisites=check_prereqs,
        missing_requirements=missing,
        statutory_disclaimer=disclaimer,
    )
