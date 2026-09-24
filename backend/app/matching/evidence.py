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
        cand_exp = float(norm_cand.get("total_experience_years", 0.0))

        if min_exp > 0:
            if cand_exp >= min_exp:
                matched_items.append({
                    "requirement": f"{min_exp}+ years experience required",
                    "candidate_evidence": f"Candidate has {cand_exp} total years of experience",
                    "status": "MATCH"
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
        if jd_cities:
            cand_city = norm_cand.get("city", "")
            if any(c.lower() in cand_city.lower() for c in jd_cities):
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
            matched_items.append({
                "requirement": f"Shift Requirement: {jd_shift}",
                "candidate_evidence": f"Candidate shift preference: {cand_shift}",
                "status": "MATCH" if ("any" in cand_shift.lower() or jd_shift.lower() in cand_shift.lower()) else "PARTIAL"
            })

        return {
            "matched_requirements": matched_items,
            "partial_requirements": partial_items,
            "missing_requirements": missing_items
        }
