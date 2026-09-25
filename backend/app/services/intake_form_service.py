import re
import copy
import time
import uuid
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from backend.app.models.candidate import Candidate
from backend.app.models.job import JobDescription
from backend.app.models.match import CandidateJobMatch

from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)

# High-performance in-memory cache and background DB persist queue for sub-10ms voice responses
_db_executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="db_sync_worker")
import threading

_CANDIDATE_MEMORY_CACHE: Dict[str, Dict[str, Any]] = {}
_candidate_locks: Dict[str, threading.Lock] = {}
_lock_registry_lock = threading.Lock()

def _get_candidate_lock(candidate_id: str) -> threading.Lock:
    with _lock_registry_lock:
        if candidate_id not in _candidate_locks:
            _candidate_locks[candidate_id] = threading.Lock()
        return _candidate_locks[candidate_id]

def _async_persist_candidate(candidate_id: str, data: Dict[str, Any]):
    """Asynchronously persists candidate form updates to PostgreSQL in background without blocking live voice call."""
    def _task():
        lock = _get_candidate_lock(candidate_id)
        with lock:
            from backend.app.core.database import SessionLocal
            db = SessionLocal()
            try:
                c = db.query(Candidate).filter(Candidate.candidate_id == candidate_id).first()
                if not c:
                    c = Candidate(candidate_id=candidate_id, candidate_data=data, status="ACTIVE")
                    db.add(c)
                else:
                    c.candidate_data = data
                    flag_modified(c, "candidate_data")
                db.commit()
                logger.debug(f"[DB Sync] Candidate {candidate_id} persisted in background.")
            except Exception:
                db.rollback()
                # Retry update if initial insert had a race condition
                try:
                    c = db.query(Candidate).filter(Candidate.candidate_id == candidate_id).first()
                    if c:
                        c.candidate_data = data
                        flag_modified(c, "candidate_data")
                        db.commit()
                except Exception as e2:
                    db.rollback()
                    logger.error(f"[DB Sync] Error persisting candidate {candidate_id}: {e2}")
            finally:
                db.close()

    _db_executor.submit(_task)

