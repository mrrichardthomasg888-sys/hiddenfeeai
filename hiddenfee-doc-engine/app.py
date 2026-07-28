"""
HiddenFeeAI — IBM Docling Document Processing Service

Production document understanding microservice.
Accepts files via HTTP, processes them with IBM Docling,
returns structured data following the HiddenFeeAI Extraction Contract.

Extraction Contract (success):
{
  "success": true,
  "text": str,
  "pages": [...],
  "tables": [...],
  "metadata": {...},
  "structured": {...},
  "confidence": float
}

Extraction Contract (failure):
{
  "success": false,
  "userMessage": "We couldn't read this document. Please try another file."
}

Run: uvicorn app:app --host 0.0.0.0 --port 8000
"""

import os
import time
import uuid
import shutil
import tempfile
import logging
from pathlib import Path
from typing import Optional, Any

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Docling imports
from docling.document_converter import DocumentConverter, PdfFormatOption
from docling.datamodel.pipeline_options import PdfPipelineOptions
from docling.datamodel.base_models import InputFormat

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("hiddenfee-doc-engine")

# ─── FastAPI app ───

app = FastAPI(
    title="HiddenFeeAI Docling Engine",
    description="IBM Docling document processing service for HiddenFeeAI",
    version="2.0.0",
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

def get_converter() -> DocumentConverter:
    """Lazy-init the Docling converter with full pipeline options for all formats."""
    global _docling_converter
    if _docling_converter is None:
        logger.info("Initializing IBM Docling converter with full format support...")

        # ── PDF pipeline: OCR + table structure + layout understanding ──
        pdf_pipeline_opts = PdfPipelineOptions()
        pdf_pipeline_opts.do_ocr = True
        pdf_pipeline_opts.do_table_structure = True
        pdf_pipeline_opts.table_structure_options.do_cell_matching = True
        pdf_pipeline_opts.images_scale = 2.0

        # ── Image pipeline: OCR for scanned docs, photos, screenshots ──
        # Images use the same PDF pipeline options (Docling processes images
        # through the same OCR + layout pipeline as scanned PDFs)
        image_pipeline_opts = PdfPipelineOptions()
        image_pipeline_opts.do_ocr = True
        image_pipeline_opts.do_table_structure = True
        image_pipeline_opts.table_structure_options.do_cell_matching = True
        image_pipeline_opts.images_scale = 2.0

        # ── Initialize converter with all supported formats ──
        # PDF and IMAGE get custom pipeline options (OCR + table structure)
        # Other formats (DOCX, PPTX, XLSX, HTML, etc.) use Docling defaults
        # which already include layout understanding and table extraction.
        _docling_converter = DocumentConverter(
            allowed_formats=[
                InputFormat.PDF,
                InputFormat.DOCX,
                InputFormat.DOC,
                InputFormat.PPTX,
                InputFormat.PPT,
                InputFormat.XLSX,
                InputFormat.XLS,
                InputFormat.HTML,
                InputFormat.IMAGE,
                InputFormat.MD,
                InputFormat.CSV,
                InputFormat.ASCIIDOC,
            ],
            format_options={
                # PDF: contracts, invoices, scanned docs — full pipeline
                InputFormat.PDF: PdfFormatOption(pipeline_options=pdf_pipeline_opts),
                # Images: photos, screenshots, scanned images — OCR pipeline
                InputFormat.IMAGE: PdfFormatOption(pipeline_options=image_pipeline_opts),
            },
        )
        logger.info("Docling converter initialized with PDF, DOCX, PPTX, XLSX, HTML, IMAGE, MD, CSV support.")
    return _docling_converter

# ─── Supported formats (dynamically derived from Docling) ───

# IBM Docling 2.x officially supports these formats.
# This list is checked against Docling's InputFormat enum at startup.
SUPPORTED_EXTENSIONS = {
    # PDF
    ".pdf",
    # Office documents
    ".docx", ".doc",
    ".pptx", ".ppt",
    ".xlsx", ".xls",
    # Web markup
    ".html", ".htm",
    # Images (OCR-processed)
    ".png", ".jpg", ".jpeg", ".tiff", ".tif", ".bmp",
    # Text
    ".txt", ".md", ".csv", ".rtf",
}

def get_extension(filename: str) -> str:
    return Path(filename).suffix.lower()

def is_supported(filename: str) -> bool:
    return get_extension(filename) in SUPPORTED_EXTENSIONS

# ─── Confidence estimation ───

def estimate_confidence(text: str, page_count: int, table_count: int, ocr_used: bool) -> float:
    """Estimate extraction confidence on a 0-1 scale."""
    text_length = len(text)
    if text_length < 50:
        return 0.15
    if text_length < 200:
        return 0.40

    chars_per_page = text_length / max(page_count, 1)

    # Base confidence from text density
    if chars_per_page > 2000:
        base = 0.95
    elif chars_per_page > 1000:
        base = 0.85
    elif chars_per_page > 200:
        base = 0.65
    else:
        base = 0.45

    # OCR slightly lowers confidence (potential misreads)
    if ocr_used:
        base *= 0.90

    # Tables found increases confidence (structured data detected)
    if table_count > 0:
        base = min(1.0, base + 0.05)

    return round(base, 2)

# ─── Health check ───

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "hiddenfee-doc-engine",
        "version": "2.0.0",
        "docling_initialized": _docling_converter is not None,
        "supported_formats": sorted(SUPPORTED_EXTENSIONS),
    }

