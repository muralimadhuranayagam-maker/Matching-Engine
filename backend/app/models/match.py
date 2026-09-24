import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Float, Index, UniqueConstraint
from backend.app.core.database import Base, JSON_TYPE

class CandidateJobMatch(Base):
    __tablename__ = "candidate_job_matches"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    candidate_id = Column(String(64), index=True, nullable=False)
    job_id = Column(String(64), index=True, nullable=False)
    overall_score = Column(Float, nullable=False, default=0.0)
    status = Column(String(32), default="MATCHED", index=True, nullable=False) # MATCHED, PARTIAL_MATCH, NOT_MATCHED, REVIEW_REQUIRED, PROCESSING, ERROR
    score_breakdown = Column(JSON_TYPE, nullable=False)
    matched_requirements = Column(JSON_TYPE, nullable=True)
    missing_requirements = Column(JSON_TYPE, nullable=True)
    partial_requirements = Column(JSON_TYPE, nullable=True)
    llm_validation = Column(JSON_TYPE, nullable=True)
    matching_run_id = Column(String(64), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        UniqueConstraint('candidate_id', 'job_id', name='uq_candidate_job_match'),
        Index('idx_match_candidate_job', 'candidate_id', 'job_id'),
        Index('idx_match_score', 'overall_score'),
    )
