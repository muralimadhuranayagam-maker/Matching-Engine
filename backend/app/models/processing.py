import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Integer, Text
from backend.app.core.database import Base

class MatchRun(Base):
    __tablename__ = "match_runs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    run_id = Column(String(64), unique=True, index=True, nullable=False)
    candidate_id = Column(String(64), nullable=True)
    job_id = Column(String(64), nullable=True)
    trigger_type = Column(String(32), nullable=False)  # NEW_CANDIDATE, NEW_JOB, MANUAL_REMATCH
    status = Column(String(32), default="PROCESSING", nullable=False)
    jobs_considered = Column(Integer, default=0)
    jobs_matched = Column(Integer, default=0)
    error = Column(Text, nullable=True)
    started_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
