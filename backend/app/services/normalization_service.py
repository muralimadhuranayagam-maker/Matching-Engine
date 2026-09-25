import re
from typing import List, Dict, Any

# Configurable Skill Synonym Mappings
SKILL_SYNONYMS: Dict[str, List[str]] = {
    # .NET Stack
    "C#": ["c sharp", "c#", "csharp", "microsoft c#", "c-sharp"],
    "ASP.NET Core": ["asp.net core", "asp net core", "aspnetcore", "asp.net core mvc", "asp.net core web api"],
    ".NET Core": [".net core", "dotnet core", "dot net core", ".net 5", ".net 6", ".net 7", ".net 8", "dotnetcore"],
    "ASP.NET": ["asp.net", "asp net", "asp.net mvc", "asp.net web api", "asp net mvc"],
    ".NET": [".net", "dotnet", "dot net", "ms .net", ".net framework", "microsoft .net"],
    # SQL / Databases
    "SQL": ["sql", "structured query language", "rdbms", "relational database", "relational db", "database"],
    "MySQL": ["mysql", "my sql", "mariadb"],
    "SQL Server": ["ms sql", "sql server", "microsoft sql server", "mssql", "t-sql", "tsql"],
    "PostgreSQL": ["postgresql", "postgres", "psql"],
    "MongoDB": ["mongodb", "mongo", "nosql"],
    # Frontend
    "React": ["react", "react.js", "reactjs", "react js"],
    "Angular": ["angular", "angularjs", "angular.js", "angular 2+", "angular 2", "angular 14", "angular 15", "angular 16", "angular 17"],
    "Vue": ["vue", "vue.js", "vuejs"],
    "JavaScript": ["javascript", "js", "es6", "ecmascript"],
    "TypeScript": ["typescript", "ts"],
    "Node.js": ["node", "node.js", "nodejs", "node js"],
    # Backend / Other languages
    "Python": ["python", "python 3", "python3", "py"],
    "Java": ["java", "j2ee", "core java", "spring boot"],
    # Cloud & DevOps
    "Cloud": ["cloud", "cloud computing"],
    "AWS": ["aws", "amazon web services"],
    "Azure": ["azure", "microsoft azure", "azure devops"],
    "Docker": ["docker", "containerization", "containers"],
    "Kubernetes": ["kubernetes", "k8s"],
    # Soft skills & BPO
    "Communication": ["communication", "english communication", "verbal communication", "good communication"],
    "Customer Support": ["customer support", "customer service", "customer care", "client support"],
    "Technical Support": ["technical support", "tech support", "it support", "helpdesk", "desktop support"],
    "Voice": ["voice", "voice process", "inbound voice", "outbound voice", "voice support", "calling"],
    "Non-Voice": ["non-voice", "non voice", "chat support", "email support", "back office"],
    "BPO": ["bpo", "call center", "bpo/call center", "contact center"],
    "Excel": ["excel", "ms excel", "advanced excel", "microsoft excel"],
}

# Skill Implications: If a candidate has skill X, they inherently possess skills in Y
SKILL_IMPLICATIONS: Dict[str, List[str]] = {
    "ASP.NET Core": [".NET Core", "ASP.NET", ".NET", "C#"],
    ".NET Core": [".NET", "C#"],
    "ASP.NET": [".NET", "C#"],
    "MySQL": ["SQL", "Database"],
    "SQL Server": ["SQL", "Database"],
    "PostgreSQL": ["SQL", "Database"],
    "React": ["JavaScript", "Frontend"],
    "Angular": ["JavaScript", "TypeScript", "Frontend"],
    "TypeScript": ["JavaScript"],
    "Customer Support": ["Communication", "BPO"],
    "Technical Support": ["Communication", "IT Support"],
    "Voice": ["Communication", "BPO"],
    "Non-Voice": ["BPO"],
}

