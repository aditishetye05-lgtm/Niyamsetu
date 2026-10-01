import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base


class MasterApproval(Base):
    __tablename__ = "master_approvals"

    id = Column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True,
    )
    code = Column(String(100), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    department = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    official_portal_url = Column(String(500), nullable=True)
    processing_days = Column(Integer, default=30, nullable=False)
    prerequisites = Column(String(500), nullable=True, default="")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    business_approvals = relationship("BusinessApproval", back_populates="approval")

    def __repr__(self):
        return f"<MasterApproval(code={self.code}, name={self.name})>"


class BusinessApproval(Base):
    __tablename__ = "business_approvals"

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
    approval_id = Column(
        String(36),
        ForeignKey("master_approvals.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    status = Column(
        String(50),
        default="not_applied",
        nullable=False,
    )  # Enum: 'not_applied', 'documents_ready', 'submitted', 'under_review', 'approved'
    is_mandatory = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    business = relationship("Business", back_populates="approvals")
    approval = relationship("MasterApproval", back_populates="business_approvals")

    def __repr__(self):
        return f"<BusinessApproval(business_id={self.business_id}, approval_id={self.approval_id}, status={self.status})>"
