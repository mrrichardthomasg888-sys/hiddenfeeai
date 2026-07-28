import type { Env, ExtractionResult } from "../types.js";
import * as errors from "../utils/errors.js";

/**
 * Lightweight text extraction — handles PDFs, DOCX, TXT, CSV.
 * Images are not processed here; they go through Docling (V2 pipeline).
 */

const ACCEPTED_EXTENSIONS = [
  ".pdf", ".png", ".jpg", ".jpeg", ".webp", ".heic", ".tiff", ".tif",
  ".docx", ".doc", ".txt", ".csv", ".xlsx", ".xls", ".xlsm",
];

export function isAcceptedExtension(filename: string): boolean {
  const ext = "." + filename.toLowerCase().split(".").pop();
  return ACCEPTED_EXTENSIONS.includes(ext);
}

export function getExtension(filename: string): string {
  return "." + filename.toLowerCase().split(".").pop();
}

/**
 * Extract text from a PDF by reading raw bytes and looking for text content.
 */
async function extractPdfNative(buffer: ArrayBuffer): Promise<string | null> {
  try {
    const bytes = new Uint8Array(buffer);
    const textContent: string[] = [];
    const decoder = new TextDecoder("utf-8");
    let content = decoder.decode(buffer);

    const parenMatches = content.match(/\(([^)]*)\)/g);
    if (parenMatches) {
      for (const match of parenMatches) {
        const text = match.slice(1, -1)
          .replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\\t/g, "\t")
          .replace(/\\([0-7]{3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
          .replace(/\\(.)/g, "$1").trim();
        if (text.length > 1) textContent.push(text);
      }
    }

    const btEtRegex = /BT([\s\S]*?)ET/g;
    let btMatch;
    while ((btMatch = btEtRegex.exec(content)) !== null) {
      const block = btMatch[1];
      const tjMatches = block.match(/\(([^)]*)\)\s*Tj/g);
      if (tjMatches) {
        for (const tj of tjMatches) {
          const text = tj.match(/\(([^)]*)\)/)?.[1];
          if (text && text.trim().length > 1) textContent.push(text);
        }
      }
    }

    const streamMatches = content.match(/stream\s([\s\S]*?)\nendstream/g);
    if (streamMatches) {
      for (const stream of streamMatches) {
        const streamData = stream.replace(/^stream\s/, "").replace(/\nendstream$/, "");
        if (/^[\x20-\x7E\n\r\t]+$/.test(streamData.substring(0, 100))) {
          textContent.push(streamData.trim());
        }
      }
    }

    const extracted = textContent.join("\n").replace(/\s+/g, " ").trim();
    if (extracted.length > 50) return extracted;
    return null;
  } catch (err) {
    console.log(`[Extractor] Native PDF extraction failed: ${err instanceof Error ? err.message : "Unknown"}`);
    return null;
  }
}

/**
 * Extract text from TXT files
 */
function extractFromTxt(buffer: ArrayBuffer): ExtractionResult {
  const decoder = new TextDecoder("utf-8");
  const text = decoder.decode(buffer).trim();
  const pages = Math.max(1, Math.ceil(text.length / 2500));
  const lineItems = text.split("\n").filter((l) => l.trim().length > 0).length;
  return { text, pages, lineItems, fileType: "txt", extractionMethod: "native", confidenceScore: 100 };
}

/**
 * Extract text from CSV (simple parsing)
 */
function extractFromCsv(buffer: ArrayBuffer): ExtractionResult {
  const decoder = new TextDecoder("utf-8");
  const raw = decoder.decode(buffer);
  const lines = raw.split("\n").filter((l) => l.trim().length > 0);
  const text = lines.join("\n");
  const lineItems = lines.length;
  return { text, pages: 1, lineItems, fileType: "spreadsheet", extractionMethod: "native", confidenceScore: 100 };
}

/**
 * Extract text from a DOCX using JSZip XML parsing (Workers-compatible).
 */
