import numpy as np
from typing import List
from backend.app.core.config import settings

# Lazy-loaded globals — model is downloaded once on first use
_model = None
_model_load_failed = False


def _get_model():
    """Lazy-load the sentence-transformers model on first use."""
    global _model, _model_load_failed
    if _model is not None:
        return _model
    if _model_load_failed:
        return None
    try:
        from sentence_transformers import SentenceTransformer
        model_name = settings.EMBEDDING_MODEL or "all-MiniLM-L6-v2"
        _model = SentenceTransformer(model_name)
        return _model
    except Exception as e:
        _model_load_failed = True
        print(f"[EmbeddingProvider] Failed to load sentence-transformers model: {e}")
        print("[EmbeddingProvider] Falling back to TF-IDF embeddings.")
        return None


class EmbeddingProvider:
    """
    Production-grade embedding provider.
    Uses sentence-transformers (all-MiniLM-L6-v2) for true semantic similarity.
    Falls back to TF-IDF + cosine similarity if model loading fails.
    """

    def __init__(self):
        self._tfidf_vectorizer = None

    def _get_tfidf(self):
        """Lazy TF-IDF fallback."""
        if self._tfidf_vectorizer is None:
            from sklearn.feature_extraction.text import TfidfVectorizer
            self._tfidf_vectorizer = TfidfVectorizer(ngram_range=(1, 2), stop_words='english')
        return self._tfidf_vectorizer

    def calculate_similarity(self, text1: str, text2: str) -> float:
        """
        Calculates cosine similarity score (0.0 to 1.0) between two text blocks.
        Uses sentence-transformers for true semantic similarity.
        """
        if not text1 or not text2:
            return 0.0

        model = _get_model()
        if model is not None:
            try:
                embeddings = model.encode([text1, text2], normalize_embeddings=True)
                sim = float(np.dot(embeddings[0], embeddings[1]))
                return max(0.0, min(1.0, sim))
            except Exception:
                pass

        # TF-IDF fallback
        return self._tfidf_similarity(text1, text2)

    def calculate_vector_similarity(self, candidate_text: str, jd_texts: List[str]) -> List[float]:
        """
        Calculates HYBRID similarity scores between candidate text and multiple JD texts.
        Uses a weighted combination of:
        - 70% Semantic Search (Sentence-Transformers all-mpnet-base-v2)
        - 30% Lexical Search (BM25 / TF-IDF exact keyword matching)
        """
        if not candidate_text or not jd_texts:
            return [0.0] * len(jd_texts)

        # 1. Semantic Similarity (Sentence Transformers)
        semantic_sims = [0.0] * len(jd_texts)
        model = _get_model()
        if model is not None:
            try:
                all_texts = [candidate_text] + jd_texts
                embeddings = model.encode(all_texts, normalize_embeddings=True, batch_size=32)
                cand_emb = embeddings[0]
                jd_embs = embeddings[1:]
                sims = np.dot(jd_embs, cand_emb)
                semantic_sims = [float(max(0.0, min(1.0, s))) for s in sims]
            except Exception as e:
                print(f"[EmbeddingProvider] Semantic encoding failed: {e}")

        # 2. Lexical Similarity (BM25 exact keyword match)
        lexical_sims = [0.0] * len(jd_texts)
        try:
            from rank_bm25 import BM25Okapi
            tokenized_corpus = [jd.lower().split() for jd in jd_texts]
            bm25 = BM25Okapi(tokenized_corpus)
            tokenized_query = candidate_text.lower().split()
            bm25_scores = bm25.get_scores(tokenized_query)
            
            # Normalize BM25 score to 0-1 range (rough upper bound estimation)
            max_possible = sum([bm25.idf.get(q, 0) for q in tokenized_query])
            if max_possible > 0:
                lexical_sims = [min(1.0, float(score / (max_possible * 0.4 + 1e-6))) for score in bm25_scores]
        except Exception as e:
            # Fallback to TF-IDF if rank_bm25 fails
            print(f"[EmbeddingProvider] BM25 failed: {e}. Falling back to TF-IDF.")
            lexical_sims = self._tfidf_batch_similarity(candidate_text, jd_texts)

        # 3. Combine into Hybrid Score
        hybrid_sims = []
        for sem, lex in zip(semantic_sims, lexical_sims):
            if model is None:
                # If no neural model, rely 100% on lexical
                hybrid_sims.append(lex)
            else:
                # 70% Context/Meaning + 30% Exact Keyword Match
                hybrid_sims.append((0.7 * sem) + (0.3 * lex))

        return hybrid_sims

    def calculate_skill_similarity(self, skill1: str, skill2: str) -> float:
        """
        Calculates semantic similarity between two skill strings.
        Useful for matching skills that are semantically similar but not in synonym lists.
        E.g., "client support" vs "customer service" → high similarity.
        """
        if not skill1 or not skill2:
            return 0.0

        s1 = skill1.strip().lower()
        s2 = skill2.strip().lower()

        # Exact match
        if s1 == s2:
            return 1.0

        model = _get_model()
        if model is not None:
            try:
                embeddings = model.encode([skill1, skill2], normalize_embeddings=True)
                sim = float(np.dot(embeddings[0], embeddings[1]))
                return max(0.0, min(1.0, sim))
            except Exception:
                pass

        # Token overlap fallback
        tokens1 = set(s1.split())
        tokens2 = set(s2.split())
        if not tokens1 or not tokens2:
            return 0.0
        overlap = tokens1.intersection(tokens2)
        return len(overlap) / max(len(tokens1), len(tokens2))

    # ---- TF-IDF Fallback Methods ----

    def _tfidf_similarity(self, text1: str, text2: str) -> float:
        try:
            from sklearn.metrics.pairwise import cosine_similarity
            vectorizer = self._get_tfidf()
            tfidf_matrix = vectorizer.fit_transform([text1, text2])
            sim = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
            return float(max(0.0, min(1.0, sim)))
        except Exception:
            tokens1 = set(text1.lower().split())
            tokens2 = set(text2.lower().split())
            if not tokens1 or not tokens2:
                return 0.0
            overlap = tokens1.intersection(tokens2)
            return len(overlap) / max(len(tokens1), len(tokens2))

    def _tfidf_batch_similarity(self, candidate_text: str, jd_texts: List[str]) -> List[float]:
        try:
            from sklearn.metrics.pairwise import cosine_similarity
            vectorizer = self._get_tfidf()
            corpus = [candidate_text] + jd_texts
            matrix = vectorizer.fit_transform(corpus)
            cand_vector = matrix[0:1]
            jd_vectors = matrix[1:]
            sims = cosine_similarity(cand_vector, jd_vectors)[0]
            return [float(max(0.0, min(1.0, s))) for s in sims]
        except Exception:
            return [self._tfidf_similarity(candidate_text, jd_text) for jd_text in jd_texts]
