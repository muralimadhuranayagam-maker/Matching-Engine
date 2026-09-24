from abc import ABC, abstractmethod
from typing import Dict, Any

class DocumentParser(ABC):
    @abstractmethod
    def extract_text(self, file_path: str) -> Dict[str, Any]:
        """
        Extracts raw text and metadata from document file.
        Returns:
            {
                "raw_text": str,
                "needs_ocr": bool,
                "metadata": dict,
                "error": str | None
            }
        """
        pass
