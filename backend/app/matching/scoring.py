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

        # ============================================================
        # 1. Skills Score (30%)
        # ============================================================
        jd_skills = canonical_jd.get("skills", {})
        cand_skill_list = norm_cand.get("skills", [])
        req_skills_raw = jd_skills.get("required", [])
        pref_skills_raw = jd_skills.get("preferred", [])

        matched_req = []
        missing_req = []
        for req in req_skills_raw:
            satisfied, _ = SkillNormalizer.is_skill_satisfied(req, cand_skill_list)
            if not satisfied:
                # Semantic fallback: use embedding similarity
                sim = self._best_skill_similarity(req, cand_skill_list)
                if sim >= 0.72:
                    satisfied = True
            if satisfied:
                matched_req.append(req)
            else:
                missing_req.append(req)

        matched_pref = []
        for pref in pref_skills_raw:
            satisfied, _ = SkillNormalizer.is_skill_satisfied(pref, cand_skill_list)
            if not satisfied:
                sim = self._best_skill_similarity(pref, cand_skill_list)
                if sim >= 0.72:
                    satisfied = True
            if satisfied:
                matched_pref.append(pref)

        if req_skills_raw:
            skills_score = (len(matched_req) / len(req_skills_raw)) * 100.0
            if pref_skills_raw and len(matched_pref) > 0:
                skills_score = min(100.0, skills_score + (len(matched_pref) / len(pref_skills_raw)) * 15.0)
        else:
            skills_score = 85.0 if cand_skill_list else 60.0

        # ============================================================
        # 2. Relevant Experience Score (25%)
        # ============================================================
        jd_exp = canonical_jd.get("experience", {})
        min_exp = float(jd_exp.get("minimum_years") or 0.0)
        max_exp = float(jd_exp.get("maximum_years") or 99.0)
        cand_exp = float(norm_cand.get("total_experience_years", 0.0))

        if min_exp == 0:
            exp_score = 100.0
        elif cand_exp >= min_exp:
            if cand_exp <= max_exp:
                exp_score = 100.0
            else:
                # Overqualified: slight penalty
                exp_score = max(75.0, 100.0 - (cand_exp - max_exp) * 5)
        elif cand_exp >= min_exp * 0.75:
            exp_score = 80.0
        elif cand_exp >= min_exp * 0.5:
            exp_score = 60.0
        else:
            exp_score = 30.0

        # ============================================================
        # 3. Role / Responsibilities Semantic Match (15%)
        # ============================================================
        resp_text = " ".join(canonical_jd.get("responsibilities", []) + canonical_jd.get("role_requirements", []))
        cand_prof = candidate.get("professional_profile", {})
        
        # Build richer candidate text from form data
        cand_parts = [
            cand_prof.get('skill_role', ''),
            cand_prof.get('skill', '') if isinstance(cand_prof.get('skill'), str) else ', '.join(cand_prof.get('skill', [])),
            cand_prof.get('industry', ''),
        ]
        # Include current employment details
        curr_emp = candidate.get("employment_history", {}).get("current", {})
        if curr_emp.get("role"):
            cand_parts.append(curr_emp["role"])
        if curr_emp.get("process_name"):
            cand_parts.append(curr_emp["process_name"])
        # Include previous company roles
        for comp in candidate.get("employment_history", {}).get("previous_companies", []):
            if comp.get("role"):
                cand_parts.append(comp["role"])
        
        cand_resp_text = " ".join(filter(None, cand_parts))
        
        if resp_text and cand_resp_text:
            sim_val = self.embedder.calculate_similarity(cand_resp_text, resp_text)
            resp_score = round(max(40.0, min(100.0, sim_val * 120.0)), 1)
        else:
            resp_score = 70.0

        # ============================================================
        # 4. Education Score (10%)
        # ============================================================
        jd_edu = canonical_jd.get("education", {}).get("minimum_qualification", "").lower()
        cand_edu = norm_cand.get("qualification", "").lower()
        
        edu_hierarchy = {"10th": 1, "12th": 2, "graduate": 3}
        cand_level = edu_hierarchy.get(cand_edu, 1)
        
        if not jd_edu or "10th" in jd_edu or "any" in jd_edu:
            edu_score = 100.0
        elif "12th" in jd_edu:
            jd_level = 2
            edu_score = 100.0 if cand_level >= jd_level else 40.0
        elif "graduate" in jd_edu or "degree" in jd_edu or "ug" in jd_edu or "pg" in jd_edu:
            jd_level = 3
            edu_score = 100.0 if cand_level >= jd_level else 40.0
        else:
            edu_score = 85.0

        # ============================================================
        # 5. Location Score (5%)
        # ============================================================
        jd_cities = [c.lower() for c in canonical_jd.get("location", {}).get("cities", []) if c]
        cand_city = (norm_cand.get("city") or "").lower()
        work_mode = (canonical_jd.get("location", {}).get("work_mode") or "").lower()

        if work_mode == "remote" or not jd_cities:
            loc_score = 100.0
        elif cand_city and any(c in cand_city or cand_city in c for c in jd_cities):
            loc_score = 100.0
        elif work_mode == "hybrid":
            loc_score = 60.0
        else:
            loc_score = 40.0

        # ============================================================
        # 6. Communication Score (5%) — NEW
        # ============================================================
        jd_comm = canonical_jd.get("communication", {})
        jd_min_comm = (jd_comm.get("minimum_level") or "").lower()
        cand_comm = (cand_prof.get("english_communication") or "").lower()

        comm_hierarchy = {"poor": 1, "average": 2, "good": 3, "very good": 4, "excellent": 5}
        cand_comm_level = comm_hierarchy.get(cand_comm, 3)

        if not jd_min_comm or jd_min_comm not in comm_hierarchy:
            comm_score = 100.0
        else:
            jd_comm_level = comm_hierarchy[jd_min_comm]
            if cand_comm_level >= jd_comm_level:
                comm_score = 100.0
            elif cand_comm_level == jd_comm_level - 1:
                comm_score = 70.0
            else:
                comm_score = 40.0

        # ============================================================
        # 7. Shift Score (5%)
        # ============================================================
        jd_shift = (canonical_jd.get("shift", {}).get("type") or "").lower()
        cand_shift = (norm_cand.get("shift_preference") or "").lower()

        if not jd_shift or "any shift" in jd_shift or "any shift" in cand_shift:
            shift_score = 100.0
        elif jd_shift in cand_shift or cand_shift in jd_shift:
            shift_score = 100.0
        elif "rotational" in cand_shift:
            shift_score = 85.0
        else:
            shift_score = 50.0

        # ============================================================
        # 8. Salary Fit Score (5%) — NEW
        # ============================================================
        jd_salary = canonical_jd.get("salary", {})
        jd_sal_max = jd_salary.get("maximum")
        jd_sal_min = jd_salary.get("minimum")
        cand_expected = candidate.get("salary", {}).get("expected_monthly_salary") or candidate.get("job_preferences", {}).get("expected_salary_monthly")

        if not jd_sal_max or not cand_expected:
            salary_score = 90.0  # No data to compare
        else:
            jd_sal_max = float(jd_sal_max)
            cand_expected = float(cand_expected)
            if cand_expected <= jd_sal_max:
                salary_score = 100.0
            elif jd_sal_min and cand_expected <= float(jd_sal_min) * 1.2:
                salary_score = 75.0
            elif cand_expected <= jd_sal_max * 1.3:
                salary_score = 60.0
            else:
                salary_score = 35.0

        # ============================================================
        # Apply Configurable Weights
        # ============================================================
        w_skills = settings.WEIGHT_SKILLS
        w_exp = settings.WEIGHT_EXPERIENCE
        w_resp = settings.WEIGHT_RESPONSIBILITIES
        w_edu = settings.WEIGHT_EDUCATION
        w_loc = settings.WEIGHT_LOCATION
        w_shift = settings.WEIGHT_SHIFT
        w_other = settings.WEIGHT_OTHER  # Now used for communication + salary

        # Split "other" weight into communication (2.5%) and salary (2.5%)
        w_comm = w_other / 2.0
        w_salary = w_other / 2.0

        total_weight = w_skills + w_exp + w_resp + w_edu + w_loc + w_shift + w_comm + w_salary

        overall = (
            (skills_score * w_skills) +
            (exp_score * w_exp) +
            (resp_score * w_resp) +
            (edu_score * w_edu) +
            (loc_score * w_loc) +
            (shift_score * w_shift) +
            (comm_score * w_comm) +
            (salary_score * w_salary)
        ) / total_weight

        overall_score = round(overall, 1)

        breakdown = {
            "skills": round(skills_score, 1),
            "experience": round(exp_score, 1),
            "role_responsibilities": round(resp_score, 1),
            "education": round(edu_score, 1),
            "location": round(loc_score, 1),
            "shift": round(shift_score, 1),
            "communication": round(comm_score, 1),
            "salary_fit": round(salary_score, 1),
        }

        return {
            "overall_score": overall_score,
            "breakdown": breakdown,
            "matched_req_skills": matched_req,
            "matched_pref_skills": matched_pref,
            "missing_skills": missing_req
        }

    def _best_skill_similarity(self, required_skill: str, candidate_skills: list) -> float:
        """
        Find the best semantic similarity between a required skill and all candidate skills.
        Used as a fallback when rule-based matching fails.
        """
        if not required_skill or not candidate_skills:
            return 0.0
        best = 0.0
        for cand_skill in candidate_skills:
            sim = self.embedder.calculate_skill_similarity(required_skill, cand_skill)
            if sim > best:
                best = sim
            if best >= 0.85:
                break  # Early exit for strong matches
        return best
