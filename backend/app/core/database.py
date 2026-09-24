import os
from sqlalchemy import create_engine, JSON
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.dialects.postgresql import JSONB
from backend.app.core.config import settings

# Determine DB engine args based on SQLite vs PostgreSQL
db_url = settings.DATABASE_URL
is_sqlite = db_url.startswith("sqlite")

connect_args = {"check_same_thread": False} if is_sqlite else {}

engine = create_engine(
    db_url,
    connect_args=connect_args,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Helper column type: PostgreSQL JSONB or standard JSON for SQLite
JSON_TYPE = JSONB if "postgresql" in db_url else JSON

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