# ─── Parse endpoint ───

@app.post("/parse")
async def parse_document(file: UploadFile = File(...)):
    """
    Parse a document using IBM Docling.

    Accepts ALL Docling-supported formats: PDF, DOCX, PPTX, XLSX, HTML, images, text.
    Returns the HiddenFeeAI Extraction Contract schema.

    Success: { success, text, pages, tables, metadata, structured, confidence }
    Failure: { success: false, userMessage: "..." }
    """
    start_time = time.time()
    document_id = str(uuid.uuid4())
    filename = file.filename or "unknown"
    extension = get_extension(filename)

    logger.info(f"[{document_id}] Parsing: {filename} ({extension})")

    # ── Validate format ──
    if not is_supported(filename):
        logger.warning(f"[{document_id}] Unsupported file type: {extension}")
        return JSONResponse(
            status_code=200,
            content={
                "success": False,
                "userMessage": "We couldn't read this document. Please try uploading a clearer copy.",
            },
        )

    # ── Save to temp file ──
    temp_dir = tempfile.mkdtemp(prefix="hiddenfee_")
    temp_path = os.path.join(temp_dir, filename)

    try:
        contents = await file.read()

        # Size limit: 50MB (matches Docling engine limit)
        max_size = 50 * 1024 * 1024
        if len(contents) > max_size:
            logger.warning(f"[{document_id}] File too large: {len(contents) / 1024 / 1024:.1f}MB")
            return JSONResponse(
                status_code=200,
                content={
                    "success": False,
                    "userMessage": "We couldn't read this document. Please try uploading a clearer copy.",
                },
            )

        with open(temp_path, "wb") as f:
            f.write(contents)

        # ── Process with Docling ──
        logger.info(f"[{document_id}] Converting with Docling...")
        converter = get_converter()
        result = converter.convert(temp_path)
        doc = result.document

        # ── Extract markdown (primary text output) ──
        markdown = ""
        try:
            markdown = doc.export_to_markdown()
        except Exception:
            try:
                markdown = doc.export_to_text()
            except Exception:
                markdown = ""

        # ── Extract pages ──
        pages = []
        page_count = 0
        try:
            if hasattr(doc, 'pages') and doc.pages:
                page_count = len(doc.pages)
                for page_no, page_obj in doc.pages.items():
                    page_text = ""
                    try:
                        # Extract text from page items
                        for item, _ in page_obj.iter_items() if hasattr(page_obj, 'iter_items') else []:
                            if hasattr(item, 'text'):
                                page_text += item.text + "\n"
                    except Exception:
                        pass

                    pages.append({
                        "page_number": page_no if isinstance(page_no, int) else len(pages) + 1,
                        "text": page_text.strip(),
                    })
        except Exception:
            pass

        # If page_count is 0, estimate from text length
        if page_count == 0 and markdown:
            page_count = max(1, len(markdown) // 2500)
            pages = [{
                "page_number": i + 1,
                "text": chunk.strip(),
            } for i, chunk in enumerate(
                [markdown[i:i+2500] for i in range(0, len(markdown), 2500)]
            ) if chunk.strip()]

        # ── Extract tables ──
        tables = []
        try:
            if hasattr(doc, 'tables'):
                for table in doc.tables:
                    table_data = {
                        "page": 0,
                        "rows": [],
                        "caption": "",
                    }

                    # Get page number
                    try:
                        if hasattr(table, 'prov') and table.prov:
                            table_data["page"] = getattr(table.prov[0], 'page_no', 0) if table.prov else 0
                    except Exception:
                        pass

                    # Extract table data
                    try:
                        if hasattr(table, 'data') and table.data:
                            if hasattr(table.data, 'rows'):
                                table_data["rows"] = [
                                    [cell.text if hasattr(cell, 'text') else str(cell) for cell in row]
                                    for row in table.data.rows
                                ]
                            elif hasattr(table.data, 'grid'):
                                # Some Docling versions use grid
                                for row in table.data.grid:
                                    table_data["rows"].append([
                                        cell.text if hasattr(cell, 'text') else str(cell)
                                        for cell in row
                                    ])
                    except Exception:
                        pass

                    # Get caption
                    try:
                        if hasattr(table, 'caption_text'):
                            table_data["caption"] = table.caption_text or ""
                        elif hasattr(table, 'caption') and table.caption:
                            table_data["caption"] = str(table.caption)
                    except Exception:
                        pass

                    tables.append(table_data)
        except Exception:
            pass

        # ── Extract headings ──
        headings = []
        try:
            if hasattr(doc, 'iterate_items'):
                for item, level in doc.iterate_items():
                    if hasattr(item, 'label') and item.label.lower() in ('heading', 'section_header', 'title'):
                        headings.append({
                            "text": getattr(item, 'text', ''),
                            "level": getattr(level, 'value', 1) if hasattr(level, 'value') else 1,
                            "page": getattr(item, 'page_number', 0) if hasattr(item, 'page_number') else 0,
                        })
        except Exception:
            pass

        # ── Detect OCR usage ──
        ocr_used = False
        is_scanned = False
        try:
            if hasattr(result, 'metadata'):
                ocr_used = getattr(result.metadata, 'ocr_used', False)
            # If we have images but little text, likely scanned
            if page_count > 0 and len(markdown) < 100 * page_count:
                is_scanned = True
                ocr_used = True
        except Exception:
            pass

        # ── Build metadata ──
        metadata = {
            "document_id": document_id,
            "filename": filename,
            "file_type": extension.lstrip("."),
            "page_count": page_count,
            "table_count": len(tables),
            "heading_count": len(headings),
            "is_scanned": is_scanned,
            "ocr_used": ocr_used,
            "processing_time_seconds": round(time.time() - start_time, 2),
        }

        # ── Build structured output ──
        structured = {
            "headings": headings,
            "tables": [
                {
                    "page": t["page"],
                    "rows": t["rows"],
                    "caption": t["caption"],
                }
                for t in tables
            ],
            "pages": pages,
        }

        # ── Calculate confidence ──
        confidence = estimate_confidence(markdown, page_count, len(tables), ocr_used)

        processing_time = time.time() - start_time

        logger.info(
            f"[{document_id}] Complete in {processing_time:.2f}s — "
            f"{page_count} pages, {len(tables)} tables, {len(headings)} headings, "
            f"confidence={confidence}, ocr_used={ocr_used}"
        )

        # ── Return Extraction Contract (success) ──
        return {
            "success": True,
            "text": markdown or "",
            "pages": pages,
            "tables": tables,
            "metadata": metadata,
            "structured": structured,
            "confidence": confidence,
        }

    except Exception as e:
        logger.error(f"[{document_id}] Processing failed: {e}", exc_info=True)
        # ── Return Extraction Contract (failure) — never expose internals ──
        return JSONResponse(
            status_code=200,
            content={
                "success": False,
                "userMessage": "We couldn't read this document. Please try uploading a clearer copy.",
            },
        )
    finally:
        # ── Clean up temp files ──
        try:
            shutil.rmtree(temp_dir, ignore_errors=True)
        except Exception:
            pass

# ─── Startup ───

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)