import os
from backend.app.ai.documents.pdf_parser import PDFParser
from backend.app.ai.documents.docx_parser import DOCXParser
from backend.app.ai.documents.txt_parser import TXTParser

def get_document_parser(file_extension: str):
    ext = file_extension.lower().lstrip(".")
    if ext == "pdf":
        return PDFParser()
    elif ext in ["docx", "doc"]:
        return DOCXParser()
    elif ext in ["txt", "text"]:
        return TXTParser()
    else:
        raise ValueError(f"Unsupported file type: .{ext}")
