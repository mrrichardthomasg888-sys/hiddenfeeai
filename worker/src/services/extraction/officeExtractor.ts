import type { Env, DocumentRouteResult } from "../../types.js";
import { extractDocumentWithGemini } from "./geminiVision.js";
import { type UnifiedExtractionResult, type ExtractionProvider, TIMEOUTS } from "./extractionTypes.js";

const PROVIDER: ExtractionProvider = "docx-native";
const decodeXml = (s: string) => s.replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16))).replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");
const xmlText = (xml: string) => decodeXml(xml.replace(/<w:tab\b[^>]*\/?\s*>/g, "\t").replace(/<w:br\b[^>]*\/?\s*>/g, "\n").replace(/<w:p\b[^>]*>/g, "\n").replace(/<w:tr\b[^>]*>/g, "\n").replace(/<w:tc\b[^>]*>/g, "\t").replace(/<[^>]+>/g, "")).replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

async function extractDocx(buffer: ArrayBuffer, env: Env) {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(buffer);
  if (!zip.file("word/document.xml")) throw new Error("The Word file is corrupted or unsupported.");
  const parts = Object.keys(zip.files).filter((n) => /^word\/(document|header\d+|footer\d+|comments|footnotes|endnotes)\.xml$/i.test(n)).sort();
  const out: string[] = [];
  for (const name of parts) out.push(`--- ${name} ---\n${xmlText(await zip.file(name)!.async("text"))}`);
  const media = Object.keys(zip.files).filter((n) => /^word\/media\//i.test(n) && !zip.files[n].dir);
  let processedImages = 0, retries = 0;
  for (const [index, name] of media.entries()) {
    const bytes = await zip.file(name)!.async("arraybuffer");
    const ext = name.split(".").pop()?.toLowerCase();
    const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
    const result = await extractDocumentWithGemini(bytes, mime, env, TIMEOUTS.ocrMs, 1, "image");
    retries += result.retries; processedImages++;
    out.push(`--- Embedded image ${index + 1}: ${name} ---\n${result.units[0].text}`);
  }
  return { text: out.join("\n\n"), images: media.length, processedImages, retries };
}

async function extractWorkbook(buffer: ArrayBuffer) {
  const XLSX = await import("xlsx");
  const book = XLSX.read(buffer, { type: "array", cellFormula: true, cellText: true, cellDates: true, sheetStubs: true });
  const output: string[] = [];
  for (const [sheetIndex, sheetName] of book.SheetNames.entries()) {
    const sheet = book.Sheets[sheetName];
    const visibility = book.Workbook?.Sheets?.[sheetIndex]?.Hidden ? "hidden" : "visible";
    output.push(`--- Worksheet: ${sheetName} (${visibility}) ---`);
    for (const address of Object.keys(sheet).filter((k) => !k.startsWith("!"))) {
      const cell: any = sheet[address];
      const value = cell.w ?? cell.v ?? "";
      const formula = cell.f ? ` formula=${cell.f}` : "";
      const comments = Array.isArray(cell.c) ? ` comments=${cell.c.map((c: any) => c.t).join(" | ")}` : "";
      output.push(`${sheetName}!${address}: displayed=${String(value)}${formula}${comments}`);
    }
    if (sheet["!merges"]?.length) output.push(`Merged cells: ${sheet["!merges"].map((m: any) => XLSX.utils.encode_range(m)).join(", ")}`);
  }
  if (!book.SheetNames.length) throw new Error("The spreadsheet contains no worksheets.");
  return { text: output.join("\n"), sheets: book.SheetNames.length };
}

export async function extractOffice(buffer: ArrayBuffer, fileName: string, route: DocumentRouteResult, env: Env): Promise<UnifiedExtractionResult | null> {
  if (["docx"].includes(route.fileFormat)) {
    const r = await extractDocx(buffer, env); if (!r.text.trim()) throw new Error("The Word file contains no readable content.");
    return { text: r.text, context: { pages: route.pageCount || 1, lineItems: r.text.split("\n").length, fileType: "docx", extractionMethod: "native", confidenceScore: 90 }, provider: PROVIDER, success: true, coverage: { totalPages: route.pageCount || 1, processedPages: route.pageCount || 1, totalImages: r.images, processedImages: r.processedImages, totalWorksheets: 0, processedWorksheets: 0, failedUnits: [], retryAttempts: r.retries } };
  }
  if (["xlsx", "xls"].includes(route.fileFormat)) {
    const r = await extractWorkbook(buffer); return { text: r.text, context: { pages: r.sheets, lineItems: r.text.split("\n").length, fileType: "spreadsheet", extractionMethod: "native", confidenceScore: 95 }, provider: "xlsx-native", success: true, coverage: { totalPages: 0, processedPages: 0, totalImages: 0, processedImages: 0, totalWorksheets: r.sheets, processedWorksheets: r.sheets, failedUnits: [], retryAttempts: 0 } };
  }
  // Legacy binary DOC and unsupported office containers are sent intact to
  // Gemini; an invalid container must fail rather than silently appear clean.
  if (route.fileFormat === "doc") {
    const r = await extractDocumentWithGemini(buffer, "application/msword", env, TIMEOUTS.largeMs, 1, "page");
    return { text: r.text, context: { pages: 1, lineItems: r.text.split("\n").length, fileType: "doc", extractionMethod: "ocr", confidenceScore: 80 }, provider: PROVIDER, success: true, coverage: { totalPages: 1, processedPages: 1, totalImages: 0, processedImages: 0, totalWorksheets: 0, processedWorksheets: 0, failedUnits: [], retryAttempts: r.retries } };
  }
  throw new Error(`Unsupported Office format: ${route.fileFormat}`);
}

export const officeExtractor = { name: PROVIDER, canHandle: (route: DocumentRouteResult) => ["docx", "doc", "xlsx", "xls"].includes(route.fileFormat), extract: extractOffice };
