from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from app.models.business import Business
from app.models.approval import BusinessApproval, MasterApproval
from app.models.document import VaultDocument, ApprovalRequiredDocument
from app.schemas.dependency import (
    DAGNode,
    DAGEdge,
    DAGSummary,
    DAGResponse,
)

# Standardized Indian regulatory dependency graph
DEPENDENCY_RULES: Dict[str, List[str]] = {
    "BIZ_REG": [],
    "FIRE_NOC": [],
    "GST_REG": ["BIZ_REG"],
    "MSME_UDYAM": ["BIZ_REG"],
    "SHOPS_EST": ["BIZ_REG"],
    "FSSAI_LICENCE": ["BIZ_REG"],
    "PCB_CTE": ["BIZ_REG"],
    "TRADE_LICENCE": ["BIZ_REG", "FIRE_NOC"],
    "FACTORY_LICENCE": ["PCB_CTE", "FIRE_NOC"],
    "BOILER_REG": ["FACTORY_LICENCE"],
}


def build_dependency_dag(business: Business, db: Session) -> DAGResponse:
    """
    Computes Directed Acyclic Graph (DAG) for a business's required approvals,
    evaluating real-time eligibility (CAN_APPLY_NOW, IN_PROGRESS, COMPLETED, BLOCKED).
    """
    approvals = (
        db.query(BusinessApproval)
        .filter(BusinessApproval.business_id == business.id)
        .all()
    )

    if not approvals:
        return DAGResponse(
            business_id=business.id,
            enterprise_name=business.enterprise_name,
            summary=DAGSummary(
                total_clearances=0,
                ready_to_apply_count=0,
                blocked_count=0,
                in_progress_count=0,
                completed_count=0,
            ),
            nodes=[],
            edges=[],
        )

    # Map approval records by master code
    approval_map: Dict[str, BusinessApproval] = {}
    master_map: Dict[str, MasterApproval] = {}
    status_map: Dict[str, str] = {}

    for ba in approvals:
        master = ba.approval
        if master:
            approval_map[master.code] = ba
            master_map[master.code] = master
            status_map[master.code] = ba.status

    # Fetch document readiness per approval
    vault_entries = (
        db.query(VaultDocument)
        .filter(VaultDocument.business_id == business.id)
        .all()
    )
    uploaded_doc_ids = {v.master_document_id for v in vault_entries}

    master_app_ids = [m.id for m in master_map.values()]
    doc_links = (
        db.query(ApprovalRequiredDocument)
        .filter(ApprovalRequiredDocument.master_approval_id.in_(master_app_ids))
        .all()
    )

    app_id_to_docs = {}
    for link in doc_links:
        app_id_to_docs.setdefault(link.master_approval_id, []).append(link.master_document_id)

    nodes: List[DAGNode] = []
    edges: List[DAGEdge] = []
    ready_count = 0
    blocked_count = 0
    in_progress_count = 0
    completed_count = 0

    # Build Nodes
    for code, ba in approval_map.items():
        master = master_map[code]
        curr_status = ba.status

        # Prerequisites defined in rule engine or master model
        raw_prereqs = DEPENDENCY_RULES.get(code)
        if raw_prereqs is None and master.prerequisites:
            raw_prereqs = [p.strip() for p in master.prerequisites.split(",") if p.strip()]
        elif raw_prereqs is None:
            raw_prereqs = []

        # Filter prerequisites to only those that apply to this business
        active_prereqs = [p for p in raw_prereqs if p in approval_map]

        # Determine satisfaction
        missing_reasons = []
        for p_code in active_prereqs:
            p_status = status_map.get(p_code, "not_applied")
            # A prerequisite is satisfied if approved (or submitted/approved)
            if p_status != "approved":
                p_name = master_map[p_code].name if p_code in master_map else p_code
                missing_reasons.append(f"Requires {p_name} to be approved first")

        # Determine execution state
        if curr_status == "approved":
            exec_state = "COMPLETED"
            can_apply = False
            completed_count += 1
        elif curr_status in ("submitted", "under_review"):
            exec_state = "IN_PROGRESS"
            can_apply = False
            in_progress_count += 1
        elif len(missing_reasons) == 0:
            exec_state = "CAN_APPLY_NOW"
            can_apply = True
            ready_count += 1
        else:
            exec_state = "BLOCKED"
            can_apply = False
            blocked_count += 1

        # Document completion for this clearance
        req_docs = app_id_to_docs.get(master.id, [])
        if req_docs:
            uploaded_for_this = sum(1 for d in req_docs if d in uploaded_doc_ids)
            doc_pct = round((uploaded_for_this / len(req_docs)) * 100.0, 1)
        else:
            doc_pct = 100.0

        nodes.append(
            DAGNode(
                id=ba.id,
                code=code,
                label=master.name,
                department=master.department,
                description=master.description,
                status=curr_status,
                execution_state=exec_state,
                can_apply=can_apply,
                blocking_reasons=missing_reasons,
                prerequisites=active_prereqs,
                documents_ready_percentage=doc_pct,
                portal_url=master.official_portal_url,
                processing_days=master.processing_days,
            )
        )

        # Build Edges for active prerequisites
        for p_code in active_prereqs:
            p_ba = approval_map.get(p_code)
            if p_ba:
                is_sat = status_map.get(p_code) == "approved"
                edges.append(
                    DAGEdge(
                        id=f"edge-{p_code}-{code}",
                        source=p_ba.id,
                        target=ba.id,
                        is_satisfied=is_sat,
                        label="Prerequisite for",
                    )
                )

    summary = DAGSummary(
        total_clearances=len(nodes),
        ready_to_apply_count=ready_count,
        blocked_count=blocked_count,
        in_progress_count=in_progress_count,
        completed_count=completed_count,
    )

    return DAGResponse(
        business_id=business.id,
        enterprise_name=business.enterprise_name,
        summary=summary,
        nodes=nodes,
        edges=edges,
    )
