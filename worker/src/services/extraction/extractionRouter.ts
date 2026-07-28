/**
 * Extraction Router — IBM DOCLING IS THE PRIMARY EXTRACTION ENGINE
 *
 * OPTIMIZED DUAL-PATH ROUTING:
 *
 *   FAST-PATH (instant <100ms):
 *     → Digital PDFs (have embedded text, not scanned)
 *     → DOCX/XLSX (structured text in XML)
 *     → TXT/CSV/MD (plain text)
 *     These use native extraction — text already exists, no ML needed.
 *
 *   OCR-PATH (2-3s, IBM Docling):
 *     → Scanned PDFs (image-based, no text layer)
 *     → Images (PNG, JPG, screenshots)
 *     These NEED OCR — Docling provides full pipeline with table structure.
 *
 *   FALLBACK: If Docling fails or native extraction is empty, try the other path.
 */

import type { Env, DocumentRouteResult } from "../../types.js";
import { routeDocument } from "../../router/documentRouter.js";
import { extractWithDocling } from "./doclingExtractor.js";
import { extractImage } from "./imageExtractor.js";
import { extractPdf } from "./pdfExtractor.js";
import { extractOffice } from "./officeExtractor.js";
import { extractFallback } from "./fallbackExtractor.js";
import {
  type UnifiedExtractionResult,
  CUSTOMER_MESSAGES,
} from "./extractionTypes.js";

const IMAGE_FORMATS = ["jpg", "jpeg", "png", "webp", "heic", "heif", "tiff", "tif", "bmp", "gif"];
const OFFICE_FORMATS = ["docx", "doc", "xlsx", "xls", "xlsm", "pptx", "ppt", "ods"];
const TEXT_FORMATS = ["txt", "md", "csv", "tsv", "html", "xml", "json", "rtf"];

function isImageFormat(f: string): boolean { return IMAGE_FORMATS.includes(f); }
function isOfficeFormat(f: string): boolean { return OFFICE_FORMATS.includes(f); }
function isTextFormat(f: string): boolean { return TEXT_FORMATS.includes(f); }

/**
 * Decide whether this document needs OCR (Docling heavy path)
 * or can use fast native extraction (text already embedded).
 */
function needsOcr(route: DocumentRouteResult): boolean {
  // Images → Cloudflare AI OCR is FAST (<3s). Only scanned PDFs need Docling's heavy pipeline.
  if (isImageFormat(route.fileFormat)) return false;  // Use fast-path: Cloudflare AI OCR
  if (route.fileFormat === "pdf" && !route.isDigital && route.hasImages) return true; // Scanned PDF → Docling
  if (route.fileFormat === "pdf" && route.needsOcr && route.hasImages) return true;
  return false;
}

export async function routeExtraction(
  buffer: ArrayBuffer,
  fileName: string,
  env: Env,
): Promise<UnifiedExtractionResult> {
  const route: DocumentRouteResult = routeDocument(buffer, fileName);
  const requiresOcr = needsOcr(route);

  console.log(
    `[EXTRACTION_START]
filename="${fileName}"
format=${route.fileFormat}
size=${buffer.byteLength}
isDigital=${route.isDigital}
isScanned=${route.isScanned}
needsOcr=${route.needsOcr}
route=${requiresOcr ? "ocr-path" : "fast-path"}`,
  );

  // ══════════════════════════════════════════════════════════
  // OCR-PATH: Document needs OCR → IBM Docling primary
  // (scanned PDFs, images, phone photos, screenshots)
  // ══════════════════════════════════════════════════════════
  if (requiresOcr && env.DOCLING_SERVICE_URL) {
    console.log("[ROUTER] route=ocr-path (Docling)");
    const doclingResult = await extractWithDocling(buffer, fileName, route, env);
    if (doclingResult?.success) {
      console.log(`[EXTRACTION_COMPLETE] provider=docling textLength=${doclingResult.text.length} confidence=${doclingResult.context.confidenceScore}`);
      return doclingResult;
    }
    console.log("[DOCLING_FAILURE] falling back to format-specific extractor");
  }

  // ══════════════════════════════════════════════════════════
  // FAST-PATH: Text already exists → native extraction (instant)
  // (digital PDFs with embedded text, DOCX, XLSX, TXT, CSV)
  // Also serves as FALLBACK when Docling fails on OCR path.
  // ══════════════════════════════════════════════════════════
  console.log(`[ROUTER] route=${requiresOcr ? "ocr-path-fallback" : "fast-path"}`);

  let result: UnifiedExtractionResult | null = null;

  if (route.fileFormat === "pdf") {
    console.log("[EXTRACTION_START] provider=pdf-native (decompressing FlateDecode streams)");
    result = await extractPdf(buffer, fileName, route, env);
  } else if (isImageFormat(route.fileFormat)) {
    console.log("[EXTRACTION_START] provider=image-ocr (Cloudflare AI)");
    result = await extractImage(buffer, fileName, route, env);
  } else if (isOfficeFormat(route.fileFormat)) {
    console.log("[EXTRACTION_START] provider=office-native (JSZip)");
    result = await extractOffice(buffer, fileName, route, env);
  } else {
    console.log("[EXTRACTION_START] provider=txt-direct");
    result = await extractFallback(buffer, fileName, route, env);
  }

  if (result?.success && result.text.length > 10) {
    // Fast-path digital PDF: enhance with Docling if quality is low
    if (route.fileFormat === "pdf" && !requiresOcr && env.DOCLING_SERVICE_URL && result.context.confidenceScore < 70) {
      console.log("[ROUTER] native_quality_low — trying Docling enhancement");
      const doclingResult = await extractWithDocling(buffer, fileName, route, env);
      if (doclingResult?.success && doclingResult.text.length > result.text.length) {
        console.log(`[EXTRACTION_COMPLETE] provider=docling (enhanced) textLength=${doclingResult.text.length}`);
        return doclingResult;
      }
    }

    console.log(`[EXTRACTION_COMPLETE] provider=${result.provider} textLength=${result.text.length} confidence=${result.context.confidenceScore}`);
    return result;
  }

  // ══════════════════════════════════════════════════════════
  // LAST RESORT: General fallback
  // ══════════════════════════════════════════════════════════
  if (!isTextFormat(route.fileFormat)) {
    console.log("[FALLBACK_STARTED] provider=general-fallback");
    const fb = await extractFallback(buffer, fileName, route, env);
    if (fb?.success && fb.text.length > 0) {
      console.log(`[EXTRACTION_COMPLETE] provider=general-fallback textLength=${fb.text.length}`);
      return fb;
    }
  }

  const msg = CUSTOMER_MESSAGES.generic;
  console.error(`[EXTRACTION_FAILED] format=${route.fileFormat} customerMessage="${msg}"`);
  return { text: "", context: { pages: 0, lineItems: 0, fileType: route.fileFormat, extractionMethod: "native", confidenceScore: 0 }, provider: "fallback", success: false, customerMessage: msg };
}

export { routeDocument } from "../../router/documentRouter.js";
