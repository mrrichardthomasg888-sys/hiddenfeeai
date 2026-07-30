/**
 * PDF Extractor — native text extraction + OCR fallback
 *
 * Used as a fallback when Docling fails or is unavailable.
 * Pipeline:
 * 1. Native text extraction (decompress FlateDecode streams)
 * 2. Cloudflare AI OCR on raw PDF bytes
 * 3. Return null if both fail (router handles final fallback)
 */

import type { Env, DocumentRouteResult } from "../../types.js";
import { extractTextWithGemini } from "./geminiVision.js";
import {
  type UnifiedExtractionResult,
  type ExtractionProvider,
  TIMEOUTS,
  LIMITS,
} from "./extractionTypes.js";

const PROVIDER: ExtractionProvider = "pdf-native";

// ─── Decompress FlateDecode (zlib) PDF streams ───

async function decompressFlateStream(compressed: Uint8Array): Promise<string> {
  try {
    const ds = new DecompressionStream("deflate");
    const writer = ds.writable.getWriter();
    const reader = ds.readable.getReader();

    writer.write(compressed);
    writer.close();

    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    return new TextDecoder("utf-8").decode(result);
  } catch (err) {
    console.log(`[PDF_NATIVE] decompress_failed error="${err instanceof Error ? err.message : "unknown"}"`);
    return "";
  }
}

// ─── Native PDF text extraction ───

async function extractPdfNative(buffer: ArrayBuffer): Promise<string | null> {
  try {
    const bytes = new Uint8Array(buffer);
    const decoder = new TextDecoder("utf-8");
    const content = decoder.decode(buffer);
    const textContent: string[] = [];

    // ── Method 1: Decompress FlateDecode streams ──
    const streamRegex = /\/Filter\s*\/FlateDecode[\s\S]*?stream[\r\n]+([\s\S]*?)endstream/g;
    let streamMatch;

    while ((streamMatch = streamRegex.exec(content)) !== null) {
      const streamStart = content.indexOf("stream", streamMatch.index) + 6;
      let dataStart = streamStart;
      if (bytes[dataStart] === 0x0d) dataStart++;
      if (bytes[dataStart] === 0x0a) dataStart++;

      const endstreamIdx = content.indexOf("endstream", dataStart);
      if (endstreamIdx === -1) continue;

      const compressedData = bytes.slice(dataStart, endstreamIdx);
      if (compressedData.length < 4) continue;

      const decompressed = await decompressFlateStream(compressedData);

      if (decompressed && decompressed.trim().length > 0) {
        // Extract text from BT...ET blocks
        const btBlocks = decompressed.match(/BT([\s\S]*?)ET/g);
        if (btBlocks) {
          for (const block of btBlocks) {
            const tjTexts = block.match(/\(([^)]*)\)\s*Tj/g);
            if (tjTexts) {
              for (const tj of tjTexts) {
                const text = tj.match(/\(([^)]*)\)/)?.[1];
                if (text && text.trim().length > 0) textContent.push(text);
              }
            }
            const tjArrayMatch = block.match(/\[([\s\S]*?)\]\s*TJ/);
            if (tjArrayMatch) {
              const arrTexts = tjArrayMatch[1].match(/\(([^)]*)\)/g);
              if (arrTexts) {
                for (const t of arrTexts) {
                  const text = t.slice(1, -1);
                  if (text.trim().length > 0) textContent.push(text);
                }
              }
            }
          }
        }
        if (textContent.length === 0) {
          const lines = decompressed.split(/[\r\n]+/).filter((l) => l.trim().length > 0);
          textContent.push(...lines);
        }
      }
    }

    // ── Method 2: Uncompressed text parsing ──
    const parenMatches = content.match(/\(([^)]*)\)/g);
    if (parenMatches) {
      for (const match of parenMatches) {
        const text = match
          .slice(1, -1)
          .replace(/\\n/g, "\n")
          .replace(/\\r/g, "\r")
          .replace(/\\t/g, "\t")
          .replace(/\\([0-7]{3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
          .replace(/\\(.)/g, "$1")
          .trim();
        if (text.length > 1 && /[a-zA-Z0-9]/.test(text)) textContent.push(text);
      }
    }

    // ── Method 3: BT...ET blocks in raw content ──
    const btEtRegex = /BT([\s\S]*?)ET/g;
    let btMatch;
    while ((btMatch = btEtRegex.exec(content)) !== null) {
      const block = btMatch[1];
      const tjMatches = block.match(/\(([^)]*)\)\s*(?:Tj|'|")/g);
      if (tjMatches) {
        for (const tj of tjMatches) {
          const text = tj.match(/\(([^)]*)\)/)?.[1];
          if (text && text.trim().length > 1) textContent.push(text);
        }
      }
    }

    const extracted = textContent
      .join("\n")
      .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "")
      .replace(/\s{3,}/g, "\n")
      .trim();

    console.log(`[PDF_NATIVE] extracted_chars=${extracted.length} fragments=${textContent.length}`);

    if (extracted.length > LIMITS.minTextLength) return extracted;
    return null;
  } catch (err) {
    console.error(`[PDF_NATIVE] failed error="${err instanceof Error ? err.message : "unknown"}"`);
    return null;
  }
}

