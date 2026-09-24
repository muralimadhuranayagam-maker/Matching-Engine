import re
from typing import Any, Dict, List, Optional, Tuple, Union

# ============================================================
# Centralized schema definition matching candidateIntakeSchema
# ============================================================

ALLOWED_SCHEMA_FIELDS: Dict[str, type] = {
    # Personal & Contact
    "personal.first_name": str,
    "personal.last_name": str,
    "personal.gender": str,
    "personal.date_of_birth": str,
    "personal.age": int,
    "personal.marital_status": str,
    "personal.mother_tongue": str,
    "personal.knowledge_of_hindi": str,
    "contact.phone": str,
    "contact.email": str,

    # Address Details
    "address.current.address_line": str,
    "address.current.pincode": str,
    "address.current.area": str,
    "address.current.city": str,
    "address.current.state": str,
    "address.permanent.address_line": str,
    "address.permanent.pincode": str,
    "address.permanent.area": str,
    "address.permanent.city": str,
    "address.permanent.state": str,

    # Education Details
    "education.tenth.school_name": str,
    "education.tenth.status": str,
    "education.tenth.passing_year": str,
    "education.tenth.percentage": float,
    "education.tenth.gap_reason": str,

    "education.twelfth.school_or_college_name": str,
    "education.twelfth.status": str,
    "education.twelfth.passing_year": str,
    "education.twelfth.percentage": float,
    "education.twelfth.gap_reason": str,

    "education.diploma.institution_name": str,
    "education.diploma.status": str,
    "education.diploma.diploma_type": str,
    "education.diploma.passing_year": str,
    "education.diploma.percentage": float,
    "education.diploma.gap_reason": str,

    "education.graduation.college_name": str,
    "education.graduation.university_name": str,
    "education.graduation.degree": str,
    "education.graduation.status": str,
    "education.graduation.passing_year": str,
    "education.graduation.percentage": float,
    "education.graduation.cgpa": float,
    "education.graduation.gap_reason": str,

    "education.graduation.undergraduation.college_name": str,
    "education.graduation.undergraduation.university_name": str,
    "education.graduation.undergraduation.degree": str,
    "education.graduation.undergraduation.passing_year": str,
    "education.graduation.undergraduation.percentage": float,
    "education.graduation.undergraduation.cgpa": float,
    "education.graduation.undergraduation.gap_reason": str,

    # Professional Profile
    "professional_profile.work_status": str,
    "professional_profile.total_experience_years": int,
    "professional_profile.total_experience_months": int,
    "professional_profile.total_companies": int,
    "professional_profile.skill_role": str,
    "professional_profile.skill": (str, list),
    "professional_profile.industry": str,
    "professional_profile.english_communication": str,

    # Employment History
    "employment_history.current.company_name": str,
    "employment_history.current.role": str,
    "employment_history.current.process_name": str,
    "employment_history.current.skill": str,
    "employment_history.current.joining_date": str,
    "employment_history.current.last_working_day": str,
    "employment_history.current.monthly_salary": float,
    "employment_history.current.notice_period": str,
    "employment_history.current.reason_for_leaving": str,
    "employment_history.previous_companies": list,

    # Preferences & Salary
    "job_preferences.job_city": str,
    "job_preferences.preferred_area": str,
    "job_preferences.shift_base": str,
    "job_preferences.work_from_home": bool,
    "job_preferences.expected_salary_monthly": float,

    "salary.current_monthly_salary": float,
    "salary.expected_monthly_salary": float,

    "availability.last_working_day": str,
    "availability.notice_period": str,
    "availability.available_from": str,

    "dnd_status": str,
    "call_disposition": str,

    # Conditional Disposition Branches
    "poor_communication_assessment.poor_communication_reason": str,
    "poor_communication_assessment.fit_domestic_or_non_voice": str,

    "non_hiring_zone_details.candidate_pincode": str,
    "non_hiring_zone_details.candidate_area": str,
    "non_hiring_zone_details.no_hiring_zone_company": str,
    "non_hiring_zone_details.no_hiring_zone_process": str,
    "non_hiring_zone_details.stay_type": str,
    "non_hiring_zone_details.will_relocate": str,

    "not_interested_details.not_interested_reason": str,

    "high_salary_assessment.expected_salary_monthly": float,
    "high_salary_assessment.communication_matches_salary": str,
    "high_salary_assessment.experience_matches_salary": str,
    "high_salary_assessment.has_paying_company": str,
    "high_salary_assessment.paying_company_name": str,
    "high_salary_assessment.paying_process_name": str,
    "high_salary_assessment.reminder_active_process": str,

    "age_limit_details.candidate_dob_age_limit": str,

    "career_gap_details.career_gap_gender": str,
    "career_gap_details.career_gap_dob": str,
    "career_gap_details.career_gap_reason": str,

    "no_company_details.no_company_reason": str,

    "other_domain_experience_details.other_domain_name": str,
    "other_domain_experience_details.interested_in_bpo_job": str,

    "busy_call_me_back_details.able_to_judge_communication": str,
    "busy_call_me_back_details.callback_english_communication": str,
    "busy_call_me_back_details.send_details_for_callback": str,

    "work_from_home_details.wfh_address_pincode": str,
    "work_from_home_details.flexible_to_work_from_office": str,

    "outstation_candidate_details.outstation_address_pincode": str,

    "shift_issues_details.preferred_shift_choice": str,
    "shift_issues_details.shift_preference_reason": str,
    "shift_issues_details.shift_go_to_lineup": str,

    "non_hiring_university_details.non_hiring_uni_10th_status": str,
    "non_hiring_university_details.non_hiring_uni_10th_year": str,
    "non_hiring_university_details.non_hiring_uni_10th_gap_reason": str,
    "non_hiring_university_details.non_hiring_uni_12th_status": str,
    "non_hiring_university_details.non_hiring_uni_12th_year": str,
    "non_hiring_university_details.non_hiring_uni_12th_gap_reason": str,
    "non_hiring_university_details.non_hiring_uni_diploma_status": str,
    "non_hiring_university_details.non_hiring_uni_diploma_type": str,
    "non_hiring_university_details.non_hiring_uni_diploma_year": str,
    "non_hiring_university_details.non_hiring_uni_diploma_gap_reason": str,
    "non_hiring_university_details.non_hiring_uni_graduation_status": str,
    "non_hiring_university_details.non_hiring_uni_graduation_year": str,
    "non_hiring_university_details.non_hiring_uni_graduation_gap_reason": str,

    "serving_notice_details.serving_notice_skill": str,
    "serving_notice_details.serving_notice_english_communication": str,
    "serving_notice_details.current_working_company": str,
    "serving_notice_details.last_working_day": str,
    "serving_notice_details.fit_target_company": str,
    "serving_notice_details.fit_target_process": str,
    "serving_notice_details.reminder_job_available": str,

    "cooling_period_details.rejected_company_name": str,
    "cooling_period_details.rejection_round": str,
    "cooling_period_details.rejection_date": str,
    "cooling_period_details.cooling_period_duration": str,

    "other_recruiter_details.assigned_other_recruiter": str,
    "other_recruiter_details.other_recruiter_notes": str,

    "call_disconnected_details.call_duration_seconds": float,
    "call_disconnected_details.call_disconnected_judge_communication": str,
    "call_disconnected_details.call_disconnected_english_communication": str,
    "call_disconnected_details.call_disconnected_fit_domestic_or_non_voice": str,
    "call_disconnected_details.call_disconnected_send_details_for_callback": str,

    "lineup_scheduled_details.lineup_skill_role": str,
    "lineup_skill_role": str,
}

