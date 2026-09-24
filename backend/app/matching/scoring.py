from typing import Dict, Any
from backend.app.core.config import settings
from backend.app.services.normalization_service import SkillNormalizer
from backend.app.ai.embeddings import EmbeddingProvider

class ScoringEngine:
    def __init__(self, embedding_provider=None):
        self.embedder = embedding_provider or EmbeddingProvider()

    def calculate_score(self, candidate: Dict[str, Any], canonical_jd: Dict[str, Any]) -> Dict[str, Any]:
        norm_cand = candidate.get("normalized", {})
        cand_skills = set(norm_cand.get("skills", []))

        # 1. Skills Score (35%)
        jd_skills = canonical_jd.get("skills", {})
        cand_skill_list = norm_cand.get("skills", [])
        req_skills_raw = jd_skills.get("required", [])
        pref_skills_raw = jd_skills.get("preferred", [])

        matched_req = []
        missing_req = []
        for req in req_skills_raw:
            satisfied, _ = SkillNormalizer.is_skill_satisfied(req, cand_skill_list)
            if satisfied:
                matched_req.append(req)
            else:
                missing_req.append(req)

        matched_pref = []
        for pref in pref_skills_raw:
            satisfied, _ = SkillNormalizer.is_skill_satisfied(pref, cand_skill_list)
            if satisfied:
                matched_pref.append(pref)

        if req_skills_raw:
            skills_score = (len(matched_req) / len(req_skills_raw)) * 100.0
            if pref_skills_raw and len(matched_pref) > 0:
                skills_score = min(100.0, skills_score + (len(matched_pref) / len(pref_skills_raw)) * 15.0)
        else:
            skills_score = 85.0 if cand_skill_list else 60.0

        # 2. Relevant Experience Score (25%)
        jd_exp = canonical_jd.get("experience", {})
        min_exp = float(jd_exp.get("minimum_years") or 0.0)
        cand_exp = float(norm_cand.get("total_experience_years", 0.0))

        if min_exp == 0:
            exp_score = 100.0
        elif cand_exp >= min_exp:
            exp_score = 100.0
        elif cand_exp >= min_exp * 0.75:
            exp_score = 80.0
        elif cand_exp >= min_exp * 0.5:
            exp_score = 60.0
        else:
            exp_score = 30.0

        # 3. Role / Responsibilities Semantic Match Score (15%)
        resp_text = " ".join(canonical_jd.get("responsibilities", []) + canonical_jd.get("role_requirements", []))
        cand_prof = candidate.get("professional_profile", {})
        cand_resp_text = f"{cand_prof.get('skill_role', '')} {cand_prof.get('skill', '')} {cand_prof.get('industry', '')}"
        
        sim_val = self.embedder.calculate_similarity(cand_resp_text, resp_text)
        resp_score = round(max(50.0, min(100.0, sim_val * 100.0 + 40.0)), 1)

        # 4. Education Score (10%)
        jd_edu = canonical_jd.get("education", {}).get("minimum_qualification", "").lower()
        cand_edu = norm_cand.get("qualification", "").lower()
        
        if not jd_edu or "10th" in jd_edu:
            edu_score = 100.0
        elif "12th" in jd_edu and cand_edu in ["12th", "graduate"]:
            edu_score = 100.0
        elif "graduate" in jd_edu or "degree" in jd_edu or "ug" in jd_edu or "pg" in jd_edu:
            edu_score = 100.0 if cand_edu == "graduate" else 50.0
        else:
            edu_score = 85.0

        # 5. Location Score (5%)
        jd_cities = [c.lower() for c in canonical_jd.get("location", {}).get("cities", []) if c]
        cand_city = (norm_cand.get("city") or "").lower()
        work_mode = (canonical_jd.get("location", {}).get("work_mode") or "").lower()

        if work_mode == "remote" or not jd_cities:
            loc_score = 100.0
        elif cand_city and any(c in cand_city or cand_city in c for c in jd_cities):
            loc_score = 100.0
        else:
            loc_score = 50.0

        # 6. Shift Score (5%)
        jd_shift = (canonical_jd.get("shift", {}).get("type") or "").lower()
        cand_shift = (norm_cand.get("shift_preference") or "").lower()

        if not jd_shift or "any shift" in jd_shift or "any shift" in cand_shift:
            shift_score = 100.0
        elif jd_shift in cand_shift or cand_shift in jd_shift:
            shift_score = 100.0
        else:
            shift_score = 70.0

        # 7. Other Requirements Score (5%)
        other_score = 90.0

        # Apply Weights
        w_skills = settings.WEIGHT_SKILLS
        w_exp = settings.WEIGHT_EXPERIENCE
        w_resp = settings.WEIGHT_RESPONSIBILITIES
        w_edu = settings.WEIGHT_EDUCATION
        w_loc = settings.WEIGHT_LOCATION
        w_shift = settings.WEIGHT_SHIFT
        w_other = settings.WEIGHT_OTHER

        total_weight = w_skills + w_exp + w_resp + w_edu + w_loc + w_shift + w_other

        overall = (
            (skills_score * w_skills) +
            (exp_score * w_exp) +
            (resp_score * w_resp) +
            (edu_score * w_edu) +
            (loc_score * w_loc) +
            (shift_score * w_shift) +
            (other_score * w_other)
        ) / total_weight

        overall_score = round(overall, 1)

        breakdown = {
            "skills": round(skills_score, 1),
            "experience": round(exp_score, 1),
            "role_responsibilities": round(resp_score, 1),
            "education": round(edu_score, 1),
            "location": round(loc_score, 1),
            "shift": round(shift_score, 1),
            "other": round(other_score, 1)
        }

        return {
            "overall_score": overall_score,
            "breakdown": breakdown,
            "matched_req_skills": matched_req,
            "matched_pref_skills": matched_pref,
            "missing_skills": missing_req
        }
