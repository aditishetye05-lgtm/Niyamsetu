import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base


class MasterDocument(Base):
    __tablename__ = "master_documents"

    id = Column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True,
    )
    code = Column(String(100), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    valid_formats = Column(String(100), default="pdf,jpg,png", nullable=False)
    max_size_mb = Column(Integer, default=5, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    approval_links = relationship(
        "ApprovalRequiredDocument",
        back_populates="master_document",
        cascade="all, delete-orphan",
    )
    vault_entries = relationship("VaultDocument", back_populates="master_document")

    def __repr__(self):
        return f"<MasterDocument(code={self.code}, name={self.name})>"


class ApprovalRequiredDocument(Base):
    __tablename__ = "approval_required_documents"

    id = Column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True,
    )
    master_approval_id = Column(
        String(36),
        ForeignKey("master_approvals.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    master_document_id = Column(
        String(36),
        ForeignKey("master_documents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    is_mandatory = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    master_approval = relationship("MasterApproval", back_populates="required_documents")
    master_document = relationship("MasterDocument", back_populates="approval_links")

    def __repr__(self):
        return f"<ApprovalRequiredDocument(approval_id={self.master_approval_id}, doc_id={self.master_document_id})>"


class VaultDocument(Base):
    __tablename__ = "vault_documents"

    id = Column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True,
    )
    business_id = Column(
        String(36),
        ForeignKey("businesses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    master_document_id = Column(
        String(36),
        ForeignKey("master_documents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    file_name = Column(String(255), nullable=False)
    file_url = Column(String(500), nullable=False)
    mime_type = Column(String(50), nullable=True)
    file_size_kb = Column(Integer, default=0, nullable=False)
    verification_status = Column(
        String(50),
        default="verified",
        nullable=False,
    )  # 'verified', 'pending', 'rejected'
    uploaded_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    business = relationship("Business", back_populates="vault_documents")
    master_document = relationship("MasterDocument", back_populates="vault_entries")

    def __repr__(self):
        return f"<VaultDocument(business_id={self.business_id}, file_name={self.file_name})>"