export async function extractDocx(buffer: ArrayBuffer): Promise<ExtractionResult> {
  try {
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(buffer);
    const docFile = zip.file("word/document.xml");
    if (!docFile) throw new Error("No document.xml found in DOCX");
    const xmlContent = await docFile.async("text");
    const text = xmlContent
      .replace(/<[^>]*>/g, " ").replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">")
      .replace(/"/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'").replace(/&#x2019;/g, "'")
      .replace(/&#x2013;/g, "-").replace(/&#x2014;/g, "--").replace(/\s+/g, " ").trim();
    const pages = Math.max(1, Math.ceil(text.length / 2500));
    const lineItems = text.split("\n").filter((l) => l.trim().length > 0).length;
    return { text, pages, lineItems, fileType: "docx", extractionMethod: "native", confidenceScore: 90 };
  } catch (err) {
    console.error("[Extractor] DOCX extraction failed:", err);
    throw errors.badFile("Could not extract text from this DOCX file.");
  }
}

/**
 * Main PDF extraction — native text path only.
 * Scanned/image PDFs should go through Docling.
 */
export async function extractPdf(buffer: ArrayBuffer, env: Env): Promise<ExtractionResult> {
  const nativeText = await extractPdfNative(buffer);
  if (nativeText) {
    const lineItems = nativeText.split("\n").filter((l) => l.trim().length > 0).length;
    return { text: nativeText, pages: 1, lineItems, fileType: "pdf", extractionMethod: "native", confidenceScore: 90 };
  }
  throw errors.badFile(
    "Could not extract text from this PDF natively. " +
    "If this is a scanned/image PDF, the system will retry with Docling OCR. " +
    "Please try again."
  );
}

/**
 * Main dispatcher — detect file type and route to the right extractor.
 * Images are not processed here — they go through the V2 Docling pipeline.
 */
export async function extractText(buffer: ArrayBuffer, fileName: string, env: Env): Promise<ExtractionResult> {
  const ext = getExtension(fileName);
  switch (ext) {
    case ".pdf": return extractPdf(buffer, env);
    case ".docx": case ".doc": return extractDocx(buffer);
    case ".txt": return extractFromTxt(buffer);
    case ".csv": return extractFromCsv(buffer);
    case ".xlsx": case ".xls": case ".xlsm":
      try {
        const JSZip = (await import("jszip")).default;
        const zip = await JSZip.loadAsync(buffer);
        const sharedStrings = zip.file("xl/sharedStrings.xml");
        if (sharedStrings) {
          const xmlContent = await sharedStrings.async("text");
          const text = xmlContent.replace(/<[^>]*>/g, " ").replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">").replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();
          if (text.length > 10) {
            const lineItems = text.split("\n").filter((l) => l.trim().length > 0).length;
            return { text, pages: 1, lineItems, fileType: "spreadsheet", extractionMethod: "native", confidenceScore: 85 };
          }
        }
        const sheetFile = zip.file("xl/worksheets/sheet1.xml");
        if (sheetFile) {
          const xmlContent = await sheetFile.async("text");
          const text = xmlContent.replace(/<[^>]*>/g, " ").replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">").replace(/\s+/g, " ").trim();
          if (text.length > 10) {
            const lineItems = text.split("\n").filter((l) => l.trim().length > 0).length;
            return { text, pages: 1, lineItems, fileType: "spreadsheet", extractionMethod: "native", confidenceScore: 80 };
          }
        }
      } catch { /* fallback */ }
      return extractFromTxt(buffer);
    // Image formats: these should be processed through the V2 Docling pipeline.
    // If they reach here (as fallback), throw a clear diagnostic error.
    case ".png": case ".jpg": case ".jpeg": case ".webp": case ".tiff": case ".tif": case ".heic":
      throw errors.badFile(
        "Image documents must be processed through the Docling pipeline. " +
        "Please ensure DOCLING_SERVICE_URL is configured."
      );
    default: throw errors.unsupportedType(ext);
  }
}