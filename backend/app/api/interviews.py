import logging
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Body, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.services.interview_service import InterviewService
from backend.app.services.intake_form_service import IntakeFormService
from backend.app.models.interview import CandidateInterview

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/interviews", tags=["AI Interview & Form MCP"])

class NextFormFieldRequest(BaseModel):
    candidate_id: str

class SubmitFormFieldAnswerRequest(BaseModel):
    candidate_id: str
    field_path: str
    candidate_answer: Any

class CompleteIntakeFormRequest(BaseModel):
    candidate_id: str

class GenerateQuestionsRequest(BaseModel):
    candidate_id: str
    session_id: Optional[str] = None

class RecordAnswerRequest(BaseModel):
    session_id: str
    question_id: str
    question: str
    candidate_answer: str

class FinalizeInterviewRequest(BaseModel):
    session_id: str

class CompareWithJDRequest(BaseModel):
    candidate_id: str
    job_id: str
    session_id: Optional[str] = None

class UpdateCandidateFieldRequest(BaseModel):
    candidate_id: str
    field_path: str
    value: Any

# ============================================================
# Dedicated Intake Form Filling Endpoints (Ultra-Resilient for Voice Agents)
# ============================================================
@router.get("/intake/next-field")
@router.post("/intake/next-field")
async def get_next_intake_field(
    request: Request,
    candidate_id: Optional[str] = None
):
    """
    Checks candidate form and returns the NEXT unfilled field metadata for SnapServe AI.
    Accepts candidate_id from query params, JSON body (candidate_id/candidateId), or defaults to CAND-LIVE-01.
    """
    service = IntakeFormService()
    cand_id = candidate_id

    # If POST with JSON body, extract candidate_id or callId
    body: Dict[str, Any] = {}
    if request.method == "POST":
        try:
            body = await request.json()
        except Exception:
            pass

    call_id = body.get("callId") or body.get("call_id") or request.query_params.get("callId")
    if call_id:
        cand_id = f"CAND-{call_id}"
    elif isinstance(body, dict):
        cand_id = body.get("candidate_id") or body.get("candidateId") or body.get("id") or cand_id

    if not cand_id:
        cand_id = request.query_params.get("candidate_id") or request.query_params.get("candidateId") or "CAND-LIVE-01"

    try:
        res = service.get_next_form_field(cand_id)
        logger.info(f"[/intake/next-field] candidate={cand_id} (callId={call_id}) -> next={res.get('field_path')}")
        return res
    except Exception as e:
        logger.error(f"Error in /intake/next-field: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/intake/submit-answer")
@router.post("/intake/submit-answer")
async def submit_intake_answer(
    request: Request
):
    """
    Receives spoken answer from SnapServe AI, parses aliases (candidate_answer, answer, value, response, etc.),
    auto-resolves missing field_path to current active field, stores to DB, and returns next question metadata.
    """
    service = IntakeFormService()
    body: Dict[str, Any] = {}

    if request.method == "POST":
        try:
            body = await request.json()
        except Exception:
            try:
                form = await request.form()
                body = dict(form)
            except Exception:
                body = {}
    elif request.method == "GET":
        body = dict(request.query_params)

    # 1. Resolve candidate_id (auto-isolates each phone call if callId is provided)
    call_id = body.get("callId") or body.get("call_id") or request.query_params.get("callId")
    if call_id:
        cand_id = f"CAND-{call_id}"
    else:
        cand_id = (
            body.get("candidate_id")
            or body.get("candidateId")
            or body.get("id")
            or request.query_params.get("candidate_id")
            or request.query_params.get("candidateId")
            or "CAND-LIVE-01"
        )

    # 2. Resolve field_path (or auto-detect current active next field if missing!)
    field_path = (
        body.get("field_path")
        or body.get("fieldPath")
        or body.get("field")
        or body.get("fieldName")
        or body.get("path")
        or body.get("key")
        or request.query_params.get("field_path")
        or request.query_params.get("field")
    )

    if not field_path:
        next_f = service.get_next_form_field(cand_id)
        field_path = next_f.get("field_path", "general.answer")

    # 3. Resolve candidate_answer
    cand_answer = (
        body.get("candidate_answer")
        or body.get("candidateAnswer")
        or body.get("answer")
        or body.get("value")
        or body.get("response")
        or body.get("text")
        or body.get("field_value")
        or body.get("data")
        or body.get("content")
        or request.query_params.get("candidate_answer")
        or request.query_params.get("answer")
        or request.query_params.get("value")
        or ""
    )

    logger.info(f"[/intake/submit-answer] candidate={cand_id} field={field_path} answer='{cand_answer}'")

    try:
        result = service.submit_form_field_answer(
            candidate_id=cand_id,
            field_path=field_path,
            candidate_answer=cand_answer
        )
        return result
    except Exception as e:
        logger.error(f"Error in /intake/submit-answer: {e}")
        # Return graceful payload rather than 500 so voice call doesn't abort
        next_info = service.get_next_form_field(cand_id)
        return {
            "status": "FALLBACK_SAVED",
            "candidate_id": cand_id,
            "field_saved": field_path,
            "raw_candidate_answer": str(cand_answer),
            "next_field": next_info
        }

