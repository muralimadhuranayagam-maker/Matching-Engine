import pytest
import asyncio
import json
from sqlalchemy.orm import Session

from backend.app.core.database import SessionLocal, engine, Base
from backend.app.models.candidate import Candidate
from backend.app.models.job import JobDescription
from backend.app.models.match import CandidateJobMatch
from backend.app.models.interview import CandidateInterview
from backend.app.services.interview_service import InterviewService
from backend.app.mcp.interview_server import handle_tool_call, MCP_TOOLS

@pytest.fixture(scope="module")
def db():
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    yield session
    session.close()

@pytest.mark.asyncio
async def test_unlinked_live_call_and_end_matching(db: Session):
    # 1. Create candidate intake form data
    cand_id = "CAND-TEST-UNLINKED-01"
    db.query(CandidateInterview).filter(CandidateInterview.candidate_id == cand_id).delete()
    db.query(CandidateJobMatch).filter(CandidateJobMatch.candidate_id == cand_id).delete()
    db.query(Candidate).filter(Candidate.candidate_id == cand_id).delete()
    db.commit()

    cand_data = {
        "candidate_id": cand_id,
        "personal": {
            "first_name": "Deepak",
            "last_name": "Verma",
            "gender": "Male"
        },
        "contact": {
            "phone": "9876501234",
            "email": "deepak.verma@example.com"
        },
        "professional_profile": {
            "work_status": "EXPERIENCED",
            "skill": ["Python", "FastAPI", "PostgreSQL", "Docker", "AWS"],
            "total_experience_months": 48,
            "shift_preference": "Day Shift",
            "english_communication": "Excellent"
        },
        "employment_history": {
            "current": {
                "company_name": "Apex Tech Solutions",
                "role": "Senior Software Engineer",
                "take_home_salary": 80000
            }
        },
        "salary": {
            "expected_monthly_salary": 95000
        },
        "address": {
            "current": {
                "city": "Bengaluru",
                "area": "Whitefield",
                "pincode": "560066"
            }
        }
    }

    cand = Candidate(
        candidate_id=cand_id,
        candidate_data=cand_data,
        status="ACTIVE"
    )
    db.add(cand)

    # 2. Create multiple active JDs in the system
    job_id_1 = "JOB-TEST-PYTHON-01"
    job_id_2 = "JOB-TEST-REACT-02"
    db.query(JobDescription).filter(JobDescription.job_id.in_([job_id_1, job_id_2])).delete()
    db.commit()

    jd_1 = {
        "job_title": "Senior Python Backend Engineer",
        "skills": {
            "required": ["Python", "FastAPI", "PostgreSQL"],
            "preferred": ["Docker", "AWS"]
        },
        "experience": {"minimum_years": 3, "maximum_years": 6},
        "responsibilities": ["Build high throughput APIs", "Database performance tuning"],
        "education": {"minimum_qualification": "Graduate"},
        "location": {"cities": ["Bengaluru"], "work_mode": "Hybrid"},
        "shift": {"type": "Day Shift"}
    }

    job1 = JobDescription(
        job_id=job_id_1,
        title="Senior Python Backend Engineer",
        original_filename="python_jd.pdf",
        file_path="/storage/python_jd.pdf",
        file_type="pdf",
        structured_data=jd_1,
        is_active=True,
        processing_status="COMPLETED"
    )

    jd_2 = {
        "job_title": "Java Spring Developer",
        "skills": {"required": ["Java", "Spring Boot", "Oracle"], "preferred": ["Kubernetes"]},
        "experience": {"minimum_years": 4, "maximum_years": 8},
        "responsibilities": ["Enterprise banking software development"],
        "education": {"minimum_qualification": "Graduate"},
        "location": {"cities": ["Pune"], "work_mode": "Onsite"},
        "shift": {"type": "Night Shift"}
    }

    job2 = JobDescription(
        job_id=job_id_2,
        title="Java Spring Developer",
        original_filename="java_jd.pdf",
        file_path="/storage/java_jd.pdf",
        file_type="pdf",
        structured_data=jd_2,
        is_active=True,
        processing_status="COMPLETED"
    )

    db.add(job1)
    db.add(job2)
    db.commit()

    service = InterviewService(db)

    # 3. LIVE CALL PHASE: Generate questions based SOLELY on candidate intake form (NO JD linked)
    q_result = await service.generate_interview_questions(candidate_id=cand_id)
    assert "questions" in q_result
    assert len(q_result["questions"]) > 0
    session_id = q_result["session_id"]
    print(f"\n[Live Call Questions from Form]: {len(q_result['questions'])} questions generated for session {session_id}")

    # 4. LIVE CALL PHASE: Record candidate spoken answers in real-time
    q1 = q_result["questions"][0]
    service.record_candidate_answer(
        session_id=session_id,
        question_id=q1["id"],
        question=q1["question"],
        candidate_answer="At Apex Tech, I designed core Python microservices with FastAPI and PostgreSQL, optimizing database latency by 40% and deploying using Docker on AWS."
    )

    if len(q_result["questions"]) > 1:
        q2 = q_result["questions"][1]
        service.record_candidate_answer(
            session_id=session_id,
            question_id=q2["id"],
            question=q2["question"],
            candidate_answer="I have 4 years of experience building backend systems in Bengaluru and prefer Day Shift."
        )

    # 5. END OF CALL PHASE: Finalize interview -> Automatically matches full data across ALL active JDs!
    finalize_res = await service.finalize_candidate_interview(session_id=session_id)
    assert finalize_res["status"] == "COMPLETED"
    assert finalize_res["jobs_matched"] > 0
    print(f"\n[End of Call Full Matching]: Matched {finalize_res['jobs_matched']} job(s) for candidate {cand_id}")

    # Verify that the Python job matched with high score
    matches = db.query(CandidateJobMatch).filter(CandidateJobMatch.candidate_id == cand_id).all()
    assert len(matches) > 0
    
    python_match = next((m for m in matches if m.job_id == job_id_1), None)
    assert python_match is not None
    assert python_match.overall_score >= 70.0
    print(f"   [PASS] Python Job Match Score: {python_match.overall_score}%")

    # 6. Test MCP tool handlers
    tools = MCP_TOOLS
    assert any(t["name"] == "finalize_candidate_interview" for t in tools)
    assert any(t["name"] == "compare_candidate_with_jd" for t in tools)

    mcp_call_res = await handle_tool_call("get_candidate_form_context", {"candidate_id": cand_id})
    assert mcp_call_res["name"] == "Deepak Verma"
    print("   [PASS] MCP tool get_candidate_form_context successfully executed.")
