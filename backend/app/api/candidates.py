import uuid
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.models.candidate import Candidate
from backend.app.models.match import CandidateJobMatch
from backend.app.models.job import JobDescription
from backend.app.matching.pipeline import MatchingPipeline

router = APIRouter(prefix="/candidates", tags=["Candidates"])

@router.post("", status_code=201)
async def create_candidate(
    payload: Dict[str, Any],
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Stores candidate JSON profile in PostgreSQL and triggers matching against active JDs.
    Returns generated candidate_id.
    """
    if not payload or not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Invalid candidate payload")

    # Generate unique candidate ID (e.g. CAND-01K8F...)
    unique_suffix = str(uuid.uuid4()).replace("-", "")[:12].upper()
    candidate_id = f"CAND-01K{unique_suffix}"
    
    payload["candidate_id"] = candidate_id

    candidate_entry = Candidate(
        candidate_id=candidate_id,
        candidate_data=payload,
        status="ACTIVE"
    )
    db.add(candidate_entry)
    db.commit()

    # Trigger candidate matching asynchronously in background
    pipeline = MatchingPipeline(db)
    background_tasks.add_task(pipeline.run_for_candidate, candidate_id=candidate_id, trigger_type="NEW_CANDIDATE")

    return {
        "id": candidate_entry.id,
        "candidate_id": candidate_id,
        "status": "ACTIVE",
        "message": "Candidate profile saved successfully. Matching pipeline initiated.",
        "created_at": candidate_entry.created_at.isoformat()
    }

@router.get("")
def list_candidates(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Candidate)
    if search:
        # Search candidate first/last name or phone
        query = query.filter(Candidate.candidate_id.ilike(f"%{search}%"))

    candidates = query.order_by(Candidate.created_at.desc()).offset(skip).limit(limit).all()
    
    result = []
    for c in candidates:
        data = c.candidate_data or {}
        personal = data.get("personal", {})
        contact = data.get("contact", {})
        prof = data.get("professional_profile", {})
        
        result.append({
            "id": c.id,
            "candidate_id": c.candidate_id,
            "name": f"{personal.get('first_name', '')} {personal.get('last_name', '')}".strip() or "Unnamed Candidate",
            "phone": contact.get("phone", ""),
            "email": contact.get("email", ""),
            "skill": prof.get("skill", ""),
            "work_status": prof.get("work_status", "FRESHER"),
            "status": c.status,
            "created_at": c.created_at.isoformat(),
            "profile": data
        })
    return {"total": query.count(), "candidates": result}

@router.get("/{candidate_id}")
def get_candidate(candidate_id: str, db: Session = Depends(get_db)):
    c = db.query(Candidate).filter(Candidate.candidate_id == candidate_id).first()
    if not c:
        raise HTTPException(status_code=404, detail=f"Candidate {candidate_id} not found")
    
    return {
        "id": c.id,
        "candidate_id": c.candidate_id,
        "status": c.status,
        "created_at": c.created_at.isoformat(),
        "updated_at": c.updated_at.isoformat(),
        "candidate_data": c.candidate_data
    }

@router.post("/{candidate_id}/match")
async def trigger_candidate_matching(
    candidate_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    c = db.query(Candidate).filter(Candidate.candidate_id == candidate_id).first()
    if not c:
        raise HTTPException(status_code=404, detail=f"Candidate {candidate_id} not found")

    pipeline = MatchingPipeline(db)
    background_tasks.add_task(pipeline.run_for_candidate, candidate_id=candidate_id, trigger_type="MANUAL_REMATCH")

    return {
        "candidate_id": candidate_id,
        "status": "PROCESSING",
        "message": "Manual rematching triggered successfully."
    }

@router.get("/{candidate_id}/matches")
def get_candidate_matches(candidate_id: str, db: Session = Depends(get_db)):
    """
    Returns candidate's matching jobs sorted by overall score descending.
    Displays ALL suitable jobs (Requirement 29).
    """
    c = db.query(Candidate).filter(Candidate.candidate_id == candidate_id).first()
    if not c:
        raise HTTPException(status_code=404, detail=f"Candidate {candidate_id} not found")

    matches = db.query(CandidateJobMatch).filter(
        CandidateJobMatch.candidate_id == candidate_id
    ).order_by(CandidateJobMatch.overall_score.desc()).all()

    results = []
    for m in matches:
        job = db.query(JobDescription).filter(JobDescription.job_id == m.job_id).first()
        jd_data = job.structured_data if job else {}

        results.append({
            "match_id": m.id,
            "job_id": m.job_id,
            "job_title": jd_data.get("job_title", job.title if job else "Untitled Job"),
            "location": ", ".join(jd_data.get("location", {}).get("cities", [])) or "Any location",
            "employment_type": jd_data.get("employment_type", "Full Time"),
            "overall_score": m.overall_score,
            "status": m.status,
            "score_breakdown": m.score_breakdown,
            "matched_requirements": m.matched_requirements,
            "missing_requirements": m.missing_requirements,
            "partial_requirements": m.partial_requirements,
            "llm_validation": m.llm_validation,
            "created_at": m.created_at.isoformat()
        })

    return {
        "candidate_id": candidate_id,
        "total_matches": len(results),
        "matches": results
    }
