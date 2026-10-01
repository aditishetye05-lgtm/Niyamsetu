import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base


class AlertAndReminder(Base):
    __tablename__ = "alerts_and_reminders"

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
        ForeignKey("master_approvals.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    alert_type = Column(
        String(50),
        nullable=False,
    )  # 'renewal_due', 'pending_action', 'status_update'
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    due_date = Column(DateTime, nullable=True)
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    business = relationship("Business", back_populates="alerts")
    approval = relationship("MasterApproval")

    def __repr__(self):
        return f"<AlertAndReminder(title={self.title}, type={self.alert_type}, is_read={self.is_read})>"
