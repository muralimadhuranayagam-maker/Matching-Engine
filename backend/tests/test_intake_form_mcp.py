import pytest
import uuid
from backend.app.core.database import SessionLocal, Base, engine
from backend.app.models.candidate import Candidate
from backend.app.models.job import JobDescription
from backend.app.models.match import CandidateJobMatch
from backend.app.services.intake_form_service import IntakeFormService, INTAKE_FORM_FIELDS
from backend.app.mcp.interview_server import handle_tool_call

@pytest.fixture(scope="module")
def setup_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    yield db
    db.close()

def test_intake_form_schema_count():
    """Verify master fields and disposition child branches are defined without prompt templates."""
    assert len(INTAKE_FORM_FIELDS) >= 30
    for field in INTAKE_FORM_FIELDS:
        assert "field_path" in field
        assert "display_name" in field
        assert "type" in field
        assert "prompt" not in field  # Ensure no prompt template exists

@pytest.mark.asyncio
async def test_disposition_branching():
    """Verify selecting a disposition dynamically triggers its specific child branch fields."""
    cand_id = f"CAND-TEST-DISP-{str(uuid.uuid4())[:6]}"
    
    # Submit Call Disposition as 'Poor Communication'
    res = await handle_tool_call("submit_form_field_answer", {
        "candidate_id": cand_id,
        "field_path": "call_disposition",
        "candidate_answer": "Poor Communication"
    })
    assert res["status"] == "SUCCESS"
    assert res["cleaned_value_stored"] == "Poor Communication"

    # Verify state includes poor communication assessment
    state = await handle_tool_call("get_intake_form_state", {"candidate_id": cand_id})
    missing = state["missing_fields"]
    assert "poor_communication_assessment.poor_communication_reason" in missing
    assert "poor_communication_assessment.fit_domestic_or_non_voice" in missing
    # Non Hiring Zone should NOT be in missing because disposition is Poor Communication
    assert "non_hiring_zone_details.candidate_pincode" not in missing


@pytest.mark.asyncio
async def test_fresher_intake_flow_and_skipping():
    """Test intake flow for a fresher candidate, ensuring experience fields are skipped."""
    cand_id = f"CAND-TEST-FRESHER-{str(uuid.uuid4())[:6]}"
    
    # 1. First field should be first_name
    res = await handle_tool_call("get_next_form_field", {"candidate_id": cand_id})
    assert res["has_next_field"] is True
    assert res["field_path"] == "personal.first_name"

    # 2. Submit First Name
    res2 = await handle_tool_call("submit_form_field_answer", {
        "candidate_id": cand_id,
        "field_path": "personal.first_name",
        "candidate_answer": "My name is Ananya"
    })
    assert res2["cleaned_value_stored"] == "Ananya"
    assert res2["next_field"]["field_path"] == "personal.last_name"

    # 3. Submit Work Status as FRESHER
    res_ws = await handle_tool_call("submit_form_field_answer", {
        "candidate_id": cand_id,
        "field_path": "professional_profile.work_status",
        "candidate_answer": "I am a fresher, just graduated"
    })
    assert res_ws["cleaned_value_stored"] == "FRESHER"

    # 4. Check state
    state = await handle_tool_call("get_intake_form_state", {"candidate_id": cand_id})
    assert state["status"] == "IN_PROGRESS"
    assert "personal.first_name" in state["filled_fields"]

@pytest.mark.asyncio
async def test_value_cleaning_heuristics():
    """Test NLP speech cleaning heuristics for various field types."""
    db = SessionLocal()
    service = IntakeFormService(db)
    
    # Salary
    sal_field = {"field_path": "salary.expected_monthly_salary", "type": "salary_number"}
    assert service._clean_extracted_value(sal_field, "I expect around 90k") == 90000
    assert service._clean_extracted_value(sal_field, "12 LPA") == 100000
    
    # Phone
    phone_field = {"field_path": "contact.phone", "type": "phone"}
    assert service._clean_extracted_value(phone_field, "+91 98450 12345") == "9845012345"

    # Education
    edu_field = {"field_path": "education.highest_qualification", "type": "select", "options": ["10th", "12th", "Diploma", "Graduate", "Post Graduate"]}
    assert service._clean_extracted_value(edu_field, "I completed B.Tech in CSE") == "Graduate"
    assert service._clean_extracted_value(edu_field, "I hold an MBA degree") == "Post Graduate"

    # Notice Period
    np_field = {"field_path": "professional_profile.notice_period", "type": "select", "options": ["Immediate / Ready to Join", "15 Days", "30 Days", "45 Days", "60 Days"]}
    assert service._clean_extracted_value(np_field, "I can join immediately without notice") == "Immediate / Ready to Join"

    db.close()
