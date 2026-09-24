from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.models.candidate import Candidate
from backend.app.models.job import JobDescription
from backend.app.models.match import CandidateJobMatch

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/summary")
def get_dashboard_summary(db: Session = Depends(get_db)):
    total_candidates = db.query(Candidate).count()
    total_jobs = db.query(JobDescription).count()
    completed_jobs = db.query(JobDescription).filter(JobDescription.processing_status == "COMPLETED").count()
    failed_jobs = db.query(JobDescription).filter(JobDescription.processing_status == "FAILED").count()
    total_matches = db.query(CandidateJobMatch).count()
    
    strong_matches = db.query(CandidateJobMatch).filter(CandidateJobMatch.overall_score >= 80.0).count()

    return {
        "total_candidates": total_candidates,
        "total_active_jobs": total_jobs,
        "jobs_processed": completed_jobs,
        "processing_errors": failed_jobs,
        "matches_generated": total_matches,
        "strong_matches": strong_matches,
        "system_status": "ONLINE"
    }

@router.get("/recent-matches")
def get_recent_matches(limit: int = 10, db: Session = Depends(get_db)):
    matches = db.query(CandidateJobMatch).order_by(CandidateJobMatch.created_at.desc()).limit(limit).all()

    results = []
    for m in matches:
        cand = db.query(Candidate).filter(Candidate.candidate_id == m.candidate_id).first()
        job = db.query(JobDescription).filter(JobDescription.job_id == m.job_id).first()
        
        c_name = "Unnamed Candidate"
        if cand and cand.candidate_data:
            p = cand.candidate_data.get("personal", {})
            c_name = f"{p.get('first_name', '')} {p.get('last_name', '')}".strip() or c_name

        results.append({
            "match_id": m.id,
            "candidate_id": m.candidate_id,
            "candidate_name": c_name,
            "job_id": m.job_id,
            "job_title": job.title if job else "Untitled Job",
            "overall_score": m.overall_score,
            "status": m.status,
            "created_at": m.created_at.isoformat()
        })

    return {"recent_matches": results}
