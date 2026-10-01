from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.business import Business
from app.models.approval import MasterApproval, BusinessApproval
from app.schemas.approval import (
    RoadmapResponse,
    RoadmapSummary,
    BusinessApprovalItem,
    StatusUpdateRequest,
)
from app.services.discovery_engine import (
    classify_msme,
    evaluate_and_generate_approvals,
)

router = APIRouter()


def build_roadmap_response(business: Business, approvals: List[BusinessApproval]) -> RoadmapResponse:
    approval_items: List[BusinessApprovalItem] = []
    total_days = 0
    mandatory_count = 0

    for ba in approvals:
        master: MasterApproval = ba.approval
        if not master:
            continue

        prereqs = (master.prerequisites or "").strip()
        prereq_count = len([p for p in prereqs.split(",") if p.strip()]) if prereqs else 0

        total_days = max(total_days, master.processing_days)
        if ba.is_mandatory:
            mandatory_count += 1

        approval_items.append(
            BusinessApprovalItem(
                id=ba.id,
                approval_id=master.id,
                code=master.code,
                name=master.name,
                department=master.department,
                description=master.description,
                official_portal_url=master.official_portal_url,
                processing_days=master.processing_days,
                prerequisites=master.prerequisites,
                prerequisite_count=prereq_count,
                status=ba.status,
                is_mandatory=ba.is_mandatory,
                created_at=ba.created_at,
            )
        )

    summary = RoadmapSummary(
        total_approvals=len(approval_items),
        mandatory_approvals=mandatory_count,
        estimated_total_days=total_days,
        msme_category=classify_msme(business.investment_inr),
    )

    return RoadmapResponse(
        business_id=business.id,
        enterprise_name=business.enterprise_name,
        business_type=business.business_type,
        state=business.state,
        investment_inr=business.investment_inr,
        employee_count=business.employee_count,
        summary=summary,
        approvals=approval_items,
    )


@router.post(
    "/{business_id}/discover-approvals",
    response_model=RoadmapResponse,
    status_code=status.HTTP_200_OK,
    summary="Evaluate & Generate Regulatory Approval Roadmap",
    description="Analyzes the business parameters (industry type, state, capital, employees) and generates the statutory approvals roadmap.",
)
def discover_approvals(
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
    return build_roadmap_response(business, approvals)


@router.get(
    "/{business_id}/roadmap",
    response_model=RoadmapResponse,
    summary="Get Regulatory Approval Roadmap",
    description="Retrieve all mapped approvals, status, timelines, departments, and prerequisites for a business.",
)
def get_business_roadmap(
    business_id: str,
    db: Session = Depends(get_db),
):
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Business profile with ID '{business_id}' not found.",
        )

    # Ensure approvals are generated if not yet discovered
    approvals, _ = evaluate_and_generate_approvals(business, db)
    return build_roadmap_response(business, approvals)


@router.patch(
    "/{business_id}/approvals/{approval_id}/status",
    summary="Update Business Approval Status",
    description="Update the progress status of a specific regulatory clearance.",
)
def update_approval_status(
    business_id: str,
    approval_id: str,
    status_in: StatusUpdateRequest,
    db: Session = Depends(get_db),
):
    allowed_statuses = ["not_applied", "documents_ready", "submitted", "under_review", "approved"]
    if status_in.status not in allowed_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status '{status_in.status}'. Allowed: {allowed_statuses}",
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
            detail=f"Approval record with ID '{approval_id}' not found for business '{business_id}'.",
        )

    ba.status = status_in.status
    db.commit()
    db.refresh(ba)
    return {
        "success": True,
        "message": f"Approval status updated to '{ba.status}'",
        "approval_id": ba.id,
        "status": ba.status,
    }
