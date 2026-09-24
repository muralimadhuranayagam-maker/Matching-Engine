import pytest
from backend.app.matching.scoring import ScoringEngine
from backend.app.matching.hard_filters import HardFilterEngine
from backend.app.matching.evidence import EvidenceEngine

def test_hard_filters_experience_pass():
    cand = {"normalized": {"total_experience_years": 4.0, "city": "Mumbai"}}
    jd = {"experience": {"required": True, "minimum_years": 3.0}}
    passed, reason = HardFilterEngine.evaluate(cand, jd)
    assert passed is True

def test_hard_filters_experience_fail():
    cand = {"normalized": {"total_experience_years": 1.0, "city": "Mumbai"}}
    jd = {"experience": {"required": True, "minimum_years": 3.0}}
    passed, reason = HardFilterEngine.evaluate(cand, jd)
    assert passed is False
    assert "Requires minimum 3.0 years" in reason

def test_weighted_scoring():
    engine = ScoringEngine()
    cand = {
        "normalized": {
            "skills": ["C#", ".NET", "SQL Server"],
            "total_experience_years": 4.0,
            "qualification": "Graduate",
            "city": "Mumbai",
            "shift_preference": "Any shift"
        },
        "professional_profile": {"skill_role": ".NET Developer"}
    }
    jd = {
        "job_title": ".NET Developer",
        "skills": {"required": ["C#", "SQL Server"], "preferred": [".NET"]},
        "experience": {"minimum_years": 3.0},
        "education": {"minimum_qualification": "Graduate"},
        "location": {"cities": ["Mumbai"]},
        "shift": {"type": "Any shift"},
        "responsibilities": ["Develop C# .NET Web APIs"]
    }
    result = engine.calculate_score(cand, jd)
    assert result["overall_score"] >= 80.0
    assert result["breakdown"]["skills"] == 100.0
    assert result["breakdown"]["experience"] == 100.0

def test_evidence_generation():
    cand = {"normalized": {"skills": ["C#"], "total_experience_years": 3.0, "city": "Mumbai"}}
    jd = {"skills": {"required": ["C#", "React"]}, "experience": {"minimum_years": 2.0}}
    scoring_res = {"overall_score": 75.0}
    
    ev = EvidenceEngine.generate_evidence(cand, jd, scoring_res)
    assert len(ev["matched_requirements"]) >= 2  # C# match + 3 yrs exp match
    assert len(ev["missing_requirements"]) >= 1  # React missing