// ─── Cloudflare AI OCR on PDF bytes ───

async function ocrPdfWithCloudflareAI(
  buffer: ArrayBuffer,
  env: Env,
  timeoutMs: number,
): Promise<string | null> {
  try {
    const base64 = arrayBufferToBase64(buffer);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const result = await env.AI.run("@cf/unisys/ocr", {
      imageBase64: base64,
    });

    clearTimeout(timeoutId);

    const text = (result as { text?: string }).text ?? "";
    const trimmed = text.trim();

    console.log(
      `[PDF_OCR] strategy=cloudflare-ai success=${trimmed.length > LIMITS.minTextLength} textLength=${trimmed.length}`,
    );

    return trimmed.length > LIMITS.minTextLength ? trimmed : null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`[PDF_OCR] strategy=cloudflare-ai success=false error="${msg}"`);
    return null;
  }
}

// ─── Base64 helper ───

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// ─── Main PDF extraction function ───

export async function extractPdf(
  buffer: ArrayBuffer,
  fileName: string,
  route: DocumentRouteResult,
  env: Env,
): Promise<UnifiedExtractionResult | null> {
  console.log(`[PDF_FALLBACK_START] filename="${fileName}" size=${buffer.byteLength} isScanned=${route.isScanned}`);

  // ── Step 1: Native text extraction ──
  console.log("[FALLBACK_STARTED] provider=pdf-native");
  const nativeText = await extractPdfNative(buffer);

  if (nativeText) {
    const lineItems = nativeText.split("\n").filter((l) => l.trim().length > 0).length;
    console.log(`[FALLBACK_SUCCESS] provider=pdf-native textLength=${nativeText.length}`);

    return {
      text: nativeText,
      context: {
        pages: route.pageCount || 1,
        lineItems,
        fileType: "pdf",
        extractionMethod: "native",
        confidenceScore: 85,
      },
      provider: PROVIDER,
      success: true,
    };
  }

  // ── Step 2: OCR fallback for scanned PDFs ──
  console.log("[FALLBACK_STARTED] provider=pdf-ocr-cloudflare-ai");
  const ocrText = await extractTextWithGemini(buffer, "application/pdf", env, TIMEOUTS.ocrMs);

  if (ocrText) {
    const lineItems = ocrText.split("\n").filter((l) => l.trim().length > 0).length;
    console.log(`[FALLBACK_SUCCESS] provider=pdf-ocr textLength=${ocrText.length}`);

    return {
      text: ocrText,
      context: {
        pages: route.pageCount || 1,
        lineItems,
        fileType: "pdf",
        extractionMethod: "ocr",
        confidenceScore: 65,
      },
      provider: PROVIDER,
      success: true,
    };
  }

  console.log("[PDF_FAILURE] reason=native_and_ocr_failed willFallback=true");
  return null;
}

// ─── Export for router use ───

export const pdfExtractor = {
  name: PROVIDER,
  canHandle(route: DocumentRouteResult): boolean {
    return route.fileFormat === "pdf";
  },
  extract: extractPdf,
};
