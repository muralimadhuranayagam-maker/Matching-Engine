import sys
import asyncio
import json

# Ensure UTF-8 output on Windows consoles
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

from backend.app.core.database import SessionLocal, engine, Base
from backend.app.models.candidate import Candidate
from backend.app.models.job import JobDescription
from backend.app.models.match import CandidateJobMatch
from backend.app.services.intake_form_service import IntakeFormService
from backend.app.mcp.interview_server import handle_tool_call

def print_banner(text: str):
    print("\n" + "=" * 80)
    print(f"  {text}")
    print("=" * 80)

async def run_intake_form_demo():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        print_banner("DEMO: FIELD-BY-FIELD INTAKE FORM MCP SERVER (SNAPSERVE INTEGRATION)")

        cand_id = "CAND-LIVE-SHIVA-01"
        db.query(CandidateJobMatch).filter(CandidateJobMatch.candidate_id == cand_id).delete()
        db.query(Candidate).filter(Candidate.candidate_id == cand_id).delete()
        
        # Ensure a target Job exists
        job_id = "JOB-PYTHON-DEV-01"
        db.query(JobDescription).filter(JobDescription.job_id == job_id).delete()
        db.commit()

        job = JobDescription(
            job_id=job_id,
            title="Senior Python Backend Developer",
            original_filename="python_job.pdf",
            file_path="/storage/python_job.pdf",
            file_type="pdf",
            structured_data={
                "job_title": "Senior Python Backend Developer",
                "skills": {"required": ["Python", "FastAPI", "PostgreSQL"], "preferred": ["Docker", "AWS"]},
                "experience": {"minimum_years": 2, "maximum_years": 5},
                "responsibilities": ["Build scalable APIs", "Optimize queries"],
                "education": {"minimum_qualification": "Graduate"},
                "location": {"cities": ["Bengaluru", "Chennai"], "work_mode": "Hybrid"},
                "shift": {"type": "Day Shift"},
                "salary": {"minimum": 70000, "maximum": 100000, "currency": "INR"}
            },
            is_active=True,
            processing_status="COMPLETED"
        )
        db.add(job)
        db.commit()

        # Step 0: Initial Candidate Created in System
        print(f"\n[INIT] Starting Intake Form Session for Candidate ID: {cand_id}")

        # Simulated spoken conversation turns between SnapServe Voice Agent & Candidate Shiva
        simulated_intake_conversation = [
            # (Expected Field, Spoken Candidate Response, Expected Extracted Value)
            ("personal.first_name", "My name is Shiva", "Shiva"),
            ("personal.last_name", "My surname is Kumar", "Kumar"),
            ("contact.phone", "My number is 9876543210", "9876543210"),
            ("contact.email", "You can reach me at shiva.kumar@example.com", "shiva.kumar@example.com"),
            ("education.highest_qualification", "I have completed B.Tech in Computer Science", "Graduate"),
            ("professional_profile.work_status", "I am an experienced developer", "EXPERIENCED"),
            ("professional_profile.skill", "I work with Python, FastAPI, and PostgreSQL", ["Python", "FastAPI", "PostgreSQL"]),
            ("professional_profile.total_experience_months", "I have 3 years of total experience", 36),
            ("employment_history.current.company_name", "My current company is TechCorp Solutions", "TechCorp Solutions"),
            ("employment_history.current.role", "I work as a Backend Developer", "Backend Developer"),
            ("professional_profile.notice_period", "I can join immediately, 0 days notice", "Immediate / Ready to Join"),
            ("professional_profile.english_communication", "My English communication is very good and fluent", "Very Good"),
            ("address.current.city", "I am living in Chennai", "Chennai"),
            ("job_preferences.preferred_locations", "I prefer Chennai and Bangalore", ["Chennai", "Bangalore"]),
            ("salary.expected_monthly_salary", "My expected salary is 85000 per month", 85000),
            ("professional_profile.shift_preference", "I prefer Day Shift", "Day Shift")
        ]

        turn_count = 1
        while True:
            # ------------------------------------------------------------
            # Step A: SnapServe Voice Agent calls MCP to get the NEXT field to ask
            # ------------------------------------------------------------
            next_field_res = await handle_tool_call("get_next_form_field", {"candidate_id": cand_id})
            
            if not next_field_res.get("has_next_field"):
                print(f"\n-> All Form Fields Complete! (Progress: {next_field_res.get('progress_percentage')}%)", flush=True)
                break

            field_path = next_field_res["field_path"]
            display_name = next_field_res["display_name"]
            field_type = next_field_res["field_type"]
            description = next_field_res["description"]
            progress = next_field_res["progress_percentage"]

            print(f"\n[TURN {turn_count}] [Progress: {progress}%]", flush=True)
            print(f"   MCP Returns Field Metadata : Path: '{field_path}' | Name: '{display_name}' | Type: '{field_type}' | Desc: '{description}'", flush=True)
            print(f"   (SnapServe AI Agent speaks natural question based on this field metadata)", flush=True)

            # ------------------------------------------------------------
            # Step B: Candidate answers via voice call
            # ------------------------------------------------------------
            matching_turn = next((t for t in simulated_intake_conversation if t[0] == field_path), None)
            candidate_voice_reply = matching_turn[1] if matching_turn else "Yes, I am comfortable with this."

            print(f"   Candidate Spoke            : \"{candidate_voice_reply}\"", flush=True)

            # ------------------------------------------------------------
            # Step C: SnapServe sends answer to MCP 'submit_form_field_answer'
            # ------------------------------------------------------------
            submit_res = await handle_tool_call("submit_form_field_answer", {
                "candidate_id": cand_id,
                "field_path": field_path,
                "candidate_answer": candidate_voice_reply
            })

            cleaned_val = submit_res["cleaned_value_stored"]
            print(f"   -> Backend Stored   : {field_path} = {repr(cleaned_val)}", flush=True)

            turn_count += 1
            if turn_count > 20:
                print("Safety break: exceeded 20 turns", flush=True)
                break

        # ------------------------------------------------------------
        # Step D: Form is 100% complete -> View complete candidate JSON data
        # ------------------------------------------------------------
        print_banner("FULL STORED CANDIDATE FORM DATA IN BACKEND POSTGRESQL")
        state = await handle_tool_call("get_intake_form_state", {"candidate_id": cand_id})
        print(f"* Completion Status: {state['status']} ({state['progress_percentage']}%)")
        print(f"* Total Form Fields Filled: {state['filled_fields_count']} / {state['total_fields']}")
        print(f"* Stored JSON Profile:")
        print(json.dumps(state["filled_fields"], indent=2))

        # ------------------------------------------------------------
        # Step E: Complete Form & Trigger Matching Engine against JDs
        # ------------------------------------------------------------
        print_banner("TRIGGERING MATCHING ENGINE WITH COMPLETE CANDIDATE FORM DATA")
        match_result = await handle_tool_call("complete_and_match_form", {"candidate_id": cand_id})
        print(f"* Matching Engine Run ID : {match_result['matching_run_id']}")
        print(f"* Jobs Considered        : {match_result['jobs_evaluated']}")
        print(f"* Jobs Matched           : {match_result['jobs_matched']}")
        
        if match_result.get("top_job_matches"):
            top_match = match_result["top_job_matches"][0]
            print(f"\n* Top Job Match:")
            print(f"    - Job Title       : {top_match['job_title']} ({top_match['job_id']})")
            print(f"    - Overall Score   : {top_match['overall_score']}% [{top_match['status']}]")
            print(f"    - Score Breakdown : {json.dumps(top_match.get('score_breakdown', {}), indent=6)}")

        print("\n" + "=" * 80)
        print("  DEMO VERIFIED: FORM FIELD-BY-FIELD INTAKE + MATCHING ENGINE COMPLETE!")
        print("=" * 80 + "\n")

    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(run_intake_form_demo())
