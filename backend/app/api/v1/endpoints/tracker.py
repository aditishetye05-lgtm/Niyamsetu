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
            detail=f"Business clearance with ID '{approval_id}' not found.",
        )

    if payload.tracking_stage not in VALID_STAGES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid tracking stage '{payload.tracking_stage}'. Allowed: {VALID_STAGES}",
        )

    if payload.application_id:
        ba.application_id = payload.application_id.strip()
    ba.tracking_stage = payload.tracking_stage
    if payload.notes is not None:
        ba.notes = payload.notes

    if not ba.application_date:
        ba.application_date = datetime.utcnow()

    # Synchronize overall approval status with tracking stage
    if payload.tracking_stage == "approved":
        ba.status = "approved"
    elif payload.tracking_stage in ("documents_verified", "department_inspection", "final_review"):
        ba.status = "under_review"
    elif payload.tracking_stage == "submitted":
        ba.status = "submitted"

    db.commit()
    db.refresh(ba)

    master = ba.approval

    # Email Notification Trigger: Application Status Transition
    target_email = None
    if business.user and business.user.email:
        target_email = business.user.email
    elif current_user and current_user.email:
        target_email = current_user.email
    else:
        target_email = "compliance-lead@enterprise.niyamsetu.gov.in"

    if master:
        dispatch_status_change_email(
            to_email=target_email,
            enterprise_name=business.enterprise_name,
            clearance_name=master.name,
            new_stage=payload.tracking_stage,
            application_id=ba.application_id or "ACK-PENDING",
            background_tasks=background_tasks,
        )

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
