from abc import ABC, abstractmethod
from typing import Dict, Any, Optional

class LLMProvider(ABC):
    @abstractmethod
    async def generate_structured(self, prompt: str, schema_dict: Dict[str, Any]) -> Dict[str, Any]:
        """
        Sends prompt and schema to LLM and returns structured JSON dict.
        """
        pass

    @abstractmethod
    async def validate_match(self, candidate_summary: str, jd_summary: str, current_score: float) -> Dict[str, Any]:
        """
        Sends candidate and JD summaries for qualitative LLM validation and explanation.
        """
        pass
