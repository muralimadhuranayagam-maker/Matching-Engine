from typing import Dict, Any
from backend.app.ai.documents.base import DocumentParser

class TXTParser(DocumentParser):
    def extract_text(self, file_path: str) -> Dict[str, Any]:
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                text_content = f.read().strip()
            return {
                "raw_text": text_content,
                "needs_ocr": False,
                "metadata": {"char_count": len(text_content)},
                "error": "File is empty" if not text_content else None
            }
        except Exception as e:
            return {
                "raw_text": "",
                "needs_ocr": False,
                "metadata": {},
                "error": f"Failed to read TXT file: {str(e)}"
            }
