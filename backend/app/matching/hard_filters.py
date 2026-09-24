from typing import Dict, Any, Tuple

class HardFilterEngine:
    @staticmethod
    def evaluate(candidate: Dict[str, Any], canonical_jd: Dict[str, Any]) -> Tuple[bool, str]:
        """
        Evaluates hard constraints.
        Returns: (passed: bool, failure_reason: str)
        """
        norm_cand = candidate.get("normalized", {})
        
        # 1. Experience Check (if strictly required in JD)
        jd_exp = canonical_jd.get("experience", {})
        if jd_exp.get("required") and jd_exp.get("minimum_years") is not None:
            min_exp = float(jd_exp["minimum_years"])
            cand_exp = float(norm_cand.get("total_experience_years", 0))
            if cand_exp < min_exp - 0.5: # 0.5 year tolerance
                return False, f"Requires minimum {min_exp} years experience (Candidate has {cand_exp} years)"

        # 2. Location Check (if mandatory location specified)
        jd_loc = canonical_jd.get("location", {})
        cities = [c.lower() for c in jd_loc.get("cities", []) if c]
        if cities and norm_cand.get("city"):
            cand_city = norm_cand["city"].lower()
            work_mode = (jd_loc.get("work_mode") or "").lower()
            relocate = jd_loc.get("relocation_required", False)
            
            # If not remote and no relocation, check city match
            if work_mode != "remote" and not relocate:
                if not any(c in cand_city or cand_city in c for c in cities):
                    return False, f"Location mismatch: Job requires {', '.join(jd_loc['cities'])}, Candidate is in {norm_cand['city']}"

        # Passed all hard filters
        return True, ""