# Parent to Children: If a job requires parent skill P, candidate possessing child C satisfies it
PARENT_TO_CHILDREN: Dict[str, List[str]] = {
    "SQL": ["MySQL", "SQL Server", "PostgreSQL", "T-SQL", "MariaDB", "SQLite", "Oracle SQL"],
    ".NET": [".NET Core", "ASP.NET", "ASP.NET Core", "C#", ".NET Framework"],
    ".NET Core": ["ASP.NET Core", ".NET Core"],
    "ASP.NET": ["ASP.NET Core", "ASP.NET"],
    "JavaScript": ["TypeScript", "React", "Angular", "Vue", "Node.js"],
    "Frontend": ["React", "Angular", "Vue", "JavaScript", "TypeScript", "HTML/CSS"],
    "Cloud": ["AWS", "Azure", "GCP", "Google Cloud"],
    "DevOps": ["Docker", "Kubernetes", "CI/CD", "Azure DevOps"],
    "BPO": ["Customer Support", "Technical Support", "Voice", "Non-Voice", "Call Center"],
    "Communication": ["English Communication", "Customer Support", "Voice", "Technical Support"],
}

class SkillNormalizer:
    @staticmethod
    def normalize_skill(skill_str: str) -> str:
        if not skill_str or not isinstance(skill_str, str):
            return ""
        
        cleaned = skill_str.strip().lower()
        
        # Check exact matches first
        for canonical, synonyms in SKILL_SYNONYMS.items():
            if cleaned == canonical.lower():
                return canonical
            if cleaned in synonyms:
                return canonical
        
        # Check regex word-boundary matches
        for canonical, synonyms in SKILL_SYNONYMS.items():
            for syn in synonyms:
                if re.search(r'\b' + re.escape(syn) + r'\b', cleaned):
                    return canonical
        
        return skill_str.strip()

    @staticmethod
    def get_all_implied_skills(skills: List[str]) -> List[str]:
        """
        Takes raw/canonical skills and expands them with implied parent/family skills.
        E.g., ['ASP.NET Core', 'MySQL'] -> ['.NET', '.NET Core', 'ASP.NET', 'ASP.NET Core', 'C#', 'SQL', 'MySQL']
        """
        result = set()
        for s in skills:
            if not s:
                continue
            canonical = SkillNormalizer.normalize_skill(s)
            if canonical:
                result.add(canonical)
                if canonical in SKILL_IMPLICATIONS:
                    for implied in SKILL_IMPLICATIONS[canonical]:
                        result.add(implied)
            raw_clean = s.strip()
            if raw_clean:
                result.add(raw_clean)
        return list(result)

    @staticmethod
    def normalize_skill_list(skills: List[str]) -> List[str]:
        return SkillNormalizer.get_all_implied_skills(skills)

    @staticmethod
    def is_skill_satisfied(required_skill: str, candidate_skills: List[str]) -> tuple:
        """
        Determines whether a required skill is satisfied by the candidate's skills.
        Returns: (is_satisfied: bool, evidence: str)
        """
        if not required_skill:
            return True, ""
        
        req_clean = required_skill.strip()
        req_canon = SkillNormalizer.normalize_skill(req_clean)
        req_lower = req_clean.lower()
        req_canon_lower = req_canon.lower()
        
        cand_lower_map = {s.lower().strip(): s for s in candidate_skills if s}
        
        # 1. Exact or Canonical match
        if req_lower in cand_lower_map:
            actual = cand_lower_map[req_lower]
            return True, f"Candidate possesses verified skill '{actual}'"
        
        if req_canon_lower in cand_lower_map:
            actual = cand_lower_map[req_canon_lower]
            return True, f"Candidate possesses verified skill '{actual}'"
            
        # 2. Check parent-to-children satisfaction (e.g. required 'SQL', candidate has 'MySQL')
        children = PARENT_TO_CHILDREN.get(req_canon, [])
        for child in children:
            if child.lower() in cand_lower_map:
                actual = cand_lower_map[child.lower()]
                return True, f"Candidate possesses verified skill '{actual}' (satisfies required {req_canon})"

        # 3. Check if required skill is satisfied by implied skills of candidate
        for cand_s in candidate_skills:
            cand_canon = SkillNormalizer.normalize_skill(cand_s)
            implied = SKILL_IMPLICATIONS.get(cand_canon, [])
            if req_canon in implied or req_clean in implied:
                return True, f"Candidate possesses verified skill '{cand_s}' (inherently includes {req_canon})"

        # 4. Substring / Token containment
        for cand_s in candidate_skills:
            c_low = cand_s.lower()
            if req_lower in c_low or (len(req_lower) >= 4 and c_low in req_lower):
                return True, f"Candidate possesses verified skill '{cand_s}' (matches required {req_clean})"

        return False, f"Skill '{req_clean}' not explicitly listed in candidate profile"

