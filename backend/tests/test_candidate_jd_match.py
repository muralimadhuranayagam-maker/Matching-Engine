import httpx
import json
import time

def test_form_fill_and_match():
    payload = {
        "personal": {
            "first_name": "Siva",
            "last_name": "Kumar",
            "gender": "Male",
            "date_of_birth": "15-05-1998",
            "age": 26,
            "marital_status": "Single",
            "mother_tongue": "Tamil",
            "knowledge_of_hindi": "Good - I may have some difficulty understanding certain Hindi accents"
        },
        "contact": {
            "phone": "9876543210",
            "email": "siva.kumar@example.com"
        },
        "address": {
            "current": {
                "address_line": "12 Anna Salai",
                "pincode": "600002",
                "area": "Guindy",
                "city": "Chennai",
                "state": "Tamil Nadu"
            },
            "permanent": {
                "address_line": "12 Anna Salai",
                "pincode": "600002",
                "area": "Guindy",
                "city": "Chennai",
                "state": "Tamil Nadu"
            }
        },
        "education": {
            "tenth": {
                "school_name": "Govt Higher Secondary School",
                "status": "Completed",
                "passing_year": "2014",
                "percentage": 85.0
            },
            "twelfth": {
                "school_or_college_name": "Govt Higher Secondary School",
                "status": "Completed",
                "passing_year": "2016",
                "percentage": 82.0
            },
            "graduation": {
                "college_name": "Anna University",
                "university_name": "Anna University",
                "degree": "B.E. Computer Science",
                "status": "UG",
                "passing_year": "2020",
                "percentage": 80.0
            }
        },
        "professional_profile": {
            "work_status": "EXPERIENCED",
            "total_experience_years": 3,
            "total_experience_months": 0,
            "total_companies": 1,
            "skill_role": "Software Engineer",
            "skill": ["C#", ".NET Core", "React", "Angular", "SQL", "JavaScript"],
            "industry": "Information Technology",
            "english_communication": "Fluent"
        },
        "employment_history": {
            "current": {
                "company_name": "Infosys",
                "role": ".NET Developer",
                "process_name": "Software Development",
                "skill": "C#, ASP.NET, React",
                "joining_date": "01-07-2021",
                "monthly_salary": 55000.0,
                "notice_period": "30 Days",
                "reason_for_leaving": "Career Growth"
            }
        },
        "job_preferences": {
            "job_city": "Chennai",
            "preferred_area": "OMR, Guindy",
            "shift_base": "Day shift only",
            "work_from_home": False,
            "expected_salary_monthly": 65000.0
        },
        "salary": {
            "current_monthly_salary": 55000.0,
            "expected_monthly_salary": 65000.0
        },
        "call_disposition": "Lineup Scheduled"
    }

    client = httpx.Client(base_url="http://127.0.0.1:8000", timeout=30.0)

    # 1. Post filled form to create candidate
    print("\n[Step 1] Submitting candidate intake form...")
    resp = client.post("/api/candidates", json=payload)
    print("Response status:", resp.status_code)
    data = resp.json()
    print("Response data:", json.dumps(data, indent=2))
    assert resp.status_code == 201
    candidate_id = data["candidate_id"]

    # 2. Wait for matching pipeline to complete in background
    print(f"\n[Step 2] Candidate created ({candidate_id}). Checking matches against JDs...")
    matched = False
    for attempt in range(1, 15):
        time.sleep(1.5)
        matches_resp = client.get(f"/api/candidates/{candidate_id}/matches")
        assert matches_resp.status_code == 200
        matches_data = matches_resp.json()
        total = matches_data.get("total_matches", 0)
        
        if total > 0:
            matched = True
            print(f"\nSUCCESS: Found {total} matching JDs for candidate {candidate_id}!")
            for idx, m in enumerate(matches_data["matches"], 1):
                print(f"\n--- Match #{idx} ---")
                print(f"Job ID: {m.get('job_id')}")
                print(f"Job Title: {m.get('job_title')}")
                print(f"Overall Score: {m.get('overall_score')}%")
                print(f"Status: {m.get('status')}")
                print(f"Score Breakdown: {json.dumps(m.get('score_breakdown'), indent=2)}")
                print(f"Matched Requirements: {m.get('matched_requirements')}")
                print(f"Missing Requirements: {m.get('missing_requirements')}")
            break
        else:
            print(f"Attempt {attempt}: Matching pipeline still running, waiting...")

    if not matched:
        print("No matches produced within timeout. Triggering manual rematch...")
        client.post(f"/api/candidates/{candidate_id}/match")
        time.sleep(3)
        res = client.get(f"/api/candidates/{candidate_id}/matches")
        print("Matches after rematch:", res.json())

if __name__ == "__main__":
    test_form_fill_and_match()
