from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app.models.business import Business
from app.models.approval import BusinessApproval, MasterApproval
from app.models.document import VaultDocument, ApprovalRequiredDocument, MasterDocument
from app.models.alert import AlertAndReminder
from app.services.compliance_score import calculate_compliance_score
from app.services.dependency_engine import build_dependency_dag


def format_inr(val: float) -> str:
    if val >= 10000000:
        return f"₹{val / 10000000:.2f} Crore"
    elif val >= 100000:
        return f"₹{val / 100000:.2f} Lakhs"
    return f"₹{val:,.2f}"


def build_business_ai_context(business_id: str, db: Session) -> Dict[str, Any]:
    """
    Compiles a comprehensive, real-time snapshot of the enterprise's regulatory profile,
    compliance score, missing document backlog, and DAG execution state.
    """
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        return {}

    # 1. MSME Classification
    inv = float(business.investment_inr or 0.0)
    if inv <= 10000000:
        msme_tier = "Micro Enterprise (Under ₹1 Cr)"
    elif inv <= 100000000:
        msme_tier = "Small Enterprise (₹1 Cr - ₹10 Cr)"
    else:
        msme_tier = "Medium Enterprise (₹10 Cr - ₹50 Cr)"

    # 2. Approvals Status
    biz_approvals = (
        db.query(BusinessApproval)
        .filter(BusinessApproval.business_id == business.id)
        .all()
    )

    approvals_list = []
    approved_count = 0
    in_progress_count = 0

    for ba in biz_approvals:
        master = ba.approval
        if not master:
            continue

        if ba.status == "approved" or ba.tracking_stage == "approved":
            approved_count += 1
        elif ba.status in ["submitted", "under_review"] or ba.tracking_stage != "submitted":
            in_progress_count += 1

        approvals_list.append({
            "code": master.code,
            "name": master.name,
            "department": master.department,
            "status": ba.status,
            "tracking_stage": ba.tracking_stage or "submitted",
            "application_id": ba.application_id,
            "portal_url": master.official_portal_url,
            "processing_days": master.processing_days,
            "fee_inr": getattr(master, "statutory_fee_inr", 0),
        })

    # 3. Vault Documents & Missing Checklist
    vault_docs = (
        db.query(VaultDocument)
        .filter(VaultDocument.business_id == business.id)
        .all()
    )
    uploaded_doc_ids = {vd.master_document_id for vd in vault_docs}

    master_approval_ids = [ba.approval_id for ba in biz_approvals]
    required_doc_links = (
        db.query(ApprovalRequiredDocument)
        .filter(ApprovalRequiredDocument.master_approval_id.in_(master_approval_ids))
        .all()
    ) if master_approval_ids else []

    all_req_doc_ids = list({link.master_document_id for link in required_doc_links})
    req_masters = (
        db.query(MasterDocument)
        .filter(MasterDocument.id.in_(all_req_doc_ids))
        .all()
    ) if all_req_doc_ids else []

    missing_documents = []
    uploaded_documents = []
    for m in req_masters:
        if m.id in uploaded_doc_ids:
            uploaded_documents.append(m.name)
        else:
            missing_documents.append({
                "code": m.code,
                "name": m.name,
                "category": getattr(m, "category", "Mandatory Statutory"),
            })

    # 4. Dependency DAG Analysis (Unblocked vs Blocked)
    dag = build_dependency_dag(business, db)
    can_apply_now = []
    blocked_clearances = []

    for node in dag.nodes:
        if node.execution_state == "CAN_APPLY_NOW":
            can_apply_now.append({
                "code": node.code,
                "name": node.label,
                "department": node.department,
                "portal_url": node.portal_url,
            })
        elif node.execution_state == "BLOCKED":
            blocked_clearances.append({
                "code": node.code,
                "name": node.label,
                "department": node.department,
                "blocking_reasons": node.blocking_reasons,
                "prerequisites": node.prerequisites,
            })

    # 5. Compliance Readiness Score
    score_data = calculate_compliance_score(business, db)
    overall_score = score_data.get("overall_score", 0)
    rating_label = score_data.get("rating_label", "Needs Attention")

    # 6. Active Alerts
    alerts = (
        db.query(AlertAndReminder)
        .filter(AlertAndReminder.business_id == business.id, AlertAndReminder.is_read == False)
        .all()
    )
    active_alerts = [
        {"title": a.title, "type": a.alert_type, "message": a.message, "due_date": str(a.due_date) if a.due_date else None}
        for a in alerts
    ]

    return {
        "business_id": business.id,
        "enterprise_name": business.enterprise_name,
        "business_type": business.business_type,
        "state": business.state,
        "investment_inr": inv,
        "investment_formatted": format_inr(inv),
        "employee_count": business.employee_count,
        "msme_tier": msme_tier,
        "total_clearances": len(biz_approvals),
        "approved_count": approved_count,
        "in_progress_count": in_progress_count,
        "compliance_score": overall_score,
        "compliance_rating": rating_label,
        "approvals": approvals_list,
        "missing_documents": missing_documents,
        "uploaded_documents": uploaded_documents,
        "can_apply_now": can_apply_now,
        "blocked_clearances": blocked_clearances,
        "active_alerts": active_alerts,
    }
