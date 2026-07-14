import { AppError, Errors } from "@/utils/AppError.js";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { v4 as uuid } from "uuid";

interface ExtractionResult {
  text: string;
  pages: number;
  lineItems: number;
  fileType: string;
}

const TEMP_DIR = path.join(os.tmpdir(), "hiddenfeeai-extractions");

async function ensureTempDir() {
  try {
    await fs.mkdir(TEMP_DIR, { recursive: true });
  } catch {
    // directory exists
  }
}

/**
 * Extract text from a PDF file using pdfjs-dist.
 * Falls back to OCR (via sharp + tesseract.js) if text extraction yields little.
 */
async function extractFromPdf(filePath: string): Promise<ExtractionResult> {
  const buffer = await fs.readFile(filePath);

  // --- Primary: extract text directly from PDF via pdfjs-dist ---
  try {
    const pdfjsLib = await import("pdfjs-dist/build/pdf.mjs");
    const doc = await (pdfjsLib.getDocument as unknown as (
      params: Record<string, unknown>
    ) => { promise: Promise<unknown> })({
      data: new Uint8Array(buffer),
      disableWorker: true,
      useSystemFonts: true,
    }).promise as { numPages: number; getPage: (n: number) => Promise<{ getTextContent: () => Promise<{ items: Array<{ str?: string }> }> }> };
    const numPages = doc.numPages;
    const textChunks: string[] = [];

    for (let i = 1; i <= numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const pageText = (content.items as Array<{ str?: string }>)
        .map((item) => item.str ?? "")
        .join(" ")
        .trim();
      if (pageText.length > 0) {
        textChunks.push(pageText);
      }
    }

    const extractedText = textChunks.join("\n\n").trim();

    // If we got a reasonable amount of text, return directly
    if (extractedText.length > 50) {
      const lineItems = extractedText.split("\n").filter((l) => l.trim().length > 0).length;
      return { text: extractedText, pages: numPages, lineItems, fileType: "pdf" };
    }

    // Low text yield - fall through to OCR
    console.log(`[Extractor] Low text from pdfjs (${extractedText.length} chars), trying OCR...`);
  } catch (err) {
    console.log(
      `[Extractor] pdfjs text extraction failed: ${
        err instanceof Error ? err.message : "Unknown error"
      }. Trying OCR fallback...`
    );
  }

  // --- Fallback: OCR via sharp + tesseract.js ---
  // This works for scanned/image-based PDFs by converting to images first
  try {
    const sharp = (await import("sharp")).default;
    const Tesseract = (await import("tesseract.js")).default;

    // Try to process the PDF as an image using sharp
    const pngPath = path.join(TEMP_DIR, `${uuid()}_pdf_fallback.png`);

    try {
      await sharp(filePath).png().toFile(pngPath);

      const { data } = await Tesseract.recognize(pngPath, "eng", {
        logger: () => undefined,
      });

      const text = (data.text ?? "").trim();
      await fs.unlink(pngPath).catch(() => {});

      if (text.length > 10) {
        const lineItems = text.split("\n").filter((l) => l.trim().length > 0).length;
        return { text, pages: 1, lineItems, fileType: "pdf" };
      }
    } catch {
      await fs.unlink(pngPath).catch(() => {});
    }

    throw new Error(
      "Could not extract text from this PDF. It may be a scanned document that requires OCR, or the file may be encrypted/corrupted."
    );
  } catch (fallbackErr) {
    throw new AppError(
      400,
      "We couldn't read that PDF. Try a clearer scan, a different format, or a text-based PDF.",
      fallbackErr instanceof Error ? fallbackErr.message : "PDF extraction failed"
    );
  }
}

/**
 * Extract text from an image using tesseract.js OCR.
 * Preprocesses with sharp for better OCR results.
 */