class CandidateNormalizer:
    @staticmethod
    def normalize(candidate_json: Dict[str, Any]) -> Dict[str, Any]:
        """
        Normalizes candidate representation without mutating original candidate JSON.
        """
        prof = candidate_json.get("professional_profile", {})
        skills: List[str] = []

        def _extract(val: Any) -> None:
            if not val:
                return
            if isinstance(val, list):
                for item in val:
                    _extract(item)
            elif isinstance(val, str):
                for part in val.split(","):
                    p = part.strip()
                    if p:
                        skills.append(p)

        _extract(prof.get("skill"))
        _extract(prof.get("skill_role"))
        
        current_emp = candidate_json.get("employment_history", {}).get("current", {})
        _extract(current_emp.get("skill"))
        _extract(current_emp.get("role"))
            
        prev_companies = candidate_json.get("employment_history", {}).get("previous_companies", [])
        for comp in prev_companies:
            _extract(comp.get("skill"))
            _extract(comp.get("role"))

        # Also extract communication skills if assessed or stated
        comm_eng = prof.get("english_communication")
        if comm_eng and str(comm_eng).lower() in ["good", "excellent", "fluent", "native", "average"]:
            skills.append("Communication")
            skills.append("English Communication")

        hindi = candidate_json.get("personal", {}).get("knowledge_of_hindi")
        if hindi and "not" not in str(hindi).lower():
            skills.append("Hindi")

        normalized_skills = SkillNormalizer.normalize_skill_list(skills)
        
        exp_years = prof.get("total_experience_years") or 0
        exp_months = prof.get("total_experience_months") or 0
        total_exp = float(exp_years) + (float(exp_months) / 12.0)
        
        qual = "10th"
        edu = candidate_json.get("education", {})
        if isinstance(edu, dict):
            hq = str(edu.get("highest_qualification", "")).lower()
            if any(k in hq for k in ["post", "pg", "master", "mtech", "mba", "msc", "mca"]):
                qual = "Post Graduate"
            elif any(k in hq for k in ["graduate", "degree", "bachelor", "btech", "be", "bcom", "bsc", "bca", "bba", "ug"]):
                qual = "Graduate"
            elif "diploma" in hq:
                qual = "Diploma"
            elif any(k in hq for k in ["12", "puc", "hsc", "+2", "plus two"]):
                qual = "12th"
            elif edu.get("graduation", {}).get("status") in ["UG", "PG", "Completed", "Regular"]:
                qual = "Graduate"
            elif edu.get("twelfth", {}).get("status"):
                qual = "12th"

        city = candidate_json.get("address", {}).get("current", {}).get("city") or candidate_json.get("job_preferences", {}).get("job_city") or ""
        shift = candidate_json.get("professional_profile", {}).get("shift_preference") or candidate_json.get("job_preferences", {}).get("shift_base") or "Any shift"
        pref_locs = candidate_json.get("job_preferences", {}).get("preferred_locations", [])
        
        return {
            "candidate_id": candidate_json.get("candidate_id", ""),
            "name": f"{candidate_json.get('personal', {}).get('first_name', '')} {candidate_json.get('personal', {}).get('last_name', '')}".strip(),
            "total_experience_years": round(total_exp, 1),
            "qualification": qual,
            "skills": normalized_skills,
            "city": city,
            "preferred_locations": pref_locs if isinstance(pref_locs, list) else [str(pref_locs)],
            "shift_preference": shift,
            "work_status": prof.get("work_status", "FRESHER"),
            "notice_period": prof.get("notice_period", "Immediate"),
            "english_communication": prof.get("english_communication", "Good")
        }