# ============================================================
# Canonical Enum & Option Dictionaries from src/config/options.ts
# ============================================================

GENDER_OPTIONS = ["Male", "Female", "Other"]
MARITAL_STATUS_OPTIONS = ["Single", "Married", "Divorced", "Widowed"]
WORK_STATUS_OPTIONS = ["FRESHER", "EXPERIENCED"]
ENGLISH_COMMUNICATION_OPTIONS = ["Excellent", "Very good", "Good", "Average", "Poor"]
GRADUATION_STATUS_OPTIONS = ["UG", "PG"]
BOARD_OPTIONS = [
    "State Board", "CBSE", "ICSE", "ISC", "IB (International Baccalaureate)",
    "IGCSE / Cambridge", "Open Board (NIOS)", "Other"
]
SHIFT_BASE_OPTIONS = [
    "Any shift", "Day shift only", "Night shift only",
    "UK Shift", "US Shift", "AUS Shift", "Domestic Shift", "Rotational"
]
DND_STATUS_OPTIONS = ["Activate", "Deactivate"]
YES_NO_OPTIONS = ["Yes", "No"]

CALL_DISPOSITION_OPTIONS = [
    "Poor Communication", "Non Hiring Zone", "Not Interested", "High Salary",
    "Age Limit", "Career Gap", "No Company", "Voice Mail",
    "Other Domain Experience", "Busy, Call me Back", "Work from Home",
    "Out Station Candidate", "Shift Issues", "Non Hiring University",
    "No Education Documents", "No Experience Documents", "Serving Notice",
    "Line Up Scheduled", "Call Disconnected", "Cooling Period",
    "Need Weekend Off", "Other Recruiter"
]

