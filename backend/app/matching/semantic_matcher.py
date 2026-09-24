from typing import List, Dict, Any
from backend.app.ai.embeddings import EmbeddingProvider

class SemanticMatcher:
    def __init__(self, embedding_provider=None):
        self.embedder = embedding_provider or EmbeddingProvider()

    def filter_and_rank_jobs(self, candidate: Dict[str, Any], jobs: List[Dict[str, Any]], top_n: int = 15) -> List[Dict[str, Any]]:
        """
        Ranks active JDs using semantic vector similarity against candidate profile.
        """
        if not jobs:
            return []

        norm_cand = candidate.get("normalized", {})
        cand_summary = f"{norm_cand.get('name', '')} {norm_cand.get('work_status', '')} Skills: {', '.join(norm_cand.get('skills', []))}"
        
        jd_summaries = [
            f"{j.get('structured_data', {}).get('job_title', '')} Skills: {', '.join(j.get('structured_data', {}).get('skills', {}).get('required', []))}"
            for j in jobs
        ]

        sim_scores = self.embedder.calculate_vector_similarity(cand_summary, jd_summaries)

        ranked = []
        for job, score in zip(jobs, sim_scores):
            ranked.append({
                "job": job,
                "semantic_score": score
            })

        ranked.sort(key=lambda x: x["semantic_score"], reverse=True)
        return [r["job"] for r in ranked[:top_n]]
