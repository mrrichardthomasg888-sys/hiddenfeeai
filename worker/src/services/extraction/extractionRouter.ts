/**
 * Extraction Router — central extraction orchestrator
 *
 * SMART ROUTING:
 *   Digital PDFs (not scanned) → native extraction (INSTANT — no ML needed)
 *   Scanned PDFs / images → Docling (OCR required)
 *   DOCX/XLSX → native JSZip (fast) → Docling as enhancement
 *   TXT/CSV → direct decode (instant)
 *
 * Flow:
 *   UPLOAD → routeDocument (detect format + digital vs scanned)
 *     ↓
 *   SMART DECISION based on format + document characteristics:
 *     ├── Digital PDF (good quality, not scanned) → pdfExtractor FIRST (instant native)
 *     ├── Scanned PDF / low quality PDF → Docling FIRST (needs OCR)
 *     ├── Images → Docling FIRST (needs OCR)
 *     ├── DOCX/XLSX → officeExtractor FIRST (fast JSZip) → Docling enhancement
 *     └── TXT/MD/CSV → fallbackExtractor FIRST (instant)
 *     ↓
 *   If primary fails → try opposite path
 *     ↓
 *   General fallback → Fail with customer message
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

// ─── Format checks ───

const IMAGE_FORMATS = [
  "jpg", "jpeg", "png", "webp", "heic", "heif", "tiff", "tif", "bmp", "gif",
];

function isImageFormat(format: string): boolean {
  return IMAGE_FORMATS.includes(format);
}

const OFFICE_FORMATS = ["docx", "doc", "xlsx", "xls", "xlsm", "pptx", "ppt", "ods"];

function isOfficeFormat(format: string): boolean {
  return OFFICE_FORMATS.includes(format);
}

const TEXT_FORMATS = ["txt", "md", "csv", "tsv", "html", "xml", "json", "rtf"];

function isTextFormat(format: string): boolean {
  return TEXT_FORMATS.includes(format);
}

// ─── Smart routing decision ───

/**
 * Determine the BEST extraction strategy based on document characteristics.
 * 
 * KEY INSIGHT: Digital PDFs with embedded text don't need ML/OCR.
 * Native extraction is INSTANT (<100ms) vs Docling (10-30s for ML model loading).
 * 
 * Docling is crucial for: scanned PDFs, images, handwritten docs.
 * Docling is unnecessary for: digital PDFs, DOCX, XLSX, text files.
 */
type ExtractionStrategy = "native-first" | "docling-first";

function pickStrategy(route: DocumentRouteResult): ExtractionStrategy {
  // ── Images always need OCR → Docling first ──
  if (isImageFormat(route.fileFormat)) {
    return "docling-first";
  }

  // ── PDF: smart decision based on document properties ──
  if (route.fileFormat === "pdf") {
    // Digital PDF with good quality and no OCR needed → native is instant
    if (!route.needsOcr && route.isDigital && route.documentQuality !== "poor" && route.documentQuality !== "unusable") {
      return "native-first";
    }
    // Scanned PDF or needs OCR → Docling is the right tool
    return "docling-first";
  }

  // ── Office docs: native JSZip is fast (<500ms) → try native first, Docling as enhancement ──
  if (isOfficeFormat(route.fileFormat)) {
    return "native-first";
  }

  // ── Text formats: direct decode is instant ──
  return "native-first";
}

// ─── Main router function ───

