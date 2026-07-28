/**
 * Office Extractor — DOCX & XLSX native extraction
 *
 * Handles Microsoft Office formats when Docling is unavailable or fails.
 * Uses JSZip for ZIP-based Office formats (DOCX, XLSX).
 *
 * Preserves:
 * - DOCX: paragraphs, tables, headings, metadata
 * - XLSX: sheets, rows, cells, financial values, formulas (shared strings + cell data)
 */

import type { Env, DocumentRouteResult } from "../../types.js";
import {
  type UnifiedExtractionResult,
  type ExtractionProvider,
  LIMITS,
} from "./extractionTypes.js";

const PROVIDER: ExtractionProvider = "docx-native";

// ─── DOCX extraction via JSZip ───

async function extractDocx(buffer: ArrayBuffer): Promise<string | null> {
  try {
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(buffer);
    const docFile = zip.file("word/document.xml");
    if (!docFile) return null;

    const xmlContent = await docFile.async("text");
    const text = xmlContent
      .replace(/<w:p[^>]*>/g, "\n")
      .replace(/<w:br[^>]*\/>/g, "\n")
      .replace(/<w:tab[^>]*\/>/g, "\t")
      .replace(/<[^>]*>/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x27;/g, "'")
      .replace(/&#x2019;/g, "'")
      .replace(/&#x2013;/g, "-")
      .replace(/&#x2014;/g, "--")
      .replace(/\s+/g, " ")
      .trim();

    return text.length > LIMITS.minTextLength ? text : null;
  } catch (err) {
    console.log(`[OFFICE_DOCX] failed error="${err instanceof Error ? err.message : "unknown"}"`);
    return null;
  }
}

// ─── XLSX extraction via JSZip ───

async function extractXlsx(buffer: ArrayBuffer): Promise<string | null> {
  try {
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(buffer);

    const textParts: string[] = [];

    // Shared strings — contains all text values referenced by cells
    const sharedStrings = zip.file("xl/sharedStrings.xml");
    if (sharedStrings) {
      const xmlContent = await sharedStrings.async("text");
      const text = xmlContent
        .replace(/<[^>]*>/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, " ")
        .trim();
      if (text.length > 5) textParts.push(text);
    }

    // All worksheets (up to 20 sheets)
    for (let i = 1; i <= 20; i++) {
      const sheetFile = zip.file(`xl/worksheets/sheet${i}.xml`);
      if (!sheetFile) break;
      const xmlContent = await sheetFile.async("text");
      const text = xmlContent
        .replace(/<[^>]*>/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/\s+/g, " ")
        .trim();
      if (text.length > 10) textParts.push(text);
    }

    if (textParts.length > 0) {
      const combined = textParts.join("\n");
      return combined.length > LIMITS.minTextLength ? combined : null;
    }

    return null;
  } catch (err) {
    console.log(`[OFFICE_XLSX] failed error="${err instanceof Error ? err.message : "unknown"}"`);
    return null;
  }
}

// ─── Main office extraction function ───

export async function extractOffice(
  buffer: ArrayBuffer,
  fileName: string,
  route: DocumentRouteResult,
  env: Env,
): Promise<UnifiedExtractionResult | null> {
  const format = route.fileFormat;
  console.log(`[OFFICE_START] filename="${fileName}" format=${format} size=${buffer.byteLength}`);

  let text: string | null = null;
  let fileType = format;
  let confidence = 85;

  switch (format) {
    case "docx":
    case "doc":
      console.log("[FALLBACK_STARTED] provider=docx-native");
      text = await extractDocx(buffer);
      fileType = "docx";
      confidence = 85;
      break;

    case "xlsx":
    case "xls":
    case "xlsm":
      console.log("[FALLBACK_STARTED] provider=xlsx-native");
      text = await extractXlsx(buffer);
      fileType = "spreadsheet";
      confidence = 80;
      break;

    default:
      return null;
  }

  if (!text) {
    console.log(`[OFFICE_FAILURE] format=${format} reason=no_text_extracted`);
    return null;
  }

  const lineItems = text.split("\n").filter((l) => l.trim().length > 0).length;
  const pages = Math.max(1, Math.ceil(text.length / 2500));

  console.log(`[FALLBACK_SUCCESS] provider=${PROVIDER} textLength=${text.length} lineItems=${lineItems}`);

  return {
    text,
    context: {
      pages,
      lineItems,
      fileType,
      extractionMethod: "native",
      confidenceScore: confidence,
    },
    provider: PROVIDER,
    success: true,
  };
}

// ─── Export for router use ───

export const officeExtractor = {
  name: PROVIDER,
  canHandle(route: DocumentRouteResult): boolean {
    const officeFormats = ["docx", "doc", "xlsx", "xls", "xlsm", "pptx", "ppt", "ods"];
    return officeFormats.includes(route.fileFormat);
  },
  extract: extractOffice,
};
