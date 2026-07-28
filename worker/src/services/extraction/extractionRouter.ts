/**
 * Extraction Router — IBM DOCLING IS THE PRIMARY EXTRACTION ENGINE
 *
 * Architecture:
 *   ALL documents → IBM Docling FIRST (OCR + layout + tables + headings)
 *     ↓ SUCCESS → return structured extraction
 *     ↓ FAILURE → format-specific fallback
 *       ├── PDF → native text extraction
 *       ├── Images → Cloudflare AI OCR (fast backup)
 *       ├── DOCX/XLSX → JSZip native
 *       └── TXT/CSV → direct decode
 *
 * Fallbacks exist ONLY for reliability. Docling is the source of truth.
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
const OFFICE_FORMATS = ["docx", "doc", "xlsx", "xls", "xlsm", "pptx", "ppt", "ods"];
const TEXT_FORMATS = ["txt", "md", "csv", "tsv", "html", "xml", "json", "rtf"];

function isImageFormat(format: string): boolean { return IMAGE_FORMATS.includes(format); }
function isOfficeFormat(format: string): boolean { return OFFICE_FORMATS.includes(format); }
function isTextFormat(format: string): boolean { return TEXT_FORMATS.includes(format); }

// ─── Main router function ───

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
mime="${route.mimeType}"
size=${buffer.byteLength}
isDigital=${route.isDigital}
isScanned=${route.isScanned}
needsOcr=${route.needsOcr}
pageCount=${route.pageCount}
quality=${route.documentQuality}`,
  );

  // ══════════════════════════════════════════════════════════
  // PRIMARY: IBM Docling for ALL formats
  // Docling handles OCR + layout + tables + headings for every
  // supported format including PDF, DOCX, XLSX, PPTX, images, HTML, text.
  // ══════════════════════════════════════════════════════════
  if (env.DOCLING_SERVICE_URL) {
    console.log("[ROUTER] primary=docling");
    const doclingResult = await extractWithDocling(buffer, fileName, route, env);

    if (doclingResult && doclingResult.success) {
      console.log(
        `[EXTRACTION_COMPLETE]
provider=${doclingResult.provider}
strategy=docling-primary
textLength=${doclingResult.text.length}
confidence=${doclingResult.context.confidenceScore}`,
      );
      return doclingResult;
    }

    console.log("[DOCLING_FAILURE] reason=extraction_failed — selecting fallback");
  } else {
    console.log("[DOCLING_SKIP] reason=not_configured — using fallback");
  }

  // ══════════════════════════════════════════════════════════
  // FALLBACK: Format-specific (only if Docling fails or unreachable)
  // ══════════════════════════════════════════════════════════
  let fallbackResult: UnifiedExtractionResult | null = null;

  if (route.fileFormat === "pdf") {
    console.log("[FALLBACK_STARTED] provider=pdf-native");
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
confidence=${fallbackResult.context.confidenceScore}`,
    );
    return fallbackResult;
  }

  // ══════════════════════════════════════════════════════════
  // LAST RESORT: General fallback
  // ══════════════════════════════════════════════════════════
  if (!isTextFormat(route.fileFormat)) {
    console.log("[FALLBACK_STARTED] provider=general-fallback");
    const generalResult = await extractFallback(buffer, fileName, route, env);
    if (generalResult && generalResult.success) {
      console.log(
        `[EXTRACTION_COMPLETE]
provider=general-fallback
strategy=last-resort
textLength=${generalResult.text.length}`,
      );
      return generalResult;
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