# Comprehensive Master Candidate Intake Form schema (Pure field metadata - No prompt templates)
INTAKE_FORM_FIELDS = [
    # 1. Personal Information
    {
        "field_path": "personal.first_name",
        "display_name": "First Name",
        "type": "string",
        "description": "Candidate's given name / first name",
        "required": True,
    },
    {
        "field_path": "personal.last_name",
        "display_name": "Last Name",
        "type": "string",
        "description": "Candidate's family name / surname",
        "required": False,
    },
    {
        "field_path": "personal.gender",
        "display_name": "Gender",
        "type": "select",
        "options": ["Male", "Female", "Other"],
        "description": "Candidate's gender",
        "required": True,
    },
    {
        "field_path": "personal.date_of_birth",
        "display_name": "Date of Birth",
        "type": "date",
        "description": "Candidate's date of birth (DD-MM-YYYY)",
        "required": False,
    },
    {
        "field_path": "personal.marital_status",
        "display_name": "Marital Status",
        "type": "select",
        "options": ["Single", "Married", "Divorced", "Widowed"],
        "description": "Candidate's marital status",
        "required": False,
    },
    {
        "field_path": "personal.mother_tongue",
        "display_name": "Mother Tongue",
        "type": "string",
        "description": "Candidate's native or mother tongue language",
        "required": False,
    },
    {
        "field_path": "personal.knowledge_of_hindi",
        "display_name": "Knowledge of Hindi",
        "type": "select",
        "options": ["Native / Fluent", "Good", "Average", "Basic / None"],
        "description": "Candidate's Hindi speaking and comprehension capability",
        "required": False,
    },

    # 2. Contact Information
    {
        "field_path": "contact.phone",
        "display_name": "Phone Number",
        "type": "phone",
        "description": "Candidate's 10-digit primary mobile contact number",
        "required": True,
    },
    {
        "field_path": "contact.email",
        "display_name": "Email Address",
        "type": "email",
        "description": "Candidate's email address",
        "required": True,
    },

    # 3. Address & Location
    {
        "field_path": "address.current.city",
        "display_name": "Current City",
        "type": "string",
        "description": "City of candidate's current residential location",
        "required": True,
    },
    {
        "field_path": "address.current.area",
        "display_name": "Current Area / Locality",
        "type": "string",
        "description": "Locality, area, or neighbourhood of residence",
        "required": False,
    },
    {
        "field_path": "address.current.pincode",
        "display_name": "Current Pincode",
        "type": "pincode",
        "description": "6-digit postal pincode of current residence",
        "required": False,
    },

    # 4. Education History (Mandatory 10th, 12th, and Higher Education)
    {
        "field_path": "education.tenth.passing_year",
        "display_name": "10th Passing Year",
        "type": "year",
        "description": "Year of 10th standard / SSLC / Matriculation completion (e.g. 2018)",
        "required": True,
    },
    {
        "field_path": "education.tenth.percentage",
        "display_name": "10th Percentage / Marks",
        "type": "percentage",
        "description": "Percentage or marks scored in 10th standard (e.g. 85%)",
        "required": True,
    },
    {
        "field_path": "education.twelfth.passing_year",
        "display_name": "12th / Diploma Passing Year",
        "type": "year",
        "description": "Year of 12th / HSC / PUC / Diploma completion (e.g. 2020)",
        "required": True,
    },
    {
        "field_path": "education.twelfth.percentage",
        "display_name": "12th / Diploma Percentage / Marks",
        "type": "percentage",
        "description": "Percentage or marks scored in 12th standard or Diploma (e.g. 80%)",
        "required": True,
    },
    {
        "field_path": "education.highest_qualification",
        "display_name": "Highest Qualification",
        "type": "select",
        "options": ["10th", "12th", "Diploma", "Graduate", "Post Graduate"],
        "description": "Candidate's highest completed educational qualification",
        "required": True,
    },
    {
        "field_path": "education.graduation.degree",
        "display_name": "Degree / Specialization",
        "type": "string",
        "description": "Candidate's degree or field of study (e.g. B.Tech CS, B.Com, B.Sc, BCA, MBA)",
        "required": False,
        "depends_on": {"field": "education.highest_qualification", "value_not": "10th"}
    },
    {
        "field_path": "education.graduation.passing_year",
        "display_name": "Graduation Passing Year",
        "type": "year",
        "description": "Year of graduation completion (e.g. 2024)",
        "required": False,
        "depends_on": {"field": "education.highest_qualification", "value_not": "10th"}
    },

    # 5. Professional Experience & Work Status
    {
        "field_path": "professional_profile.work_status",
        "display_name": "Work Status",
        "type": "select",
        "options": ["FRESHER", "EXPERIENCED"],
        "description": "Candidate work status (FRESHER or EXPERIENCED)",
        "required": True,
    },
    # Experience sub-fields: Only asked if work_status is EXPERIENCED. Completely skipped for FRESHER!
    {
        "field_path": "professional_profile.total_experience_months",
        "display_name": "Total Work Experience (Months)",
        "type": "number_months",
        "description": "Total duration of professional work experience",
        "required": True,
        "depends_on": {"field": "professional_profile.work_status", "value": "EXPERIENCED"}
    },
    {
        "field_path": "professional_profile.total_companies",
        "display_name": "Total Companies Worked",
        "type": "number",
        "description": "Total number of companies candidate has worked in",
        "required": False,
        "depends_on": {"field": "professional_profile.work_status", "value": "EXPERIENCED"}
    },
    {
        "field_path": "employment_history.current.company_name",
        "display_name": "Current/Previous Company",
        "type": "string",
        "description": "Name of current or most recent employer",
        "required": False,
        "depends_on": {"field": "professional_profile.work_status", "value": "EXPERIENCED"}
    },
    {
        "field_path": "employment_history.current.role",
        "display_name": "Current Role / Designation",
        "type": "string",
        "description": "Current job title or designation",
        "required": False,
        "depends_on": {"field": "professional_profile.work_status", "value": "EXPERIENCED"}
    },
    {
        "field_path": "salary.current_monthly_salary",
        "display_name": "Current Monthly Salary",
        "type": "salary_number",
        "description": "Candidate's current monthly take-home salary in INR",
        "required": False,
        "depends_on": {"field": "professional_profile.work_status", "value": "EXPERIENCED"}
    },
    # Common Skills & Domain (Asked for both Freshers and Experienced)
    {
        "field_path": "professional_profile.skill",
        "display_name": "Primary Skills",
        "type": "array_string",
        "description": "Core technical skills, tools, or domain specializations",
        "required": True,
    },
    {
        "field_path": "professional_profile.skill_role",
        "display_name": "Primary Role / Title",
        "type": "string",
        "description": "Candidate's primary job role or specialization (e.g. Software Engineer, Customer Support, Data Analyst)",
        "required": False,
    },
    {
        "field_path": "professional_profile.industry",
        "display_name": "Industry / Domain",
        "type": "string",
        "description": "Candidate's industry domain (e.g. IT / Software, BPO / ITES, Banking, Retail)",
        "required": False,
    },
    {
        "field_path": "professional_profile.notice_period",
        "display_name": "Notice Period",
        "type": "select",
        "options": ["Immediate / Ready to Join", "15 Days", "30 Days", "45 Days", "60 Days"],
        "description": "Candidate's availability or notice period to join a new company",
        "required": True,
        "depends_on": {"field": "professional_profile.work_status", "value": "EXPERIENCED"}
    },
    {
        "field_path": "professional_profile.english_communication",
        "display_name": "English Communication Level",
        "type": "select",
        "options": ["Basic", "Average", "Good", "Very Good", "Excellent"],
        "description": "Candidate's self-assessed spoken English proficiency",
        "required": True,
    },
    {
        "field_path": "professional_profile.certifications",
        "display_name": "Certifications",
        "type": "string",
        "description": "Any professional certifications held by candidate",
        "required": False,
    },
    {
        "field_path": "professional_profile.computer_literacy",
        "display_name": "Computer Literacy",
        "type": "select",
        "options": ["Yes", "No"],
        "description": "Whether candidate is comfortable with basic computer operations",
        "required": False,
    },
    {
        "field_path": "professional_profile.two_wheeler_license",
        "display_name": "Two Wheeler & License",
        "type": "select",
        "options": ["Yes", "No"],
        "description": "Whether candidate possesses a two-wheeler and valid driving license",
        "required": False,
    },

    # 6. Job Preferences & Availability
    {
        "field_path": "job_preferences.preferred_locations",
        "display_name": "Preferred Work Cities",
        "type": "array_string",
        "description": "Target cities or preferred work locations for the candidate",
        "required": False,
    },
    {
        "field_path": "job_preferences.willingness_to_relocate",
        "display_name": "Willingness to Relocate",
        "type": "select",
        "options": ["Yes", "No"],
        "description": "Whether candidate is willing to relocate for work",
        "required": False,
    },
    {
        "field_path": "job_preferences.work_from_home",
        "display_name": "Work Mode Preference",
        "type": "select",
        "options": ["Work From Office", "Hybrid", "Work From Home / Remote"],
        "description": "Preferred work mode (Office, Hybrid, or Remote)",
        "required": False,
    },
    {
        "field_path": "salary.expected_monthly_salary",
        "display_name": "Expected Monthly Salary",
        "type": "salary_number",
        "description": "Candidate's expected in-hand monthly salary in INR",
        "required": True,
    },
    {
        "field_path": "professional_profile.shift_preference",
        "display_name": "Shift Preference",
        "type": "select",
        "options": ["Day Shift", "Night Shift", "Rotational", "Any Shift"],
        "description": "Preferred work shift timing",
        "required": True,
    },
    {
        "field_path": "professional_profile.willingness_to_work_shifts",
        "display_name": "Willing to Work Shifts",
        "type": "select",
        "options": ["Yes", "No"],
        "description": "Whether candidate is open to working in rotational or night shifts",
        "required": False,
    },

    # 7. Recruiter Call Disposition Master
    {
        "field_path": "call_disposition",
        "display_name": "Call Disposition",
        "type": "select",
        "options": [
            "Line Up Scheduled",
            "Poor Communication",
            "Non Hiring Zone",
            "Not Interested",
            "High Salary",
            "Age Limit",
            "Career Gap",
            "No Company",
            "Voice Mail",
            "Other Domain Experience",
            "Busy, Call me Back",
            "Work from Home",
            "Out Station Candidate",
            "Shift Issues",
            "Non Hiring University",
            "No Education Documents",
            "No Experience Documents",
            "Serving Notice",
            "Cooling Period",
            "Call Disconnected",
            "Need Weekend Off",
            "Other Recruiter"
        ],
        "description": "Final call outcome and recruiter disposition classification",
        "required": True,
    },

    # 8. Child Branch Disposition Fields (Triggered conditionally based on call_disposition)
    # Poor Communication
    {
        "field_path": "poor_communication_assessment.poor_communication_reason",
        "display_name": "Poor Communication Reason",
        "type": "select",
        "options": ["Heavy accent", "Grammar issues", "Lack of vocabulary", "Unable to comprehend", "Stammering", "MTI", "Other"],
        "description": "Specific communication impediment reason",
        "required": True,
        "depends_on": {"field": "call_disposition", "value": "Poor Communication"}
    },
    {
        "field_path": "poor_communication_assessment.fit_domestic_or_non_voice",
        "display_name": "Fit Domestic or Non-Voice",
        "type": "select",
        "options": ["Domestic (Voice)", "Non-Voice", "Neither"],
        "description": "Suitability for alternate domestic or non-voice processes",
        "required": True,
        "depends_on": {"field": "call_disposition", "value": "Poor Communication"}
    },

    # Non Hiring Zone
    {
        "field_path": "non_hiring_zone_details.candidate_pincode",
        "display_name": "Non-Hiring Zone Pincode",
        "type": "pincode",
        "description": "Candidate's residential pincode in non-hiring zone",
        "required": True,
        "depends_on": {"field": "call_disposition", "value": "Non Hiring Zone"}
    },
    {
        "field_path": "non_hiring_zone_details.candidate_area",
        "display_name": "Non-Hiring Zone Area",
        "type": "string",
        "description": "Area or locality within non-hiring zone",
        "required": True,
        "depends_on": {"field": "call_disposition", "value": "Non Hiring Zone"}
    },
    {
        "field_path": "non_hiring_zone_details.stay_type",
        "display_name": "Living Arrangement",
        "type": "select",
        "options": ["PG", "With Family"],
        "description": "Candidate living status (PG or With Family)",
        "required": True,
        "depends_on": {"field": "call_disposition", "value": "Non Hiring Zone"}
    },
    {
        "field_path": "non_hiring_zone_details.will_relocate",
        "display_name": "Willingness to Relocate",
        "type": "select",
        "options": ["Yes", "No"],
        "description": "Whether candidate is willing to relocate near hiring company",
        "required": True,
        "depends_on": {"field": "call_disposition", "value": "Non Hiring Zone"}
    },

    # Not Interested
    {
        "field_path": "not_interested_details.not_interested_reason",
        "display_name": "Not Interested Reason",
        "type": "select",
        "options": ["DND (Do Not Disturb)", "Just Joined Another Company", "Looking for other domain", "Hate JobShop", "Others"],
        "description": "Reason candidate declined current opportunities",
        "required": True,
        "depends_on": {"field": "call_disposition", "value": "Not Interested"}
    },

    # High Salary
    {
        "field_path": "high_salary_assessment.communication_matches_salary",
        "display_name": "Communication Matches Salary",
        "type": "select",
        "options": ["Yes", "No"],
        "description": "Whether candidate communication skills justify requested compensation",
        "required": True,
        "depends_on": {"field": "call_disposition", "value": "High Salary"}
    },
    {
        "field_path": "high_salary_assessment.experience_matches_salary",
        "display_name": "Experience Matches Salary",
        "type": "select",
        "options": ["Yes", "No"],
        "description": "Whether candidate work experience matches requested salary bracket",
        "required": True,
        "depends_on": {"field": "call_disposition", "value": "High Salary"}
    },
    {
        "field_path": "high_salary_assessment.has_paying_company",
        "display_name": "Has High-Paying Company Match",
        "type": "select",
        "options": ["Yes", "No"],
        "description": "Whether an existing company client meets this salary tier",
        "required": True,
        "depends_on": {"field": "call_disposition", "value": "High Salary"}
    },

    # Career Gap
    {
        "field_path": "career_gap_details.career_gap_reason",
        "display_name": "Career Gap Reason",
        "type": "select",
        "options": ["Health Issues", "Family Concerns", "Exam Preparation", "Finishing Backlogs", "Others"],
        "description": "Explanation for employment or educational gap",
        "required": True,
        "depends_on": {"field": "call_disposition", "value": "Career Gap"}
    },

    # Other Domain Experience
    {
        "field_path": "other_domain_experience_details.other_domain_name",
        "display_name": "Other Domain Name",
        "type": "string",
        "description": "Name of non-BPO/other domain worked in",
        "required": True,
        "depends_on": {"field": "call_disposition", "value": "Other Domain Experience"}
    },
    {
        "field_path": "other_domain_experience_details.interested_in_bpo_job",
        "display_name": "Interested in BPO/Target Roles",
        "type": "select",
        "options": ["Yes", "No"],
        "description": "Willingness to transition into target domain/BPO roles",
        "required": True,
        "depends_on": {"field": "call_disposition", "value": "Other Domain Experience"}
    },

    # Busy, Call me Back
    {
        "field_path": "busy_call_me_back_details.able_to_judge_communication",
        "display_name": "Able to Judge Communication",
        "type": "select",
        "options": ["Yes", "No"],
        "description": "Whether interviewer could assess spoken English during brief interaction",
        "required": True,
        "depends_on": {"field": "call_disposition", "value": "Busy, Call me Back"}
    },
    {
        "field_path": "busy_call_me_back_details.send_details_for_callback",
        "display_name": "Send Callback Notification",
        "type": "select",
        "options": ["Yes", "No"],
        "description": "Whether to schedule automated callback reminder",
        "required": True,
        "depends_on": {"field": "call_disposition", "value": "Busy, Call me Back"}
    },

    # Work from Home
    {
        "field_path": "work_from_home_details.flexible_to_work_from_office",
        "display_name": "Flexible for Work From Office",
        "type": "select",
        "options": ["Yes", "No"],
        "description": "Candidate flexibility to work from physical office location",
        "required": True,
        "depends_on": {"field": "call_disposition", "value": "Work from Home"}
    },

    # Shift Issues
    {
        "field_path": "shift_issues_details.preferred_shift_choice",
        "display_name": "Strict Preferred Shift",
        "type": "select",
        "options": ["Day shift only", "Night shift only", "Rotational"],
        "description": "Specific non-negotiable shift preference",
        "required": True,
        "depends_on": {"field": "call_disposition", "value": "Shift Issues"}
    },
    {
        "field_path": "shift_issues_details.shift_preference_reason",
        "display_name": "Shift Constraint Reason",
        "type": "string",
        "description": "Reason candidate cannot work other shifts",
        "required": False,
        "depends_on": {"field": "call_disposition", "value": "Shift Issues"}
    },

    # Serving Notice
    {
        "field_path": "serving_notice_details.current_working_company",
        "display_name": "Notice Serving Company",
        "type": "string",
        "description": "Company where candidate is currently serving notice",
        "required": True,
        "depends_on": {"field": "call_disposition", "value": "Serving Notice"}
    },
    {
        "field_path": "serving_notice_details.last_working_day",
        "display_name": "Official Last Working Day",
        "type": "date",
        "description": "Confirmed last working date with current employer (DD-MM-YYYY)",
        "required": True,
        "depends_on": {"field": "call_disposition", "value": "Serving Notice"}
    },
    {
        "field_path": "serving_notice_details.reminder_job_available",
        "display_name": "Notice Completion Job Reminder",
        "type": "select",
        "options": ["Yes", "No"],
        "description": "Schedule job openings reminder near last working date",
        "required": True,
        "depends_on": {"field": "call_disposition", "value": "Serving Notice"}
    },

    # Cooling Period
    {
        "field_path": "cooling_period_details.rejected_company_name",
        "display_name": "Cooling Period Company",
        "type": "string",
        "description": "Company where candidate was previously rejected",
        "required": True,
        "depends_on": {"field": "call_disposition", "value": "Cooling Period"}
    },
    {
        "field_path": "cooling_period_details.cooling_period_duration",
        "display_name": "Cooling Period Duration",
        "type": "select",
        "options": ["30 Days", "60 Days", "90 Days", "6 Months"],
        "description": "Mandatory waiting duration before re-application",
        "required": True,
        "depends_on": {"field": "call_disposition", "value": "Cooling Period"}
    },

    # Call Disconnected
    {
        "field_path": "call_disconnected_details.call_disconnected_judge_communication",
        "display_name": "Judged Communication Before Drop",
        "type": "select",
        "options": ["Yes", "No"],
        "description": "Whether communication was assessed before call disconnect",
        "required": True,
        "depends_on": {"field": "call_disposition", "value": "Call Disconnected"}
    },

    # Other Recruiter
    {
        "field_path": "other_recruiter_details.assigned_other_recruiter",
        "display_name": "Other Recruiter Name",
        "type": "string",
        "description": "Name of recruiter already working with this candidate",
        "required": True,
        "depends_on": {"field": "call_disposition", "value": "Other Recruiter"}
    },

    # Line Up Scheduled
    {
        "field_path": "lineup_scheduled_details.lineup_skill_role",
        "display_name": "Line Up Target Role",
        "type": "string",
        "description": "Target job title / profile candidate is scheduled for",
        "required": False,
        "depends_on": {"field": "call_disposition", "value": "Line Up Scheduled"}
    }
]

