import os
import uuid
from typing import List, Optional
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    UploadFile,
    File,
    Form,
    status,
)
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.business import Business
from app.models.approval import BusinessApproval, MasterApproval
from app.models.document import MasterDocument, ApprovalRequiredDocument, VaultDocument
from app.schemas.document import (
    BusinessDocumentsResponse,
    ApprovalDocumentGroup,
    ApprovalDocumentItem,
    VaultDocumentResponse,
    ComplianceScoreResponse,
    ComplianceScoreBreakdown,
)
from app.services.compliance_score import calculate_compliance_score
from app.services.discovery_engine import evaluate_and_generate_approvals

router = APIRouter()

# Local storage directory for vault files
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.get(
    "/{business_id}/documents",
    response_model=BusinessDocumentsResponse,
    summary="Get Required Documents & Vault Checklist",
    description="Returns all required statutory documents categorized by approval and aggregated for the Vault, highlighting cross-approval reuse and upload status.",
)
def get_business_documents(
    business_id: str,
    db: Session = Depends(get_db),
):
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Business profile with ID '{business_id}' not found.",
        )

    # Ensure approvals have been generated
    approvals, _ = evaluate_and_generate_approvals(business, db)

    # Fetch uploaded vault documents for this business
    vault_entries = (
        db.query(VaultDocument)
        .filter(VaultDocument.business_id == business.id)
        .all()
    )
    vault_map = {v.master_document_id: v for v in vault_entries}

    # Fetch all document links for the business's required approvals
    master_app_ids = [a.approval_id for a in approvals]
    links = (
        db.query(ApprovalRequiredDocument)
        .filter(ApprovalRequiredDocument.master_approval_id.in_(master_app_ids))
        .all()
    )

    # Group links by approval and also by document to calculate reuse
    doc_to_approvals = {}
    app_id_to_master = {a.approval_id: a.approval for a in approvals}

    for link in links:
        doc_id = link.master_document_id
        app = app_id_to_master.get(link.master_approval_id)
        if app:
            doc_to_approvals.setdefault(doc_id, []).append(app.name)

    # Build Approval Groups
    approval_groups: List[ApprovalDocumentGroup] = []
    unique_docs_seen = {}

    for a in approvals:
        master_app: MasterApproval = a.approval
        if not master_app:
            continue

        app_links = [l for l in links if l.master_approval_id == master_app.id]
        doc_items: List[ApprovalDocumentItem] = []
        uploaded_count = 0

        for link in app_links:
            master_doc: MasterDocument = link.master_document
            if not master_doc:
                continue

            v_doc = vault_map.get(master_doc.id)
            is_up = v_doc is not None
            if is_up:
                uploaded_count += 1

            v_resp = None
            if v_doc:
                v_resp = VaultDocumentResponse(
                    id=v_doc.id,
                    business_id=v_doc.business_id,
                    master_document_id=v_doc.master_document_id,
                    file_name=v_doc.file_name,
                    file_url=v_doc.file_url,
                    mime_type=v_doc.mime_type,
                    file_size_kb=v_doc.file_size_kb,
                    verification_status=v_doc.verification_status,
                    uploaded_at=v_doc.uploaded_at,
                )

            reused_list = doc_to_approvals.get(master_doc.id, [])

            doc_item = ApprovalDocumentItem(
                master_document_id=master_doc.id,
                code=master_doc.code,
                name=master_doc.name,
                description=master_doc.description,
                valid_formats=master_doc.valid_formats,
                max_size_mb=master_doc.max_size_mb,
                is_mandatory=link.is_mandatory,
                is_uploaded=is_up,
                vault_document=v_resp,
                reused_in_approvals=reused_list,
            )
            doc_items.append(doc_item)

            if master_doc.id not in unique_docs_seen:
                unique_docs_seen[master_doc.id] = doc_item

        total_d = len(doc_items)
        completion = (uploaded_count / total_d * 100.0) if total_d > 0 else 100.0

        approval_groups.append(
            ApprovalDocumentGroup(
                approval_id=a.id,
                approval_code=master_app.code,
                approval_name=master_app.name,
                department=master_app.department,
                total_documents=total_d,
                uploaded_documents=uploaded_count,
                completion_percentage=round(completion, 1),
                documents=doc_items,
            )
        )

    # Unique overall checklist
    unique_list = list(unique_docs_seen.values())
    total_unique = len(unique_list)
    uploaded_unique = sum(1 for d in unique_list if d.is_uploaded)
    readiness_pct = (uploaded_unique / total_unique * 100.0) if total_unique > 0 else 100.0

    return BusinessDocumentsResponse(
        business_id=business.id,
        enterprise_name=business.enterprise_name,
        total_required_unique=total_unique,
        total_uploaded_unique=uploaded_unique,
        document_readiness_pct=round(readiness_pct, 1),
        approvals=approval_groups,
        unique_vault_checklist=unique_list,
    )


