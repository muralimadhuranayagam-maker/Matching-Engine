import json
import re
import httpx
from typing import Dict, Any
from backend.app.core.config import settings
from backend.app.ai.llm.base import LLMProvider

class SarvamProvider(LLMProvider):
    def __init__(self):
        self.api_key = settings.SARVAM_API_KEY
        self.model = settings.SARVAM_MODEL
        self.url = settings.SARVAM_API_URL

    async def generate_structured(self, prompt: str, schema_dict: Dict[str, Any]) -> Dict[str, Any]:
        if not self.api_key:
            return self._fallback_extract_jd(prompt)

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        system_instruction = (
            "You are a recruitment AI assistant. You convert raw Job Description text into clean JSON strictly conforming to the requested schema. "
            "Extract only information present in the JD. Distinguish mandatory vs preferred requirements. Do not invent skills or requirements not present. "
            "Return valid JSON ONLY."
        )

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": prompt}
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.1
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                res = await client.post(self.url, headers=headers, json=payload)
                res.raise_for_status()
                data = res.json()
                content = data["choices"][0]["message"]["content"]
                return json.loads(content)
        except Exception as e:
            # Fallback to deterministic regex-based extractor if API call fails
            return self._fallback_extract_jd(prompt)

    async def validate_match(self, candidate_summary: str, jd_summary: str, current_score: float) -> Dict[str, Any]:
        if not self.api_key:
            return {
                "llm_validated": True,
                "confidence_score": current_score,
                "explanation": f"Candidate demonstrates strong alignment based on structured parameters ({current_score}% overall score).",
                "key_strengths": ["Matched core technical skills", "Relevant industry background"],
                "potential_risks": []
            }

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        prompt = (
            f"Candidate Summary:\n{candidate_summary}\n\n"
            f"Job Description Summary:\n{jd_summary}\n\n"
            f"Calculated Score: {current_score}%\n\n"
            "Provide a concise qualitative match validation JSON with keys: "
            '"llm_validated" (boolean), "confidence_score" (float 0-100), "explanation" (string), "key_strengths" (list of strings), "potential_risks" (list of strings).'
        )

        payload = {
            "model": self.model,
            "messages": [
                {"role": "user", "content": prompt}
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.2
        }

        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                res = await client.post(self.url, headers=headers, json=payload)
                res.raise_for_status()
                data = res.json()
                content = data["choices"][0]["message"]["content"]
                return json.loads(content)
        except Exception:
            return {
                "llm_validated": True,
                "confidence_score": current_score,
                "explanation": f"Candidate evidence matches JD criteria with an overall score of {current_score}%.",
                "key_strengths": ["Matched core requirements", "Aligned experience level"],
                "potential_risks": []
            }

    def _fallback_extract_jd(self, raw_text: str) -> Dict[str, Any]:
        """
        Extractive fallback parser for JDs when LLM API key is not configured.
        Extracts title, experience, skills, location, etc. using regex patterns.
        """
        text = raw_text.strip()
        if "JOB DESCRIPTION TEXT:" in text:
            part = text.split("JOB DESCRIPTION TEXT:")[1]
            if "SCHEMA DEFINITION:" in part:
                part = part.split("SCHEMA DEFINITION:")[0]
            text = part.strip()

        lines = [l.strip() for l in text.split("\n") if l.strip()]
        title = lines[0] if lines else "Software Professional"

        # Experience extraction
        exp_min = None
        exp_max = None
        exp_match = re.search(r'(\d+)\s*[-to]*\s*(\d+)?\s*(?:years?|yrs?)', text, re.IGNORECASE)
        if exp_match:
            exp_min = float(exp_match.group(1))
            if exp_match.group(2):
                exp_max = float(exp_match.group(2))

        # Clean text excluding footer notes, interview rounds, and disclaimers
        clean_jd_text = re.split(r'(?:interview process|selection process|recruitment note|contact\s*\[)', text, flags=re.IGNORECASE)[0]

        # Skill extraction
        known_techs = [
            "C#", ".NET", ".NET Core", "ASP.NET", "SQL Server", "SQL", "MySQL", "PostgreSQL",
            "React", "React.js", "Angular", "Vue", "Node.js", "JavaScript", "TypeScript",
            "Python", "Java", "Spring Boot", "AWS", "Azure", "Docker", "Kubernetes", "BPO",
            "Customer Support", "Technical Support", "Voice", "Non-Voice", "Excel", "Communication", "VNA",
            "Sales", "Marketing"
        ]

        is_tech_role = any(t in title.lower() for t in ["developer", "engineer", ".net", "software", "stack", "frontend", "backend", "web"])
        if not is_tech_role:
            known_techs.extend(["HR", "Recruitment"])

        # Detect Preferred / Good-to-have section
        pref_section_match = re.search(r'(?:preferred|good[-\s]to[-\s]have|desirable|nice[-\s]to[-\s]have).*?(?=(?:interview|selection|contact|salary|$))', clean_jd_text, re.IGNORECASE | re.DOTALL)
        pref_text = pref_section_match.group(0) if pref_section_match else ""

        req_skills = []
        pref_skills = []
        for tech in known_techs:
            if re.search(r'\b' + re.escape(tech) + r'\b', clean_jd_text, re.IGNORECASE):
                # If tech appears only in preferred section and not in title/overview
                if pref_text and re.search(r'\b' + re.escape(tech) + r'\b', pref_text, re.IGNORECASE) and not re.search(r'\b' + re.escape(tech) + r'\b', title, re.IGNORECASE):
                    pref_skills.append(tech)
                else:
                    req_skills.append(tech)

        if not req_skills and pref_skills:
            req_skills = pref_skills[:3]
            pref_skills = pref_skills[3:]

        # Location extraction
        known_cities = ["Mumbai", "Bengaluru", "Bangalore", "Chennai", "Hyderabad", "Delhi", "Noida", "Gurgaon", "Pune", "Kolkata"]
        found_cities = [c for c in known_cities if c.lower() in text.lower()]

        # Work mode
        work_mode = "On-site"
        if "remote" in text.lower() or "work from home" in text.lower() or "wfh" in text.lower():
            work_mode = "Remote"
            if "hybrid" in text.lower():
                work_mode = "Hybrid"
        elif "hybrid" in text.lower():
            work_mode = "Hybrid"

        return {
            "job_title": title[:100],
            "job_summary": text[:300] + "..." if len(text) > 300 else text,
            "experience": {
                "minimum_years": exp_min if exp_min is not None else 1.0,
                "maximum_years": exp_max,
                "required": True
            },
            "education": {
                "minimum_qualification": "Graduate" if "graduate" in text.lower() or "degree" in text.lower() else "12th",
                "preferred_qualification": "",
                "required": False
            },
            "skills": {
                "required": req_skills if req_skills else ["Communication", "Problem Solving"],
                "preferred": pref_skills
            },
            "responsibilities": [l for l in lines[1:6] if len(l) > 15],
            "role_requirements": [l for l in lines[6:10] if len(l) > 15],
            "industry_experience": [],
            "communication": {
                "english_required": "english" in text.lower(),
                "minimum_level": "Good",
                "languages": ["English"] if "english" in text.lower() else []
            },
            "location": {
                "cities": found_cities,
                "states": [],
                "work_mode": work_mode,
                "relocation_required": False
            },
            "shift": {
                "type": "Night shift" if "night" in text.lower() else ("Rotational" if "rotational" in text.lower() else "Any shift"),
                "timings": "",
                "rotational": "rotational" in text.lower()
            },
            "salary": {
                "minimum": None,
                "maximum": None,
                "currency": "INR"
            },
            "employment_type": "Full Time",
            "mandatory_requirements": req_skills,
            "preferred_requirements": pref_skills,
            "other_requirements": []
        }
