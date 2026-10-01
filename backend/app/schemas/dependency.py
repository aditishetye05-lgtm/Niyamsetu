from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class DAGNode(BaseModel):
    id: str
    code: str
    label: str
    department: str
    description: str
    status: str
    execution_state: str  # "CAN_APPLY_NOW", "IN_PROGRESS", "COMPLETED", "BLOCKED"
    can_apply: bool
    blocking_reasons: List[str] = []
    prerequisites: List[str] = []
    documents_ready_percentage: float = 0.0
    portal_url: Optional[str] = None
    processing_days: int = 30

    model_config = ConfigDict(from_attributes=True)


class DAGEdge(BaseModel):
    id: str
    source: str
    target: str
    is_satisfied: bool
    label: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class DAGSummary(BaseModel):
    total_clearances: int
    ready_to_apply_count: int
    blocked_count: int
    in_progress_count: int
    completed_count: int


class DAGResponse(BaseModel):
    business_id: str
    enterprise_name: str
    summary: DAGSummary
    nodes: List[DAGNode]
    edges: List[DAGEdge]

    model_config = ConfigDict(from_attributes=True)
