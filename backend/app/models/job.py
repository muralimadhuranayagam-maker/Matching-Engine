import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Text, Boolean, Index
from backend.app.core.database import Base, JSON_TYPE

class JobDescription(Base):
    __tablename__ = "job_descriptions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    job_id = Column(String(64), unique=True, index=True, nullable=False)
    title = Column(String(255), nullable=False, default="Untitled Job Description")
    original_filename = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    file_type = Column(String(32), nullable=False)  # pdf, docx, txt
    file_size = Column(String(32), nullable=True)
    raw_text = Column(Text, nullable=True)
    structured_data = Column(JSON_TYPE, nullable=True)  # Canonical JD JSON
    processing_status = Column(String(32), default="UPLOADED", index=True, nullable=False) # UPLOADED, EXTRACTING, PARSING, NORMALIZING, EMBEDDING, MATCHING, COMPLETED, FAILED, OCR_REQUIRED
    processing_error = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, index=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

Index("idx_jobs_job_id", JobDescription.job_id)
Index("idx_jobs_status", JobDescription.processing_status)
Index("idx_jobs_is_active", JobDescription.is_active)
