from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.models.match import CandidateJobMatch
from backend.app.models.candidate import Candidate
from backend.app.models.job import JobDescription

router = APIRouter(prefix="/matches", tags=["Matches"])

@router.get("/{match_id}")
def get_match_detail(match_id: str, db: Session = Depends(get_db)):
    m = db.query(CandidateJobMatch).filter(CandidateJobMatch.id == match_id).first()
    if not m:
        raise HTTPException(status_code=404, detail=f"Match record {match_id} not found")

    candidate = db.query(Candidate).filter(Candidate.candidate_id == m.candidate_id).first()
    job = db.query(JobDescription).filter(JobDescription.job_id == m.job_id).first()

    return {
        "id": m.id,
        "candidate_id": m.candidate_id,
        "candidate_name": f"{candidate.candidate_data.get('personal', {}).get('first_name', '')} {candidate.candidate_data.get('personal', {}).get('last_name', '')}".strip() if candidate else "",
        "candidate_data": candidate.candidate_data if candidate else {},
        "job_id": m.job_id,
        "job_title": job.title if job else "",
        "job_data": job.structured_data if job else {},
        "overall_score": m.overall_score,
        "status": m.status,
        "score_breakdown": m.score_breakdown,
        "matched_requirements": m.matched_requirements,
        "missing_requirements": m.missing_requirements,
        "partial_requirements": m.partial_requirements,
        "llm_validation": m.llm_validation,
        "created_at": m.created_at.isoformat(),
        "updated_at": m.updated_at.isoformat()
    }
