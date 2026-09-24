import fitz  # PyMuPDF
from typing import Dict, Any
from backend.app.ai.documents.base import DocumentParser

class PDFParser(DocumentParser):
    def extract_text(self, file_path: str) -> Dict[str, Any]:
        try:
            doc = fitz.open(file_path)
            extracted_pages = []
            
            for page in doc:
                text = page.get_text("text")
                if text.strip():
                    extracted_pages.append(text.strip())
            
            doc.close()
            full_text = "\n\n".join(extracted_pages).strip()
            
            # If PDF text length is less than 20 chars, mark as needing OCR
            needs_ocr = len(full_text) < 20
            
            return {
                "raw_text": full_text,
                "needs_ocr": needs_ocr,
                "metadata": {"pages": len(extracted_pages)},
                "error": "OCR_REQUIRED: PDF appears image-based or contains no readable text" if needs_ocr else None
            }
        except Exception as e:
            return {
                "raw_text": "",
                "needs_ocr": False,
                "metadata": {},
                "error": f"Failed to extract PDF: {str(e)}"
            }
