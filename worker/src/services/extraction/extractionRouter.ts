/**
 * Extraction Router — central extraction orchestrator
 *
 * This is the SINGLE entry point for all document extraction.
 * No extraction logic lives in the upload route — it all flows
 * through here via routeExtraction().
 *
 * Flow:
 *   UPLOAD
 *     ↓
 *   Detect File Type (routeDocument from existing router)
 *     ↓
 *   [ROUTER_SELECTED] — log format + provider selection
 *     ↓
 *   ── PRIMARY: IBM Docling ──
 *     ↓ Success? → Return structured extraction
 *     ↓ No
 *   ── Format-specific fallback ──
 *     ↓   PDF → pdfExtractor (native + OCR)
 *     ↓   Image → imageExtractor (OCR pipeline)
 *     ↓   DOCX/XLSX → officeExtractor (JSZip)
 *     ↓   TXT/CSV → fallbackExtractor (direct)
 *     ↓ Success? → Return extraction
 *     ↓ No
 *   ── General fallback (raw text decode) ──
 *     ↓ Success? → Return extraction
 *     ↓ No
 *   ── FAIL (sanitized customer message) ──
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

// ─── Image format check ───

const IMAGE_FORMATS = [
  "jpg", "jpeg", "png", "webp", "heic", "heif", "tiff", "tif", "bmp", "gif",
];

function isImageFormat(format: string): boolean {
  return IMAGE_FORMATS.includes(format);
}

// ─── Office format check ───

const OFFICE_FORMATS = ["docx", "doc", "xlsx", "xls", "xlsm", "pptx", "ppt", "ods"];

function isOfficeFormat(format: string): boolean {
  return OFFICE_FORMATS.includes(format);
}

// ─── Text format check ───

const TEXT_FORMATS = ["txt", "md", "csv", "tsv", "html", "xml", "json", "rtf"];

function isTextFormat(format: string): boolean {
  return TEXT_FORMATS.includes(format);
}

// ─── Main router function ───

/**
 * Extract text from a document using the unified pipeline.
 *
 * @param buffer - Raw file bytes
 * @param fileName - Original filename
 * @param env - Worker environment
 * @returns UnifiedExtractionResult on success, or a failed result with customerMessage
 */
export async function routeExtraction(
  buffer: ArrayBuffer,
  fileName: string,
  env: Env,
): Promise<UnifiedExtractionResult> {
  // ── Step 1: Route the document (detect format, quality, etc.) ──
  const route: DocumentRouteResult = routeDocument(buffer, fileName);

  // ── [EXTRACTION_START] ──
  console.log(
    `[EXTRACTION_START]
filename="${fileName}"
mime="${route.mimeType}"
size=${buffer.byteLength}
type=${route.fileFormat}`,
  );

  // ── [FORMAT_DETECTED] ──
  const fallbackProvider = isImageFormat(route.fileFormat)
    ? "image-ocr"
    : route.fileFormat === "pdf"
      ? "pdf-native"
      : isOfficeFormat(route.fileFormat)
        ? "office-native"
        : "txt-direct";

  console.log(
    `[FORMAT_DETECTED]
format=${route.fileFormat}
provider_selected=docling
fallback=${fallbackProvider}
size=${buffer.byteLength}
isScanned=${route.isScanned}
needsOcr=${route.needsOcr}
pageCount=${route.pageCount}
quality=${route.documentQuality}`,
  );

  // ── Step 2: PRIMARY — IBM Docling ──
  const doclingResult = await extractWithDocling(buffer, fileName, route, env);

  if (doclingResult && doclingResult.success) {
    console.log(
      `[EXTRACTION_COMPLETE]
provider=${doclingResult.provider}
textLength=${doclingResult.text.length}
method=${doclingResult.context.extractionMethod}
confidence=${doclingResult.context.confidenceScore}`,
    );
    return doclingResult;
  }

  // ── Step 3: Format-specific fallback ──
  console.log("[DOCLING_FAILURE] reason=extraction_failed — selecting fallback");

  let fallbackResult: UnifiedExtractionResult | null = null;

  if (route.fileFormat === "pdf") {
    console.log("[FALLBACK_STARTED] provider=pdf-extractor");
    fallbackResult = await extractPdf(buffer, fileName, route, env);
  } else if (isImageFormat(route.fileFormat)) {
    console.log("[FALLBACK_STARTED] provider=image-ocr");
    fallbackResult = await extractImage(buffer, fileName, route, env);
  } else if (isOfficeFormat(route.fileFormat)) {
    console.log("[FALLBACK_STARTED] provider=office-native");
    fallbackResult = await extractOffice(buffer, fileName, route, env);
  } else {
    console.log("[FALLBACK_STARTED] provider=txt-direct");
    fallbackResult = await extractFallback(buffer, fileName, route, env);
  }

  if (fallbackResult && fallbackResult.success) {
    console.log(
      `[FALLBACK_SUCCESS]
provider=${fallbackResult.provider}
textLength=${fallbackResult.text.length}
method=${fallbackResult.context.extractionMethod}
confidence=${fallbackResult.context.confidenceScore}`,
    );
    return fallbackResult;
  }

  // ── Step 4: General fallback (last resort for any format) ──
  if (!isTextFormat(route.fileFormat)) {
    // For PDFs, images, and Office docs that failed their specific fallback,
    // try the general fallback (raw text decode) as a last resort.
    console.log("[FALLBACK_STARTED] provider=general-fallback");
    fallbackResult = await extractFallback(buffer, fileName, route, env);

    if (fallbackResult && fallbackResult.success) {
      console.log(
        `[EXTRACTION_COMPLETE]
provider=${fallbackResult.provider}
textLength=${fallbackResult.text.length}
method=${fallbackResult.context.extractionMethod}
confidence=${fallbackResult.context.confidenceScore}`,
      );
      return fallbackResult;
    }
  }

  // ── Step 5: ALL EXTRACTION FAILED ──
  const customerMessage = isImageFormat(route.fileFormat)
    ? CUSTOMER_MESSAGES.image
    : route.fileFormat === "pdf"
      ? CUSTOMER_MESSAGES.pdf
      : CUSTOMER_MESSAGES.generic;

  console.error(
    `[EXTRACTION_FAILED]
format=${route.fileFormat}
reason=all_providers_failed
customerMessage="${customerMessage}"`,
  );

  return {
    text: "",
    context: {
      pages: 0,
      lineItems: 0,
      fileType: route.fileFormat,
      extractionMethod: "native",
      confidenceScore: 0,
    },
    provider: "fallback",
    success: false,
    customerMessage,
  };
}

// ─── Re-export routeDocument for convenience ───

export { routeDocument } from "../../router/documentRouter.js";
