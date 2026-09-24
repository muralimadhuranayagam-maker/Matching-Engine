import uuid
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from backend.app.models.candidate import Candidate
from backend.app.models.job import JobDescription
from backend.app.models.match import CandidateJobMatch
from backend.app.models.processing import MatchRun
from backend.app.services.normalization_service import CandidateNormalizer
from backend.app.matching.hard_filters import HardFilterEngine
from backend.app.matching.semantic_matcher import SemanticMatcher
from backend.app.matching.scoring import ScoringEngine
from backend.app.matching.evidence import EvidenceEngine
from backend.app.ai.llm.sarvam_provider import SarvamProvider
from backend.app.core.config import settings

class MatchingPipeline:
    def __init__(self, db: Session):
        self.db = db
        self.semantic_matcher = SemanticMatcher()
        self.scoring_engine = ScoringEngine()
        self.sarvam_provider = SarvamProvider()

    async def run_for_candidate(self, candidate_id: str, trigger_type: str = "NEW_CANDIDATE") -> MatchRun:
        run_id = f"RUN-{str(uuid.uuid4())[:8].upper()}"
        match_run = MatchRun(
            run_id=run_id,
            candidate_id=candidate_id,
            trigger_type=trigger_type,
            status="PROCESSING"
        )
        self.db.add(match_run)
        self.db.commit()

        try:
            candidate_row = self.db.query(Candidate).filter(Candidate.candidate_id == candidate_id).first()
            if not candidate_row:
                raise ValueError(f"Candidate {candidate_id} not found")

            cand_data = candidate_row.candidate_data
            cand_data["normalized"] = CandidateNormalizer.normalize(cand_data)

            # Get all active JDs
            active_jobs = self.db.query(JobDescription).filter(JobDescription.is_active == True, JobDescription.processing_status == "COMPLETED").all()
            match_run.jobs_considered = len(active_jobs)

            if not active_jobs:
                match_run.status = "COMPLETED"
                match_run.jobs_matched = 0
                self.db.commit()
                return match_run

            # 1. Hard Filter Pass
            eligible_jobs = []
            for job in active_jobs:
                passed, reason = HardFilterEngine.evaluate(cand_data, job.structured_data or {})
                if passed:
                    eligible_jobs.append(job)

            if not eligible_jobs:
                match_run.status = "COMPLETED"
                match_run.jobs_matched = 0
                self.db.commit()
                return match_run

            # Convert to dict for semantic matcher
            job_dicts = [{"job_id": j.job_id, "structured_data": j.structured_data, "row": j} for j in eligible_jobs]
            
            # 2. Semantic Matcher Top-N Retrieval
            top_jobs_dicts = self.semantic_matcher.filter_and_rank_jobs(cand_data, job_dicts, top_n=15)

            # 3. Structured Scoring & Evidence Generation for Top-N
            matches_to_save = []
            for item in top_jobs_dicts:
                job_row = item["row"]
                c_jd = job_row.structured_data or {}
                
                score_res = self.scoring_engine.calculate_score(cand_data, c_jd)
                overall = score_res["overall_score"]
                
                evidence = EvidenceEngine.generate_evidence(cand_data, c_jd, score_res)
                
                # Status determination based on threshold
                if overall >= settings.THRESHOLD_STRONG_MATCH:
                    status_val = "MATCHED"
                elif overall >= settings.THRESHOLD_GOOD_MATCH:
                    status_val = "PARTIAL_MATCH"
                elif overall >= settings.THRESHOLD_PARTIAL_MATCH:
                    status_val = "REVIEW_REQUIRED"
                else:
                    status_val = "NOT_MATCHED"

                matches_to_save.append({
                    "job_row": job_row,
                    "overall_score": overall,
                    "status": status_val,
                    "score_breakdown": score_res["breakdown"],
                    "evidence": evidence,
                    "c_jd": c_jd
                })

            # Sort by overall score descending
            matches_to_save.sort(key=lambda x: x["overall_score"], reverse=True)

            # 4. Sarvam LLM Validation for Top-5
            top_k_matches = matches_to_save[:5]
            for match_item in top_k_matches:
                cand_summary = f"Name: {cand_data['normalized']['name']}, Skills: {', '.join(cand_data['normalized']['skills'])}, Experience: {cand_data['normalized']['total_experience_years']}Y"
                jd_summary = f"Title: {match_item['c_jd'].get('job_title')}, Required Skills: {', '.join(match_item['c_jd'].get('skills', {}).get('required', []))}"
                
                val_res = await self.sarvam_provider.validate_match(cand_summary, jd_summary, match_item["overall_score"])
                match_item["llm_validation"] = val_res

            # 5. Persist or Update CandidateJobMatch records
            for match_item in matches_to_save:
                existing = self.db.query(CandidateJobMatch).filter(
                    CandidateJobMatch.candidate_id == candidate_id,
                    CandidateJobMatch.job_id == match_item["job_row"].job_id
                ).first()

                if existing:
                    existing.overall_score = match_item["overall_score"]
                    existing.status = match_item["status"]
                    existing.score_breakdown = match_item["score_breakdown"]
                    existing.matched_requirements = match_item["evidence"]["matched_requirements"]
                    existing.missing_requirements = match_item["evidence"]["missing_requirements"]
                    existing.partial_requirements = match_item["evidence"]["partial_requirements"]
                    existing.llm_validation = match_item.get("llm_validation")
                    existing.matching_run_id = run_id
                else:
                    new_match = CandidateJobMatch(
                        candidate_id=candidate_id,
                        job_id=match_item["job_row"].job_id,
                        overall_score=match_item["overall_score"],
                        status=match_item["status"],
                        score_breakdown=match_item["score_breakdown"],
                        matched_requirements=match_item["evidence"]["matched_requirements"],
                        missing_requirements=match_item["evidence"]["missing_requirements"],
                        partial_requirements=match_item["evidence"]["partial_requirements"],
                        llm_validation=match_item.get("llm_validation"),
                        matching_run_id=run_id
                    )
                    self.db.add(new_match)

            match_run.status = "COMPLETED"
            match_run.jobs_matched = len(matches_to_save)
            self.db.commit()
            return match_run

        except Exception as e:
            match_run.status = "FAILED"
            match_run.error = str(e)
            self.db.commit()
            raise e

    async def run_for_job(self, job_id: str, trigger_type: str = "NEW_JOB") -> MatchRun:
        run_id = f"RUN-{str(uuid.uuid4())[:8].upper()}"
        match_run = MatchRun(
            run_id=run_id,
            job_id=job_id,
            trigger_type=trigger_type,
            status="PROCESSING"
        )
        self.db.add(match_run)
        self.db.commit()

        try:
            job_row = self.db.query(JobDescription).filter(JobDescription.job_id == job_id).first()
            if not job_row or not job_row.structured_data:
                raise ValueError(f"Job {job_id} not found or not processed")

            candidates = self.db.query(Candidate).filter(Candidate.status == "ACTIVE").all()
            match_run.jobs_considered = len(candidates)

            count = 0
            for candidate_row in candidates:
                cand_data = candidate_row.candidate_data
                cand_data["normalized"] = CandidateNormalizer.normalize(cand_data)
                
                passed, _ = HardFilterEngine.evaluate(cand_data, job_row.structured_data)
                if not passed:
                    continue

                score_res = self.scoring_engine.calculate_score(cand_data, job_row.structured_data)
                overall = score_res["overall_score"]
                evidence = EvidenceEngine.generate_evidence(cand_data, job_row.structured_data, score_res)

                if overall >= settings.THRESHOLD_STRONG_MATCH:
                    status_val = "MATCHED"
                elif overall >= settings.THRESHOLD_GOOD_MATCH:
                    status_val = "PARTIAL_MATCH"
                elif overall >= settings.THRESHOLD_PARTIAL_MATCH:
                    status_val = "REVIEW_REQUIRED"
                else:
                    status_val = "NOT_MATCHED"

                existing = self.db.query(CandidateJobMatch).filter(
                    CandidateJobMatch.candidate_id == candidate_row.candidate_id,
                    CandidateJobMatch.job_id == job_id
                ).first()

                if existing:
                    existing.overall_score = overall
                    existing.status = status_val
                    existing.score_breakdown = score_res["breakdown"]
                    existing.matched_requirements = evidence["matched_requirements"]
                    existing.missing_requirements = evidence["missing_requirements"]
                    existing.partial_requirements = evidence["partial_requirements"]
                    existing.matching_run_id = run_id
                else:
                    new_match = CandidateJobMatch(
                        candidate_id=candidate_row.candidate_id,
                        job_id=job_id,
                        overall_score=overall,
                        status=status_val,
                        score_breakdown=score_res["breakdown"],
                        matched_requirements=evidence["matched_requirements"],
                        missing_requirements=evidence["missing_requirements"],
                        partial_requirements=evidence["partial_requirements"],
                        matching_run_id=run_id
                    )
                    self.db.add(new_match)
                count += 1

            match_run.status = "COMPLETED"
            match_run.jobs_matched = count
            self.db.commit()
            return match_run
        except Exception as e:
            match_run.status = "FAILED"
            match_run.error = str(e)
            self.db.commit()
            raise e
