from typing import List, Optional, Dict
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class TrackApprovalRequest(BaseModel):
    application_id: Optional[str] = Field(
        None,
        description="Official government application / reference number",
        examples=["MH2026-FSSAI-8921"],
    )
    application_reference_number: Optional[str] = Field(
        None,
        description="Alternative key for official government application reference number",
    )
    tracking_stage: Optional[str] = Field(
        None,
        description="Stage: 'submitted', 'documents_verified', 'department_inspection', 'final_review', 'approved'",
        examples=["documents_verified"],
    )
    progression_stage: Optional[str] = Field(
        None,
        description="Alternative key for progression stage",
    )
    notes: Optional[str] = None
    clearance_code: Optional[str] = None
    business_id: Optional[str] = None


class TrackedApprovalItem(BaseModel):
    id: str
    approval_id: str
    code: str
    name: str
    department: str
    application_id: Optional[str] = None
    tracking_stage: str = "submitted"
    application_date: Optional[datetime] = None
    approval_expiry_date: Optional[datetime] = None
    notes: Optional[str] = None
    status: str
    official_portal_url: Optional[str] = None
    processing_days: int = 30

    model_config = ConfigDict(from_attributes=True)


class TrackingOverviewResponse(BaseModel):
    business_id: str
    enterprise_name: str
    total_tracked: int
    stage_counts: Dict[str, int]
    approvals: List[TrackedApprovalItem]

    model_config = ConfigDict(from_attributes=True)


class AlertItem(BaseModel):
    id: str
    business_id: str
    approval_id: Optional[str] = None
    alert_type: str  # 'renewal_due', 'pending_action', 'status_update'
    title: str
    message: str
    due_date: Optional[datetime] = None
    is_read: bool = False
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AlertsSummary(BaseModel):
    total_unread: int
    upcoming_renewals_count: int
    pending_actions_count: int
    status_updates_count: int
    alerts: List[AlertItem]

    model_config = ConfigDict(from_attributes=True)


class PortalCheckResponse(BaseModel):
    business_id: str
    approval_id: str
    approval_code: str
    approval_name: str
    official_portal_url: str
    is_ready_to_proceed: bool
    check_eligibility: bool
    check_documents: bool
    check_prerequisites: bool
    missing_requirements: List[str] = []
    statutory_disclaimer: str

    model_config = ConfigDict(from_attributes=True)
