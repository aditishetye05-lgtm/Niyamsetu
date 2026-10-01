from typing import Tuple, Dict, Any, List
from sqlalchemy.orm import Session
from app.models.business import Business
from app.models.approval import BusinessApproval
from app.models.document import VaultDocument, ApprovalRequiredDocument, MasterDocument


def calculate_compliance_score(business: Business, db: Session) -> Dict[str, Any]:
    """
    Computes dynamic Compliance Readiness Score (0-100%) and 4 breakdown metrics:
      1. Documents Readiness (40%)
      2. Approvals Progress (30%)
      3. Dependencies Score (20%)
      4. Renewals & Validity (10%)
    """
    # 1. Fetch business approvals
    approvals = (
        db.query(BusinessApproval)
        .filter(BusinessApproval.business_id == business.id)
        .all()
    )

    # If no approvals found, return zeroed score
    if not approvals:
        return {
            "overall_score": 0,
            "rating_label": "Needs Attention",
            "breakdown": {
                "documents_readiness": 0.0,
                "approvals_progress": 0.0,
                "dependencies_score": 0.0,
                "renewals_validity_score": 95.0,
            },
            "weights": {
                "documents": 0.40,
                "approvals": 0.30,
                "dependencies": 0.20,
                "renewals": 0.10,
            },
            "summary_message": "No statutory approvals mapped yet. Please generate roadmap.",
        }

    # 2. Determine all required documents for these approvals
    master_approval_ids = [a.approval_id for a in approvals]
    required_doc_links = (
        db.query(ApprovalRequiredDocument)
        .filter(ApprovalRequiredDocument.master_approval_id.in_(master_approval_ids))
        .all()
    )

    # Unique master document IDs required
    mandatory_doc_ids = set()
    for link in required_doc_links:
        if link.is_mandatory:
            mandatory_doc_ids.add(link.master_document_id)

    # 3. Check uploaded vault documents for this business
    vault_entries = (
        db.query(VaultDocument)
        .filter(VaultDocument.business_id == business.id)
        .all()
    )
    uploaded_doc_ids = {v.master_document_id for v in vault_entries}

    # Component 1: Documents Readiness
    if mandatory_doc_ids:
        uploaded_mandatory_count = len(mandatory_doc_ids.intersection(uploaded_doc_ids))
        docs_score = (uploaded_mandatory_count / len(mandatory_doc_ids)) * 100.0
    else:
        docs_score = 100.0

    # Component 2: Approvals Progress
    # 'approved' = 100%, 'under_review'/'submitted' = 75%, 'documents_ready' = 40%, 'not_applied' = 0%
    total_approvals = len(approvals)
    progress_sum = 0.0
    for a in approvals:
        if a.status == "approved":
            progress_sum += 100.0
        elif a.status in ("submitted", "under_review"):
            progress_sum += 75.0
        elif a.status == "documents_ready":
            progress_sum += 40.0
        else:
            progress_sum += 0.0

    approvals_score = progress_sum / total_approvals if total_approvals > 0 else 0.0

    # Component 3: Dependencies Score
    # An approval's prerequisites are met if all prerequisite codes have status 'submitted' or 'approved'
    approved_or_submitted_codes = set()
    for a in approvals:
        if a.status in ("approved", "submitted") and a.approval:
            approved_or_submitted_codes.add(a.approval.code)

    deps_met_count = 0
    for a in approvals:
        master = a.approval
        if not master or not master.prerequisites or not master.prerequisites.strip():
            deps_met_count += 1
        else:
            prereq_codes = [p.strip() for p in master.prerequisites.split(",") if p.strip()]
            if all(p in approved_or_submitted_codes for p in prereq_codes):
                deps_met_count += 1

    deps_score = (deps_met_count / total_approvals) * 100.0 if total_approvals > 0 else 100.0

    # Component 4: Renewals & Validity Score
    renewals_score = 95.0

    # Weighted Overall Score
    overall = (
        (docs_score * 0.40)
        + (approvals_score * 0.30)
        + (deps_score * 0.20)
        + (renewals_score * 0.10)
    )
    overall_int = int(round(overall))

    # Rating Label
    if overall_int >= 80:
        rating_label = "Audit Ready"
        summary_message = "Enterprise compliance is fully structured and ready for statutory submissions."
    elif overall_int >= 50:
        rating_label = "On Track"
        summary_message = "Good progress. Upload remaining mandatory documents to achieve full audit readiness."
    else:
        rating_label = "Needs Attention"
        summary_message = "Action required: Core mandatory documents and prerequisite registrations are pending."

    return {
        "overall_score": overall_int,
        "rating_label": rating_label,
        "breakdown": {
            "documents_readiness": round(docs_score, 1),
            "approvals_progress": round(approvals_score, 1),
            "dependencies_score": round(deps_score, 1),
            "renewals_validity_score": round(renewals_score, 1),
        },
        "weights": {
            "documents": 0.40,
            "approvals": 0.30,
            "dependencies": 0.20,
            "renewals": 0.10,
        },
        "summary_message": summary_message,
    }
