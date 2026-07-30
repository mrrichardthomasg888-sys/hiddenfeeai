/**
 * Image Extractor — OCR pipeline for image uploads
 *
 * Handles PNG, JPG, JPEG, WEBP, TIFF, BMP, and HEIC images.
 * Uses Cloudflare Workers AI OCR (@cf/unisys/ocr) as the primary
 * OCR engine, with DeepSeek as a secondary fallback.
 *
 * Robust preprocessing:
 * - Detects MIME from magic bytes (never trusts client MIME)
 * - Detects corrupted images
 * - Handles EXIF rotation via OffscreenCanvas (when available)
 * - Resizes extremely large images
 * - Normalizes color space
 * - Falls back to raw bytes if canvas APIs are unavailable
 *
 * CRITICAL: Does NOT assume createImageBitmap works.
 * Cloudflare Workers environments are not browsers.
 */

import type { Env, DocumentRouteResult } from "../../types.js";
import {
  type UnifiedExtractionResult,
  type ExtractionProvider,
  TIMEOUTS,
  RETRIES,
  LIMITS,
  CUSTOMER_MESSAGES,
} from "./extractionTypes.js";
import { extractTextWithGemini } from "./geminiVision.js";

const PROVIDER: ExtractionProvider = "image-ocr";

// ─── MIME detection from magic bytes ───

type ImageMime =
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "image/tiff"
  | "image/bmp"
  | "image/gif"
  | "image/heic"
  | "image/heif"
  | "unknown";

function detectImageMime(buffer: ArrayBuffer): ImageMime {
  const arr = new Uint8Array(buffer.slice(0, 12));
  if (arr.length < 4) return "unknown";

  // JPEG: FF D8 FF
  if (arr[0] === 0xff && arr[1] === 0xd8 && arr[2] === 0xff) return "image/jpeg";
  // PNG: 89 50 4E 47
  if (arr[0] === 0x89 && arr[1] === 0x50 && arr[2] === 0x4e && arr[3] === 0x47) return "image/png";
  // WEBP: RIFF....WEBP
  if (arr[0] === 0x52 && arr[1] === 0x49 && arr[2] === 0x46 && arr[3] === 0x46) {
    if (arr.length >= 12) {
      const marker = new TextDecoder().decode(arr.slice(8, 12));
      if (marker === "WEBP") return "image/webp";
    }
  }
  // TIFF: II\x2A\x00 or MM\x00\x2A
  if (
    (arr[0] === 0x49 && arr[1] === 0x49 && arr[2] === 0x2a && arr[3] === 0x00) ||
    (arr[0] === 0x4d && arr[1] === 0x4d && arr[2] === 0x00 && arr[3] === 0x2a)
  ) {
    return "image/tiff";
  }
  // BMP: BM
  if (arr[0] === 0x42 && arr[1] === 0x4d) return "image/bmp";
  // GIF: GIF87a / GIF89a
  if (arr[0] === 0x47 && arr[1] === 0x49 && arr[2] === 0x46) return "image/gif";
  // HEIC/HEIF: ftyp box
  if (arr[4] === 0x66 && arr[5] === 0x74 && arr[6] === 0x79 && arr[7] === 0x70) {
    if (arr.length >= 12) {
      const brand = new TextDecoder().decode(arr.slice(8, 12)).toLowerCase();
      if (["heic", "heix", "mif1", "mif2", "msf1"].includes(brand)) return "image/heic";
      if (brand === "heif" || brand === "hevc") return "image/heif";
    }
  }

  return "unknown";
}

// ─── Corruption check ───

function isCorruptImage(buffer: ArrayBuffer, mime: ImageMime): boolean {
  const arr = new Uint8Array(buffer);

  // JPEG must end with FF D9
  if (mime === "image/jpeg") {
    if (arr.length < 4) return true;
    return !(arr[arr.length - 2] === 0xff && arr[arr.length - 1] === 0xd9);
  }

  // PNG must end with IEND chunk
  if (mime === "image/png") {
    if (arr.length < 8) return true;
    const tail = new TextDecoder().decode(
      arr.slice(Math.max(0, arr.length - 8), arr.length),
    );
    return !tail.includes("IEND");
  }

  // For other formats, just check minimum size
  if (arr.length < 100) return true;

  return false;
}

// ─── Base64 encoding ───

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// ─── Image preprocessing (best-effort, never throws) ───