class IntakeFormService:
    def __init__(self, db: Optional[Session] = None):
        self.db = db

    def _get_candidate_data(self, candidate_id: str) -> Dict[str, Any]:
        """Ultra-fast in-memory state lookup (< 0.1ms). Falls back to DB once if not cached."""
        if candidate_id in _CANDIDATE_MEMORY_CACHE:
            return _CANDIDATE_MEMORY_CACHE[candidate_id]

        close_after = False
        try:
            db_session = self.db
            if not db_session:
                from backend.app.core.database import SessionLocal
                db_session = SessionLocal()
                close_after = True

            c = db_session.query(Candidate).filter(Candidate.candidate_id == candidate_id).first()
            if close_after:
                db_session.close()

            if c and c.candidate_data:
                _CANDIDATE_MEMORY_CACHE[candidate_id] = copy.deepcopy(c.candidate_data)
                return _CANDIDATE_MEMORY_CACHE[candidate_id]
        except Exception as e:
            logger.error(f"Error querying candidate {candidate_id}: {e}")

        # Blank template for new candidate
        initial_data = {
            "candidate_id": candidate_id,
            "personal": {},
            "contact": {},
            "education": {},
            "professional_profile": {},
            "employment_history": {"current": {}},
            "job_preferences": {},
            "salary": {},
            "address": {"current": {}},
            "intake_status": "IN_PROGRESS",
            "field_answers": []
        }
        _CANDIDATE_MEMORY_CACHE[candidate_id] = initial_data
        _async_persist_candidate(candidate_id, initial_data)
        return initial_data

    def _get_or_create_candidate(self, candidate_id: Optional[str] = None) -> Candidate:
        cand_id = candidate_id or f"CAND-{str(uuid.uuid4())[:8].upper()}"
        if cand_id in _CANDIDATE_MEMORY_CACHE:
            c = self.db.query(Candidate).filter(Candidate.candidate_id == cand_id).first()
            if c:
                return c
        else:
            c = self.db.query(Candidate).filter(Candidate.candidate_id == cand_id).first()
            if c:
                _CANDIDATE_MEMORY_CACHE[cand_id] = copy.deepcopy(c.candidate_data or {})
                return c

        init_data = {
            "candidate_id": cand_id,
            "personal": {},
            "contact": {},
            "education": {},
            "professional_profile": {},
            "employment_history": {"current": {}},
            "job_preferences": {},
            "salary": {},
            "address": {"current": {}},
            "intake_status": "IN_PROGRESS",
            "field_answers": []
        }
        _CANDIDATE_MEMORY_CACHE[cand_id] = init_data
        new_cand = Candidate(
            candidate_id=cand_id,
            candidate_data=init_data,
            status="ACTIVE"
        )
        self.db.add(new_cand)
        self.db.commit()
        return new_cand

    def _get_nested_value(self, data: Dict[str, Any], path: str) -> Any:
        parts = path.split(".")
        curr = data
        for p in parts:
            if not isinstance(curr, dict) or p not in curr:
                return None
            curr = curr[p]
        return curr

    def _set_nested_value(self, data: Dict[str, Any], path: str, value: Any):
        parts = path.split(".")
        curr = data
        for p in parts[:-1]:
            if p not in curr or not isinstance(curr[p], dict):
                curr[p] = {}
            curr = curr[p]
        curr[parts[-1]] = value

    def _clean_extracted_value(self, field_def: Dict[str, Any], raw_answer: str) -> Any:
        """Parses natural spoken candidate responses into clean structured field values."""
        text = str(raw_answer).strip()
        ftype = field_def.get("type", "string")

        if ftype == "string":
            # Strip common speech prefixes: "My name is Siva" -> "Siva", "I live in Bengaluru" -> "Bengaluru"
            cleaned = re.sub(r'^(?:my name is|i am|i live in|located in|company name is|i work at|my company is|it is|it\'s)\s+', '', text, flags=re.IGNORECASE)
            cleaned = cleaned.strip().rstrip(".!,")
            if "certifications" in field_def.get("field_path", ""):
                if any(k in text.lower() for k in ["no", "none", "don't have", "dont have", "nil", "na"]):
                    return "No"

            if field_def.get("field_path") == "education.graduation.degree":
                low_deg = cleaned.lower()
                # Telephony ASR often hears "B.E." as "beam", "bean", "be", "b e"
                if any(k in low_deg for k in ["beam", "bean", "b.e", "b e", "b. e"]) or low_deg == "be":
                    return "B.E."
                if any(k in low_deg for k in ["btech", "b tech", "b.tech"]):
                    return "B.Tech"
                if any(k in low_deg for k in ["bcom", "b com", "b.com"]):
                    return "B.Com"
                if any(k in low_deg for k in ["bsc", "b sc", "b.sc"]):
                    return "B.Sc"
                if any(k in low_deg for k in ["mtech", "m tech", "m.tech"]):
                    return "M.Tech"
                if any(k in low_deg for k in ["mca", "m ca"]):
                    return "MCA"
                if any(k in low_deg for k in ["bca", "b ca"]):
                    return "BCA"
                if any(k in low_deg for k in ["mba", "m ba"]):
                    return "MBA"

            return cleaned

        elif ftype == "phone":
            digits = re.sub(r'\D', '', text)
            if len(digits) >= 10:
                return digits[-10:]
            return digits or text

        elif ftype == "email":
            match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', text)
            if match:
                return match.group(0)
            return text.replace(" at ", "@").replace(" dot ", ".").replace(" ", "")

        elif ftype == "select":
            options = field_def.get("options", [])
            fpath = field_def.get("field_path", "")
            low_text = text.lower()

            # Yes / No heuristics for select fields with Yes/No options
            if options == ["Yes", "No"] or set(options) == {"Yes", "No"}:
                if any(k in low_text for k in [
                    "yes", "yeah", "yep", "sure", "okay", "ok", "comfortable", 
                    "i have", "available", "ready", "relocate work", "i relocate",
                    "can relocate", "open to", "fine with", "done", "am comfortable"
                ]):
                    return "Yes"
                if any(k in low_text for k in ["no", "nope", "not", "don't", "dont", "never", "cannot", "can't"]):
                    return "No"

            # Check fresher/experienced heuristics strictly for work_status
            if "work_status" in fpath or set(options) == {"FRESHER", "EXPERIENCED"}:
                if any(k in low_text for k in [
                    "fresher", "freshers", "fresh", "no experience", "not experienced", "dont have experience", "don't have experience",
                    "zero experience", "no work", "without experience", "student", "studying", "college",
                    "just completed", "just passed", "beginner", "no company", "never worked", "0 experience", "zero",
                    "nan fresher", "naan fresher", "fresher thaan", "fresher pa", "fresher sir", "fresher mam"
                ]):
                    return "FRESHER"
                if any(k in low_text for k in [
                    "have experience", "i have worked", "working", "experienced", "currently working", "job experience"
                ]) and not any(neg in low_text for neg in ["no", "not", "dont", "don't", "zero", "never", "without", "fresher"]):
                    return "EXPERIENCED"
                return "FRESHER"

            # Gender heuristics - check Female first (since 'male' is a substring of 'female')
            if "gender" in fpath or set(options) == {"Male", "Female", "Other"} or set(options) == {"Male", "Female"}:
                if any(k in low_text for k in ["female", "woman", "girl", "she"]):
                    return "Female"
                if any(k in low_text for k in ["male", "man", "boy", "he"]):
                    return "Male"
                if "other" in low_text:
                    return "Other"

            # Direct option match with word-boundaries (longest first to avoid substring false positives)
            for opt in sorted(options, key=len, reverse=True):
                if re.search(r'\b' + re.escape(opt.lower()) + r'\b', low_text):
                    return opt
                if opt.lower() == low_text:
                    return opt

            # Education heuristics
            if "education" in fpath or "qualification" in fpath:
                if any(k in low_text for k in ["post graduate", "pg", "master", "m.tech", "mtech", "mba", "msc", "mca"]):
                    return "Post Graduate"
                if any(k in low_text for k in ["graduate", "degree", "b.tech", "btech", "b.e", "be", "b.com", "bcom", "bsc", "bca", "bba", "ug", "bachelor", "engineering"]):
                    return "Graduate"
                if any(k in low_text for k in ["diploma", "polytechnic"]):
                    return "Diploma"
                if any(k in low_text for k in ["12th", "twelfth", "+2", "plus two", "puc", "hsc"]):
                    return "12th"
                if any(k in low_text for k in ["10th", "tenth", "sslc", "matric"]):
                    return "10th"

            # Notice Period heuristics
            if "notice" in fpath:
                if any(k in low_text for k in ["immediate", "ready", "immediately", "right now", "0 days", "no notice", "any time"]):
                    return "Immediate / Ready to Join"
                if "15" in low_text or "2 weeks" in low_text:
                    return "15 Days"
                if "30" in low_text or "1 month" in low_text or "one month" in low_text:
                    return "30 Days"
                if "45" in low_text or "1.5 month" in low_text:
                    return "45 Days"
                if "60" in low_text or "2 month" in low_text or "two month" in low_text or "90" in low_text or "3 month" in low_text:
                    return "60 Days"

            # English Communication heuristics
            if "english" in fpath:
                if any(k in low_text for k in ["excellent", "fluent", "native"]):
                    return "Excellent"
                if any(k in low_text for k in ["very good", "high"]):
                    return "Very Good"
                if any(k in low_text for k in ["good", "intermediate"]):
                    return "Good"
                if any(k in low_text for k in ["average", "medium", "moderate", "fair"]):
                    return "Average"
                if any(k in low_text for k in ["basic", "beginner", "low", "poor"]):
                    return "Basic"

            # Gender heuristics
            if "gender" in fpath:
                if "female" in low_text or "woman" in low_text or "girl" in low_text:
                    return "Female"
                if "male" in low_text or "man" in low_text or "boy" in low_text:
                    return "Male"

            # Marital Status heuristics
            if "marital" in fpath:
                if "married" in low_text:
                    return "Married"
                if "single" in low_text or "unmarried" in low_text:
                    return "Single"

            # Hindi heuristics
            if "hindi" in fpath:
                if "fluent" in low_text or "native" in low_text or "mother tongue" in low_text:
                    return "Native / Fluent"
                if "good" in low_text or "manage" in low_text:
                    return "Good"
                if "average" in low_text or "little" in low_text:
                    return "Average"
                if "no" in low_text or "not" in low_text or "basic" in low_text or "poor" in low_text:
                    return "Basic / None"

            # Work Mode heuristics
            if "work_from_home" in fpath or "work_mode" in fpath:
                if "home" in low_text or "wfh" in low_text or "remote" in low_text:
                    return "Work From Home / Remote"
                if "hybrid" in low_text:
                    return "Hybrid"
                if "office" in low_text or "wfo" in low_text or "on-site" in low_text:
                    return "Work From Office"

            # Shift heuristics
            if "shift" in fpath:
                if "day" in low_text:
                    return "Day Shift"
                if "night" in low_text:
                    return "Night Shift"
                if "rotational" in low_text:
                    return "Rotational"
                if "any" in low_text or "comfortable" in low_text or "okay" in low_text:
                    return "Any Shift"

            return text

        elif ftype == "pincode":
            digits = re.sub(r'\D', '', text)
            if len(digits) >= 6:
                return digits[:6]
            return digits or text

        elif ftype == "year":
            match = re.search(r'\b(19\d\d|20\d\d)\b', text)
            if match:
                return match.group(1)
            return text

        elif ftype == "percentage":
            # e.g. "85%", "I got 78 percent", "82.5"
            match = re.search(r'(\d+(?:\.\d+)?)\s*(?:%|percent)?', text, re.IGNORECASE)
            if match:
                val = float(match.group(1))
                return int(val) if val.is_integer() else val
            return text

        elif ftype == "date":
            # Normalize DD-MM-YYYY or DD/MM/YYYY
            match = re.search(r'(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})', text)
            if match:
                d, m, y = match.group(1).zfill(2), match.group(2).zfill(2), match.group(3)
                if len(y) == 2:
                    y = f"19{y}" if int(y) > 40 else f"20{y}"
                return f"{d}-{m}-{y}"
            return text

        elif ftype == "array_string":
            # e.g. "I know Python, FastAPI, and PostgreSQL" -> ["Python", "FastAPI", "PostgreSQL"]
            # or "I prefer Chennai and Bangalore" -> ["Chennai", "Bangalore"]
            cleaned = re.sub(r'^(?:i know|my skills are|i work with|i use|skills in|experience in|prefer|i prefer|preferred cities are|locations are)\s+', '', text, flags=re.IGNORECASE)
            # Split on commas, 'and', slashes
            items = re.split(r'[,/|]|\band\b', cleaned, flags=re.IGNORECASE)
            result = [i.strip().title() for i in items if i.strip()]
            return result if result else [text]

        elif ftype == "number_months":
            # e.g. "I have 3 years of experience" -> 36, "18 months" -> 18
            year_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:years?|yrs?)', text, re.IGNORECASE)
            if year_match:
                return int(float(year_match.group(1)) * 12)
            month_match = re.search(r'(\d+)\s*(?:months?|moths?)', text, re.IGNORECASE)
            if month_match:
                return int(month_match.group(1))
            num_match = re.search(r'\b(\d+(?:\.\d+)?)\b', text)
            if num_match:
                val = float(num_match.group(1))
                return int(val * 12) if val < 20 else int(val)
            return 0

        elif ftype == "salary_number":
            # e.g. "85k" -> 85000, "90000 per month" -> 90000, "12 LPA" -> 100000, "Around ₹25,000" -> 25000
            clean_s = re.sub(r'[,₹]', '', text)
            k_match = re.search(r'(\d+(?:\.\d+)?)\s*k\b', clean_s, re.IGNORECASE)
            if k_match:
                return int(float(k_match.group(1)) * 1000)
            lpa_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:lpa|lakhs?|lac)', clean_s, re.IGNORECASE)
            if lpa_match:
                annual = float(lpa_match.group(1)) * 100000
                return int(annual / 12)
            num_match = re.search(r'\b(\d{4,7})\b', clean_s)
            if num_match:
                return int(num_match.group(1))
            return 0

        return text

    def _normalize_field_path(self, field_path: str) -> str:
        """Maps dynamic or LLM-generated field aliases to standard schema field paths."""
        fp = field_path.strip()
        alias_map = {
            "professional_profile.willingness_to_work_shifts": "professional_profile.willingness_to_work_shifts",
            "willingness_to_work_shifts": "professional_profile.willingness_to_work_shifts",
            "work_shifts": "professional_profile.willingness_to_work_shifts",
            "shifts": "professional_profile.shift_preference",
            "shift": "professional_profile.shift_preference",
            "professional_profile.shifts": "professional_profile.shift_preference",
            "professional_profile.shift": "professional_profile.shift_preference",
            "willingness_to_relocate": "job_preferences.willingness_to_relocate",
            "professional_profile.willingness_to_relocate": "job_preferences.willingness_to_relocate",
            "job_preferences.willingness_to_relocate": "job_preferences.willingness_to_relocate",
            "job_preferences.relocate": "job_preferences.willingness_to_relocate",
            "relocate": "job_preferences.willingness_to_relocate",
            "job_preferences.locations": "job_preferences.preferred_locations",
            "job_preferences.cities": "job_preferences.preferred_locations",
            "job_preferences.city": "job_preferences.preferred_locations",
            "preferred_locations": "job_preferences.preferred_locations",
            "preferred_cities": "job_preferences.preferred_locations",
            "cities": "job_preferences.preferred_locations",
            "salary.expected_salary": "salary.expected_monthly_salary",
            "professional_profile.expected_salary": "salary.expected_monthly_salary",
            "expected_salary": "salary.expected_monthly_salary",
            "salary.current_salary": "salary.current_monthly_salary",
            "professional_profile.current_salary": "salary.current_monthly_salary",
            "current_salary": "salary.current_monthly_salary",
            "professional_profile.notice": "professional_profile.notice_period",
            "notice_period": "professional_profile.notice_period",
            "professional_profile.english": "professional_profile.english_communication",
            "professional_profile.english_level": "professional_profile.english_communication",
            "english_communication": "professional_profile.english_communication",
            "job_preferences.wfh": "job_preferences.work_from_home",
            "job_preferences.work_mode": "job_preferences.work_from_home",
            "work_mode": "job_preferences.work_from_home",
            "work_from_home": "job_preferences.work_from_home",
            "skills": "professional_profile.skill",
            "skill": "professional_profile.skill",
            "primary_skills": "professional_profile.skill",
            "role": "professional_profile.skill_role",
            "job_role": "professional_profile.skill_role",
            "domain": "professional_profile.industry",
            "industry": "professional_profile.industry",
            "experience": "professional_profile.total_experience_months",
            "total_experience": "professional_profile.total_experience_months",
            "certifications": "professional_profile.certifications",
            "certification": "professional_profile.certifications",
            "professional_profile.certification": "professional_profile.certifications",
            "computer_literacy": "professional_profile.computer_literacy",
            "professional_profile.computer_literacy": "professional_profile.computer_literacy",
            "two_wheeler_license": "professional_profile.two_wheeler_license",
            "professional_profile.two_wheeler_license": "professional_profile.two_wheeler_license",
            "two_wheeler": "professional_profile.two_wheeler_license",
            "license": "professional_profile.two_wheeler_license",
            "driving_license": "professional_profile.two_wheeler_license",
            "degree": "education.graduation.degree",
            "course": "education.graduation.degree",
            "graduation_degree": "education.graduation.degree",
            "education.degree": "education.graduation.degree",
            "passing_year": "education.graduation.passing_year",
            "graduation_year": "education.graduation.passing_year",
            "year_of_passing": "education.graduation.passing_year",
            "education.passing_year": "education.graduation.passing_year",
            "qualification": "education.highest_qualification",
            "highest_qualification": "education.highest_qualification",
            "10th_passing_year": "education.tenth.passing_year",
            "tenth_passing_year": "education.tenth.passing_year",
            "10th_year": "education.tenth.passing_year",
            "tenth_year": "education.tenth.passing_year",
            "10th_percentage": "education.tenth.percentage",
            "tenth_percentage": "education.tenth.percentage",
            "10th_marks": "education.tenth.percentage",
            "tenth_marks": "education.tenth.percentage",
            "12th_passing_year": "education.twelfth.passing_year",
            "twelfth_passing_year": "education.twelfth.passing_year",
            "12th_year": "education.twelfth.passing_year",
            "twelfth_year": "education.twelfth.passing_year",
            "12th_percentage": "education.twelfth.percentage",
            "twelfth_percentage": "education.twelfth.percentage",
            "12th_marks": "education.twelfth.percentage",
            "twelfth_marks": "education.twelfth.percentage",
            "diploma_passing_year": "education.twelfth.passing_year",
            "diploma_year": "education.twelfth.passing_year",
            "diploma_percentage": "education.twelfth.percentage",
            "work_status": "professional_profile.work_status",
            "workstatus": "professional_profile.work_status",
            "experience.total_years": "professional_profile.total_experience_months",
            "experience.total_experience": "professional_profile.total_experience_months",
            "total_years": "professional_profile.total_experience_months",
            "experience.current_job_title": "employment_history.current.role",
            "experience.current_job_title": "employment_history.current.role",
            "current_job_title": "employment_history.current.role",
            "experience.company": "employment_history.current.company_name",
            "experience.company_name": "employment_history.current.company_name",
            "experience.work_from_home": "job_preferences.work_from_home",
            "experience.back_office_bpo": "professional_profile.industry",
            "back_office_bpo": "professional_profile.industry",
            "total_companies": "professional_profile.total_companies",
            "total_companies_worked": "professional_profile.total_companies",
            "professional_profile.total_companies_worked": "professional_profile.total_companies",
            "companies_count": "professional_profile.total_companies",
            "companies_worked": "professional_profile.total_companies",
            "number_of_companies": "professional_profile.total_companies",
            "no_of_companies": "professional_profile.total_companies"
        }
        return alias_map.get(fp, fp)

    def evaluate_call_disposition(self, candidate_id: str, data: Dict[str, Any]) -> str:
        """
        Evaluates candidate call disposition using intelligent recruiter logic and LLM synthesis.
        The candidate is NEVER directly asked 'What is your call disposition?'.
        Once evaluated, the disposition is saved and activates any required child branch fields.
        """
        answers = data.get("field_answers", [])
        # Exclude any previous call_disposition field answers from speech search
        answers_non_disp = [a for a in answers if a.get("field_path") != "call_disposition"]
        all_raw_speech = " ".join([str(a.get("raw_answer", "")).lower() for a in answers_non_disp])

        willing_shifts = str(self._get_nested_value(data, "professional_profile.willingness_to_work_shifts") or "").strip().lower()
        shift_pref = str(self._get_nested_value(data, "professional_profile.shift_preference") or "").strip().lower()
        wfh = str(self._get_nested_value(data, "job_preferences.work_from_home") or "").strip().lower()
        relocate = str(self._get_nested_value(data, "job_preferences.willingness_to_relocate") or "").strip().lower()
        english = str(self._get_nested_value(data, "professional_profile.english_communication") or "").strip().lower()
        notice = str(self._get_nested_value(data, "professional_profile.notice_period") or "").strip().lower()
        exp_salary = self._get_nested_value(data, "salary.expected_monthly_salary") or 0
        work_status = str(self._get_nested_value(data, "professional_profile.work_status") or "").strip().upper()

        # 1. Immediate disqualifications / explicit intents in candidate speech
        if any(k in all_raw_speech for k in ["not interested", "not looking for change", "don't call me", "dont call", "wrong number"]):
            return "Not Interested"

        if any(k in all_raw_speech for k in ["cooling period", "attended interview", "rejected in interview", "attended round"]):
            return "Cooling Period"

        if any(k in all_raw_speech for k in ["busy right now", "call me back", "call later", "driving now", "in meeting", "in class"]):
            return "Busy, Call me Back"

        # 2. Shift Issues
        # Candidate explicitly said No to shifts, or expressed strong shift reluctance
        if willing_shifts in ["no", "false", "nope"] or any(k in all_raw_speech for k in ["cannot work night", "no night shift", "shift issue", "shift problem", "only day shift", "cannot do rotational"]):
            return "Shift Issues"

        # 3. Work From Home only
        if ("home" in wfh and "office" not in wfh) or any(k in all_raw_speech for k in ["only work from home", "wfh only", "remote only"]):
            return "Work from Home"

        # 4. Serving Notice
        if "serving" in notice or any(k in all_raw_speech for k in ["serving notice", "last working day", "official notice", "serving 1 month"]):
            return "Serving Notice"

        # 5. Poor Communication
        if english in ["poor", "low", "average"] or any(k in all_raw_speech for k in ["heavy mti", "poor english", "cannot speak english", "unable to understand"]):
            return "Poor Communication"

        # 6. Non Hiring Zone
        if relocate in ["no", "false"] and any(k in all_raw_speech for k in ["cannot relocate", "won't relocate", "remote location", "not willing to move"]):
            return "Non Hiring Zone"

        # 7. High Salary
        if (work_status == "FRESHER" and isinstance(exp_salary, (int, float)) and exp_salary > 60000) or (isinstance(exp_salary, (int, float)) and exp_salary > 150000):
            return "High Salary"

        # 8. Optional LLM Evaluation for edge cases (with 1.5s timeout safeguard)
        try:
            from backend.app.core.config import settings
            import httpx
            import json
            if settings.SARVAM_API_KEY:
                candidate_summary = (
                    f"Work Status: {work_status}, "
                    f"English: {english}, "
                    f"Willing Shifts: {willing_shifts}, "
                    f"Shift Pref: {shift_pref}, "
                    f"WFH: {wfh}, "
                    f"Relocate: {relocate}, "
                    f"Notice: {notice}, "
                    f"Expected Salary: {exp_salary}. "
                    f"Recent speech: {all_raw_speech[-200:] if len(all_raw_speech) > 200 else all_raw_speech}"
                )
                headers = {
                    "Authorization": f"Bearer {settings.SARVAM_API_KEY}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": settings.SARVAM_MODEL,
                    "messages": [
                        {
                            "role": "system",
                            "content": (
                                "You are an automated recruitment intake evaluator. "
                                "Select the single best call disposition for this candidate from: "
                                "['Line Up Scheduled', 'Shift Issues', 'Work from Home', 'Non Hiring Zone', 'High Salary', 'Poor Communication', 'Not Interested', 'Serving Notice', 'Cooling Period', 'Busy, Call me Back']. "
                                "Return JSON: {\"disposition\": \"...\"}"
                            )
                        },
                        {"role": "user", "content": candidate_summary}
                    ],
                    "response_format": {"type": "json_object"},
                    "temperature": 0.1
                }
                with httpx.Client(timeout=1.5) as client:
                    res = client.post(settings.SARVAM_API_URL, headers=headers, json=payload)
                    if res.status_code == 200:
                        content = res.json()["choices"][0]["message"]["content"]
                        parsed = json.loads(content)
                        disp = parsed.get("disposition")
                        from backend.app.services.live_intake_normalizer import CALL_DISPOSITION_OPTIONS
                        if disp in CALL_DISPOSITION_OPTIONS:
                            return disp
        except Exception:
            pass

        # 9. Default: Candidate is qualified, interested, and ready for interview line-up
        return "Line Up Scheduled"

    def _eval_state_in_memory(self, candidate_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculates form completion metrics directly from the in-memory data dictionary in < 1ms."""
        filled_fields = {}
        missing_fields = []
        total_evaluable = 0
        total_filled = 0

        # Bulletproof Fresher status check
        work_status = self._get_nested_value(data, "professional_profile.work_status")
        tot_exp = self._get_nested_value(data, "professional_profile.total_experience_months")
        is_fresher = (work_status == "FRESHER") or (tot_exp == 0 and work_status is not None and work_status != "EXPERIENCED")

        for f in INTAKE_FORM_FIELDS:
            # Experience and notice period fields MUST never be evaluated for freshers
            if is_fresher and (
                f["field_path"].startswith("employment_history.")
                or f["field_path"] in [
                    "professional_profile.total_experience_months",
                    "professional_profile.total_companies",
                    "professional_profile.notice_period",
                    "salary.current_monthly_salary"
                ]
            ):
                continue

            # Candidate is never directly asked call_disposition
            if f["field_path"] == "call_disposition":
                disp_val = self._get_nested_value(data, "call_disposition")
                if disp_val:
                    filled_fields["call_disposition"] = {
                        "display_name": "Call Disposition",
                        "value": disp_val
                    }
                    total_filled += 1
                total_evaluable += 1
                continue

            # Check dependency
            dep = f.get("depends_on")
            if dep:
                curr_dep_val = self._get_nested_value(data, dep["field"])
                if dep.get("value_not") and curr_dep_val == dep["value_not"]:
                    continue
                if dep.get("value") and curr_dep_val != dep["value"]:
                    continue
                if dep.get("in") and curr_dep_val not in dep["in"]:
                    continue

            total_evaluable += 1
            val = self._get_nested_value(data, f["field_path"])
            if val is not None and val != "" and val != []:
                filled_fields[f["field_path"]] = {
                    "display_name": f["display_name"],
                    "value": val
                }
                total_filled += 1
            else:
                missing_fields.append(f)

        progress_pct = round((total_filled / total_evaluable * 100.0), 1) if total_evaluable > 0 else 0.0

        return {
            "candidate_id": candidate_id,
            "status": data.get("intake_status", "IN_PROGRESS"),
            "total_fields": total_evaluable,
            "filled_fields_count": total_filled,
            "progress_percentage": progress_pct,
            "is_complete": len(missing_fields) == 0,
            "filled_fields": filled_fields,
            "missing_fields": [m["field_path"] for m in missing_fields],
            "raw_candidate_data": data
        }

    def get_intake_form_state(self, candidate_id: str, data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Returns the full intake form state for a candidate in < 1ms."""
        if data is None:
            data = self._get_candidate_data(candidate_id)
        return self._eval_state_in_memory(candidate_id, data)

    def get_next_form_field(self, candidate_id: str, data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Determines the next unfilled field in the intake form and returns pure field metadata in < 1ms.
        """
        if data is None:
            data = self._get_candidate_data(candidate_id)

        state = self._eval_state_in_memory(candidate_id, data)

        # Bulletproof Fresher status check
        work_status = self._get_nested_value(data, "professional_profile.work_status")
        tot_exp = self._get_nested_value(data, "professional_profile.total_experience_months")
        is_fresher = (work_status == "FRESHER") or (tot_exp == 0 and work_status is not None and work_status != "EXPERIENCED")

        for f in INTAKE_FORM_FIELDS:
            # Experience and notice period fields MUST never be prompted to a fresher
            if is_fresher and (
                f["field_path"].startswith("employment_history.")
                or f["field_path"] in [
                    "professional_profile.total_experience_months",
                    "professional_profile.total_companies",
                    "professional_profile.notice_period",
                    "salary.current_monthly_salary"
                ]
            ):
                continue

            # Candidate must NEVER be asked the internal 'call_disposition' question directly.
            # When reaching this step, evaluate disposition via LLM / intelligent rules automatically.
            if f["field_path"] == "call_disposition":
                curr_disp = self._get_nested_value(data, "call_disposition")
                if not curr_disp:
                    curr_disp = self.evaluate_call_disposition(candidate_id, data)
                    self._set_nested_value(data, "call_disposition", curr_disp)
                    # If Line Up Scheduled, auto-populate lineup details from existing profile
                    if curr_disp == "Line Up Scheduled":
                        role = self._get_nested_value(data, "professional_profile.skill_role") or "Candidate"
                        self._set_nested_value(data, "lineup_scheduled_details.lineup_skill_role", role)
                    _CANDIDATE_MEMORY_CACHE[candidate_id] = data
                    _async_persist_candidate(candidate_id, data)
                # Never return call_disposition as a question to the candidate!
                continue

            # Check dependency
            dep = f.get("depends_on")
            if dep:
                curr_dep_val = self._get_nested_value(data, dep["field"])
                if dep.get("value_not") and curr_dep_val == dep["value_not"]:
                    continue
                if dep.get("value") and curr_dep_val != dep["value"]:
                    continue
                if dep.get("in") and curr_dep_val not in dep["in"]:
                    continue

            val = self._get_nested_value(data, f["field_path"])
            if val is None or val == "" or val == []:
                return {
                    "candidate_id": candidate_id,
                    "has_next_field": True,
                    "field_path": f["field_path"],
                    "display_name": f["display_name"],
                    "field_type": f["type"],
                    "description": f.get("description", ""),
                    "options": f.get("options", []),
                    "required": f.get("required", True),
                    "progress_percentage": state["progress_percentage"],
                    "filled_count": state["filled_fields_count"],
                    "total_count": state["total_fields"]
                }

        # Form is fully complete!
        return {
            "candidate_id": candidate_id,
            "has_next_field": False,
            "message": "All intake form fields have been successfully collected.",
            "is_complete": True,
            "progress_percentage": 100.0
        }

    def submit_form_field_answer(
        self, candidate_id: str, field_path: str, candidate_answer: Any
    ) -> Dict[str, Any]:
        """
        Saves candidate's spoken response into memory (< 1ms) and triggers background DB sync.
        Prevents any webhook timeouts during live voice calls.
        """
        data = self._get_candidate_data(candidate_id)

        # Normalize field path to schema target
        normalized_path = self._normalize_field_path(field_path)

        # Find field definition
        field_def = next((f for f in INTAKE_FORM_FIELDS if f["field_path"] == normalized_path), None)
        if not field_def:
            field_def = next((f for f in INTAKE_FORM_FIELDS if f["field_path"] == field_path), None)
        if not field_def:
            # Fallback dynamic field
            field_def = {"field_path": normalized_path, "display_name": normalized_path, "type": "string"}

        # Clean/parse spoken response
        cleaned_value = self._clean_extracted_value(field_def, str(candidate_answer))

        # Store into candidate data
        self._set_nested_value(data, normalized_path, cleaned_value)

        # --- Cross-field intelligence & reconciliation ---
        current_year = datetime.now().year

        # 1. Graduation Passing Year vs Current Year Check (Future Year Logic)
        passing_year_val = self._get_nested_value(data, "education.graduation.passing_year")
        is_pursuing_degree = False
        if passing_year_val:
            pyear_match = re.search(r'\b(20\d\d)\b', str(passing_year_val))
            if pyear_match:
                pyear = int(pyear_match.group(1))
                if pyear > current_year:
                    is_pursuing_degree = True
                    # Candidate will graduate in the future (e.g. 2028 when current year is 2026).
                    # They are currently a student pursuing their degree!
                    self._set_nested_value(data, "education.graduation.status", f"Pursuing (Expected {pyear})")
                    # A currently studying college student cannot be an experienced full-time professional!
                    # Enforce FRESHER work status and clear out any erroneously prompted experience fields
                    self._set_nested_value(data, "professional_profile.work_status", "FRESHER")
                    self._set_nested_value(data, "professional_profile.total_experience_months", 0)
                    self._set_nested_value(data, "professional_profile.total_companies", 0)
                    self._set_nested_value(data, "employment_history.current.company_name", "")
                    self._set_nested_value(data, "employment_history.current.role", "")
                    self._set_nested_value(data, "salary.current_monthly_salary", 0)

        # 2. Fresher detection from spoken responses or 0 months experience
        tot_exp = self._get_nested_value(data, "professional_profile.total_experience_months")
        raw_ans_lower = str(candidate_answer).lower()

        fresher_pattern = r'\b(fresher|freshers|fresh|fresh graduate|fresh candidate|student|studying|pursuing|no experience|zero experience|zero month|0 month|0 year|never worked|no company|haven\'?t worked|not worked|did not work|didn\'?t work)\b'
        is_spoken_fresher = bool(re.search(fresher_pattern, raw_ans_lower)) or any(phrase in raw_ans_lower for phrase in [
            "i am fresher", "i'm fresher", "am fresher", "fresher thaan", "fresher pa", "fresher sir", "fresher mam", "nan fresher", "naan fresher"
        ])

        if (tot_exp == 0 or is_spoken_fresher or cleaned_value == "FRESHER" or (normalized_path == "professional_profile.work_status" and cleaned_value == "FRESHER")) and not is_pursuing_degree:
            self._set_nested_value(data, "professional_profile.work_status", "FRESHER")
            self._set_nested_value(data, "professional_profile.total_experience_months", 0)
            self._set_nested_value(data, "professional_profile.total_companies", 0)
            self._set_nested_value(data, "employment_history.current.company_name", "")
            self._set_nested_value(data, "employment_history.current.role", "")
            self._set_nested_value(data, "salary.current_monthly_salary", 0)

        # 3. Fresher invariant: when work_status is FRESHER, ensure experience fields remain cleared and notice period is Immediate
        if self._get_nested_value(data, "professional_profile.work_status") == "FRESHER":
            self._set_nested_value(data, "professional_profile.total_experience_months", 0)
            self._set_nested_value(data, "professional_profile.total_companies", 0)
            self._set_nested_value(data, "employment_history.current.company_name", "")
            self._set_nested_value(data, "employment_history.current.role", "")
            self._set_nested_value(data, "salary.current_monthly_salary", 0)
            self._set_nested_value(data, "professional_profile.notice_period", "Immediate / Ready to Join")

        # Record answer audit history
        answers = list(data.get("field_answers", []))
        answers.append({
            "field_path": normalized_path,
            "display_name": field_def["display_name"],
            "raw_answer": str(candidate_answer),
            "stored_value": cleaned_value,
            "timestamp": int(time.time())
        })
        data["field_answers"] = answers

        # Update thread-safe memory cache
        _CANDIDATE_MEMORY_CACHE[candidate_id] = data

        # Non-blocking async persistence to PostgreSQL
        _async_persist_candidate(candidate_id, data)

        # Retrieve next field prompt directly using updated data in memory (0ms DB delay)
        next_field_info = self.get_next_form_field(candidate_id, data=data)

        return {
            "status": "SUCCESS",
            "candidate_id": candidate_id,
            "field_saved": normalized_path,
            "display_name": field_def["display_name"],
            "raw_candidate_answer": str(candidate_answer),
            "cleaned_value_stored": cleaned_value,
            "next_field": next_field_info
        }

    def complete_form_sync(self, candidate_id: str) -> Dict[str, Any]:
        """
        Marks form completed instantly in memory and triggers background DB sync and matching.
        """
        data = self._get_candidate_data(candidate_id)
        data["intake_status"] = "COMPLETED"
        _CANDIDATE_MEMORY_CACHE[candidate_id] = data
        _async_persist_candidate(candidate_id, data)

        # Fast match summary retrieval without blocking
        match_summaries = []
        active_count = 0
        try:
            db_session = self.db
            close_after = False
            if not db_session:
                from backend.app.core.database import SessionLocal
                db_session = SessionLocal()
                close_after = True

            matches = db_session.query(CandidateJobMatch).filter(
                CandidateJobMatch.candidate_id == candidate_id
            ).order_by(CandidateJobMatch.overall_score.desc()).limit(5).all()

            for m in matches:
                job = db_session.query(JobDescription).filter(JobDescription.job_id == m.job_id).first()
                match_summaries.append({
                    "job_id": m.job_id,
                    "job_title": job.title if job else m.job_id,
                    "overall_score": m.overall_score,
                    "status": m.status,
                    "score_breakdown": m.score_breakdown,
                    "matched_requirements": m.matched_requirements
                })

            active_count = db_session.query(JobDescription).filter(JobDescription.is_active == True).count()
            if close_after:
                db_session.close()
        except Exception as e:
            logger.warning(f"Error fetching matches in complete_form_sync: {e}")

        return {
            "status": "COMPLETED",
            "candidate_id": candidate_id,
            "jobs_evaluated": active_count,
            "jobs_matched": len(match_summaries),
            "top_job_matches": match_summaries,
            "message": "Candidate intake form completed successfully."
        }

    async def complete_and_match_form(self, candidate_id: str) -> Dict[str, Any]:
        """Async wrapper for complete_form_sync."""
        return self.complete_form_sync(candidate_id)
