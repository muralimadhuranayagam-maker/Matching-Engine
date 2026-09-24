from typing import Dict, Any, List
from backend.app.services.normalization_service import SkillNormalizer

class EvidenceEngine:
    @staticmethod
    def generate_evidence(candidate: Dict[str, Any], canonical_jd: Dict[str, Any], scoring_result: Dict[str, Any]) -> Dict[str, List[Dict[str, Any]]]:
        norm_cand = candidate.get("normalized", {})
        cand_skills = set(norm_cand.get("skills", []))
        
        matched_items = []
        partial_items = []
        missing_items = []

        # 1. Mandatory Skills
        req_skills = canonical_jd.get("skills", {}).get("required", [])
        cand_skill_list = norm_cand.get("skills", [])
        for skill in req_skills:
            satisfied, evidence_detail = SkillNormalizer.is_skill_satisfied(skill, cand_skill_list)
            if satisfied:
                matched_items.append({
                    "requirement": f"Required Skill: {skill}",
                    "candidate_evidence": evidence_detail,
                    "status": "MATCH"
                })
            else:
                missing_items.append({
                    "requirement": f"Required Skill: {skill}",
                    "candidate_evidence": evidence_detail,
                    "status": "MISSING"
                })

        # 2. Preferred Skills
        pref_skills = canonical_jd.get("skills", {}).get("preferred", [])
        for skill in pref_skills:
            satisfied, evidence_detail = SkillNormalizer.is_skill_satisfied(skill, cand_skill_list)
            if satisfied:
                matched_items.append({
                    "requirement": f"Preferred Skill: {skill}",
                    "candidate_evidence": evidence_detail,
                    "status": "MATCH"
                })
            else:
                partial_items.append({
                    "requirement": f"Preferred Skill: {skill}",
                    "candidate_evidence": f"Preferred skill '{skill}' not present (Optional)",
                    "status": "PARTIAL"
                })

        # 3. Experience Requirement
        jd_exp = canonical_jd.get("experience", {})
        min_exp = float(jd_exp.get("minimum_years") or 0.0)
        max_exp = float(jd_exp.get("maximum_years") or 99.0)
        cand_exp = float(norm_cand.get("total_experience_years", 0.0))

        if min_exp > 0:
            if cand_exp >= min_exp:
                if cand_exp <= max_exp:
                    matched_items.append({
                        "requirement": f"{min_exp}+ years experience required",
                        "candidate_evidence": f"Candidate has {cand_exp} total years of experience",
                        "status": "MATCH"
                    })
                else:
                    partial_items.append({
                        "requirement": f"{min_exp}-{max_exp} years experience required",
                        "candidate_evidence": f"Candidate has {cand_exp} years experience (May be overqualified)",
                        "status": "PARTIAL"
                    })
            elif cand_exp >= min_exp * 0.7:
                partial_items.append({
                    "requirement": f"{min_exp}+ years experience required",
                    "candidate_evidence": f"Candidate has {cand_exp} years experience (Slightly below target)",
                    "status": "PARTIAL"
                })
            else:
                missing_items.append({
                    "requirement": f"{min_exp}+ years experience required",
                    "candidate_evidence": f"Candidate has {cand_exp} years experience",
                    "status": "MISSING"
                })

        # 4. Location Requirement
        jd_cities = canonical_jd.get("location", {}).get("cities", [])
        work_mode = (canonical_jd.get("location", {}).get("work_mode") or "").lower()
        if jd_cities:
            cand_city = norm_cand.get("city", "")
            if work_mode == "remote":
                matched_items.append({
                    "requirement": f"Job Location: Remote",
                    "candidate_evidence": f"Remote work — location not a constraint",
                    "status": "MATCH"
                })
            elif any(c.lower() in cand_city.lower() for c in jd_cities):
                matched_items.append({
                    "requirement": f"Job Location: {', '.join(jd_cities)}",
                    "candidate_evidence": f"Candidate resides in {cand_city}",
                    "status": "MATCH"
                })
            else:
                partial_items.append({
                    "requirement": f"Job Location: {', '.join(jd_cities)}",
                    "candidate_evidence": f"Candidate resides in {cand_city} (Relocation / Remote discussion recommended)",
                    "status": "PARTIAL"
                })

        # 5. Shift Requirement
        jd_shift = canonical_jd.get("shift", {}).get("type", "")
        if jd_shift:
            cand_shift = norm_cand.get("shift_preference", "Any shift")
            is_match = "any" in cand_shift.lower() or jd_shift.lower() in cand_shift.lower()
            matched_items.append({
                "requirement": f"Shift Requirement: {jd_shift}",
                "candidate_evidence": f"Candidate shift preference: {cand_shift}",
                "status": "MATCH" if is_match else "PARTIAL"
            })

        # 6. Communication Requirement
        jd_comm = canonical_jd.get("communication", {})
        jd_min_comm = jd_comm.get("minimum_level", "")
        if jd_min_comm:
            cand_comm = candidate.get("professional_profile", {}).get("english_communication", "")
            comm_hierarchy = {"Poor": 1, "Average": 2, "Good": 3, "Very good": 4, "Excellent": 5}
            cand_level = comm_hierarchy.get(cand_comm, 3)
            jd_level = comm_hierarchy.get(jd_min_comm, 3)

            if cand_level >= jd_level:
                matched_items.append({
                    "requirement": f"English Communication: {jd_min_comm} or above",
                    "candidate_evidence": f"Candidate communication level: {cand_comm}",
                    "status": "MATCH"
                })
            elif cand_level == jd_level - 1:
                partial_items.append({
                    "requirement": f"English Communication: {jd_min_comm} or above",
                    "candidate_evidence": f"Candidate communication level: {cand_comm} (Slightly below requirement)",
                    "status": "PARTIAL"
                })
            else:
                missing_items.append({
                    "requirement": f"English Communication: {jd_min_comm} or above",
                    "candidate_evidence": f"Candidate communication level: {cand_comm}",
                    "status": "MISSING"
                })

        # 7. Education Qualification
        jd_edu = canonical_jd.get("education", {}).get("minimum_qualification", "")
        if jd_edu:
            cand_qual = norm_cand.get("qualification", "10th")
            edu_hierarchy = {"10th": 1, "12th": 2, "Graduate": 3}
            cand_edu_level = edu_hierarchy.get(cand_qual, 1)
            jd_edu_lower = jd_edu.lower()
            
            if "graduate" in jd_edu_lower or "degree" in jd_edu_lower:
                jd_edu_level = 3
            elif "12th" in jd_edu_lower:
                jd_edu_level = 2
            else:
                jd_edu_level = 1

            if cand_edu_level >= jd_edu_level:
                matched_items.append({
                    "requirement": f"Education: {jd_edu}",
                    "candidate_evidence": f"Candidate qualification: {cand_qual}",
                    "status": "MATCH"
                })
            else:
                missing_items.append({
                    "requirement": f"Education: {jd_edu}",
                    "candidate_evidence": f"Candidate qualification: {cand_qual} (Below requirement)",
                    "status": "MISSING"
                })

        # 8. Salary Fit
        jd_salary = canonical_jd.get("salary", {})
        jd_sal_max = jd_salary.get("maximum")
        cand_expected = candidate.get("salary", {}).get("expected_monthly_salary") or candidate.get("job_preferences", {}).get("expected_salary_monthly")
        if jd_sal_max and cand_expected:
            if float(cand_expected) <= float(jd_sal_max):
                matched_items.append({
                    "requirement": f"Salary Budget: up to ₹{jd_sal_max:,}",
                    "candidate_evidence": f"Candidate expects ₹{float(cand_expected):,.0f}/month",
                    "status": "MATCH"
                })
            else:
                partial_items.append({
                    "requirement": f"Salary Budget: up to ₹{jd_sal_max:,}",
                    "candidate_evidence": f"Candidate expects ₹{float(cand_expected):,.0f}/month (Above budget)",
                    "status": "PARTIAL"
                })

        return {
            "matched_requirements": matched_items,
            "partial_requirements": partial_items,
            "missing_requirements": missing_items
        }