async function extractFromImage(filePath: string): Promise<ExtractionResult> {
  try {
    const sharp = (await import("sharp")).default;
    const preprocessedPath = path.join(TEMP_DIR, `${uuid()}_preprocessed.png`);
    await sharp(filePath)
      .greyscale()
      .normalise()
      .sharpen()
      .png()
      .toFile(preprocessedPath);

    const Tesseract = (await import("tesseract.js")).default;
    const { data } = await Tesseract.recognize(preprocessedPath, "eng", {
      logger: () => undefined,
    });

    // Clean up preprocessed file
    await fs.unlink(preprocessedPath).catch(() => {});

    const text = (data.text ?? "").trim();
    const pages = 1;
    const lineItems = text.split("\n").filter((l: string) => l.trim().length > 0).length;
    return { text, pages, lineItems, fileType: "image" };
  } catch {
    throw Errors.badFile();
  }
}

/**
 * Extract text from a DOCX file using mammoth.
 */
async function extractFromDocx(filePath: string): Promise<ExtractionResult> {
  const mammoth = (await import("mammoth")).default;
  const buffer = await fs.readFile(filePath);
  const { value: html } = await mammoth.extractRawText({ buffer });
  const text = (html ?? "").trim();
  const pages = Math.max(1, Math.ceil(text.length / 2500));
  const lineItems = text.split("\n").filter((l: string) => l.trim().length > 0).length;
  return { text, pages, lineItems, fileType: "docx" };
}

/**
 * Extract text from a TXT file.
 */
async function extractFromTxt(filePath: string): Promise<ExtractionResult> {
  const buffer = await fs.readFile(filePath, "utf-8");
  const text = buffer.trim();
  const pages = Math.max(1, Math.ceil(text.length / 2500));
  const lineItems = text.split("\n").filter((l: string) => l.trim().length > 0).length;
  return { text, pages, lineItems, fileType: "txt" };
}

/**
 * Extract text from CSV/XLSX using SheetJS (xlsx).
 */
async function extractFromSpreadsheet(filePath: string): Promise<ExtractionResult> {
  const XLSX = (await import("xlsx")).default;
  const workbook = XLSX.readFile(filePath);
  const sheets = workbook.SheetNames;
  const lines: string[] = [];

  for (const sheetName of sheets) {
    const sheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
    if (json.length === 0) continue;

    // Convert to readable text rows
    const headers = Object.keys(json[0] ?? {});
    lines.push(`--- Sheet: ${sheetName} ---`);
    lines.push(headers.join(" | "));
    for (const row of json) {
      lines.push(headers.map((h) => String(row[h] ?? "")).join(" | "));
    }
  }

  const text = lines.join("\n").trim();
  const pages = 1;
  const lineItems = text.split("\n").filter((l: string) => l.trim().length > 0).length;
  return { text, pages, lineItems, fileType: "spreadsheet" };
}

/**
 * Main extraction function. Dispatches to the correct extractor based on file extension.
 * Files are processed in a temp directory and immediately deleted after extraction.
 */
export async function extractText(
  filePath: string,
  fileName: string
): Promise<ExtractionResult> {
  await ensureTempDir();
  const ext = path.extname(fileName).toLowerCase().replace(".", "");

  let result: ExtractionResult;

  switch (ext) {
    case "pdf":
      result = await extractFromPdf(filePath);
      break;
    case "png":
    case "jpg":
    case "jpeg":
    case "webp":
    case "heic":
    case "tiff":
    case "tif":
      result = await extractFromImage(filePath);
      break;
    case "docx":
    case "doc":
      result = await extractFromDocx(filePath);
      break;
    case "txt":
      result = await extractFromTxt(filePath);
      break;
    case "csv":
    case "xlsx":
    case "xls":
    case "xlsm":
      result = await extractFromSpreadsheet(filePath);
      break;
    default:
      throw Errors.unsupportedType(ext);
  }

  // Delete the temp file immediately after extraction
  await fs.unlink(filePath).catch(() => {});
  return result;
}