@router.post(
    "/{business_id}/documents/upload",
    response_model=VaultDocumentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload Document to Vault (Cross-Approval Reuse)",
    description="Uploads a statutory document into the Smart Document Vault. This document is automatically linked and reused across all clearances requiring it.",
)
async def upload_vault_document(
    business_id: str,
    master_document_id: str = Form(...),
    file: Optional[UploadFile] = File(None),
    file_name: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Business profile with ID '{business_id}' not found.",
        )

    master_doc = (
        db.query(MasterDocument)
        .filter(MasterDocument.id == master_document_id)
        .first()
    )
    if not master_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Master document with ID '{master_document_id}' not found.",
        )

    # Determine file attributes
    if file and file.filename:
        actual_name = file.filename
        content = await file.read()
        size_kb = max(1, len(content) // 1024)
        mime = file.content_type or "application/octet-stream"

        # Save to local uploads folder
        safe_filename = f"{business_id}_{master_doc.code}_{uuid.uuid4().hex[:6]}_{actual_name}"
        dest_path = os.path.join(UPLOAD_DIR, safe_filename)
        with open(dest_path, "wb") as f:
            f.write(content)
        file_url = f"/uploads/{safe_filename}"
    else:
        # Virtual / metadata document upload
        actual_name = file_name or f"{master_doc.code}_document.pdf"
        size_kb = 250
        mime = "application/pdf"
        file_url = f"/mock_vault/{business_id}/{actual_name}"

    # Check if this document was already uploaded in vault for this business
    existing_vault = (
        db.query(VaultDocument)
        .filter(
            VaultDocument.business_id == business.id,
            VaultDocument.master_document_id == master_doc.id,
        )
        .first()
    )

    if existing_vault:
        existing_vault.file_name = actual_name
        existing_vault.file_url = file_url
        existing_vault.mime_type = mime
        existing_vault.file_size_kb = size_kb
        existing_vault.verification_status = "verified"
        db.commit()
        db.refresh(existing_vault)
        return existing_vault
    else:
        new_vault = VaultDocument(
            business_id=business.id,
            master_document_id=master_doc.id,
            file_name=actual_name,
            file_url=file_url,
            mime_type=mime,
            file_size_kb=size_kb,
            verification_status="verified",
        )
        db.add(new_vault)
        db.commit()
        db.refresh(new_vault)
        return new_vault


@router.delete(
    "/{business_id}/documents/{vault_document_id}",
    summary="Delete Vault Document",
    description="Remove an uploaded document from the business vault.",
)
def delete_vault_document(
    business_id: str,
    vault_document_id: str,
    db: Session = Depends(get_db),
):
    doc = (
        db.query(VaultDocument)
        .filter(
            VaultDocument.business_id == business_id,
            VaultDocument.id == vault_document_id,
        )
        .first()
    )
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Vault document '{vault_document_id}' not found.",
        )

    db.delete(doc)
    db.commit()
    return {"success": True, "message": "Document removed from vault."}


@router.get(
    "/{business_id}/compliance-score",
    response_model=ComplianceScoreResponse,
    summary="Calculate Dynamic Compliance Readiness Score",
    description="Calculates real-time compliance readiness score (0-100%) with 4 component breakdown (Documents, Approvals, Dependencies, Renewals).",
)
def get_compliance_score(
    business_id: str,
    db: Session = Depends(get_db),
):
    business = db.query(Business).filter(Business.id == business_id).first()
    if not business:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Business profile with ID '{business_id}' not found.",
        )

    score_data = calculate_compliance_score(business, db)

    return ComplianceScoreResponse(
        business_id=business.id,
        enterprise_name=business.enterprise_name,
        overall_score=score_data["overall_score"],
        rating_label=score_data["rating_label"],
        breakdown=ComplianceScoreBreakdown(**score_data["breakdown"]),
        weights=score_data["weights"],
        summary_message=score_data["summary_message"],
    )
