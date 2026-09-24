import pytest
from backend.app.services.normalization_service import SkillNormalizer, CandidateNormalizer

def test_skill_normalization():
    assert SkillNormalizer.normalize_skill("C Sharp") == "C#"
    assert SkillNormalizer.normalize_skill("csharp") == "C#"
    assert SkillNormalizer.normalize_skill("React.js") == "React"
    assert SkillNormalizer.normalize_skill("ASP.NET Core") == "ASP.NET Core"
    assert ".NET" in SkillNormalizer.get_all_implied_skills(["ASP.NET Core"])

def test_candidate_normalization():
    cand_data = {
        "candidate_id": "CAND-TEST1234",
        "personal": {"first_name": "Rahul", "last_name": "Sharma"},
        "professional_profile": {
            "total_experience_years": 3,
            "total_experience_months": 6,
            "skill": "C Sharp",
            "skill_role": "Software Engineer"
        },
        "education": {
            "graduation": {"status": "UG"}
        },
        "address": {
            "current": {"city": "Mumbai"}
        }
    }
    norm = CandidateNormalizer.normalize(cand_data)
    assert norm["name"] == "Rahul Sharma"
    assert norm["total_experience_years"] == 3.5
    assert "C#" in norm["skills"]
    assert norm["qualification"] == "Graduate"
    assert norm["city"] == "Mumbai"
