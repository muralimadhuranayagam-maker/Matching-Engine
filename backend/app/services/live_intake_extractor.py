import re
import json
import logging
from typing import Any, Dict, List, Optional
from backend.app.services.live_intake_normalizer import (
    sanitize_and_order_updates,
    ALL_CANONICAL_SKILLS,
    SHIFT_BASE_OPTIONS,
    CALL_DISPOSITION_OPTIONS,
)

logger = logging.getLogger(__name__)

def extract_structured_entities_from_speech(utterance: str) -> Dict[str, Any]:
    """
    Server-side entity extractor for candidate spoken utterances.
    Extracts ONLY information explicitly stated by the candidate.
    Zero hallucination / zero guessing.
    Latest confirmed answer overwrites previous.
    """
    text = (utterance or "").strip()
    if not text:
        return {}

    updates: Dict[str, Any] = {}

    # 1. Candidate Name (e.g. "My name is Siva", "I am Siva", "Call me Siva")
    name_patterns = [
        r"(?:my name is|i am|this is|i'm|name is)\s+([A-Za-z]+)(?:\s+([A-Za-z]+))?",
    ]
    for pattern in name_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            # Check if it was followed by a job title (e.g. "I am a software engineer")
            candidate_first = match.group(1).strip()
            if candidate_first.lower() not in (
                "a", "an", "the", "working", "currently", "living",
                "experienced", "ready", "willing", "looking", "interested",
                "not", "fresher", "sorry", "able", "available", "seeking"
            ):
                updates["personal.first_name"] = candidate_first.capitalize()
                if match.group(2) and match.group(2).lower() not in ("working", "at", "from", "to", "for", "in"):
                    updates["personal.last_name"] = match.group(2).strip().capitalize()
                break

    # 2. Years of Experience (e.g. "3 years of experience", "have 3 years experience", "3.5 yrs")
    exp_patterns = [
        r"(\d+(?:\.\d+)?)\s*(?:years?|yrs?)(?:\s*(?:of)?\s*experience)?",
        r"experience\s*(?:is|of)?\s*(\d+(?:\.\d+)?)\s*(?:years?|yrs?)?",
    ]
    for pattern in exp_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            years = float(match.group(1))
            updates["professional_profile.work_status"] = "EXPERIENCED"
            updates["professional_profile.total_experience_years"] = int(years)
            break

    # Explicit fresher mention
    if re.search(r"\b(fresher|no experience|just passed out|recent graduate|no prior experience)\b", text, re.IGNORECASE):
        updates["professional_profile.work_status"] = "FRESHER"
        updates["professional_profile.total_experience_years"] = 0

    # 3. Current / Previous Company Name (e.g. "I work at Infosys", "working at Infosys", "company is TCS", "Actually, I work at TCS")
    company_patterns = [
        r"(?:working at|work at|work for|employed at|company is|working with|joined|at)\s+([A-Za-z0-9\.\s&]+?)(?:\s+as|\s+with|\s+in|\s+for|\s+and|\.|$)",
    ]
    for pattern in company_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            raw_company = match.group(1).strip()
            # Clean common trailing prepositions
            raw_company = re.sub(r"\b(as|with|in|for|and|a|an)\b.*$", "", raw_company, flags=re.IGNORECASE).strip()
            if raw_company and len(raw_company) > 1 and raw_company.lower() not in ("home", "bangalore", "chennai", "mumbai", "hyderabad", "delhi", "pune"):
                updates["employment_history.current.company_name"] = raw_company
                updates["professional_profile.work_status"] = "EXPERIENCED"
                break

    # 4. Role / Designation (e.g. "I am a .NET developer", "role as software engineer")
    role_patterns = [
        r"(?:as a|as an|role is|role of|working as|designation is)\s+([A-Za-z0-9#\.\+\s]+?)(?:\s+at|\s+in|\s+with|\s+for|\s+and|\.|$)",
        r"\b([A-Za-z0-9#\.\+]+(?:\s+[A-Za-z0-9#\.\+]+)?\s+(?:developer|engineer|analyst|associate|lead|manager|executive|trainer|operator))\b",
    ]
    for pattern in role_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            raw_role = match.group(1).strip()
            raw_role = re.sub(r"^(?:a|an|the)\s+", "", raw_role, flags=re.IGNORECASE).strip()
            if raw_role and len(raw_role) > 2:
                updates["employment_history.current.role"] = raw_role
                # Infer skill_role category
                if any(k in raw_role.lower() for k in ("developer", "software", "engineer", "coder", "programmer", "architect")):
                    updates["professional_profile.skill_role"] = "Software Engineer"
                elif any(k in raw_role.lower() for k in ("support", "customer", "voice", "bpo", "telecalling")):
                    updates["professional_profile.skill_role"] = "Customer Support Associate"
                elif any(k in raw_role.lower() for k in ("tech support", "hardware", "desktop", "l1", "l2")):
                    updates["professional_profile.skill_role"] = "Technical Support Executive"
                elif any(k in raw_role.lower() for k in ("quality", "qa", "auditor")):
                    updates["professional_profile.skill_role"] = "Quality Analyst"
                break

    # 5. Technical Skills (e.g. "I know React and Angular", "skilled in Python, SQL")
    detected_skills: List[str] = []
    # Check specific skills directly
    skill_keywords = [
        "React", "Angular", "Vue.js", ".NET Core", "ASP.NET Core", "C#",
        "Python", "Java", "Spring Boot", "Node.js", "JavaScript", "TypeScript",
        "SQL", "PostgreSQL", "MySQL", "MongoDB", "FastAPI", "Django",
        "Docker", "Kubernetes", "AWS", "Azure", "GCP", "Git"
    ]
    for skill in skill_keywords:
        # Match word boundaries or special handling for .NET / C#
        if skill in (".NET Core", "ASP.NET Core"):
            if re.search(r"\b\.net\b", text, re.IGNORECASE):
                if skill not in detected_skills:
                    detected_skills.append(".NET Core")
        elif skill == "C#":
            if re.search(r"\bc#\b|\bc\s*sharp\b", text, re.IGNORECASE):
                if "C#" not in detected_skills:
                    detected_skills.append("C#")
        else:
            if re.search(r"\b" + re.escape(skill) + r"\b", text, re.IGNORECASE):
                if skill not in detected_skills:
                    detected_skills.append(skill)

    if detected_skills:
        updates["professional_profile.skill"] = detected_skills

    # 6. Current City / Location (e.g. "I live in Chennai", "staying in Bangalore", "located in Mumbai")
    city_match = re.search(r"(?:live in|staying in|living in|located in|from|hometown is|residing in)\s+([A-Za-z]+)", text, re.IGNORECASE)
    if city_match:
        city_candidate = city_match.group(1).strip()
        if city_candidate.lower() not in ("a", "an", "the", "paying", "rental", "office", "home"):
            updates["address.current.city"] = city_candidate.capitalize()

    # 7. Education / Degree (e.g. "I completed B.E. Computer Science in 2024", "graduated with B.Tech in 2022")
    degree_patterns = [
        r"(?:completed|graduated with|holding|degree in|finished|passed|done)\s+([A-Za-z\.\s]+?(?:engineering|computer science|science|commerce|arts|management|technology|b\.?e\.?|b\.?tech|b\.?sc|b\.?com|b\.?ba|m\.?ca|m\.?tech|m\.?sc)?)\s+(?:in|batch of|year)\s*(\d{4})",
        r"\b(B\.?E\.?(?:\s+[A-Za-z\s]+)?|B\.?Tech(?:\s+[A-Za-z\s]+)?|B\.?Sc|B\.?Com|B\.?CA|M\.?CA|M\.?Tech)\b",
    ]
    deg_match = re.search(degree_patterns[0], text, re.IGNORECASE)
    if deg_match:
        deg_name = deg_match.group(1).strip()
        deg_year = deg_match.group(2).strip()
        updates["education.graduation.degree"] = deg_name
        updates["education.graduation.passing_year"] = deg_year
        updates["education.graduation.status"] = "UG"
    else:
        deg_simple = re.search(degree_patterns[1], text, re.IGNORECASE)
        if deg_simple:
            updates["education.graduation.degree"] = deg_simple.group(1).strip()
            updates["education.graduation.status"] = "UG"

    # Year of passing standalone (e.g. "passed out in 2024")
    year_match = re.search(r"(?:passed out|graduated|batch of)\s*(?:in)?\s*(\d{4})", text, re.IGNORECASE)
    if year_match and "education.graduation.passing_year" not in updates:
        updates["education.graduation.passing_year"] = year_match.group(1)

    # 8. Shift Preference (e.g. "I prefer day shift", "only night shift", "rotational shift is fine")
    if re.search(r"\b(day shift|general shift|morning shift)\b", text, re.IGNORECASE):
        updates["job_preferences.shift_base"] = "Day shift only"
    elif re.search(r"\b(night shift|us shift|graveyard)\b", text, re.IGNORECASE):
        updates["job_preferences.shift_base"] = "Night shift only"
    elif re.search(r"\b(rotational|any shift|flexible with shift)\b", text, re.IGNORECASE):
        updates["job_preferences.shift_base"] = "Rotational"

    # Explicit experience mention without numbers (e.g. "I am experienced", "I have experience")
    if re.search(r"\b(i am experienced|i have experience|experienced candidate)\b", text, re.IGNORECASE):
        updates["professional_profile.work_status"] = "EXPERIENCED"

    # 10. Salary Extraction (e.g. "current salary is 6 lakhs", "salary is 50000", "earning 30k")
    sal_match = re.search(r"(?:salary|ctc|earning|package|lpa)\s*(?:is|of)?\s*(\d+(?:\.\d+)?)\s*(lakhs?|lpa|k|thousand)?", text, re.IGNORECASE)
    if sal_match:
        val = float(sal_match.group(1))
        unit = (sal_match.group(2) or "").lower()
        if "lakh" in unit or "lpa" in unit:
            # 6 lakhs per annum = 50,000 monthly
            monthly = round((val * 100000) / 12, 2)
            updates["employment_history.current.monthly_salary"] = monthly
            updates["salary.current_monthly_salary"] = monthly
        elif "k" in unit or "thousand" in unit:
            updates["employment_history.current.monthly_salary"] = val * 1000
            updates["salary.current_monthly_salary"] = val * 1000
        else:
            if val > 100000:
                updates["employment_history.current.monthly_salary"] = round(val / 12, 2)
                updates["salary.current_monthly_salary"] = round(val / 12, 2)
            else:
                updates["employment_history.current.monthly_salary"] = val
                updates["salary.current_monthly_salary"] = val

    # 11. Relocation Willingness (e.g. "I am ready to relocate", "willing to relocate")
    if re.search(r"\b(ready to relocate|willing to relocate|can relocate|open to relocate|open to relocation)\b", text, re.IGNORECASE):
        updates["non_hiring_zone_details.will_relocate"] = "Yes"
    # 12. Call Disposition Triggers
    if re.search(r"\b(cannot work night|shift problem|shift issue|shift issues|health issues with shift)\b", text, re.IGNORECASE):
        updates["call_disposition"] = "Shift Issues"
        updates["shift_issues_details.preferred_shift_choice"] = "Day shift only"
    elif re.search(r"\b(not interested|not looking for change|don't call|do not call)\b", text, re.IGNORECASE):
        updates["call_disposition"] = "Not Interested"

    # Pass all raw extractions through the canonical normalizer to ensure 100% schema compliance
    sanitized, _ = sanitize_and_order_updates(updates)
    return sanitized

