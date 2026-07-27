"""
HiddenFeeAI — IBM Docling Document Processing Service

Production document understanding microservice.
Accepts files via HTTP, processes them with IBM Docling,
returns structured Markdown + JSON with preserved layout.

Run: uvicorn app:app --host 0.0.0.0 --port 8000
"""

import os
import time
import uuid
import shutil
import tempfile
import logging
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Docling imports
from docling.document_converter import DocumentConverter, PdfFormatOption
from docling.datamodel.pipeline_options import PdfPipelineOptions
from docling.datamodel.base_models import InputFormat
from docling_core.types.doc import ImageRefMode

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("hiddenfee-doc-engine")

# ─── FastAPI app ───

app = FastAPI(
    title="HiddenFeeAI Docling Engine",
    description="IBM Docling document processing service for HiddenFeeAI v2",
    version="1.0.0",
)

# CORS: allow the Cloudflare Worker to call us
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

# ─── Docling converter (lazy init) ───

_docling_converter: Optional[DocumentConverter] = None
_docling_pipeline_opts: Optional[PdfPipelineOptions] = None

def get_converter() -> DocumentConverter:
    """Lazy-init the Docling converter with optimized pipeline options."""
    global _docling_converter, _docling_pipeline_opts
    if _docling_converter is None:
        logger.info("Initializing IBM Docling converter...")
        pipeline_opts = PdfPipelineOptions()
        pipeline_opts.do_ocr = True
        pipeline_opts.do_table_structure = True
        pipeline_opts.table_structure_options.do_cell_matching = True
        pipeline_opts.images_scale = 2.0
        
        _docling_pipeline_opts = pipeline_opts
        _docling_converter = DocumentConverter(
            format_options={
                InputFormat.PDF: PdfFormatOption(pipeline_options=pipeline_opts),
            }
        )
        logger.info("Docling converter initialized successfully.")
    return _docling_converter

# ─── File type helpers ───

SUPPORTED_EXTENSIONS = {
    ".pdf", ".docx", ".doc", ".pptx", ".ppt",
    ".xlsx", ".xls", ".html", ".htm", ".txt", ".md",
    ".png", ".jpg", ".jpeg", ".tiff", ".tif", ".bmp",
    ".rtf", ".csv",
}

def get_extension(filename: str) -> str:
    return Path(filename).suffix.lower()

def is_supported(filename: str) -> bool:
    return get_extension(filename) in SUPPORTED_EXTENSIONS

def detect_quality(text: str, page_count: int) -> dict:
    """Estimate document quality from extraction results."""
    text_length = len(text)
    chars_per_page = text_length / max(page_count, 1)
    
    if chars_per_page > 2000:
        score, label = 0.95, "excellent"
    elif chars_per_page > 1000:
        score, label = 0.85, "good"
    elif chars_per_page > 200:
        score, label = 0.65, "fair"
    elif chars_per_page > 50:
        score, label = 0.40, "poor"
    else:
        score, label = 0.15, "unusable"
    
    return {"quality_score": score, "quality_label": label, "chars_per_page": chars_per_page}

# ─── Response model ───

class ParseResponse(BaseModel):
    document_id: str
    filename: str
    file_type: str
    page_count: int
    markdown: str
    structured_json: dict
    tables: list
    headings: list
    metadata: dict
    processing_time_seconds: float
    quality: dict
    is_scanned: bool
    ocr_used: bool
    warnings: list

# ─── Health check ───

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "hiddenfee-doc-engine",
        "version": "1.0.0",
    }

# ─── Parse endpoint ───