export async function routeExtraction(
  buffer: ArrayBuffer,
  fileName: string,
  env: Env,
): Promise<UnifiedExtractionResult> {
  // ── Step 1: Route the document (detect format, quality, scanned vs digital, etc.) ──
  const route: DocumentRouteResult = routeDocument(buffer, fileName);
  const strategy = pickStrategy(route);

  // ── [EXTRACTION_START] ──
  console.log(
    `[EXTRACTION_START]
filename="${fileName}"
format=${route.fileFormat}
mime="${route.mimeType}"
size=${buffer.byteLength}
isDigital=${route.isDigital}
isScanned=${route.isScanned}
needsOcr=${route.needsOcr}
pageCount=${route.pageCount}
quality=${route.documentQuality}
strategy=${strategy}`,
  );

  let result: UnifiedExtractionResult | null = null;

  // ══════════════════════════════════════════════════════════
  // NATIVE-FIRST PATH: Fast native extraction (instant for digital PDFs, DOCX, text)
  // Only try Docling if native fails or quality is low.
  // ══════════════════════════════════════════════════════════
  if (strategy === "native-first") {
    console.log(`[ROUTER] strategy=native-first`);
    
    // Try native extraction first
    if (route.fileFormat === "pdf") {
      console.log("[EXTRACTION_START] provider=pdf-native (instant)");
      result = await extractPdf(buffer, fileName, route, env);
    } else if (isOfficeFormat(route.fileFormat)) {
      console.log("[EXTRACTION_START] provider=office-native (fast)");
      result = await extractOffice(buffer, fileName, route, env);
    } else {
      console.log("[EXTRACTION_START] provider=txt-direct (instant)");
      result = await extractFallback(buffer, fileName, route, env);
    }

    // If native extraction succeeded with good quality, return immediately
    if (result && result.success && result.text.length > 50 && result.context.confidenceScore >= 60) {
      console.log(
        `[EXTRACTION_COMPLETE]
provider=${result.provider}
strategy=native-first
textLength=${result.text.length}
confidence=${result.context.confidenceScore}`,
      );
      return result;
    }

    // Native failed or low quality — try Docling as enhancement
    if (env.DOCLING_SERVICE_URL) {
      console.log("[ROUTER] native_insufficient — trying Docling enhancement");
      const doclingResult = await extractWithDocling(buffer, fileName, route, env);
      if (doclingResult && doclingResult.success) {
        console.log(
          `[EXTRACTION_COMPLETE]
provider=${doclingResult.provider}
strategy=native-first→docling
textLength=${doclingResult.text.length}
confidence=${doclingResult.context.confidenceScore}`,
        );
        return doclingResult;
      }
    }

    // If native succeeded but quality was low, use it anyway (better than nothing)
    if (result && result.success && result.text.length > 0) {
      console.log(
        `[EXTRACTION_COMPLETE]
provider=${result.provider}
strategy=native-first-fallback
textLength=${result.text.length}
confidence=${result.context.confidenceScore}`,
      );
      return result;
    }

    // Both failed — fall through to failure handling
  }

  // ══════════════════════════════════════════════════════════
  // DOCLING-FIRST PATH: ML/OCR needed (images, scanned PDFs)
  // Try Docling first, fall back to native if it fails.
  // ══════════════════════════════════════════════════════════
  else {
    console.log("[ROUTER] strategy=docling-first");

    // Try Docling
    console.log("[EXTRACTION_START] provider=docling (primary)");
    const doclingResult = await extractWithDocling(buffer, fileName, route, env);

    if (doclingResult && doclingResult.success) {
      console.log(
        `[EXTRACTION_COMPLETE]
provider=${doclingResult.provider}
strategy=docling-first
textLength=${doclingResult.text.length}
confidence=${doclingResult.context.confidenceScore}`,
      );
      return doclingResult;
    }

    // Docling failed — try format-specific fallback
    console.log("[DOCLING_FAILURE] reason=extraction_failed — selecting fallback");

    if (route.fileFormat === "pdf") {
      console.log("[FALLBACK_STARTED] provider=pdf-extractor");
      result = await extractPdf(buffer, fileName, route, env);
    } else if (isImageFormat(route.fileFormat)) {
      console.log("[FALLBACK_STARTED] provider=image-ocr");
      result = await extractImage(buffer, fileName, route, env);
    } else if (isOfficeFormat(route.fileFormat)) {
      console.log("[FALLBACK_STARTED] provider=office-native");
      result = await extractOffice(buffer, fileName, route, env);
    } else {
      console.log("[FALLBACK_STARTED] provider=txt-direct");
      result = await extractFallback(buffer, fileName, route, env);
    }

    if (result && result.success) {
      console.log(
        `[FALLBACK_SUCCESS]
provider=${result.provider}
textLength=${result.text.length}
confidence=${result.context.confidenceScore}`,
      );
      return result;
    }
  }

  // ══════════════════════════════════════════════════════════
  // LAST RESORT: General fallback (raw text decode)
  // ══════════════════════════════════════════════════════════
  if (!isTextFormat(route.fileFormat)) {
    console.log("[FALLBACK_STARTED] provider=general-fallback");
    const fallbackResult = await extractFallback(buffer, fileName, route, env);

    if (fallbackResult && fallbackResult.success) {
      console.log(
        `[EXTRACTION_COMPLETE]
provider=${fallbackResult.provider}
strategy=last-resort
textLength=${fallbackResult.text.length}`,
      );
      return fallbackResult;
    }
  }

  // ══════════════════════════════════════════════════════════
  // ALL EXTRACTION FAILED
  // ══════════════════════════════════════════════════════════
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

export { routeDocument } from "../../router/documentRouter.js";