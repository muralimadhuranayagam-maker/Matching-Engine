import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.core.config import settings
from backend.app.core.database import engine, Base
import backend.app.models  # Import all models to register with Base

# Auto create database tables
Base.metadata.create_all(bind=engine)

# Ensure local upload storage directory exists
os.makedirs(settings.UPLOAD_DIRECTORY, exist_ok=True)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Recruitment Matching Engine V1 – FastAPI Backend",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from backend.app.api.candidates import router as candidates_router
from backend.app.api.live_intake import router as live_intake_router
from backend.app.api.jobs import router as jobs_router
from backend.app.api.matches import router as matches_router
from backend.app.api.dashboard import router as dashboard_router
from backend.app.api.interviews import router as interviews_router

app.include_router(candidates_router, prefix=settings.API_V1_STR)
app.include_router(live_intake_router, prefix=settings.API_V1_STR)
app.include_router(jobs_router, prefix=settings.API_V1_STR)
app.include_router(matches_router, prefix=settings.API_V1_STR)
app.include_router(dashboard_router, prefix=settings.API_V1_STR)

# Register interview & intake form routes on all standard URL prefixes for bulletproof AI agent tool integration
app.include_router(interviews_router, prefix="/api")
app.include_router(interviews_router, prefix="/api/v1")
app.include_router(interviews_router, prefix="")

@app.get("/")
def root():
    return {
        "project": settings.PROJECT_NAME,
        "status": "ONLINE",
        "docs": "/docs",
        "api_v1": settings.API_V1_STR
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
