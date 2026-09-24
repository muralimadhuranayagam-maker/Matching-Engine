import numpy as np
from typing import List
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

class EmbeddingProvider:
    def __init__(self):
        self.vectorizer = TfidfVectorizer(ngram_range=(1, 2), stop_words='english')

    def calculate_similarity(self, text1: str, text2: str) -> float:
        """
        Calculates cosine similarity score (0.0 to 1.0) between two text blocks.
        """
        if not text1 or not text2:
            return 0.0
        
        try:
            tfidf_matrix = self.vectorizer.fit_transform([text1, text2])
            sim = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
            return float(max(0.0, min(1.0, sim)))
        except Exception:
            # Fallback string token overlap calculation
            tokens1 = set(text1.lower().split())
            tokens2 = set(text2.lower().split())
            if not tokens1 or not tokens2:
                return 0.0
            overlap = tokens1.intersection(tokens2)
            return len(overlap) / max(len(tokens1), len(tokens2))

    def calculate_vector_similarity(self, candidate_text: str, jd_texts: List[str]) -> List[float]:
        if not candidate_text or not jd_texts:
            return [0.0] * len(jd_texts)
        
        try:
            corpus = [candidate_text] + jd_texts
            matrix = self.vectorizer.fit_transform(corpus)
            cand_vector = matrix[0:1]
            jd_vectors = matrix[1:]
            sims = cosine_similarity(cand_vector, jd_vectors)[0]
            return [float(max(0.0, min(1.0, s))) for s in sims]
        except Exception:
            return [self.calculate_similarity(candidate_text, jd_text) for jd_text in jd_texts]
