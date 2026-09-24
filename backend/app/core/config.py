import os
from typing import Any
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Recruitment Matching Engine V1"
    API_V1_STR: str = "/api"
    
    # Database URL: supports Railway PostgreSQL and SQLite
    DATABASE_URL: str = ""
    DATABASE_PUBLIC_URL: str = ""
    PGPORT: str = ""
    PGPASSWORD: str = ""

    def model_post_init(self, __context: Any) -> None:
        if not self.DATABASE_URL:
            self.DATABASE_URL = self.DATABASE_PUBLIC_URL or os.getenv("DATABASE_URL") or os.getenv("DATABASE_PUBLIC_URL") or "sqlite:///./matching_engine.db"
    
    # Local Storage Directory for uploaded Job Descriptions
    UPLOAD_DIRECTORY: str = os.getenv("UPLOAD_DIRECTORY", "./storage/job_descriptions")
    
    # Sarvam-105B API settings
    SARVAM_API_KEY: str = os.getenv("SARVAM_API_KEY", "")
    SARVAM_MODEL: str = os.getenv("SARVAM_MODEL", "sarvam-105b")
    SARVAM_API_URL: str = os.getenv("SARVAM_API_URL", "https://api.sarvam.ai/v1/chat/completions")

    # SnapServe AI Voice Agent Settings
    SNAPSERVE_API_KEY: str = os.getenv("SNAPSERVE_API_KEY", "")
    SNAPSERVE_BASE_URL: str = os.getenv("SNAPSERVE_BASE_URL", "https://app.snapserve.ai/api")

    
    # Embeddings Provider Settings
    EMBEDDING_PROVIDER: str = os.getenv("EMBEDDING_PROVIDER", "sentence-transformers")
    EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
    
    # Weighted Scoring System Defaults (%)
    WEIGHT_SKILLS: float = 35.0
    WEIGHT_EXPERIENCE: float = 25.0
    WEIGHT_RESPONSIBILITIES: float = 15.0
    WEIGHT_EDUCATION: float = 10.0
    WEIGHT_LOCATION: float = 5.0
    WEIGHT_SHIFT: float = 5.0
    WEIGHT_OTHER: float = 5.0
    
    # Match Thresholds (%)
    THRESHOLD_STRONG_MATCH: float = 80.0
    THRESHOLD_GOOD_MATCH: float = 70.0
    THRESHOLD_PARTIAL_MATCH: float = 60.0

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
        case_sensitive=True
    )

settings = Settings()