SKILL_ROLE_OPTIONS = [
    "Software Engineer",
    "Customer Support Associate",
    "Technical Support Executive",
    "Quality Analyst",
    "Team Leader",
    "Process Trainer",
    "Operations Manager",
    "Data Entry Operator",
    "Sales Executive",
    "MIS Executive",
    "HR Executive",
    "Other"
]

ROLE_SKILLS_MAP = {
    "Software Engineer": [
        "C#", "ASP.NET Core", ".NET Core", "MySQL", "React", "Angular",
        "JavaScript", "TypeScript", "Node.js", "Python", "Java", "Spring Boot",
        "SQL / PostgreSQL", "MongoDB", "FastAPI / Django", "Vue.js",
        "HTML5 / CSS3 / Tailwind", "REST APIs / GraphQL", "Docker & Kubernetes",
        "AWS / Azure / GCP", "Git / GitHub", "CI/CD Pipelines",
        "Microservices Architecture", "Unit Testing / TDD"
    ],
    "Customer Support Associate": [
        "Inbound Customer Support", "Outbound Customer Support",
        "Voice Process - Domestic", "Voice Process - International",
        "Live Chat Support", "Email Support & Ticketing", "Blended Customer Service",
        "Customer Retention & Loyalty", "Escalation Management",
        "CRM & Zendesk / Freshdesk", "Query & Grievance Handling",
        "Active Listening & Empathy", "First Contact Resolution (FCR)",
        "Customer Satisfaction (CSAT)"
    ],
    "Technical Support Executive": [
        "L1 Technical Support", "L2 Technical Support",
        "Hardware & Desktop Troubleshooting", "Software Installation & Configuration",
        "Network Support (LAN/WAN/DNS/DHCP)", "Remote Desktop Support (AnyDesk/TeamViewer)",
        "Active Directory & User Management", "VPN & Firewall Troubleshooting",
        "Windows OS / Linux / macOS Support", "ServiceNow / Jira Service Management",
        "Incident & Ticket Lifecycle Management", "Email & Outlook Configuration"
    ]
}

# Flatten all known skills for fast lookup
ALL_CANONICAL_SKILLS = set()
for skills in ROLE_SKILLS_MAP.values():
    for s in skills:
        ALL_CANONICAL_SKILLS.add(s)

# ============================================================
# Normalization Functions
# ============================================================

def normalize_enum_value(val: str, options: List[str]) -> Optional[str]:
    """Matches a spoken string or code to an exact canonical option in the options list."""
    if not val:
        return None
    val_clean = str(val).strip().lower()
    
    # Direct case-insensitive match
    for opt in options:
        if val_clean == opt.lower():
            return opt
            
    # Substring / partial match
    for opt in options:
        opt_lower = opt.lower()
        if val_clean in opt_lower or opt_lower in val_clean:
            return opt
            
    return None

