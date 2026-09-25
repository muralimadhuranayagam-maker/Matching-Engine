import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Float, Index, Text
from backend.app.core.database import Base, JSON_TYPE

class CandidateInterview(Base):
    __tablename__ = "candidate_interviews"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id = Column(String(64), unique=True, index=True, nullable=False)
    candidate_id = Column(String(64), index=True, nullable=False)
    job_id = Column(String(64), index=True, nullable=True)
    status = Column(String(32), default="IN_PROGRESS", index=True, nullable=False)  # IN_PROGRESS, COMPLETED, EVALUATED
    
    # List of generated questions with categories, difficulty, target JD criteria
    questions = Column(JSON_TYPE, default=list, nullable=False)
    
    # List of recorded candidate responses { question_id, question, answer, timestamp }
    responses = Column(JSON_TYPE, default=list, nullable=False)
    
    # Evaluation result containing score, strengths, weaknesses, matched_jd_points, qualitative feedback
    evaluation = Column(JSON_TYPE, nullable=True)
    
    # Calculated interview score (0-100)
    interview_score = Column(Float, nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

Index("idx_interview_candidate_id", CandidateInterview.candidate_id)
Index("idx_interview_session_id", CandidateInterview.session_id)
Index("idx_interview_job_id", CandidateInterview.job_id)
