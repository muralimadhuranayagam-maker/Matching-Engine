import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Text, Index
from backend.app.core.database import Base, JSON_TYPE

class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    candidate_id = Column(String(64), unique=True, index=True, nullable=False)
    candidate_data = Column(JSON_TYPE, nullable=False)  # Complete JSON payload from form
    status = Column(String(32), default="ACTIVE", index=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

Index("idx_candidates_candidate_id", Candidate.candidate_id)
Index("idx_candidates_status", Candidate.status)