def normalize_field_update(field_path: str, raw_value: Any) -> Tuple[Optional[str], Any, Optional[str]]:
    """
    Validates and normalizes a single field/value update.
    Returns: (canonical_field_path, canonical_value, error_message)
    """
    if field_path not in ALLOWED_SCHEMA_FIELDS:
        # Check shorthand mappings
        shorthand_map = {
            "first_name": "personal.first_name",
            "last_name": "personal.last_name",
            "gender": "personal.gender",
            "phone": "contact.phone",
            "email": "contact.email",
            "pincode": "address.current.pincode",
            "city": "address.current.city",
            "workStatus": "professional_profile.work_status",
            "work_status": "professional_profile.work_status",
            "experience": "professional_profile.total_experience_years",
            "total_experience_years": "professional_profile.total_experience_years",
            "company": "employment_history.current.company_name",
            "lastCompany": "employment_history.current.company_name",
            "company_name": "employment_history.current.company_name",
            "role": "employment_history.current.role",
            "designation": "employment_history.current.role",
            "skill": "professional_profile.skill",
            "skills": "professional_profile.skill",
            "skill_role": "professional_profile.skill_role",
            "shift": "job_preferences.shift_base",
            "shift_base": "job_preferences.shift_base",
            "shiftBase": "job_preferences.shift_base",
            "disposition": "call_disposition",
        }
        if field_path in shorthand_map:
            field_path = shorthand_map[field_path]
        else:
            return None, None, f"Unknown field path: '{field_path}'. Rejected by schema validator."

    expected_type = ALLOWED_SCHEMA_FIELDS[field_path]

    # Handle None or empty
    if raw_value is None:
        return field_path, None, None

    # Handle Work Status Enum
    if field_path == "professional_profile.work_status":
        s = str(raw_value).strip().upper()
        if "EXP" in s or "YEAR" in s or "MONTH" in s or "WORK" in s or "JOB" in s:
            return field_path, "EXPERIENCED", None
        elif "FRESH" in s or "STUDENT" in s or "NONE" in s or "0" in s:
            return field_path, "FRESHER", None
        matched = normalize_enum_value(str(raw_value), list(WORK_STATUS_OPTIONS))
        if matched:
            return field_path, matched, None
        return field_path, "EXPERIENCED" if "exp" in s else "FRESHER", None

    # Handle Gender Enum
    if field_path == "personal.gender":
        matched = normalize_enum_value(str(raw_value), GENDER_OPTIONS)
        if matched:
            return field_path, matched, None
        return None, None, f"Invalid gender: {raw_value}. Allowed: {GENDER_OPTIONS}"

    # Handle Shift Preference Enum
    if field_path in ("job_preferences.shift_base", "shift_issues_details.preferred_shift_choice"):
        s = str(raw_value).lower()
        if "day" in s:
            return field_path, "Day shift only", None
        elif "night" in s:
            return field_path, "Night shift only", None
        elif "us" in s:
            return field_path, "US Shift", None
        elif "uk" in s:
            return field_path, "UK Shift", None
        elif "aus" in s:
            return field_path, "AUS Shift", None
        elif "rotational" in s:
            return field_path, "Rotational", None
        elif "domestic" in s:
            return field_path, "Domestic Shift", None
        elif "any" in s or "flexible" in s:
            return field_path, "Any shift", None
        matched = normalize_enum_value(str(raw_value), SHIFT_BASE_OPTIONS)
        if matched:
            return field_path, matched, None
        return field_path, "Any shift", None

    # Handle Call Disposition Enum
    if field_path == "call_disposition":
        matched = normalize_enum_value(str(raw_value), CALL_DISPOSITION_OPTIONS)
        if matched:
            return field_path, matched, None
        return None, None, f"Invalid call disposition: {raw_value}"

    # Handle English Communication Enum
    if field_path in ("professional_profile.english_communication", "busy_call_me_back_details.callback_english_communication"):
        matched = normalize_enum_value(str(raw_value), ENGLISH_COMMUNICATION_OPTIONS)
        if matched:
            return field_path, matched, None
        return field_path, "Good", None

    # Handle Graduation Status
    if field_path == "education.graduation.status":
        s = str(raw_value).strip().upper()
        if "PG" in s or "POST" in s or "MASTER" in s:
            return field_path, "PG", None
        return field_path, "UG", None

    # Handle Skills (Can be single string or list of strings)
    if field_path == "professional_profile.skill":
        if isinstance(raw_value, list):
            clean_skills = []
            for item in raw_value:
                clean_item = str(item).strip()
                # Check canonical match
                found = False
                for c_skill in ALL_CANONICAL_SKILLS:
                    if clean_item.lower() == c_skill.lower():
                        clean_skills.append(c_skill)
                        found = True
                        break
                if not found and clean_item:
                    clean_skills.append(clean_item)
            return field_path, clean_skills, None
        elif isinstance(raw_value, str):
            clean_val = raw_value.strip()
            # If comma or 'and' separated, split into list
            if "," in clean_val or " and " in clean_val:
                parts = re.split(r",|\sand\s", clean_val)
                parsed_list = [p.strip() for p in parts if p.strip()]
                return field_path, parsed_list, None
            # Check canonical skill
            for c_skill in ALL_CANONICAL_SKILLS:
                if clean_val.lower() == c_skill.lower():
                    return field_path, c_skill, None
            return field_path, clean_val, None

    # Handle Skill / Role
    if field_path == "professional_profile.skill_role":
        matched = normalize_enum_value(str(raw_value), SKILL_ROLE_OPTIONS)
        if matched:
            return field_path, matched, None
        return field_path, str(raw_value).strip(), None

    # Handle Numbers (years, months, companies, salary, age, percentage)
    if expected_type in (int, float):
        if isinstance(raw_value, (int, float)):
            return field_path, expected_type(raw_value), None
        s = str(raw_value).strip()
        # Extract numeric characters (e.g. "3 years" -> 3, "25,000" -> 25000)
        num_match = re.search(r"[-+]?\d*\.?\d+", s.replace(",", ""))
        if num_match:
            try:
                num_val = expected_type(float(num_match.group(0)))
                return field_path, num_val, None
            except ValueError:
                pass
        return None, None, f"Expected numeric value for '{field_path}', got: '{raw_value}'"

    # Handle Strings
    if expected_type == str:
        s_val = str(raw_value).strip()
        return field_path, s_val, None

    return field_path, raw_value, None


