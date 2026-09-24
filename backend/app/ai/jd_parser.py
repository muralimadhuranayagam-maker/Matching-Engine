import logging
from typing import Dict, Any
from backend.app.schemas.job import CanonicalJD
from backend.app.ai.llm.sarvam_provider import SarvamProvider

logger = logging.getLogger(__name__)

class JDParser:
    def __init__(self, llm_provider=None):
        self.llm_provider = llm_provider or SarvamProvider()

    async def parse_jd(self, raw_text: str, job_id: str) -> CanonicalJD:
        """
        Extracts raw JD text into a validated CanonicalJD object.
        """
        schema_dict = CanonicalJD.model_json_schema()

        prompt = (
            f"Convert the following Job Description into structured JSON strictly adhering to the schema:\n\n"
            f"JOB DESCRIPTION TEXT:\n{raw_text}\n\n"
            f"SCHEMA DEFINITION:\n{schema_dict}"
        )

        raw_json = await self.llm_provider.generate_structured(prompt, schema_dict)

        # Ensure job_id is set
        raw_json["job_id"] = job_id
        if not raw_json.get("job_title"):
            raw_json["job_title"] = "Untitled Job Requirement"

        # Validate with Pydantic schema
        canonical_jd = CanonicalJD.model_validate(raw_json)
        return canonical_jd
