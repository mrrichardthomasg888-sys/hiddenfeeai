import type { Env, DocumentRouteResult } from "../../types.js";
import { extractDocumentWithGemini } from "./geminiVision.js";
import { type UnifiedExtractionResult, type ExtractionProvider, TIMEOUTS } from "./extractionTypes.js";

const PROVIDER: ExtractionProvider = "pdf-native";

export async function extractPdf(buffer: ArrayBuffer, fileName: string, _route: DocumentRouteResult, env: Env): Promise<UnifiedExtractionResult | null> {
  const { PDFDocument } = await import("pdf-lib");
  let source: any;
  try { source = await PDFDocument.load(buffer, { ignoreEncryption: false, updateMetadata: false }); }
  catch { throw new Error("The PDF is corrupted, encrypted, or unsupported."); }
  const totalPages = source.getPageCount();
  if (!totalPages) throw new Error("The PDF contains no pages.");
  const texts: string[] = [], failedUnits: string[] = [];
  let retries = 0;

  // Small batches bound response size while preserving page order. Every page is
  // rendered/interpreted by Gemini, including mixed PDFs with partial text layers.
  for (let start = 0; start < totalPages; start += 6) {
    const count = Math.min(6, totalPages - start);
    try {
      const batch = await PDFDocument.create();
      (await batch.copyPages(source, Array.from({ length: count }, (_, i) => start + i))).forEach((p) => batch.addPage(p));
      const bytes = await batch.save({ useObjectStreams: false });
      const result = await extractDocumentWithGemini(bytes.buffer as ArrayBuffer, "application/pdf", env, TIMEOUTS.largeMs, count, "page");
      retries += result.retries;
      result.units.forEach((unit, i) => texts.push(`--- Page ${start + i + 1} ---\n${unit.text}`));
      console.log(`[PDF_BATCH] file="${fileName}" pages=${start + 1}-${start + count} sent=${count} returned=${result.units.length} retries=${result.retries}`);
    } catch (error) {
      for (let i = 0; i < count; i++) failedUnits.push(`page ${start + i + 1}`);
      console.error(`[PDF_BATCH] file="${fileName}" pages=${start + 1}-${start + count} failed=true error="${error instanceof Error ? error.message : String(error)}"`);
    }
  }
  if (failedUnits.length) throw new Error(`File only partially analyzed; failed: ${failedUnits.join(", ")}`);
  const text = texts.join("\n\n");
  return { text, context: { pages: totalPages, lineItems: text.split("\n").filter((l) => l.trim()).length, fileType: "pdf", extractionMethod: "ocr", confidenceScore: 90 }, provider: PROVIDER, success: true,
    coverage: { totalPages, processedPages: totalPages, totalImages: 0, processedImages: 0, totalWorksheets: 0, processedWorksheets: 0, failedUnits, retryAttempts: retries } };
}

export const pdfExtractor = { name: PROVIDER, canHandle: (route: DocumentRouteResult) => route.fileFormat === "pdf", extract: extractPdf };
