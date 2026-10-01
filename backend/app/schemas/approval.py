from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class MasterApprovalBase(BaseModel):
    code: str
    name: str
    department: str
    description: str
    official_portal_url: Optional[str] = None
    processing_days: int = 30
    prerequisites: Optional[str] = None


class MasterApprovalResponse(MasterApprovalBase):
    id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BusinessApprovalItem(BaseModel):
    id: str
    approval_id: str
    code: str
    name: str
    department: str
    description: str
    official_portal_url: Optional[str] = None
    processing_days: int
    prerequisites: Optional[str] = None
    prerequisite_count: int = 0
    status: str = "not_applied"
    is_mandatory: bool = True
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RoadmapSummary(BaseModel):
    total_approvals: int
    mandatory_approvals: int
    estimated_total_days: int
    msme_category: str


class RoadmapResponse(BaseModel):
    business_id: str
    enterprise_name: str
    business_type: str
    state: str
    investment_inr: float
    employee_count: int
    summary: RoadmapSummary
    approvals: List[BusinessApprovalItem]

    model_config = ConfigDict(from_attributes=True)


class StatusUpdateRequest(BaseModel):
    status: str = Field(
        ...,
        description="Status: 'not_applied', 'documents_ready', 'submitted', 'under_review', 'approved'",
        examples=["submitted"],
    )