def sanitize_and_order_updates(updates: Dict[str, Any]) -> Tuple[Dict[str, Any], List[str]]:
    """
    Sanitizes all updates, rejects invalid fields, and orders TRIGGER fields first.
    For example, ensures 'professional_profile.work_status' is set before
    'employment_history.current.company_name'.
    """
    valid_updates: Dict[str, Any] = {}
    errors: List[str] = []

    for path, val in updates.items():
        canonical_path, canonical_val, err = normalize_field_update(path, val)
        if err:
            errors.append(err)
        elif canonical_path:
            valid_updates[canonical_path] = canonical_val

    # AUTOMATIC TRIGGER ENFORCEMENT:
    # 1. If any employment_history fields are present, ensure work_status is EXPERIENCED
    has_employment = any(k.startswith("employment_history.current") for k in valid_updates)
    if has_employment and valid_updates.get("professional_profile.work_status") != "FRESHER":
        valid_updates["professional_profile.work_status"] = "EXPERIENCED"

    # 2. If graduation status is PG and undergrad is present, ensure graduation status is PG
    has_undergrad = any(k.startswith("education.graduation.undergraduation") for k in valid_updates)
    if has_undergrad:
        valid_updates["education.graduation.status"] = "PG"

    # 3. Order trigger fields first
    trigger_keys = [
        "call_disposition",
        "professional_profile.work_status",
        "education.graduation.status",
    ]

    ordered_updates: Dict[str, Any] = {}
    for t_key in trigger_keys:
        if t_key in valid_updates:
            ordered_updates[t_key] = valid_updates[t_key]

    for k, v in valid_updates.items():
        if k not in ordered_updates:
            ordered_updates[k] = v

    return ordered_updates, errors