interface PreprocessResult {
  base64: string;
  mime: ImageMime;
  width?: number;
  height?: number;
  preprocessed: boolean;
  outputFormat: string;
  outputSize: number;
}

async function preprocessImage(
  buffer: ArrayBuffer,
  detectedMime: ImageMime,
): Promise<PreprocessResult> {
  const originalSize = buffer.byteLength;

  console.log(
    `[IMAGE_PREPROCESS]
originalSize=${originalSize}
format=${detectedMime}`,
  );

  // ── HEIC/HEIF: cannot decode in Workers — pass raw to OCR ──
  if (detectedMime === "image/heic" || detectedMime === "image/heif") {
    console.log("[IMAGE_PREPROCESS] HEIC detected — passing raw bytes to OCR (no canvas decode)");
    return {
      base64: arrayBufferToBase64(buffer),
      mime: detectedMime,
      preprocessed: false,
      outputFormat: detectedMime,
      outputSize: originalSize,
    };
  }

  // ── Try canvas-based preprocessing (resize + grayscale) ──
  let width: number | undefined;
  let height: number | undefined;

  try {
    const blob = new Blob([buffer], { type: detectedMime });
    const bitmap = await createImageBitmap(blob);
    width = bitmap.width;
    height = bitmap.height;

    console.log(`[IMAGE_PREPROCESS] width=${width} height=${height}`);

    let targetW = width;
    let targetH = height;

    // Resize if extremely large
    if (width > LIMITS.imageMaxDim || height > LIMITS.imageMaxDim) {
      const ratio = Math.min(LIMITS.imageMaxDim / width, LIMITS.imageMaxDim / height);
      targetW = Math.round(width * ratio);
      targetH = Math.round(height * ratio);
      console.log(`[IMAGE_PREPROCESS] resized=${targetW}x${targetH}`);
    }

    // Try OffscreenCanvas for grayscale + contrast normalization
    if (typeof OffscreenCanvas !== "undefined") {
      const canvas = new OffscreenCanvas(targetW, targetH);
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(bitmap, 0, 0, targetW, targetH);

        // Grayscale + contrast stretch for document readability
        const imageData = ctx.getImageData(0, 0, targetW, targetH);
        const data = imageData.data;

        let min = 255;
        let max = 0;
        for (let i = 0; i < data.length; i += 4) {
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          data[i] = data[i + 1] = data[i + 2] = gray;
          if (gray < min) min = gray;
          if (gray > max) max = gray;
        }

        const range = max - min || 1;
        for (let i = 0; i < data.length; i += 4) {
          const val = ((data[i] - min) / range) * 255;
          data[i] = data[i + 1] = data[i + 2] = val;
        }

        ctx.putImageData(imageData, 0, 0);
        bitmap.close();

        const processedBlob = await canvas.convertToBlob({
          type: "image/jpeg",
          quality: 0.85,
        });
        const processedBuffer = await processedBlob.arrayBuffer();

        console.log(
          `[IMAGE_PREPROCESS] preprocessed=true outputFormat=image/jpeg outputSize=${processedBuffer.byteLength}`,
        );

        return {
          base64: arrayBufferToBase64(processedBuffer),
          mime: "image/jpeg",
          width: targetW,
          height: targetH,
          preprocessed: true,
          outputFormat: "image/jpeg",
          outputSize: processedBuffer.byteLength,
        };
      }
    }

    // OffscreenCanvas not available — close bitmap and fall through
    bitmap.close();
  } catch (err) {
    console.log(
      `[IMAGE_PREPROCESS] canvas_decode_failed error="${err instanceof Error ? err.message : "unknown"}" — using raw bytes`,
    );
  }

  // ── Fallback: pass raw bytes as base64 ──
  console.log(
    `[IMAGE_PREPROCESS] preprocessed=false outputFormat=${detectedMime} outputSize=${originalSize}`,
  );

  return {
    base64: arrayBufferToBase64(buffer),
    mime: detectedMime,
    width,
    height,
    preprocessed: false,
    outputFormat: detectedMime,
    outputSize: originalSize,
  };
}

// ─── Cloudflare Workers AI OCR ───

