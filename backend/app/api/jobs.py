import os
import uuid
import shutil
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks, Query
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.core.config import settings
from backend.app.models.job import JobDescription
from backend.app.models.candidate import Candidate
from backend.app.models.match import CandidateJobMatch
from backend.app.ai.documents import get_document_parser
from backend.app.ai.jd_parser import JDParser
from backend.app.matching.pipeline import MatchingPipeline

router = APIRouter(prefix="/jobs", tags=["Job Descriptions"])

ALLOWED_EXTENSIONS = {"pdf", "docx", "doc", "txt"}
MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024  # 15 MB

@router.post("/upload", status_code=202)
async def upload_job_descriptions(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    """
    Batch uploads and processes 20-30+ Job Descriptions (PDF, DOCX, TXT).
    Processes each file independently — one corrupted file does not break the batch.
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded")

    results = []
    success_count = 0
    fail_count = 0
    jd_parser = JDParser()

    for file in files:
        filename = file.filename or "unknown.pdf"
        ext = filename.split(".")[-1].lower() if "." in filename else ""

        # Validation 1: File Extension
        if ext not in ALLOWED_EXTENSIONS:
            results.append({
                "job_id": "",
                "filename": filename,
                "status": "FAILED",
                "message": f"Unsupported file type .{ext}. Allowed: PDF, DOCX, TXT"
            })
            fail_count += 1
            continue

        # Generate unique job ID
        unique_suffix = str(uuid.uuid4()).replace("-", "")[:12].upper()
        job_id = f"JOB-01K{unique_suffix}"

        # Setup local storage directory
        job_dir = os.path.join(settings.UPLOAD_DIRECTORY, job_id)
        os.makedirs(job_dir, exist_ok=True)
        local_file_path = os.path.join(job_dir, f"original.{ext}")

        # Save uploaded binary file locally
        try:
            with open(local_file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            file_size_bytes = os.path.getsize(local_file_path)
            
            if file_size_bytes == 0:
                results.append({
                    "job_id": job_id,
                    "filename": filename,
                    "status": "FAILED",
                    "message": "File is empty (0 bytes)"
                })
                fail_count += 1
                continue
                
        except Exception as e:
            results.append({
                "job_id": job_id,
                "filename": filename,
                "status": "FAILED",
                "message": f"Failed to save file locally: {str(e)}"
            })
            fail_count += 1
            continue

        # Extract Raw Text from PDF / DOCX / TXT
        try:
            parser = get_document_parser(ext)
            extraction = parser.extract_text(local_file_path)

            if extraction.get("needs_ocr"):
                job_db = JobDescription(
                    job_id=job_id,
                    title=filename.rsplit(".", 1)[0],
                    original_filename=filename,
                    file_path=local_file_path,
                    file_type=ext,
                    file_size=f"{file_size_bytes} bytes",
                    processing_status="OCR_REQUIRED",
                    processing_error=extraction.get("error")
                )
                db.add(job_db)
                db.commit()

                results.append({
                    "job_id": job_id,
                    "filename": filename,
                    "status": "OCR_REQUIRED",
                    "message": "Document contains images or scanned text requiring OCR."
                })
                continue

            raw_text = extraction.get("raw_text", "")
            if not raw_text:
                job_db = JobDescription(
                    job_id=job_id,
                    title=filename.rsplit(".", 1)[0],
                    original_filename=filename,
                    file_path=local_file_path,
                    file_type=ext,
                    file_size=f"{file_size_bytes} bytes",
                    processing_status="FAILED",
                    processing_error=extraction.get("error") or "Document contains no readable text"
                )
                db.add(job_db)
                db.commit()

                results.append({
                    "job_id": job_id,
                    "filename": filename,
                    "status": "FAILED",
                    "message": extraction.get("error") or "Document contains no readable text"
                })
                fail_count += 1
                continue

            # Parse with Sarvam-105B into Canonical JD JSON
            canonical_jd = await jd_parser.parse_jd(raw_text, job_id=job_id)
            if not canonical_jd.job_title or canonical_jd.job_title == "Untitled Job Requirement":
                canonical_jd.job_title = filename.rsplit(".", 1)[0].replace("-", " ").replace("_", " ").title()

            # Save to Database
            job_db = JobDescription(
                job_id=job_id,
                title=canonical_jd.job_title,
                original_filename=filename,
                file_path=local_file_path,
                file_type=ext,
                file_size=f"{round(file_size_bytes / 1024, 1)} KB",
                raw_text=raw_text,
                structured_data=canonical_jd.model_dump(),
                processing_status="COMPLETED",
                is_active=True
            )
            db.add(job_db)
            db.commit()

            # Trigger Candidate Matching for this new JD
            pipeline = MatchingPipeline(db)
            background_tasks.add_task(pipeline.run_for_job, job_id=job_id, trigger_type="NEW_JOB")

            success_count += 1
            results.append({
                "job_id": job_id,
                "filename": filename,
                "status": "COMPLETED",
                "message": f"Successfully parsed and converted into canonical JD JSON ({canonical_jd.job_title})."
            })

        except Exception as e:
            job_db = JobDescription(
                job_id=job_id,
                title=filename.rsplit(".", 1)[0],
                original_filename=filename,
                file_path=local_file_path,
                file_type=ext,
                file_size=f"{file_size_bytes} bytes",
                processing_status="FAILED",
                processing_error=str(e)
            )
            db.add(job_db)
            db.commit()

            fail_count += 1
            results.append({
                "job_id": job_id,
                "filename": filename,
                "status": "FAILED",
                "message": f"Parsing failed: {str(e)}"
            })

    return {
        "total_files": len(files),
        "successful_files": success_count,
        "failed_files": fail_count,
        "jobs": results
    }

@router.get("")
def list_jobs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(JobDescription)
    if status:
        query = query.filter(JobDescription.processing_status == status)

    jobs = query.order_by(JobDescription.created_at.desc()).offset(skip).limit(limit).all()

    results = []
    for j in jobs:
        results.append({
            "id": j.id,
            "job_id": j.job_id,
            "title": j.title,
            "original_filename": j.original_filename,
            "file_type": j.file_type,
            "file_size": j.file_size,
            "processing_status": j.processing_status,
            "processing_error": j.processing_error,
            "is_active": j.is_active,
            "created_at": j.created_at.isoformat(),
            "structured_data": j.structured_data
        })
    return {"total": query.count(), "jobs": results}

@router.get("/{job_id}")
def get_job(job_id: str, db: Session = Depends(get_db)):
    j = db.query(JobDescription).filter(JobDescription.job_id == job_id).first()
    if not j:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    return {
        "id": j.id,
        "job_id": j.job_id,
        "title": j.title,
        "original_filename": j.original_filename,
        "file_type": j.file_type,
        "file_size": j.file_size,
        "raw_text": j.raw_text,
        "structured_data": j.structured_data,
        "processing_status": j.processing_status,
        "processing_error": j.processing_error,
        "is_active": j.is_active,
        "created_at": j.created_at.isoformat(),
        "updated_at": j.updated_at.isoformat()
    }

@router.post("/{job_id}/match")
async def trigger_job_matching(
    job_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    j = db.query(JobDescription).filter(JobDescription.job_id == job_id).first()
    if not j:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    pipeline = MatchingPipeline(db)
    background_tasks.add_task(pipeline.run_for_job, job_id=job_id, trigger_type="MANUAL_REMATCH")

    return {
        "job_id": job_id,
        "status": "PROCESSING",
        "message": "Job candidate matching triggered successfully."
    }

@router.get("/{job_id}/candidates")
def get_job_matching_candidates(job_id: str, db: Session = Depends(get_db)):
    """
    Returns candidates matching a specific Job Description sorted by overall score descending (Requirement 28).
    """
    j = db.query(JobDescription).filter(JobDescription.job_id == job_id).first()
    if not j:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    matches = db.query(CandidateJobMatch).filter(
        CandidateJobMatch.job_id == job_id
    ).order_by(CandidateJobMatch.overall_score.desc()).all()

    results = []
    for m in matches:
        cand = db.query(Candidate).filter(Candidate.candidate_id == m.candidate_id).first()
        c_data = cand.candidate_data if cand else {}
        personal = c_data.get("personal", {})
        contact = c_data.get("contact", {})
        prof = c_data.get("professional_profile", {})

        results.append({
            "match_id": m.id,
            "candidate_id": m.candidate_id,
            "candidate_name": f"{personal.get('first_name', '')} {personal.get('last_name', '')}".strip() or "Unnamed Candidate",
            "phone": contact.get("phone", ""),
            "email": contact.get("email", ""),
            "skill": prof.get("skill", ""),
            "work_status": prof.get("work_status", "FRESHER"),
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
        "job_id": job_id,
        "job_title": j.title,
        "total_candidates": len(results),
        "candidates": results
    }

from pydantic import BaseModel

class BulkDeleteRequest(BaseModel):
    job_ids: List[str]

@router.delete("/{job_id}")
def delete_job(job_id: str, db: Session = Depends(get_db)):
    """
    Deletes a specific Job Description, its local document folder, and associated candidate matches.
    """
    j = db.query(JobDescription).filter(JobDescription.job_id == job_id).first()
    if not j:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    # 1. Delete associated candidate matches
    db.query(CandidateJobMatch).filter(CandidateJobMatch.job_id == job_id).delete(synchronize_session=False)

    # 2. Delete local storage directory if exists
    try:
        job_dir = os.path.join(settings.UPLOAD_DIRECTORY, job_id)
        if os.path.exists(job_dir):
            shutil.rmtree(job_dir, ignore_errors=True)
    except Exception as e:
        print(f"Warning: could not delete files for {job_id}: {e}")

    # 3. Delete Job record
    db.delete(j)
    db.commit()

    return {
        "status": "SUCCESS",
        "message": f"Job {job_id} deleted successfully.",
        "job_id": job_id
    }

@router.post("/bulk-delete")
def bulk_delete_jobs(body: BulkDeleteRequest, db: Session = Depends(get_db)):
    """
    Bulk deletes multiple Job Descriptions, their local files, and associated candidate matches.
    """
    if not body.job_ids:
        raise HTTPException(status_code=400, detail="No job IDs provided for deletion")

    # 1. Delete associated candidate matches
    db.query(CandidateJobMatch).filter(CandidateJobMatch.job_id.in_(body.job_ids)).delete(synchronize_session=False)

    # 2. Delete local directories for all target jobs
    for jid in body.job_ids:
        try:
            job_dir = os.path.join(settings.UPLOAD_DIRECTORY, jid)
            if os.path.exists(job_dir):
                shutil.rmtree(job_dir, ignore_errors=True)
        except Exception:
            pass

    # 3. Delete Job records
    deleted_count = db.query(JobDescription).filter(JobDescription.job_id.in_(body.job_ids)).delete(synchronize_session=False)
    db.commit()

    return {
        "status": "SUCCESS",
        "deleted_count": deleted_count,
        "job_ids": body.job_ids,
        "message": f"Successfully deleted {deleted_count} job description(s)."
    }