@router.get("/intake/state/{candidate_id}")
def get_intake_state(candidate_id: str):
    """Returns current filled form state and progress percentage."""
    service = IntakeFormService()
    try:
        return service.get_intake_form_state(candidate_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/intake/complete")
@router.post("/intake/complete")
async def complete_intake_form(
    request: Request,
    candidate_id: Optional[str] = None
):
    """Marks intake completed and runs Matching Engine across all active JDs."""
    service = IntakeFormService()
    cand_id = candidate_id
    if request.method == "POST":
        try:
            body = await request.json()
            if isinstance(body, dict):
                call_id = body.get("callId") or body.get("call_id")
                if call_id:
                    cand_id = f"CAND-{call_id}"
                else:
                    cand_id = body.get("candidate_id") or body.get("candidateId") or cand_id
        except Exception:
            pass

    if not cand_id:
        call_id = request.query_params.get("callId")
        if call_id:
            cand_id = f"CAND-{call_id}"
        else:
            cand_id = request.query_params.get("candidate_id") or "CAND-LIVE-01"

    try:
        return await service.complete_and_match_form(cand_id)
    except Exception as e:
        logger.error(f"Error completing intake: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/candidate/{candidate_id}/form-context")
def get_form_context(candidate_id: str, db: Session = Depends(get_db)):
    """Fetches full candidate intake form context for AI Interview Agent."""
    service = InterviewService(db)
    try:
        return service.get_candidate_form_context(candidate_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/job/{job_id}/requirements")
def get_job_requirements(job_id: str, db: Session = Depends(get_db)):
    """Fetches structured JD requirements."""
    service = InterviewService(db)
    try:
        return service.get_job_requirements(job_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/generate-questions")
async def generate_questions(
    payload: GenerateQuestionsRequest,
    db: Session = Depends(get_db)
):
    """
    Generates dynamic screening questions based solely on the candidate's intake form data.
    (JD is not linked during the live call; matching happens at the end).
    """
    service = InterviewService(db)
    try:
        result = await service.generate_interview_questions(
            candidate_id=payload.candidate_id,
            session_id=payload.session_id
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error generating questions: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate questions: {str(e)}")

@router.post("/answers")
def record_answer(
    payload: RecordAnswerRequest,
    db: Session = Depends(get_db)
):
    """
    Records a candidate's answer to an interview question in real-time.
    """
    service = InterviewService(db)
    try:
        result = service.record_candidate_answer(
            session_id=payload.session_id,
            question_id=payload.question_id,
            question=payload.question,
            candidate_answer=payload.candidate_answer
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/finalize")
async def finalize_interview(
    payload: FinalizeInterviewRequest,
    db: Session = Depends(get_db)
):
    """
    Finalizes the interview call, attaches full transcript to candidate profile,
    and runs the Matching Engine across ALL active JDs with complete data.
    """
    service = InterviewService(db)
    try:
        result = await service.finalize_candidate_interview(
            session_id=payload.session_id
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error finalizing interview: {e}")
        raise HTTPException(status_code=500, detail=f"Finalize failed: {str(e)}")

@router.post("/compare-jd")
async def compare_candidate_with_jd(
    payload: CompareWithJDRequest,
    db: Session = Depends(get_db)
):
    """
    Compares the full candidate profile (form data + interview transcript) against a specific JD.
    """
    service = InterviewService(db)
    try:
        result = await service.compare_candidate_with_jd(
            candidate_id=payload.candidate_id,
            job_id=payload.job_id,
            session_id=payload.session_id
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error comparing with JD: {e}")
        raise HTTPException(status_code=500, detail=f"Comparison failed: {str(e)}")

@router.get("/sessions/{session_id}")
def get_session(session_id: str, db: Session = Depends(get_db)):
    """Retrieves full interview session details (questions, answers, evaluation)."""
    interview = db.query(CandidateInterview).filter(CandidateInterview.session_id == session_id).first()
    if not interview:
        raise HTTPException(status_code=404, detail=f"Interview session '{session_id}' not found.")
    
    return {
        "id": interview.id,
        "session_id": interview.session_id,
        "candidate_id": interview.candidate_id,
        "job_id": interview.job_id,
        "status": interview.status,
        "interview_score": interview.interview_score,
        "questions": interview.questions,
        "responses": interview.responses,
        "evaluation": interview.evaluation,
        "created_at": interview.created_at.isoformat(),
        "updated_at": interview.updated_at.isoformat()
    }

@router.get("/candidate/{candidate_id}/sessions")
def get_candidate_sessions(candidate_id: str, db: Session = Depends(get_db)):
    """Retrieves all interview sessions for a specific candidate."""
    interviews = db.query(CandidateInterview).filter(
        CandidateInterview.candidate_id == candidate_id
    ).order_by(CandidateInterview.created_at.desc()).all()
    
    return {
        "candidate_id": candidate_id,
        "total_sessions": len(interviews),
        "sessions": [
            {
                "id": it.id,
                "session_id": it.session_id,
                "job_id": it.job_id,
                "status": it.status,
                "interview_score": it.interview_score,
                "total_questions": len(it.questions or []),
                "total_answers": len(it.responses or []),
                "evaluation": it.evaluation,
                "created_at": it.created_at.isoformat()
            }
            for it in interviews
        ]
    }
