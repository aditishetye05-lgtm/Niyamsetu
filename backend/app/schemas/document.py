from typing import List, Optional, Dict
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class MasterDocumentResponse(BaseModel):
    id: str
    code: str
    name: str
    description: str
    valid_formats: str
    max_size_mb: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class VaultDocumentResponse(BaseModel):
    id: str
    business_id: str
    master_document_id: str
    file_name: str
    file_url: str
    mime_type: Optional[str] = None
    file_size_kb: int = 0
    verification_status: str = "verified"
    uploaded_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ApprovalDocumentItem(BaseModel):
    master_document_id: str
    code: str
    name: str
    description: str
    valid_formats: str
    max_size_mb: int
    is_mandatory: bool
    is_uploaded: bool
    vault_document: Optional[VaultDocumentResponse] = None
    reused_in_approvals: List[str] = []

    model_config = ConfigDict(from_attributes=True)


class ApprovalDocumentGroup(BaseModel):
    approval_id: str
    approval_code: str
    approval_name: str
    department: str
    total_documents: int
    uploaded_documents: int
    completion_percentage: float
    documents: List[ApprovalDocumentItem]

    model_config = ConfigDict(from_attributes=True)


class BusinessDocumentsResponse(BaseModel):
    business_id: str
    enterprise_name: str
    total_required_unique: int
    total_uploaded_unique: int
    document_readiness_pct: float
    approvals: List[ApprovalDocumentGroup]
    unique_vault_checklist: List[ApprovalDocumentItem]

    model_config = ConfigDict(from_attributes=True)


class ComplianceScoreBreakdown(BaseModel):
    documents_readiness: float
    approvals_progress: float
    dependencies_score: float
    renewals_validity_score: float


class ComplianceScoreResponse(BaseModel):
    business_id: str
    enterprise_name: str
    overall_score: int
    rating_label: str  # 'Audit Ready', 'On Track', 'Needs Attention'
    breakdown: ComplianceScoreBreakdown
    weights: Dict[str, float]
    summary_message: str

    model_config = ConfigDict(from_attributes=True)
