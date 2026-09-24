from typing import List, Dict, Any
from backend.app.ai.embeddings import EmbeddingProvider

class SemanticMatcher:
    def __init__(self, embedding_provider=None):
        self.embedder = embedding_provider or EmbeddingProvider()

    def filter_and_rank_jobs(self, candidate: Dict[str, Any], jobs: List[Dict[str, Any]], top_n: int = 15) -> List[Dict[str, Any]]:
        """
        Ranks active JDs using semantic vector similarity against candidate profile.
        Uses sentence-transformers for true semantic understanding.
        """
        if not jobs:
            return []

        norm_cand = candidate.get("normalized", {})
        prof = candidate.get("professional_profile", {})
        curr_emp = candidate.get("employment_history", {}).get("current", {})

        # Build a rich candidate summary for better semantic matching
        cand_parts = [
            f"Name: {norm_cand.get('name', '')}",
            f"Work Status: {norm_cand.get('work_status', '')}",
            f"Experience: {norm_cand.get('total_experience_years', 0)} years",
            f"Skills: {', '.join(norm_cand.get('skills', []))}",
            f"Role: {prof.get('skill_role', '')}",
            f"Industry: {prof.get('industry', '')}",
            f"Communication: {prof.get('english_communication', '')}",
        ]
        if curr_emp.get("role"):
            cand_parts.append(f"Current Role: {curr_emp['role']}")
        if curr_emp.get("company_name"):
            cand_parts.append(f"Current Company: {curr_emp['company_name']}")
        
        cand_summary = " ".join(filter(None, cand_parts))
        
        # Build rich JD summaries
        jd_summaries = []
        for j in jobs:
            sd = j.get('structured_data', {})
            jd_parts = [
                f"Title: {sd.get('job_title', '')}",
                f"Required Skills: {', '.join(sd.get('skills', {}).get('required', []))}",
                f"Experience: {sd.get('experience', {}).get('minimum_years', 0)} years",
                f"Industry: {', '.join(sd.get('industry_experience', []))}",
            ]
            responsibilities = sd.get('responsibilities', [])
            if responsibilities:
                jd_parts.append(f"Responsibilities: {' '.join(responsibilities[:3])}")
            jd_summaries.append(" ".join(filter(None, jd_parts)))

        sim_scores = self.embedder.calculate_vector_similarity(cand_summary, jd_summaries)

        ranked = []
        for job, score in zip(jobs, sim_scores):
            ranked.append({
                "job": job,
                "semantic_score": score
            })

        ranked.sort(key=lambda x: x["semantic_score"], reverse=True)
        return [r["job"] for r in ranked[:top_n]]
