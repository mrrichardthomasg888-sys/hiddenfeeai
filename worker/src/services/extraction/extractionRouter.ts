/**
 * Extraction Router — IBM DOCLING IS THE PRIMARY ENGINE
 * 
 * SMART ROUTING:
 *   Digital PDFs (have text, not scanned) → native extraction (INSTANT <100ms)
 *   Scanned PDFs / images (no text, image-based) → IBM Docling (OCR needed)
 *   DOCX/XLSX → native JSZip → Docling enhancement if quality low
 *   TXT/CSV → direct decode (instant)
 *
 * Docling is ALWAYS primary for documents that NEED OCR.
 * For documents that already HAVE text, native extraction is instant.
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

export async function routeExtraction(
  buffer: ArrayBuffer,
  fileName: string,
  env: Env,
): Promise<UnifiedExtractionResult> {
  const route: DocumentRouteResult = routeDocument(buffer, fileName);

  console.log(
    `[EXTRACTION_START]
filename="${fileName}"
format=${route.fileFormat}
size=${buffer.byteLength}
isDigital=${route.isDigital}
isScanned=${route.isScanned}
needsOcr=${route.needsOcr}`,
  );

  // ══════════════════════════════════════════════════════════
  // USE DOCLING FOR: images + scanned PDFs (no embedded text, needs OCR)
  // USE NATIVE FOR: digital PDFs + DOCX/XLSX + text files (text exists)
  // ══════════════════════════════════════════════════════════
  const needsDocling = isImageFormat(route.fileFormat) || (route.fileFormat === "pdf" && (route.isScanned || route.needsOcr));

  if (needsDocling && env.DOCLING_SERVICE_URL) {
    console.log("[ROUTER] route=docling (document needs OCR)");
    const doclingResult = await extractWithDocling(buffer, fileName, route, env);
    if (doclingResult?.success) {
      console.log(`[EXTRACTION_COMPLETE] provider=docling textLength=${doclingResult.text.length} confidence=${doclingResult.context.confidenceScore}`);
      return doclingResult;
    }
    console.log("[DOCLING_FAILURE] falling back");
  }

  // ══════════════════════════════════════════════════════════
  // NATIVE EXTRACTION (instant for PDFs with text, DOCX, XLSX)
  // ══════════════════════════════════════════════════════════
  let result: UnifiedExtractionResult | null = null;

  if (route.fileFormat === "pdf") {
    console.log("[EXTRACTION_START] provider=pdf-native");
    result = await extractPdf(buffer, fileName, route, env);
  } else if (isImageFormat(route.fileFormat)) {
    console.log("[EXTRACTION_START] provider=image-ocr");
    result = await extractImage(buffer, fileName, route, env);
  } else if (isOfficeFormat(route.fileFormat)) {
    console.log("[EXTRACTION_START] provider=office-native");
    result = await extractOffice(buffer, fileName, route, env);
  } else {
    console.log("[EXTRACTION_START] provider=txt-direct");
    result = await extractFallback(buffer, fileName, route, env);
  }

  if (result?.success && result.text.length > 0) {
    // For digital PDFs with native text: try Docling as ENHANCEMENT only for quality
    if (route.fileFormat === "pdf" && !route.isScanned && env.DOCLING_SERVICE_URL && result.context.confidenceScore < 80) {
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
    if (fb?.success) {
      console.log(`[EXTRACTION_COMPLETE] provider=general-fallback textLength=${fb.text.length}`);
      return fb;
    }
  }

  const msg = CUSTOMER_MESSAGES.generic;
  console.error(`[EXTRACTION_FAILED] format=${route.fileFormat} customerMessage="${msg}"`);
  return { text: "", context: { pages: 0, lineItems: 0, fileType: route.fileFormat, extractionMethod: "native", confidenceScore: 0 }, provider: "fallback", success: false, customerMessage: msg };
}

export { routeDocument } from "../../router/documentRouter.js";