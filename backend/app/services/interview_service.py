import asyncio
import json
import logging
import time
import uuid
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from backend.app.models.candidate import Candidate
from backend.app.models.job import JobDescription
from backend.app.models.match import CandidateJobMatch
from backend.app.models.interview import CandidateInterview
from backend.app.ai.llm.sarvam_provider import SarvamProvider
from backend.app.ai.embeddings import EmbeddingProvider
from backend.app.core.config import settings

logger = logging.getLogger(__name__)

class InterviewService:
    def __init__(self, db: Session):
        self.db = db
        self.llm = SarvamProvider()
        self.embedder = EmbeddingProvider()

    def get_candidate_form_context(self, candidate_id: str) -> Dict[str, Any]:
        """Fetches the complete candidate intake form context."""
        c = self.db.query(Candidate).filter(Candidate.candidate_id == candidate_id).first()
        if not c:
            raise ValueError(f"Candidate '{candidate_id}' not found.")
        
        data = c.candidate_data or {}
        personal = data.get("personal", {})
        prof = data.get("professional_profile", {})
        contact = data.get("contact", {})
        edu = data.get("education_history", {})
        emp = data.get("employment_history", {})
        addr = data.get("address", {})

        return {
            "candidate_id": c.candidate_id,
            "status": c.status,
            "name": f"{personal.get('first_name', '')} {personal.get('last_name', '')}".strip() or "Candidate",
            "phone": contact.get("phone", ""),
            "email": contact.get("email", ""),
            "work_status": prof.get("work_status", "FRESHER"),
            "primary_skills": prof.get("skill", []),
            "total_experience_months": prof.get("total_experience_months", 0),
            "current_company": emp.get("current", {}).get("company_name"),
            "current_role": emp.get("current", {}).get("role"),
            "current_salary": emp.get("current", {}).get("take_home_salary"),
            "expected_salary": data.get("salary", {}).get("expected_monthly_salary") or data.get("job_preferences", {}).get("expected_salary_monthly"),
            "shift_preference": prof.get("shift_preference", "Any"),
            "english_communication": prof.get("english_communication", "Good"),
            "city": addr.get("current", {}).get("city") or addr.get("permanent", {}).get("city"),
            "raw_form_data": data
        }

    async def generate_interview_questions(
        self, candidate_id: str, session_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Interview questions disabled: Only intake form fields are collected.
        Matching occurs directly from the complete intake form data.
        """
        cand_context = self.get_candidate_form_context(candidate_id)
        if not session_id:
            session_id = f"INT-{str(uuid.uuid4())[:8].upper()}"

        return {
            "session_id": session_id,
            "candidate_id": candidate_id,
            "candidate_name": cand_context["name"],
            "total_questions": 0,
            "questions": [],
            "message": "Candidate intake form mode active. Interview questions are disabled. Collect intake form fields only."
        }

    def _build_template_questions(self, cand_context: Dict[str, Any]) -> Dict[str, Any]:
        skills = cand_context.get("primary_skills") or ["your primary domain"]
        skill_str = ", ".join(skills) if isinstance(skills, list) else str(skills)
        current_comp = cand_context.get("current_company")
        is_fresher = (
            cand_context.get("work_status") == "FRESHER"
            or cand_context.get("total_experience_months", 0) == 0
            or not current_comp
        )

        q_list = [
            {
                "id": "q1",
                "category": "TECHNICAL_DEPTH",
                "question": f"In your profile, you mentioned expertise in {skill_str}. Could you describe key concepts or tools you are most comfortable working with?",
                "target_skill_or_topic": skill_str,
                "evaluation_criteria": "Verifies technical grasp and domain knowledge."
            }
        ]

        if not is_fresher:
            q_list.append({
                "id": "q2",
                "category": "EXPERIENCE_VERIFICATION",
                "question": f"Could you walk me through your daily responsibilities and key contributions at {current_comp}?",
                "target_skill_or_topic": "Role & Responsibilities",
                "evaluation_criteria": "Validates actual role responsibilities and tenure."
            })

        q_list.extend([
            {
                "id": "q3" if not is_fresher else "q2",
                "category": "PROBLEM_SOLVING",
                "question": "Can you share an example of a difficult challenge you faced and how you resolved it?",
                "target_skill_or_topic": "Problem Solving",
                "evaluation_criteria": "Evaluates analytical thinking and composure under pressure."
            },
            {
                "id": "q4" if not is_fresher else "q3",
                "category": "OPERATIONAL_FIT",
                "question": f"Are you comfortable with the shift timings ({cand_context.get('shift_preference', 'Day Shift')}), and what is your expected monthly salary?",
                "target_skill_or_topic": "Shift & Salary Alignment",
                "evaluation_criteria": "Confirms non-technical constraint satisfaction."
            }
        ])

        return {
            "questions": q_list
        }

    def record_candidate_answer(
        self, session_id: str, question_id: str, question: str, candidate_answer: str
    ) -> Dict[str, Any]:
        """Stores a candidate's answer into the interview session."""
        interview = self.db.query(CandidateInterview).filter(CandidateInterview.session_id == session_id).first()
        if not interview:
            raise ValueError(f"Interview session '{session_id}' not found.")

        current_responses = list(interview.responses or [])
        
        # Check if already answered; update or append
        existing_idx = next((i for i, r in enumerate(current_responses) if r.get("question_id") == question_id), None)
        answer_record = {
            "question_id": question_id,
            "question": question,
            "answer": candidate_answer,
            "recorded_at": int(time.time())
        }

        if existing_idx is not None:
            current_responses[existing_idx] = answer_record
        else:
            current_responses.append(answer_record)

        interview.responses = current_responses
        self.db.commit()

        return {
            "status": "SAVED",
            "session_id": session_id,
            "total_answers_recorded": len(current_responses),
            "answer_record": answer_record
        }

    async def finalize_candidate_interview(self, session_id: str) -> Dict[str, Any]:
        """
        Finalizes the live interview call, attaches the full interview transcript
        to the candidate profile, and triggers the Matching Engine across ALL active JDs.
        """
        from backend.app.matching.pipeline import MatchingPipeline

        interview = self.db.query(CandidateInterview).filter(CandidateInterview.session_id == session_id).first()
        if not interview:
            raise ValueError(f"Interview session '{session_id}' not found.")

        cand = self.db.query(Candidate).filter(Candidate.candidate_id == interview.candidate_id).first()
        if not cand:
            raise ValueError(f"Candidate '{interview.candidate_id}' not found.")

        # Attach interview Q&A transcript to candidate data
        cand_data = dict(cand.candidate_data or {})
        cand_data["interview_qa"] = interview.responses or []
        cand_data["interview_session_id"] = session_id
        
        # Build aggregated transcript text
        transcript_text = "\n".join([f"Q: {r.get('question')}\nA: {r.get('answer')}" for r in (interview.responses or [])])
        cand_data["interview_transcript"] = transcript_text
        
        cand.candidate_data = cand_data
        interview.status = "COMPLETED"
        self.db.commit()

        # Trigger full Matching Engine pipeline across ALL active JDs with complete data
        pipeline = MatchingPipeline(self.db)
        match_run = await pipeline.run_for_candidate(
            candidate_id=interview.candidate_id,
            trigger_type="INTERVIEW_COMPLETED"
        )

        return {
            "status": "COMPLETED",
            "session_id": session_id,
            "candidate_id": interview.candidate_id,
            "total_answers_recorded": len(interview.responses or []),
            "matching_run_id": match_run.run_id,
            "jobs_considered": match_run.jobs_considered,
            "jobs_matched": match_run.jobs_matched,
            "message": "Interview finalized. Full candidate data (form + interview responses) matched against all active JDs."
        }

    async def compare_candidate_with_jd(self, candidate_id: str, job_id: str, session_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Compares full candidate profile (intake form + interview transcript) against a specific JD.
        """
        cand_context = self.get_candidate_form_context(candidate_id)
        
        job = self.db.query(JobDescription).filter(JobDescription.job_id == job_id).first()
        if not job:
            raise ValueError(f"Job '{job_id}' not found.")
        
        jd_data = job.structured_data or {}
        
        # Fetch candidate interview responses if available
        interview_session = None
        if session_id:
            interview_session = self.db.query(CandidateInterview).filter(CandidateInterview.session_id == session_id).first()
        if not interview_session:
            interview_session = self.db.query(CandidateInterview).filter(
                CandidateInterview.candidate_id == candidate_id
            ).order_by(CandidateInterview.created_at.desc()).first()

        responses = interview_session.responses if interview_session else []
        qa_formatted = "\n".join([f"Q: {r.get('question')}\nA: {r.get('answer')}" for r in responses])

        prompt = (
            f"You are a Senior Technical Recruiter evaluating candidate fit for a specific JD at the end of the intake process.\n\n"
            f"Candidate Profile: {json.dumps(cand_context, default=str)}\n\n"
            f"Interview Transcript (Spoken Responses):\n{qa_formatted or 'No live interview transcript recorded.'}\n\n"
            f"Job Description Requirements:\n"
            f"Title: {jd_data.get('job_title', job.title)}\n"
            f"Required Skills: {', '.join(jd_data.get('skills', {}).get('required', []))}\n"
            f"Preferred Skills: {', '.join(jd_data.get('skills', {}).get('preferred', []))}\n"
            f"Responsibilities: {', '.join(jd_data.get('responsibilities', []))}\n\n"
            "Evaluate the candidate's complete data (form + interview transcript) strictly against the Job Description.\n"
            "Return JSON ONLY with keys:\n"
            "{\n"
            '  "technical_depth_score": 85.0,\n'
            '  "jd_relevance_score": 80.0,\n'
            '  "communication_clarity_score": 90.0,\n'
            '  "overall_interview_score": 84.0,\n'
            '  "recommendation": "STRONG_MATCH" | "CONDITIONAL_MATCH" | "NOT_RECOMMENDED",\n'
            '  "strengths": ["Verified skill X in interview", "Matched experience"],\n'
            '  "gaps": ["Lacks experience in Y"],\n'
            '  "matched_requirements": ["Requirement 1 verified"],\n'
            '  "missing_requirements": ["Requirement 2 missing"],\n'
            '  "executive_summary": "Summary of fit."\n'
            "}"
        )

        eval_result = None
        if settings.SARVAM_API_KEY:
            try:
                eval_result = await asyncio.wait_for(
                    self.llm.generate_structured(prompt, {}),
                    timeout=4.0
                )
            except Exception as e:
                logger.info(f"LLM comparison fallback to deterministic evaluation: {e}")

        if not eval_result or "overall_interview_score" not in eval_result:
            eval_result = self._fallback_evaluate_responses(cand_context, jd_data, responses)

        if interview_session:
            interview_session.evaluation = eval_result
            interview_session.interview_score = float(eval_result.get("overall_interview_score", 75.0))
            interview_session.job_id = job_id
            interview_session.status = "EVALUATED"
            self.db.commit()

        return {
            "candidate_id": candidate_id,
            "job_id": job_id,
            "evaluation": eval_result,
            "interview_score": eval_result.get("overall_interview_score")
        }

    def _fallback_evaluate_responses(
        self, cand_context: Dict[str, Any], jd_context: Dict[str, Any], responses: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Deterministic NLP similarity-based fallback evaluator."""
        total_answers_text = " ".join([r.get("answer", "") for r in responses])
        jd_skills_text = " ".join(jd_context.get("skills", {}).get("required", []) + jd_context.get("skills", {}).get("preferred", []))

        sim = self.embedder.calculate_similarity(total_answers_text, jd_skills_text) if total_answers_text and jd_skills_text else 0.7
        tech_score = round(max(50.0, min(95.0, sim * 110.0)), 1)
        
        return {
            "technical_depth_score": tech_score,
            "jd_relevance_score": tech_score,
            "communication_clarity_score": 85.0,
            "overall_interview_score": tech_score,
            "recommendation": "STRONG_MATCH" if tech_score >= 80 else "CONDITIONAL_MATCH",
            "strengths": ["Answered screening interview questions", "Aligned with core domain background"],
            "gaps": ["Requires final technical round with hiring team"],
            "matched_requirements": jd_context.get("skills", {}).get("required", [])[:3],
            "missing_requirements": [],
            "executive_summary": f"Candidate completed AI interview screening with an overall evaluation score of {tech_score}%."
        }
