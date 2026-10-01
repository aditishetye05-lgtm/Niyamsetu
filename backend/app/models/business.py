import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, DateTime
from app.db.session import Base


class Business(Base):
    __tablename__ = "businesses"

    id = Column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True,
    )
    enterprise_name = Column(String(255), nullable=False, index=True)
    business_type = Column(String(100), nullable=False, index=True)
    state = Column(String(100), nullable=False, index=True)
    investment_inr = Column(Float, nullable=False)
    employee_count = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<Business(id={self.id}, enterprise_name={self.enterprise_name})>"
