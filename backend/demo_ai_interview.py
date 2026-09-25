import sys
import asyncio
import json
import time

# Ensure UTF-8 output on Windows consoles
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

from sqlalchemy.orm import Session
from backend.app.core.database import SessionLocal, engine, Base
from backend.app.models.candidate import Candidate
from backend.app.models.job import JobDescription
from backend.app.models.match import CandidateJobMatch
from backend.app.models.interview import CandidateInterview
from backend.app.services.interview_service import InterviewService
from backend.app.mcp.interview_server import handle_tool_call

def print_banner(text: str):
    print("\n" + "=" * 75)
    print(f"  {text}")
    print("=" * 75)

async def run_live_demo():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    try:
        print_banner("DEMO: 7-STEP AI INTERVIEW MCP & MATCHING ENGINE PIPELINE")

        # Setup Seed Data
        cand_id = "CAND-DEMO-ROHAN-01"
        db.query(CandidateInterview).filter(CandidateInterview.candidate_id == cand_id).delete()
        db.query(CandidateJobMatch).filter(CandidateJobMatch.candidate_id == cand_id).delete()
        db.query(Candidate).filter(Candidate.candidate_id == cand_id).delete()
        
        job_id = "JOB-DEMO-FINTECH-01"
        db.query(JobDescription).filter(JobDescription.job_id == job_id).delete()
        db.commit()

        # Seed Job Description
        jd_data = {
            "job_title": "Senior Backend API Engineer (Python/FastAPI)",
            "skills": {
                "required": ["Python", "FastAPI", "PostgreSQL", "Microservices"],
                "preferred": ["Docker", "Kubernetes", "Redis", "AWS"]
            },
            "experience": {
                "minimum_years": 3,
                "maximum_years": 6
            },
            "responsibilities": [
                "Build scalable RESTful API services handling high concurrent payment volume",
                "Design and optimize relational PostgreSQL schemas and indexing",
                "Deploy and orchestrate containerized services with Docker"
            ],
            "education": {
                "minimum_qualification": "Graduate"
            },
            "location": {
                "cities": ["Bengaluru"],
                "work_mode": "Hybrid"
            },
            "shift": {
                "type": "Day Shift"
            },
            "salary": {
                "minimum": 80000,
                "maximum": 110000,
                "currency": "INR"
            }
        }
        job = JobDescription(
            job_id=job_id,
            title="Senior Backend API Engineer (Python/FastAPI)",
            original_filename="fintech_backend_jd.pdf",
            file_path="/storage/fintech_backend_jd.pdf",
            file_type="pdf",
            structured_data=jd_data,
            is_active=True,
            processing_status="COMPLETED"
        )
        db.add(job)

        # Seed Candidate Intake Form
        cand_data = {
            "candidate_id": cand_id,
            "personal": {
                "first_name": "Rohan",
                "last_name": "Sharma",
                "gender": "Male"
            },
            "contact": {
                "phone": "9845012345",
                "email": "rohan.sharma@example.com"
            },
            "professional_profile": {
                "work_status": "EXPERIENCED",
                "skill": ["Python", "FastAPI", "PostgreSQL", "Docker", "AWS"],
                "total_experience_months": 42,
                "english_communication": "Excellent",
                "shift_preference": "Day Shift"
            },
            "employment_history": {
                "current": {
                    "company_name": "CloudNine Infotech",
                    "role": "Senior Software Engineer",
                    "take_home_salary": 75000,
                    "process_name": "FinTech Payment APIs"
                }
            },
            "salary": {
                "expected_monthly_salary": 90000
            },
            "address": {
                "current": {
                    "city": "Bengaluru",
                    "area": "Indiranagar",
                    "pincode": "560038"
                }
            }
        }
        candidate = Candidate(
            candidate_id=cand_id,
            candidate_data=cand_data,
            status="ACTIVE"
        )
        db.add(candidate)
        db.commit()

        # ============================================================
        # STEP 1: Request candidate's form data through the MCP
        # ============================================================
        print("\n[STEP 1] Requesting candidate's form data through MCP ('get_candidate_form_context')...")
        form_context = await handle_tool_call("get_candidate_form_context", {"candidate_id": cand_id})
        print(f"   -> Candidate Name: {form_context['name']}")
        print(f"   -> Claimed Skills: {', '.join(form_context['primary_skills'])}")
        print(f"   -> Total Experience: {form_context['total_experience_months']} months ({form_context['total_experience_months']/12:.1f} years)")
        print(f"   -> Current Role & Company: {form_context['current_role']} at {form_context['current_company']}")
        print(f"   -> Expected Salary: Rs. {form_context['expected_salary']:,} / month")
        print(f"   -> Shift Preference: {form_context['shift_preference']} | City: {form_context['city']}")

        # ============================================================
        # STEP 2: AI Interview Agent generates questions using form data
        # ============================================================
        print("\n[STEP 2] AI Interview Agent generates live screening questions tailored to form data...")
        print("         (Note: JD is NOT linked during live call; questions strictly probe candidate's background)")
        q_resp = await handle_tool_call("generate_interview_questions", {"candidate_id": cand_id})
        session_id = q_resp["session_id"]
        questions = q_resp["questions"]
        print(f"   -> Session ID: {session_id}")
        print(f"   -> Generated {len(questions)} Candidate-Tailored Questions:")
        for idx, q in enumerate(questions, 1):
            print(f"      Q{idx} [{q.get('category')}]: {q.get('question')}")

        # ============================================================
        # STEP 3 & 4: Candidate answers questions & answers stored in backend
        # ============================================================
        print("\n[STEP 3 & 4] Candidate answers questions over phone call -> Answers recorded to Backend in real-time...")
        sample_answers = [
            "At CloudNine Infotech, I engineered core FastAPI microservices handling over 5,000 requests/sec, tuned PostgreSQL database queries with composite indices, and deployed via Docker on AWS.",
            "In my 3.5 years of experience, I was responsible for designing API schemas, leading database migrations, and mentoring junior engineers.",
            "When encountering production outages, I inspect AWS CloudWatch logs and metrics, trace database connection pool saturation, and apply hotfixes with automated rollback pipelines.",
            "Yes, I am located in Bengaluru, comfortable with Day Shift, and my expected monthly salary is Rs. 90,000."
        ]

        for idx, q in enumerate(questions):
            ans_text = sample_answers[idx] if idx < len(sample_answers) else "I have direct hands-on production experience in this area."
            save_res = await handle_tool_call("record_candidate_answer", {
                "session_id": session_id,
                "question_id": q["id"],
                "question": q["question"],
                "candidate_answer": ans_text
            })
            print(f"\n   [Question {idx+1}]: {q['question']}")
            print(f"   [Candidate Answer]: \"{ans_text}\"")
            print(f"   -> Backend Status: {save_res['status']} (Total stored answers: {save_res['total_answers_recorded']})")

        # ============================================================
        # STEP 5 & 6: Interview finalized -> Complete JSON data (form + answers) sent to Matching Engine
        # ============================================================
        print("\n[STEP 5 & 6] Call completed -> Candidate's complete JSON data (form + interview transcript)")
        print("             is sent to the Matching Engine to compare against the Job Description (JD)...")
        finalize_res = await handle_tool_call("finalize_candidate_interview", {"session_id": session_id})
        print(f"   -> Finalize Status: {finalize_res['status']}")
        print(f"   -> Matching Run ID: {finalize_res['matching_run_id']}")
        print(f"   -> Jobs Evaluated: {finalize_res['jobs_considered']} | Jobs Matched: {finalize_res['jobs_matched']}")

        # Deep JD-Specific Evaluation Breakdown
        eval_resp = await handle_tool_call("compare_candidate_with_jd", {
            "candidate_id": cand_id,
            "job_id": job_id,
            "session_id": session_id
        })

        # ============================================================
        # STEP 7: System generates final matching/evaluation result
        # ============================================================
        print_banner("STEP 7: FINAL MATCHING & EVALUATION RESULT")
        
        # Query matching result from DB
        match_record = db.query(CandidateJobMatch).filter(
            CandidateJobMatch.candidate_id == cand_id,
            CandidateJobMatch.job_id == job_id
        ).first()

        if match_record:
            print(f"* Target Job: {job.title} ({job_id})")
            print(f"* Overall Matching Fit Score: {match_record.overall_score}% [{match_record.status}]")
            print(f"* Multi-Factor Score Breakdown:")
            for factor, score in (match_record.score_breakdown or {}).items():
                print(f"    - {factor.replace('_', ' ').title():<24}: {score}%")
            
            matched_items = []
            for item in (match_record.matched_requirements or []):
                if isinstance(item, dict):
                    matched_items.append(item.get("requirement", str(item)))
                else:
                    matched_items.append(str(item))
            print(f"* Verified Matched Requirements: {', '.join(matched_items)}")
        
        eval_data = eval_resp.get("evaluation", {})
        print(f"\n* AI Interview Evidence & Evaluation:")
        print(f"    - Competency Score       : {eval_resp.get('interview_score')}%")
        print(f"    - Recommendation         : {eval_data.get('recommendation')}")
        print(f"    - Summary                : {eval_data.get('executive_summary')}")
        print(f"    - Verified Strengths     : {', '.join([str(s) for s in eval_data.get('strengths', [])])}")
        print(f"    - Potential Gaps/Notes   : {', '.join([str(g) for g in eval_data.get('gaps', [])])}")

        print("\n" + "=" * 75)
        print("  ALL 7 STEPS VERIFIED AND COMPLETED SUCCESSFULLY!")
        print("=" * 75 + "\n")

    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(run_live_demo())

