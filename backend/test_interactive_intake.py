"""
Interactive Intake Form CLI Tester for SnapServe Voice Agent Simulation
Allows you to simulate the live candidate call turn-by-turn directly in your terminal.
"""

import asyncio
import sys

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

from backend.app.core.database import SessionLocal, Base, engine
from backend.app.mcp.interview_server import handle_tool_call

def print_header(title: str):
    print("\n" + "=" * 75)
    print(f"  {title}")
    print("=" * 75)

async def main():
    Base.metadata.create_all(bind=engine)
    print_header("JOB-SHOP CANDIDATE INTAKE FORM — LIVE INTERACTIVE TESTER")
    
    cand_id = input("\nEnter Candidate ID (or press Enter for default 'CAND-TEST-USER-01'): ").strip()
    if not cand_id:
        cand_id = "CAND-TEST-USER-01"

    print(f"\n[OK] Starting intake session for Candidate ID: {cand_id}")
    print("Type your answers as a candidate would speak over the phone.")
    print("Type 'exit' to quit anytime.\n")

    turn = 1
    while True:
        # Step 1: Get next unfilled field metadata
        next_res = await handle_tool_call("get_next_form_field", {"candidate_id": cand_id})

        if not next_res.get("has_next_field"):
            print("\n" + "*" * 75)
            print(f" ALL FORM FIELDS COLLECTED! (Progress: {next_res.get('progress_percentage', 100)}%)")
            print("*" * 75)
            break

        field_path = next_res["field_path"]
        display_name = next_res["display_name"]
        field_type = next_res["field_type"]
        description = next_res["description"]
        options = next_res.get("options", [])
        progress = next_res.get("progress_percentage", 0.0)

        print(f"\n--- [Turn {turn}] [Form Progress: {progress}%] ---")
        print(f"  Field Path   : {field_path}")
        print(f"  Field Name   : {display_name} ({field_type})")
        print(f"  Description  : {description}")
        if options:
            print(f"  Options      : {', '.join(options)}")
        
        # Step 2: User enters spoken response
        user_input = input(f"\n>> Speak/Type answer for '{display_name}': ").strip()
        if user_input.lower() == "exit":
            print("\nExiting session...")
            return

        # Step 3: Submit to MCP tool
        submit_res = await handle_tool_call("submit_form_field_answer", {
            "candidate_id": cand_id,
            "field_path": field_path,
            "candidate_answer": user_input
        })

        stored_val = submit_res["cleaned_value_stored"]
        print(f"  [SAVED TO DB] Stored Clean Value: {repr(stored_val)}")
        turn += 1

    # Step 4: Run Matching Engine
    run_matching = input("\nRun Matching Engine across all active JDs now? (Y/n): ").strip().lower()
    if run_matching in ["", "y", "yes"]:
        print("\n[MATCHING] Running Matching Engine across all active Job Descriptions...")
        match_res = await handle_tool_call("complete_and_match_form", {"candidate_id": cand_id})
        
        print_header("MATCHING ENGINE EVALUATION RESULT")
        print(f"Run ID          : {match_res.get('matching_run_id')}")
        print(f"Jobs Evaluated  : {match_res.get('jobs_evaluated')}")
        print(f"Jobs Matched    : {match_res.get('jobs_matched')}")

        top_matches = match_res.get("top_job_matches", [])
        if top_matches:
            print("\nTop Matching Job:")
            top = top_matches[0]
            print(f"  Job Title     : {top['job_title']} ({top['job_id']})")
            print(f"  Overall Score : {top['overall_score']}% [{top['status']}]")
            print(f"  Score Detail  : {top['score_breakdown']}")
        else:
            print("\nNo matching jobs found for this candidate profile.")

if __name__ == "__main__":
    asyncio.run(main())