async function ocrWithCloudflareAI(
  base64Image: string,
  env: Env,
  timeoutMs: number,
): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const result = await env.AI.run("@cf/unisys/ocr", {
      imageBase64: base64Image,
    });

    clearTimeout(timeoutId);

    const text = (result as { text?: string }).text ?? "";
    const trimmed = text.trim();

    console.log(
      `[OCR_ATTEMPT]
strategy=cloudflare-ai
success=${trimmed.length > LIMITS.minTextLength}
textLength=${trimmed.length}`,
    );

    return trimmed.length > LIMITS.minTextLength ? trimmed : null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(
      `[OCR_ATTEMPT]
strategy=cloudflare-ai
success=false
textLength=0
error="${msg}"`,
    );
    return null;
  }
}

// ─── DeepSeek OCR fallback (text model with data URI) ───

async function ocrWithDeepSeek(
  base64Image: string,
  env: Env,
  timeoutMs: number,
): Promise<string | null> {
  if (!env.DEEPSEEK_API_KEY) {
    console.log("[OCR_ATTEMPT] strategy=deepseek skipped=no_api_key");
    return null;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const requestBody = {
      model: env.DEEPSEEK_MODEL || "deepseek-chat",
      messages: [
        {
          role: "user",
          content: `You are a precise OCR engine. Extract ALL text from this document image.
Preserve line breaks, table structure, and layout.
Return ONLY the extracted text, no JSON, no explanations.

![document](data:image/jpeg;base64,${base64Image})`,
        },
      ],
      temperature: 0.1,
      max_tokens: 4096,
    };

    const response = await fetch(
      `${env.DEEPSEEK_BASE_URL}/v1/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      },
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text().catch(() => "unknown");
      console.log(
        `[OCR_ATTEMPT]
strategy=deepseek
success=false
textLength=0
error="HTTP ${response.status}: ${errText.slice(0, 200)}"`,
      );
      return null;
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data.choices?.[0]?.message?.content?.trim() ?? "";

    console.log(
      `[OCR_ATTEMPT]
strategy=deepseek
success=${text.length > LIMITS.minTextLength}
textLength=${text.length}`,
    );

    return text.length > LIMITS.minTextLength ? text : null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(
      `[OCR_ATTEMPT]
strategy=deepseek
success=false
textLength=0
error="${msg}"`,
    );
    return null;
  }
}

// ─── Main image extraction function ───

export async function extractImage(
  buffer: ArrayBuffer,
  fileName: string,
  route: DocumentRouteResult,
  env: Env,
): Promise<UnifiedExtractionResult | null> {
  const detectedMime = detectImageMime(buffer);

  console.log(
    `[IMAGE_START] filename="${fileName}" detectedMime=${detectedMime} size=${buffer.byteLength}`,
  );

  // ── Corruption check ──
  if (detectedMime === "unknown") {
    console.log("[IMAGE_FAILURE] reason=unknown_format willFallback=true");
    return null;
  }

  if (isCorruptImage(buffer, detectedMime)) {
    console.log("[IMAGE_FAILURE] reason=corrupt_image willFallback=true");
    return null;
  }

  // ── Preprocess ──
  // Preserve the original resolution, color and EXIF orientation for Gemini.

  // ── OCR Attempt 1: Cloudflare Workers AI ──
  console.log("[OCR_STARTED] provider=gemini");
  let ocrText = await extractTextWithGemini(buffer, detectedMime, env, TIMEOUTS.ocrMs);

  // ── OCR Attempt 2: DeepSeek (if CF AI failed) ──
  if (!ocrText) {
    console.log("[IMAGE_FAILURE] reason=all_ocr_failed willFallback=true");
    return null;
  }

  const lineItems = ocrText.split("\n").filter((l) => l.trim().length > 0).length;

  console.log(`[FALLBACK_SUCCESS] provider=image-ocr textLength=${ocrText.length}`);

  return {
    text: ocrText,
    context: {
      pages: 1,
      lineItems,
      fileType: route.fileFormat,
      extractionMethod: "image-ocr",
      confidenceScore: 70,
    },
    provider: PROVIDER,
    success: true,
    coverage: { totalPages: 1, processedPages: 1, totalImages: 1, processedImages: 1, totalWorksheets: 0, processedWorksheets: 0, failedUnits: [], retryAttempts: 0 },
  };
}

// ─── Export for router use ───

export const imageExtractor = {
  name: PROVIDER,
  canHandle(route: DocumentRouteResult): boolean {
    const imageFormats = [
      "jpg", "jpeg", "png", "webp", "heic", "heif", "tiff", "tif", "bmp", "gif",
    ];
    return imageFormats.includes(route.fileFormat);
  },
  extract: extractImage,
};
