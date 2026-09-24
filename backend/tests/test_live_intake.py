import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.live_intake_normalizer import (
    normalize_field_update,
    sanitize_and_order_updates,
)
from backend.app.services.live_intake_extractor import (
    extract_structured_entities_from_speech,
)

client = TestClient(app)

def test_scenario_1_name_extraction():
    """Test 1: 'My name is Siva.' -> personal.first_name: 'Siva'"""
    updates = extract_structured_entities_from_speech("My name is Siva.")
    assert updates.get("personal.first_name") == "Siva"

def test_scenario_2_experience_extraction():
    """Test 2: 'I have 3 years experience.' -> professional_profile.work_status: 'EXPERIENCED', total_experience_years: 3"""
    updates = extract_structured_entities_from_speech("I have 3 years experience.")
    assert updates.get("professional_profile.work_status") == "EXPERIENCED"
    assert updates.get("professional_profile.total_experience_years") == 3

def test_scenario_3_company_extraction():
    """Test 3: 'I'm working at Infosys.' -> employment_history.current.company_name: 'Infosys'"""
    updates = extract_structured_entities_from_speech("I'm working at Infosys.")
    assert updates.get("employment_history.current.company_name") == "Infosys"
    assert updates.get("professional_profile.work_status") == "EXPERIENCED"

def test_scenario_4_role_extraction():
    """Test 4: 'I'm a .NET developer.' -> professional_profile.skill_role: 'Software Engineer', role: '.NET developer'"""
    updates = extract_structured_entities_from_speech("I'm a .NET developer.")
    assert updates.get("employment_history.current.role") == ".NET developer"
    assert updates.get("professional_profile.skill_role") == "Software Engineer"

def test_scenario_5_compound_multi_field():
    """Test 5: 'I'm a .NET developer at Infosys with 3 years experience.'"""
    updates = extract_structured_entities_from_speech("I'm a .NET developer at Infosys with 3 years experience.")
    assert updates.get("professional_profile.work_status") == "EXPERIENCED"
    assert updates.get("professional_profile.total_experience_years") == 3
    assert updates.get("employment_history.current.company_name") == "Infosys"
    assert ".NET developer" in updates.get("employment_history.current.role", "")
    assert updates.get("professional_profile.skill_role") == "Software Engineer"

def test_scenario_6_skills_array():
    """Test 6: 'I know React and Angular.' -> professional_profile.skill: ['React', 'Angular']"""
    updates = extract_structured_entities_from_speech("I know React and Angular.")
    skills = updates.get("professional_profile.skill")
    assert isinstance(skills, list)
    assert "React" in skills
    assert "Angular" in skills

def test_scenario_7_city_extraction():
    """Test 7: 'I live in Chennai.' -> address.current.city: 'Chennai'"""
    updates = extract_structured_entities_from_speech("I live in Chennai.")
    assert updates.get("address.current.city") == "Chennai"

def test_scenario_8_education_extraction():
    """Test 8: 'I completed B.E. Computer Science in 2024.'"""
    updates = extract_structured_entities_from_speech("I completed B.E. Computer Science in 2024.")
    assert updates.get("education.graduation.degree") == "B.E. Computer Science"
    assert updates.get("education.graduation.passing_year") == "2024"
    assert updates.get("education.graduation.status") == "UG"

def test_scenario_9_shift_preference():
    """Test 9: 'I prefer day shift.' -> job_preferences.shift_base: 'Day shift only'"""
    updates = extract_structured_entities_from_speech("I prefer day shift.")
    assert updates.get("job_preferences.shift_base") == "Day shift only"

def test_scenario_10_correction():
    """Test 10: Correction — previous answer overridden by latest confirmed answer"""
    first_turn = extract_structured_entities_from_speech("I work at Infosys.")
    assert first_turn.get("employment_history.current.company_name") == "Infosys"

    correction_turn = extract_structured_entities_from_speech("Actually, I work at TCS.")
    assert correction_turn.get("employment_history.current.company_name") == "TCS"

def test_scenario_11_and_12_conditional_trigger():
    """Test 11 & 12: Candidate triggers conditional disposition 'Shift Issues' and sub-field"""
    updates = extract_structured_entities_from_speech("I have health issues with shift and cannot work night.")
    assert updates.get("call_disposition") == "Shift Issues"
    assert updates.get("shift_issues_details.preferred_shift_choice") == "Day shift only"

def test_scenario_13_dropdown_option_matching():
    """Test 13: Spoken natural answer automatically maps to exact canonical option"""
    # Natural "experienced" -> canonical "EXPERIENCED"
    path, val, err = normalize_field_update("professional_profile.work_status", "I have 5 years experience in IT")
    assert path == "professional_profile.work_status"
    assert val == "EXPERIENCED"
    assert err is None

    # Natural "rotational shift" -> canonical "Rotational"
    path, val, err = normalize_field_update("job_preferences.shift_base", "rotational")
    assert val == "Rotational"

    # Natural "female" -> canonical "Female"
    path, val, err = normalize_field_update("personal.gender", "female")
    assert val == "Female"

def test_unknown_field_rejection():
    """Test 14: Arbitrary unknown fields are rejected by schema validator"""
    path, val, err = normalize_field_update("arbitrary.hack.field", "malicious_payload")
    assert path is None
    assert err is not None
    assert "Unknown field path" in err

def test_http_bridge_and_websocket():
    """Test 15: End-to-end HTTP speech endpoint and state retrieval"""
    session_id = "test_e2e_session_123"

    # Ingest speech
    resp = client.post(
        f"/api/candidates/live-intake/{session_id}/speech",
        json={"utterance": "My name is Siva and I work at Infosys as a .NET developer with 3 years experience."}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "SUCCESS"
    assert data["applied_updates"]["personal.first_name"] == "Siva"
    assert data["applied_updates"]["employment_history.current.company_name"] == "Infosys"
    assert data["applied_updates"]["professional_profile.work_status"] == "EXPERIENCED"

    # Verify session state endpoint maintains cumulative state
    state_resp = client.get(f"/api/candidates/live-intake/{session_id}/state")
    assert state_resp.status_code == 200
    state_data = state_resp.json()
    assert state_data["state"]["personal.first_name"] == "Siva"
    assert state_data["state"]["employment_history.current.company_name"] == "Infosys"
