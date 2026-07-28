import type { Env, ExtractionResult } from "../types.js";
import * as errors from "../utils/errors.js";

/**
 * Layered extraction pipeline for Cloudflare Workers:
 * 1. Native PDF text extraction via lightweight approach
 * 2. Cloudflare AI OCR fallback for scanned/image PDFs
 * 3. Image OCR for direct image uploads
 * 4. DOCX extraction via JSZip XML parsing
 * 5. TXT/CSV direct text extraction
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
 * OCR result interface.
 */
interface OcrResult {
  text: string | null;
  textLength: number;
  error: string | null;
  success: boolean;
  rawResponseShape: string;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

/**
 * Dispatch pixel array to @cf/llava-hf/llava-1.5-7b-hf.
 * Used by both code paths (ImageBitmap and pure-JS).
 */
async function runLlavaIcr(pixelData: number[], width: number, height: number, env: Env): Promise<OcrResult> {
  try {
    console.log(`[OCR_DIAG] Sending to @cf/llava-hf/llava-1.5-7b-hf: ${width}x${height}, ${pixelData.length} pixels`);

    const result = await env.AI.run("@cf/llava-hf/llava-1.5-7b-hf" as any, {
      image: pixelData,
      prompt: "Extract ALL text visible in this document image. Preserve line breaks, numbers, dates, dollar amounts, and table structure. Output ONLY the extracted text, no explanations.",
      max_tokens: 2048,
    } as any);

    const rawShape = JSON.stringify(Object.keys(result as Record<string, unknown>)).slice(0, 200);
    console.log(`[OCR_DIAG] Response keys: ${rawShape}`);

    const r = result as Record<string, unknown>;
    const text = (r.description || r.text || r.result || r.output || r.response || '') as string;
    const trimmed = text.trim();
    const textLength = trimmed.length;

    if (textLength > 10) {
      const alphaCount = (trimmed.match(/[a-zA-Z0-9]/g) || []).length;
      if (alphaCount > 5) {
        return { text: trimmed, textLength, error: null, success: true, rawResponseShape: rawShape };
      }
    }

    const preview = trimmed.slice(0, 200);
    console.log(`[OCR_DIAG] Short/empty response. Text: "${preview}". Raw keys: ${rawShape}`);
    return {
      text: trimmed || null,
      textLength,
      error: textLength > 0
        ? `OCR returned ${textLength} chars, ${(trimmed.match(/[a-zA-Z0-9]/g) || []).length} alphanumeric`
        : `OCR returned 0 chars. Response keys: ${rawShape}`,
      success: false,
      rawResponseShape: rawShape,
    };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    const errStack = err instanceof Error ? (err.stack?.slice(0, 300) || '') : '';
    console.error(`[OCR_DIAG] Exception: ${errMsg}. Stack: ${errStack}`);
    return { text: null, textLength: 0, error: `Exception: ${errMsg}`, success: false, rawResponseShape: 'exception' };
  }
}

// ── CODEC PATH 1: createImageBitmap + canvas (Attempt 1) ──

/**
 * Decode image using createImageBitmap → canvas → pixel array.
 * This is the standard browser codec path. Returns null if image cannot be decoded.
 */
async function decodeViaCreateImageBitmap(imageBuffer: ArrayBuffer): Promise<{ pixels: number[]; width: number; height: number } | null> {
  const arr = new Uint8Array(imageBuffer.slice(0, 12));
  let mimeType = 'image/png';
  if (arr[0] === 0xFF && arr[1] === 0xD8) mimeType = 'image/jpeg';
  else if (arr[0] === 0x89 && arr[1] === 0x50 && arr[2] === 0x4E && arr[3] === 0x47) mimeType = 'image/png';
  else if (arr[0] === 0x52 && arr[1] === 0x49 && arr[2] === 0x46 && arr[3] === 0x46) mimeType = 'image/webp';

  const strategies = [
    { label: 'with-mime', fn: async () => createImageBitmap(new Blob([imageBuffer], { type: mimeType })) },
    { label: 'without-mime', fn: async () => createImageBitmap(new Blob([imageBuffer])) },
  ];

  for (const strategy of strategies) {
    try {
      const bitmap = await strategy.fn();
      let { width, height } = bitmap;
      const MAX = 1024;
      if (width > MAX || height > MAX) {
        const ratio = Math.min(MAX / width, MAX / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext('2d');
      if (!ctx) { bitmap.close(); continue; }
      ctx.drawImage(bitmap, 0, 0, width, height);
      bitmap.close();
      const imageData = ctx.getImageData(0, 0, width, height);
      const pixels = Array.from(imageData.data);
      return { pixels, width, height };
    } catch (err) {
      console.log(`[IMAGE_BITMAP] strategy=${strategy.label} failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return null;
}

async function ocrAttemptViaImageBitmap(imageBuffer: ArrayBuffer, env: Env): Promise<OcrResult & { width?: number; height?: number }> {
  const pixelData = await decodeViaCreateImageBitmap(imageBuffer);
  if (!pixelData) {
    return { text: null, textLength: 0, error: 'createImageBitmap could not decode image', success: false, rawResponseShape: '' };
  }
  const result = await runLlavaIcr(pixelData.pixels, pixelData.width, pixelData.height, env);
  return { ...result, width: pixelData.width, height: pixelData.height };
}

// ── CODEC PATH 2: Pure-JS PNG decoder (Attempt 2) ──

/**
 * Pure-JS PNG decoder that does NOT use createImageBitmap.
 * Parses IDAT chunks, decompresses with DecompressionStream, unfilters pixels.
 * Only supports color type 2 (RGB) and 6 (RGBA) with 8-bit depth.
 */
async function decodeViaPureJsPng(imageBuffer: ArrayBuffer): Promise<{ pixels: number[]; width: number; height: number; channels: number; filterTypesSeen: string } | null> {
  const bytes = new Uint8Array(imageBuffer);
  const pngSig = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  for (let i = 0; i < 8; i++) { if (bytes[i] !== pngSig[i]) return null; }

  const chunks = readPngChunks(bytes, 8);
  const ihdr = chunks.find(c => c.type === 'IHDR');
  if (!ihdr || ihdr.data.length < 13) return null;

  const dv = new DataView(ihdr.data.buffer, ihdr.data.byteOffset, ihdr.data.byteLength);
  const width = dv.getUint32(0);
  const height = dv.getUint32(4);
  const bitDepth = ihdr.data[8];
  const colorType = ihdr.data[9];
  const interlace = ihdr.data[12];

  // Validate: only support PNGs that LLaVA can handle
  if (width === 0 || height === 0 || width > 10000 || height > 10000) return null;
  if (interlace !== 0) return null; // Adam7 interlacing not supported
  if (bitDepth !== 8) return null;  // Only 8-bit
  if (colorType !== 2 && colorType !== 6) return null; // RGB or RGBA only

  // Collect IDAT data
  const idatList = chunks.filter(c => c.type === 'IDAT');
  if (idatList.length === 0) return null;
  const totalLen = idatList.reduce((s, c) => s + c.length, 0);
  const compressed = new Uint8Array(totalLen);
  let offset = 0;
  for (const c of idatList) { compressed.set(c.data, offset); offset += c.data.length; }

  // Decompress — try 'deflate' (zlib-aware) first
  let rawPixelData: Uint8Array | null = null;
  const formats = ['deflate', 'deflate-raw'];
  for (const fmt of formats) {
    if (rawPixelData) break;
    try {
      const ds = new DecompressionStream(fmt as any);
      const writer = ds.writable.getWriter();
      const reader = ds.readable.getReader();
      await writer.write(compressed);
      await writer.close();
      const ck: Uint8Array[] = [];
      while (true) { const { done, value } = await reader.read(); if (done) break; ck.push(value); }
      const total = ck.reduce((s, c) => s + c.length, 0);
      const result = new Uint8Array(total);
      let pos = 0;
      for (const c of ck) { result.set(c, pos); pos += c.length; }
      if (result.length > 10) rawPixelData = result;
    } catch { /* try next */ }
  }
  // Try stripped zlib wrapper
  if (!rawPixelData && compressed.length > 6) {
    try {
      const stripped = compressed.slice(2, compressed.length - 4);
      const ds = new DecompressionStream('deflate-raw' as any);
      const writer = ds.writable.getWriter();
      const reader = ds.readable.getReader();
      await writer.write(stripped);
      await writer.close();
      const ck: Uint8Array[] = [];
      while (true) { const { done, value } = await reader.read(); if (done) break; ck.push(value); }
      const total = ck.reduce((s, c) => s + c.length, 0);
      const result = new Uint8Array(total);
      let pos = 0;
      for (const c of ck) { result.set(c, pos); pos += c.length; }
      if (result.length > 10) rawPixelData = result;
    } catch { /* give up */ }
  }

  if (!rawPixelData) { return null; }

  const channels = colorType === 6 ? 4 : 3;
  const bpp = channels;
  const stride = width * bpp + 1;
  const expectedMinSize = stride * height;

  // Unfilter scanlines
  const unfiltered = new Uint8Array(width * height * channels);
  let unfIdx = 0;
  const filterTypesSeen = new Set<number>();

  if (rawPixelData.length >= expectedMinSize * 0.7) {
    for (let row = 0; row < height; row++) {
      const rowStart = row * stride;
      if (rowStart + 1 >= rawPixelData.length) break;
      const filterType = rawPixelData[rowStart];
      filterTypesSeen.add(filterType);
      for (let col = 0; col < width; col++) {
        const ps = rowStart + 1 + col * bpp;
        if (ps + bpp > rawPixelData.length) break;
        for (let c = 0; c < bpp; c++) {
          let raw = rawPixelData[ps + c];
          let left = 0, above = 0, upperLeft = 0;
          if (col > 0) left = unfiltered[(row * width + (col - 1)) * bpp + c];
          if (row > 0) above = unfiltered[((row - 1) * width + col) * bpp + c];
          if (col > 0 && row > 0) upperLeft = unfiltered[((row - 1) * width + (col - 1)) * bpp + c];
          if (filterType === 1) raw = (raw + left) & 0xFF;           // Sub
          else if (filterType === 2) raw = (raw + above) & 0xFF;    // Up
          else if (filterType === 3) raw = (raw + Math.floor((left + above) / 2)) & 0xFF; // Average
          else if (filterType === 4) { // Paeth
            const p = left + above - upperLeft;
            const pL = Math.abs(p - left), pA = Math.abs(p - above), pUL = Math.abs(p - upperLeft);
            let pr = left;
            if (pA <= pL && pA <= pUL) pr = above;
            else if (pUL <= pL) pr = upperLeft;
            raw = (raw + pr) & 0xFF;
          }
          // filterType 0: raw is actual value
          unfiltered[unfIdx++] = raw;
        }
      }
    }
  } else {
    const copyLen = Math.min(rawPixelData.length, width * height * channels);
    for (let i = 0; i < copyLen; i++) unfiltered[unfIdx++] = rawPixelData[i];
    filterTypesSeen.add(-1); // unknown
  }

  const validCount = Math.min(unfIdx, width * height * channels);

  // LLaVA model @cf/llava-hf/llava-1.5-7b-hf expects RGBA (4 channels) with alpha = 255.
  // The ImageBitmap path produces this via canvas.getImageData which always outputs RGBA.
  // We must produce exactly the same structure.
  const OUTPUT_CHANNELS = 4;
  const rgbaData = new Uint8Array(Math.ceil(validCount / channels) * OUTPUT_CHANNELS);
  let pi = 0;
  for (let i = 0; i + channels - 1 < validCount; i += channels) {
    rgbaData[pi++] = unfiltered[i];       // R
    rgbaData[pi++] = unfiltered[i + 1];   // G
    rgbaData[pi++] = unfiltered[i + 2];   // B
    rgbaData[pi++] = channels === 4 ? unfiltered[i + 3] : 255; // A (or 255 if RGB source)
  }

  // Nearest-neighbor resize to max 1024 (match ImageBitmap path behavior)
  let outW = width, outH = height;
  let outPixels = rgbaData;
  const MAX = 1024;
  if (width > MAX || height > MAX) {
    const ratio = Math.min(MAX / width, MAX / height);
    outW = Math.round(width * ratio);
    outH = Math.round(height * ratio);
    const resampled = new Uint8Array(outW * outH * OUTPUT_CHANNELS);
    for (let y = 0; y < outH; y++) {
      const srcY = Math.round(y / ratio);
      for (let x = 0; x < outW; x++) {
        const srcX = Math.round(x / ratio);
        const si = (srcY * width + srcX) * OUTPUT_CHANNELS;
        const di = (y * outW + x) * OUTPUT_CHANNELS;
        resampled[di] = rgbaData[si];
        resampled[di + 1] = rgbaData[si + 1];
        resampled[di + 2] = rgbaData[si + 2];
        resampled[di + 3] = rgbaData[si + 3];
      }
    }
    outPixels = resampled;
  }

  const filterTypeStr = Array.from(filterTypesSeen).sort().join(',');
  const expectedLen = outW * outH * OUTPUT_CHANNELS;
  console.log(`[PURE_JS_PNG] outputChannels=${OUTPUT_CHANNELS} pixelArrayLength=${outPixels.length} expectedPixelArrayLength=${expectedLen} inputShapeValid=${outPixels.length === expectedLen}`);
  return { pixels: Array.from(outPixels), width: outW, height: outH, channels: OUTPUT_CHANNELS, filterTypesSeen: filterTypeStr };
}

async function ocrAttemptViaPureJsPng(imageBuffer: ArrayBuffer, env: Env): Promise<OcrResult & { width?: number; height?: number; filterTypesSeen?: string; pngInfo?: string }> {
  const bytes = new Uint8Array(imageBuffer);
  // Parse IHDR for detailed info
  let pngInfo = '';
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
    const chunks2 = readPngChunks(bytes, 8);
    const ihdr2 = chunks2.find(c => c.type === 'IHDR');
    if (ihdr2 && ihdr2.data.length >= 13) {
      const dv = new DataView(ihdr2.data.buffer, ihdr2.data.byteOffset, ihdr2.data.byteLength);
      pngInfo = `firstChunk=${chunks2[0]?.type || '?'} width=${dv.getUint32(0)} height=${dv.getUint32(4)} bitDepth=${ihdr2.data[8]} colorType=${ihdr2.data[9]} interlaceMethod=${ihdr2.data[12]}`;
    }
  } else if (bytes[0] === 0xFF && bytes[1] === 0xD8) {
    pngInfo = 'format=JPEG (pure-js PNG decoder not applicable)';
  } else {
    pngInfo = 'format=unknown';
  }

  console.log(`[IMAGE_INPUT] ${pngInfo}`);

  const result = await decodeViaPureJsPng(imageBuffer);
  if (!result) {
    return { text: null, textLength: 0, error: `Pure-JS PNG decoder could not decode (${pngInfo})`, success: false, rawResponseShape: '', pngInfo, filterTypesSeen: '' };
  }

  console.log(`[PURE_JS_PNG] decodeSuccess=true filterTypesSeen=${result.filterTypesSeen} pixelBytes=${result.pixels.length} expectedPixelBytes=${result.width * result.height * 3} outputChannels=${result.channels}`);

  const ocrResult = await runLlavaIcr(result.pixels, result.width, result.height, env);
  return { ...ocrResult, width: result.width, height: result.height, filterTypesSeen: result.filterTypesSeen, pngInfo };
}

// ── CODEC PATH 3: CgBI repair + canvas (Attempt 3) ──

/**
 * Pure-JS PNG parser and repairer for Apple CgBI (iPhone) PNGs.
 * CgBI PNGs have BGR(A) pixel ordering instead of RGB(A).
 * This parser does NOT use createImageBitmap.
 */
const PNG_SIGNATURE_8 = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
interface PngChunk { length: number; type: string; data: Uint8Array; crc: Uint8Array; }

function readPngChunks(bytes: Uint8Array, offset: number): PngChunk[] {
  const chunks: PngChunk[] = [];
  let pos = offset;
  while (pos + 8 <= bytes.length) {
    const length = new DataView(bytes.buffer, bytes.byteOffset + pos, 4).getUint32(0);
    pos += 4;
    const type = new TextDecoder().decode(bytes.slice(pos, pos + 4));
    pos += 4;
    const data = bytes.slice(pos, pos + length);
    pos += length;
    const crc = bytes.slice(pos, pos + 4);
    pos += 4;
    chunks.push({ length, type, data, crc });
    if (type === 'IEND') break;
  }
  return chunks;
}

function isCgbiPng(bytes: Uint8Array): boolean {
  for (let i = 0; i < 8; i++) { if (bytes[i] !== PNG_SIGNATURE_8[i]) return false; }
  if (bytes.length < 12) return false;
  const firstChunkType = new TextDecoder().decode(bytes.slice(12, 16));
  return firstChunkType === 'CgBI';
}

function crc32(chunkType: string, data: Uint8Array): Uint8Array {
  const combined = new Uint8Array(4 + data.length);
  combined.set(new TextEncoder().encode(chunkType), 0);
  combined.set(data, 4);
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < combined.length; i++) {
    crc ^= combined[i];
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
  }
  crc ^= 0xFFFFFFFF;
  const result = new Uint8Array(4);
  new DataView(result.buffer).setUint32(0, crc >>> 0);
  return result;
}

async function repairCgbiPng(buffer: ArrayBuffer): Promise<ArrayBuffer | null> {
  const bytes = new Uint8Array(buffer);
  if (!isCgbiPng(bytes)) return null;
  console.log(`[CGBI_REPAIR] detected=true firstChunk=CgBI`);

  const chunks = readPngChunks(bytes, 8);
  const cgbiChunk = chunks.find(c => c.type === 'CgBI');
  if (!cgbiChunk) return null;

  let width = 0, height = 0, bitDepth = 8, colorType = 6;
  const ihdrChunk = chunks.find(c => c.type === 'IHDR');
  if (ihdrChunk && ihdrChunk.data.length >= 8) {
    const dv = new DataView(ihdrChunk.data.buffer, ihdrChunk.data.byteOffset, ihdrChunk.data.byteLength);
    width = dv.getUint32(0); height = dv.getUint32(4);
    bitDepth = ihdrChunk.data[8]; colorType = ihdrChunk.data[9];
  } else return null;

  if (width === 0 || height === 0 || width > 10000 || height > 10000) return null;

  const rawChunks: Uint8Array[] = [];
  const idatChunks = chunks.filter(c => c.type === 'IDAT' || c.type === 'iDOT');
  for (const c of idatChunks) rawChunks.push(c.data);
  if (rawChunks.length === 0) return null;

  const totalLen = rawChunks.reduce((s, c) => s + c.length, 0);
  const compressed = new Uint8Array(totalLen);
  let offset = 0;
  for (const c of rawChunks) { compressed.set(c, offset); offset += c.length; }

  let rawPixelData: Uint8Array;
  try {
    const ds = new DecompressionStream('deflate');
    const writer = ds.writable.getWriter();
    const reader = ds.readable.getReader();
    await writer.write(compressed); await writer.close();
    const decompressedChunks: Uint8Array[] = [];
    while (true) { const { done, value } = await reader.read(); if (done) break; decompressedChunks.push(value); }
    const totalDecompressed = decompressedChunks.reduce((s, c) => s + c.length, 0);
    rawPixelData = new Uint8Array(totalDecompressed);
    let pos = 0;
    for (const c of decompressedChunks) { rawPixelData.set(c, pos); pos += c.length; }
  } catch (err) {
    console.log(`[CGBI_REPAIR] Decompression failed: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }

  const channelsPerPixel = (colorType === 6 || colorType === 2) ? 4 : 3;
  const bytesPerRow = width * channelsPerPixel + 1;
  let pixelsSwapped = 0;
  for (let row = 0; row < height && row * bytesPerRow + 1 < rawPixelData.length; row++) {
    const rowStart = row * bytesPerRow + 1;
    const rowWidth = Math.min(width, Math.floor((rawPixelData.length - rowStart) / channelsPerPixel));
    for (let col = 0; col < rowWidth; col++) {
      const ps = rowStart + col * channelsPerPixel;
      const r = rawPixelData[ps];
      rawPixelData[ps] = rawPixelData[ps + 2];
      rawPixelData[ps + 2] = r;
      pixelsSwapped++;
    }
  }
  console.log(`[CGBI_REPAIR] Swapped ${pixelsSwapped} pixels BGR→RGB`);

  let recompressed: Uint8Array;
  try {
    const cs = new CompressionStream('deflate');
    const writer = cs.writable.getWriter();
    const reader = cs.readable.getReader();
    await writer.write(rawPixelData); await writer.close();
    const compressedChunks: Uint8Array[] = [];
    while (true) { const { done, value } = await reader.read(); if (done) break; compressedChunks.push(value); }
    const totalCompressed = compressedChunks.reduce((s, c) => s + c.length, 0);
    recompressed = new Uint8Array(totalCompressed);
    let pos = 0;
    for (const c of compressedChunks) { recompressed.set(c, pos); pos += c.length; }
  } catch {
    return null;
  }

  const ihdrData = new Uint8Array(13);
  const ihdrDv = new DataView(ihdrData.buffer);
  ihdrDv.setUint32(0, width); ihdrDv.setUint32(4, height);
  ihdrData[8] = bitDepth; ihdrData[9] = colorType;
  ihdrData[10] = 0; ihdrData[11] = 0; ihdrData[12] = 0;

  const pngSize = 8 + 4 + 4 + 13 + 4 + 4 + 4 + recompressed.length + 4 + 4 + 4 + 0 + 4;
  const png = new Uint8Array(pngSize);
  let pos = 0;
  png.set(PNG_SIGNATURE_8, pos); pos += 8;
  const l4 = new Uint8Array(4); new DataView(l4.buffer).setUint32(0, 13);
  png.set(l4, pos); pos += 4;
  png.set(new TextEncoder().encode('IHDR'), pos); pos += 4;
  png.set(ihdrData, pos); pos += 13;
  png.set(crc32('IHDR', ihdrData), pos); pos += 4;
  const idatLen = new Uint8Array(4); new DataView(idatLen.buffer).setUint32(0, recompressed.length);
  png.set(idatLen, pos); pos += 4;
  png.set(new TextEncoder().encode('IDAT'), pos); pos += 4;
  png.set(recompressed, pos); pos += recompressed.length;
  png.set(crc32('IDAT', recompressed), pos); pos += 4;
  const iendL = new Uint8Array(4); new DataView(iendL.buffer).setUint32(0, 0);
  png.set(iendL, pos); pos += 4;
  png.set(new TextEncoder().encode('IEND'), pos); pos += 4;
  png.set(crc32('IEND', new Uint8Array(0)), pos); pos += 4;

  console.log(`[CGBI_REPAIR] Repaired PNG: ${buffer.byteLength} → ${png.byteLength} bytes, ${width}x${height}`);
  return png.buffer as ArrayBuffer;
}

/**
 * Extract text from a PDF using Cloudflare AI OCR
 */
async function extractPdfViaOcr(buffer: ArrayBuffer, env: Env): Promise<string | null> {
  const result = await ocrAttemptViaImageBitmap(buffer, env);
  if (result.success && result.text) return result.text;
  return null;
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
 * Main PDF extraction function with layered pipeline.
 */
export async function extractPdf(buffer: ArrayBuffer, env: Env): Promise<ExtractionResult> {
  const nativeText = await extractPdfNative(buffer);
  if (nativeText) {
    const lineItems = nativeText.split("\n").filter((l) => l.trim().length > 0).length;
    return { text: nativeText, pages: 1, lineItems, fileType: "pdf", extractionMethod: "native", confidenceScore: 90 };
  }
  const ocrText = await extractPdfViaOcr(buffer, env);
  if (ocrText) {
    const lineItems = ocrText.split("\n").filter((l) => l.trim().length > 0).length;
    return { text: ocrText, pages: 1, lineItems, fileType: "pdf", extractionMethod: "ocr", confidenceScore: 75 };
  }
  throw errors.badFile("Could not extract text from this PDF. It may be a scanned document or the file may be corrupted. Try uploading a clearer scan or image format (PNG/JPG).");
}

/**
 * OCR attempt diagnostics.
 */
interface OcrAttemptDiag {
  attempt: number;
  strategy: string;
  outputMimeType: string;
  inputBytes: number;
  sameInputAsAttempt1: boolean;
  width?: number;
  height?: number;
  success: boolean;
  textLength: number;
  textPreview?: string;
  error: string | null;
  ocrResponseShape: string;
  pngInfo?: string;
  filterTypesSeen?: string;
}

interface OcrDiagnostics {
  auditId: string;
  fileName: string;
  originalFormat: string;
  originalBytes: number;
  attempts: OcrAttemptDiag[];
}

/**
 * Extract text from an image using Cloudflare AI OCR.
 *
 * Three materially different and truly independent code paths:
 *   Attempt 1: createImageBitmap + canvas → pixel array → @cf/llava-hf/llava-1.5-7b-hf
 *   Attempt 2: Pure-JS PNG parser (no createImageBitmap) → pixel array → @cf/llava-hf/llava-1.5-7b-hf
 *   Attempt 3: CgBI repair → re-encoded PNG → @cf/llava-hf/llava-1.5-7b-hf
 *
 * Each attempt uses a DIFFERENT code path to produce the pixel array,
 * so sameInputAsAttempt1=false for attempts 2 and 3.
 */
export async function extractImage(
  buffer: ArrayBuffer,
  env: Env,
  fileName?: string,
  auditId?: string
): Promise<ExtractionResult> {
  const id = auditId || 'unknown';
  const name = fileName || 'image';
  const originalFormat = detectImageFormat(buffer);
  const isRasterImage = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/bmp', 'image/gif', 'image/tiff'].includes(originalFormat);

  const diag: OcrDiagnostics = {
    auditId: id, fileName: name, originalFormat, originalBytes: buffer.byteLength, attempts: [],
  };

  // ── Attempt 1: createImageBitmap path ──
  const a1: OcrAttemptDiag = {
    attempt: 1, strategy: 'imagebitmap', outputMimeType: originalFormat,
    inputBytes: buffer.byteLength, sameInputAsAttempt1: false,
    success: false, textLength: 0, error: null, ocrResponseShape: '',
  };
  console.log(`[OCR_ATTEMPT] auditId=${id} attempt=1 strategy=imagebitmap inputBytes=${buffer.byteLength}`);

  if (!isRasterImage) {
    a1.error = `Skipped — not a raster image (format=${originalFormat})`;
    a1.success = false; diag.attempts.push(a1);
  } else {
    const r1 = await ocrAttemptViaImageBitmap(buffer, env);
    a1.success = r1.success; a1.textLength = r1.textLength;
    a1.error = r1.error; a1.ocrResponseShape = r1.rawResponseShape;
    if (r1.width) a1.width = r1.width;
    if (r1.height) a1.height = r1.height;
    if (r1.text) a1.textPreview = r1.text.slice(0, 150);
    diag.attempts.push(a1);

    if (r1.success && r1.text) {
      const lineItems = r1.text.split("\n").filter((l) => l.trim().length > 0).length;
      console.log(`[OCR_COMPLETE] auditId=${id} strategy=imagebitmap textLength=${r1.textLength} pageCount=1`);
      return { text: r1.text, pages: 1, lineItems, fileType: "image", extractionMethod: "image-ocr", confidenceScore: 75 };
    }
  }

  // ── Attempt 2: Pure-JS PNG decoder (completely independent code path) ──
  const a2: OcrAttemptDiag = {
    attempt: 2, strategy: 'pure-js-png-pixels', outputMimeType: 'pixel-array',
    inputBytes: buffer.byteLength, sameInputAsAttempt1: false, // GUARANTEED different code path
    success: false, textLength: 0, error: null, ocrResponseShape: '',
  };

  console.log(`[OCR_ATTEMPT] auditId=${id} attempt=2 strategy=pure-js-png-pixels inputBytes=${buffer.byteLength} sameInputAsAttempt1=false`);

  if (originalFormat !== 'image/png') {
    a2.error = `Skipped — pure-JS PNG decoder only applies to image/png (format=${originalFormat})`;
    a2.success = false; diag.attempts.push(a2);
  } else {
    const r2 = await ocrAttemptViaPureJsPng(buffer, env);
    a2.success = r2.success; a2.textLength = r2.textLength;
    a2.error = r2.error; a2.ocrResponseShape = r2.rawResponseShape;
    if (r2.width) a2.width = r2.width;
    if (r2.height) a2.height = r2.height;
    if (r2.text) a2.textPreview = r2.text.slice(0, 150);
    if (r2.pngInfo) a2.pngInfo = r2.pngInfo;
    if (r2.filterTypesSeen) a2.filterTypesSeen = r2.filterTypesSeen;
    diag.attempts.push(a2);

    if (r2.success && r2.text) {
      const lineItems = r2.text.split("\n").filter((l) => l.trim().length > 0).length;
      console.log(`[OCR_COMPLETE] auditId=${id} strategy=pure-js-png-pixels textLength=${r2.textLength} pageCount=1`);
      return { text: r2.text, pages: 1, lineItems, fileType: "image", extractionMethod: "image-ocr", confidenceScore: 75 };
    }
  }

  // ── Attempt 3: CgBI repair → re-encoded PNG (for iPhone CgBI PNGs) ──
  const a3: OcrAttemptDiag = {
    attempt: 3, strategy: 'cgbi-repaired-png', outputMimeType: 'image/png',
    inputBytes: 0, sameInputAsAttempt1: false,
    success: false, textLength: 0, error: null, ocrResponseShape: '',
  };

  if (originalFormat === 'image/png') {
    console.log(`[CGBI_REPAIR] detected=false (attempting repair for standard PNG anyway)`);
    // Try CgBI repair — if it returns non-null, the PNG is actually CgBI
    const repaired = await repairCgbiPng(buffer);
    if (repaired) {
      a3.inputBytes = repaired.byteLength;
      console.log(`[OCR_ATTEMPT] auditId=${id} attempt=3 strategy=cgbi-repaired-png inputBytes=${repaired.byteLength} sameInputAsAttempt1=false`);

      // Re-encode repaired PNG → pixel array via createImageBitmap (now should work since it's standard PNG)
      const decoded = await decodeViaCreateImageBitmap(repaired);
      if (decoded) {
        const r3 = await runLlavaIcr(decoded.pixels, decoded.width, decoded.height, env);
        a3.success = r3.success; a3.textLength = r3.textLength;
        a3.error = r3.error; a3.ocrResponseShape = r3.rawResponseShape;
        if (r3.text) a3.textPreview = r3.text.slice(0, 150);
        a3.width = decoded.width; a3.height = decoded.height;
        diag.attempts.push(a3);

        if (r3.success && r3.text) {
          const lineItems = r3.text.split("\n").filter((l) => l.trim().length > 0).length;
          console.log(`[OCR_COMPLETE] auditId=${id} strategy=cgbi-repaired-png textLength=${r3.textLength} pageCount=1`);
          return { text: r3.text, pages: 1, lineItems, fileType: "image", extractionMethod: "image-ocr", confidenceScore: 75 };
        }
      } else {
        a3.error = 'CgBI-repaired PNG could not be decoded by createImageBitmap';
        diag.attempts.push(a3);
      }
    } else {
      a3.error = 'CgBI not detected — not an iPhone CgBI PNG';
      diag.attempts.push(a3);
    }
  } else {
    a3.error = `Skipped — not PNG (format=${originalFormat})`;
    diag.attempts.push(a3);
  }

  // All attempts failed — log full diagnostics
  const diagJson = JSON.stringify(diag, null, 2);
  console.error(`[OCR_COMPLETE] auditId=${id} ALL_ATTEMPTS_FAILED diagnostics:\n${diagJson}`);

  const summary = diag.attempts.map(a =>
    `[${a.attempt}] ${a.strategy}: success=${a.success} sameInput=${a.sameInputAsAttempt1} textLen=${a.textLength} error="${a.error}"`
  ).join(' | ');
  throw errors.badFile(
    `Could not extract text from this image. ` +
    `Format: ${originalFormat}, ${originalByteFmt(buffer.byteLength)}. ` +
    `OCR attempts: ${summary}. ` +
    `Try a clearer scan or a different format.`
  );
}

function originalByteFmt(bytes: number): string {
  if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  if (bytes > 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${bytes}B`;
}

function detectImageFormat(buffer: ArrayBuffer): string {
  const arr = new Uint8Array(buffer.slice(0, 16));
  if (arr[0] === 0xFF && arr[1] === 0xD8 && arr[2] === 0xFF) return 'image/jpeg';
  if (arr[0] === 0x89 && arr[1] === 0x50 && arr[2] === 0x4E && arr[3] === 0x47) return 'image/png';
  if (arr[0] === 0x52 && arr[1] === 0x49 && arr[2] === 0x46 && arr[3] === 0x46) {
    const webpMarker = new TextDecoder().decode(arr.slice(8, 12));
    if (webpMarker === 'WEBP') return 'image/webp';
  }
  if (arr[4] === 0x66 && arr[5] === 0x74 && arr[6] === 0x79 && arr[7] === 0x70) {
    const brand = new TextDecoder().decode(arr.slice(8, 12)).toLowerCase();
    if (brand === 'heic' || brand === 'heif' || brand === 'heix' || brand === 'hevc') return `image/${brand}`;
  }
  if (arr[0] === 0x42 && arr[1] === 0x4D) return 'image/bmp';
  if (arr[0] === 0x47 && arr[1] === 0x49 && arr[2] === 0x46 && arr[3] === 0x38) return 'image/gif';
  return 'unknown';
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
 * Main dispatcher — detect file type and route to the right extractor
 */
export async function extractText(buffer: ArrayBuffer, fileName: string, env: Env): Promise<ExtractionResult> {
  const ext = getExtension(fileName);
  switch (ext) {
    case ".pdf": return extractPdf(buffer, env);
    case ".png": case ".jpg": case ".jpeg": case ".webp": case ".tiff": case ".tif": case ".heic":
      return extractImage(buffer, env, fileName);
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
    default: throw errors.unsupportedType(ext);
  }
}