@app.post("/parse", response_model=ParseResponse)
async def parse_document(file: UploadFile = File(...)):
    """
    Parse a document using IBM Docling.
    Accepts PDF, DOCX, PPTX, XLSX, images, HTML, and text files.
    Returns structured Markdown + JSON with preserved layout.
    """
    start_time = time.time()
    document_id = str(uuid.uuid4())
    filename = file.filename or "unknown"
    extension = get_extension(filename)
    
    logger.info(f"[{document_id}] Parsing: {filename} ({extension})")
    
    # ── Validate ──
    if not is_supported(filename):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {extension}. Supported: {', '.join(sorted(SUPPORTED_EXTENSIONS))}"
        )
    
    # ── Save to temp file ──
    temp_dir = tempfile.mkdtemp(prefix="hiddenfee_")
    temp_path = os.path.join(temp_dir, filename)
    
    try:
        contents = await file.read()
        
        # Size limit: 50MB
        max_size = 50 * 1024 * 1024
        if len(contents) > max_size:
            raise HTTPException(
                status_code=413,
                detail=f"File too large ({len(contents) / 1024 / 1024:.1f}MB). Maximum is 50MB."
            )
        
        with open(temp_path, "wb") as f:
            f.write(contents)
        
        # ── Process with Docling ──
        logger.info(f"[{document_id}] Converting with Docling...")
        converter = get_converter()
        result = converter.convert(temp_path)
        
        # ── Extract structured output ──
        markdown = result.document.export_to_markdown() if hasattr(result.document, 'export_to_markdown') else ""
        
        # Build structured JSON
        doc = result.document
        structured_json = {
            "text": "",
            "pages": [],
            "tables": [],
            "pictures": [],
        }
        
        # Extract pages
        page_count = 0
        if hasattr(doc, 'pages'):
            page_count = len(doc.pages) if doc.pages else 0
        
        # Extract tables
        tables = []
        if hasattr(doc, 'tables'):
            for table in doc.tables:
                table_data = {
                    "page": getattr(table, 'page_number', 0) if hasattr(table, 'page_number') else 0,
                    "rows": [],
                    "caption": "",
                }
                if hasattr(table, 'data'):
                    table_data["rows"] = [
                        [cell.text if hasattr(cell, 'text') else str(cell) for cell in row]
                        for row in table.data.rows
                    ] if hasattr(table.data, 'rows') else []
                if hasattr(table, 'caption_text'):
                    table_data["caption"] = table.caption_text or ""
                tables.append(table_data)
        
        # Extract headings
        headings = []
        if hasattr(doc, 'iterate_items'):
            for item, level in doc.iterate_items():
                if hasattr(item, 'label') and item.label.lower() in ('heading', 'section_header', 'title'):
                    headings.append({
                        "text": getattr(item, 'text', ''),
                        "level": getattr(level, 'value', 1) if hasattr(level, 'value') else 1,
                        "page": getattr(item, 'page_number', 0) if hasattr(item, 'page_number') else 0,
                    })
        
        # ── Build response ──
        processing_time = time.time() - start_time
        
        # Detect quality
        full_text = structured_json.get("text", "")
        if not full_text:
            full_text = "\n".join(
                [item.get("text", "") for item in headings] +
                [str(t) for t in tables]
            )
        quality = detect_quality(full_text or markdown, max(page_count, 1))
        
        # OCR detection
        ocr_used = False
        is_scanned = False
        if hasattr(result, 'metadata'):
            ocr_used = getattr(result.metadata, 'ocr_used', False) or "_ocr" in str(type(result)).lower()
        
        # Build metadata
        metadata = {
            "language": "en",
            "author": "",
            "created_at": "",
            "page_count": page_count,
        }
        
        logging.info(
            f"[{document_id}] Complete in {processing_time:.2f}s — "
            f"{page_count} pages, {len(tables)} tables, {len(headings)} headings"
        )
        
        return ParseResponse(
            document_id=document_id,
            filename=filename,
            file_type=extension.lstrip("."),
            page_count=page_count,
            markdown=markdown or "",
            structured_json=structured_json,
            tables=tables,
            headings=headings,
            metadata=metadata,
            processing_time_seconds=round(processing_time, 2),
            quality=quality,
            is_scanned=is_scanned,
            ocr_used=ocr_used,
            warnings=[],
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[{document_id}] Processing failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=422,
            detail=f"Document processing failed: {str(e)}. The file may be corrupted or in an unsupported format."
        )
    finally:
        # ── Clean up temp files ──
        try:
            shutil.rmtree(temp_dir, ignore_errors=True)
            logger.debug(f"[{document_id}] Temp files cleaned: {temp_dir}")
        except Exception:
            pass

# ─── Startup ───

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)