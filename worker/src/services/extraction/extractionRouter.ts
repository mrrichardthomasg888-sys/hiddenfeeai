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
  // PRIMARY: IBM Docling for ALL formats
  // ══════════════════════════════════════════════════════════
  if (env.DOCLING_SERVICE_URL) {
    console.log("[ROUTER] primary=docling");
    const doclingResult = await extractWithDocling(buffer, fileName, route, env);
    if (doclingResult?.success) {
      console.log(`[EXTRACTION_COMPLETE] provider=docling textLength=${doclingResult.text.length} confidence=${doclingResult.context.confidenceScore}`);
      return doclingResult;
    }
    console.log("[DOCLING_FAILURE] falling back");
  }

  // ══════════════════════════════════════════════════════════
  // FALLBACK: Format-specific
  // ══════════════════════════════════════════════════════════
  let result: UnifiedExtractionResult | null = null;

  if (route.fileFormat === "pdf") {
    console.log("[FALLBACK_STARTED] provider=pdf-native");
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

  if (result?.success) {
    console.log(`[FALLBACK_SUCCESS] provider=${result.provider} textLength=${result.text.length}`);
    return result;
  }

  // ══════════════════════════════════════════════════════════
  // LAST RESORT
  // ══════════════════════════════════════════════════════════
  if (!isTextFormat(route.fileFormat)) {
    console.log("[FALLBACK_STARTED] provider=general-fallback");
    const fb = await extractFallback(buffer, fileName, route, env);
    if (fb?.success) return fb;
  }

  const msg = CUSTOMER_MESSAGES.generic;
  console.error(`[EXTRACTION_FAILED] format=${route.fileFormat} customerMessage="${msg}"`);
  return { text: "", context: { pages: 0, lineItems: 0, fileType: route.fileFormat, extractionMethod: "native", confidenceScore: 0 }, provider: "fallback", success: false, customerMessage: msg };
}

export { routeDocument } from "../../router/documentRouter.js";
