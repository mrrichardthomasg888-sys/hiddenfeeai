import type { ExtractedDocument, ExtractedPage, PageBlock, Env } from "../types.js";
import * as errors from "../utils/errors.js";

// ─── File type detection by magic bytes ───

type SupportedFileType = ExtractedDocument['fileType'];

function detectFileType(buffer: ArrayBuffer, fileName: string): SupportedFileType {
  const arr = new Uint8Array(buffer);
  const header = arr.slice(0, 12);

  // PDF: %PDF
  if (arr[0] === 0x25 && arr[1] === 0x50 && arr[2] === 0x44 && arr[3] === 0x46) return 'pdf';

  // PNG: \x89PNG\r\n\x1a\n
  if (arr[0] === 0x89 && arr[1] === 0x50 && arr[2] === 0x4E && arr[3] === 0x47) return 'png';

  // JPEG: \xFF\xD8\xFF
  if (arr[0] === 0xFF && arr[1] === 0xD8 && arr[2] === 0xFF) return 'jpg';

  // WEBP: RIFF....WEBP
  if (arr[0] === 0x52 && arr[1] === 0x49 && arr[2] === 0x46 && arr[3] === 0x46) {
    const webpMarker = new TextDecoder().decode(header.slice(8, 12));
    if (webpMarker === 'WEBP') return 'webp';
  }

  // TIFF: II (little-endian) or MM (big-endian)
  if (
    (arr[0] === 0x49 && arr[1] === 0x49 && arr[2] === 0x2A && arr[3] === 0x00) ||
    (arr[0] === 0x4D && arr[1] === 0x4D && arr[2] === 0x00 && arr[3] === 0x2A)
  ) {
    // TIFF is an image format — treat as image/png-like for OCR pipeline
    const ext = fileName.toLowerCase().split('.').pop() ?? '';
    if (ext === 'tiff' || ext === 'tif') return 'png'; // route to OCR path
    return 'png';
  }

  // BMP: BM
  if (arr[0] === 0x42 && arr[1] === 0x4D) return 'png';

  // ZIP-based (DOCX, XLSX) — PK signature
  if (arr[0] === 0x50 && arr[1] === 0x4B) {
    const ext = fileName.toLowerCase().split('.').pop() ?? '';
    if (ext === 'xlsx' || ext === 'xls' || ext === 'xlsm') return 'xlsx';
    if (ext === 'pptx' || ext === 'ppt') return 'docx'; // treat PPTX like DOCX
    return 'docx';
  }

  // HEIC/HEIF: ftyp box with heic/heif/heix/hevc brand
  if (arr[4] === 0x66 && arr[5] === 0x74 && arr[6] === 0x79 && arr[7] === 0x70) {
    const brand = new TextDecoder().decode(header.slice(8, 12)).toLowerCase();
    if (brand === 'heic' || brand === 'heif' || brand === 'heix' || brand === 'hevc') return 'heic';
  }

  // Fallback by extension
  const ext = fileName.toLowerCase().split('.').pop() ?? '';
  if (ext === 'txt' || ext === 'text' || ext === 'rtf' || ext === 'md') return 'txt';
  if (ext === 'csv' || ext === 'tsv') return 'csv';
  if (ext === 'heic' || ext === 'heif') return 'heic';
  if (ext === 'tiff' || ext === 'tif' || ext === 'bmp') return 'png';
  if (ext === 'xlsx' || ext === 'xls' || ext === 'xlsm') return 'xlsx';
  if (ext === 'docx' || ext === 'doc' || ext === 'pptx' || ext === 'ppt') return 'docx';

  throw errors.unsupportedType('.' + ext);
}

// ─── Accepted extensions ───

const ACCEPTED_EXTENSIONS = [
  ".pdf", ".png", ".jpg", ".jpeg", ".webp", ".heic", ".heif",
  ".tiff", ".tif", ".bmp", ".docx", ".doc", ".pptx", ".ppt",
  ".txt", ".csv", ".tsv", ".rtf", ".md", ".xlsx", ".xls", ".xlsm",
];

export function isAcceptedExtension(filename: string): boolean {
  const ext = "." + filename.toLowerCase().split(".").pop();
  return ACCEPTED_EXTENSIONS.includes(ext);
}

// ─── MIME Type Detection ───

function detectMimeType(buffer: ArrayBuffer, fileName: string): string {
  const arr = new Uint8Array(buffer.slice(0, 4));
  if (arr[0] === 0x89 && arr[1] === 0x50 && arr[2] === 0x4E && arr[3] === 0x47) return 'image/png';
  if (arr[0] === 0xFF && arr[1] === 0xD8 && arr[2] === 0xFF) return 'image/jpeg';
  if (arr[0] === 0x52 && arr[1] === 0x49 && arr[2] === 0x46 && arr[3] === 0x46) return 'image/webp';
  
  const ext = fileName.toLowerCase().split('.').pop() ?? '';
  if (ext === 'png') return 'image/png';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'heic' || ext === 'heif') return 'image/heic';
  if (ext === 'tiff' || ext === 'tif') return 'image/tiff';
  return 'image/jpeg'; // fallback to JPEG as a common image type for Gemini
}

// ─── Base64 utilities ───

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  if (typeof globalThis !== 'undefined' && (globalThis as any).Buffer) {
    return (globalThis as any).Buffer.from(buffer).toString('base64');
  }
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    const slice = bytes.subarray(i, i + chunk);
    binary += String.fromCharCode.apply(null, slice as unknown as number[]);
  }
  return btoa(binary);
}

// ─── Gemini Vision OCR ───

async function geminiOCR(
  base64Image: string,
  mimeType: string,
  pageNumber: number,
  env: Env,
  retryCount = 0
): Promise<ExtractedPage> {
  const apiKey = env.GEMINI_API_KEY || env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY or GOOGLE_API_KEY is not configured");

  const model = env.GEMINI_MODEL || "gemini-1.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  console.log(`[geminiOCR] Page ${pageNumber}: sending OCR request (attempt ${retryCount + 1}) to Gemini`);

  const requestBody = {
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Image,
            },
          },
          {
            text: `You are a precise, high-fidelity OCR engine. Extract ALL text from this document image.
Preserve line breaks, table structure, and layout.
Identify text blocks and estimate confidence (0.0 to 1.0) for each.
Return ONLY valid JSON in this exact format:
{
  "pageNumber": ${pageNumber},
  "text": "full extracted text with line breaks",
  "textBlocks": [
    {"text": "string", "confidence": 0.0-1.0}
  ],
  "tables": [[["cell1","cell2"],["cell3","cell4"]]]
}
Do not include any conversational text, markdown wrapping (no \`\`\`json blocks), or explanations. Return ONLY the JSON object.`,
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
    ]
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60_000);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    throw new Error(`Gemini OCR fetch failed: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(`Gemini OCR failed (${response.status}): ${errorText}`);
  }

  const data = await response.json() as any;
  const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  console.log(`[geminiOCR] Raw response length: ${rawContent.length} chars`);

  let parsed: any;
  try {
    parsed = JSON.parse(rawContent);
  } catch (err) {
    console.warn("[geminiOCR] Failed to parse JSON directly, attempting fallback cleanup");
    const match = rawContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) {
      try {
        parsed = JSON.parse(match[1]);
      } catch { parsed = null; }
    }
  }

  if (!parsed || !parsed.text || parsed.text.trim().length < 5) {
    if (retryCount === 0) {
      console.log(`[geminiOCR] Empty/low response — retrying once...`);
      return geminiOCR(base64Image, mimeType, pageNumber, env, retryCount + 1);
    }
    return {
      pageNumber,
      text: rawContent || '[No text extracted]',
      textBlocks: [{ text: rawContent || '', confidence: 0.3 }],
      ocrEngine: 'gemini-vision',
      ocrConfidence: 0.3
    };
  }

  const textBlocks: PageBlock[] = (parsed.textBlocks || []).map((b: any) => ({
    text: String(b.text || ''),
    confidence: Math.min(1, Math.max(0, Number(b.confidence) || 0.8))
  }));

  const avgConfidence = textBlocks.length > 0
    ? textBlocks.reduce((s: number, b: PageBlock) => s + b.confidence, 0) / textBlocks.length
    : (parsed.text && parsed.text.length > 20 ? 0.85 : 0.5);

  return {
    pageNumber,
    text: String(parsed.text || ''),
    textBlocks,
    tables: parsed.tables || [],
    ocrEngine: 'gemini-vision',
    ocrConfidence: avgConfidence
  };
}

// ─── DeepSeek Vision OCR ───

async function deepSeekOCR(base64Image: string, pageNumber: number, env: Env, retryCount = 0): Promise<ExtractedPage> {
  const apiKey = env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY is not configured");

  const ocrEndpoint = `${env.DEEPSEEK_BASE_URL}/v1/chat/completions`;
  console.log(`[deepSeekOCR] Page ${pageNumber}: sending OCR request (attempt ${retryCount + 1}) to ${ocrEndpoint}`);
  console.log(`[deepSeekOCR] Base64 image length: ${base64Image.length} chars`);

  // DeepSeek chat API uses text-only content parts (no image_url variant).
  // Embed the image as a data URI inline within a text content block.
  const requestBody = {
    model: env.DEEPSEEK_MODEL || 'deepseek-chat',
    messages: [
      {
        role: 'user',
        content: `You are a precise OCR engine. Extract ALL text from this document image.
Preserve line breaks, table structure, and layout.
Identify text blocks and estimate confidence for each.
Return ONLY valid JSON in this exact format:
{
  "pageNumber": number,
  "text": "full extracted text with line breaks",
  "textBlocks": [
    {"text": "string", "confidence": 0.0-1.0}
  ],
  "tables": [[["cell1","cell2"],["cell3","cell4"]]]
}
Do not include markdown formatting or explanations. Return ONLY the JSON object.

Here is the document image:
![document](data:image/jpeg;base64,${base64Image})`
      }
    ],
    temperature: 0.1,
    max_tokens: 4096
  };

  console.log(`[deepSeekOCR] Request model: ${requestBody.model}, messages: ${requestBody.messages.length}`);
  console.log(`[deepSeekOCR] User content length: ${(requestBody.messages[0].content as string).length} chars`);

  // 60-second timeout to prevent hanging the worker indefinitely
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60_000);

  let response: Response;
  try {
    response = await fetch(ocrEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
  } catch (fetchErr) {
    clearTimeout(timeoutId);
    const errMsg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
    console.error(`[deepSeekOCR] Fetch failed: ${errMsg}`);
    throw new Error(`DeepSeek OCR request failed: ${errMsg}`);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => 'Unknown error');
    console.error(`[deepSeekOCR] API error (${response.status}):`, errText.slice(0, 500));
    // Include actual API response body in the thrown error for debugging
    throw new Error(`DeepSeek OCR failed (${response.status}): ${errText.slice(0, 300)}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const rawContent = data.choices?.[0]?.message?.content || '';
  console.log(`[deepSeekOCR] Raw response length: ${rawContent.length} chars`);

  // Parse JSON from response
  let parsed: any;
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    const match = rawContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) {
      try {
        parsed = JSON.parse(match[1]);
      } catch {
        parsed = null;
      }
    }
    if (!parsed) {
      // Last resort: try to find JSON object
      const braceIdx = rawContent.indexOf('{');
      const lastBrace = rawContent.lastIndexOf('}');
      if (braceIdx !== -1 && lastBrace > braceIdx) {
        try {
          parsed = JSON.parse(rawContent.slice(braceIdx, lastBrace + 1));
        } catch { /* give up */ }
      }
    }
  }

  if (!parsed || !parsed.text || parsed.text.trim().length < 5) {
    // Retry once with higher contrast note
    if (retryCount === 0) {
      console.log(`[deepSeekOCR] Empty/low response — retrying once...`);
      return deepSeekOCR(base64Image, pageNumber, env, retryCount + 1);
    }
    // Return partial data instead of throwing
    return {
      pageNumber,
      text: rawContent || '[No text extracted]',
      textBlocks: [{ text: rawContent || '', confidence: 0.3 }],
      ocrEngine: 'deepseek-vision',
      ocrConfidence: 0.3
    };
  }

  const textBlocks: PageBlock[] = (parsed.textBlocks || []).map((b: any) => ({
    text: String(b.text || ''),
    confidence: Math.min(1, Math.max(0, Number(b.confidence) || 0.8))
  }));

  const avgConfidence = textBlocks.length > 0
    ? textBlocks.reduce((s: number, b: PageBlock) => s + b.confidence, 0) / textBlocks.length
    : (parsed.text && parsed.text.length > 20 ? 0.6 : 0.4);

  console.log(`[deepSeekOCR] Page ${pageNumber}: ${textBlocks.length} blocks, avg confidence: ${avgConfidence.toFixed(2)}`);

  return {
    pageNumber,
    text: String(parsed.text || ''),
    textBlocks,
    tables: parsed.tables || [],
    ocrEngine: 'deepseek-vision',
    ocrConfidence: avgConfidence
  };
}

// ─── Decompress FlateDecode (zlib) PDF streams ───

async function decompressFlateStream(compressed: Uint8Array): Promise<string> {
  try {
    // DecompressionStream is available in Cloudflare Workers
    const ds = new DecompressionStream('deflate');
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

    // Combine chunks
    const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    return new TextDecoder('utf-8').decode(result);
  } catch (err) {
    console.log(`[decompressFlate] Failed: ${err instanceof Error ? err.message : 'Unknown'}`);
    return '';
  }
}

// ─── Improved PDF Native Text Extraction ───

async function extractPdfNative(buffer: ArrayBuffer): Promise<string | null> {
  try {
    const bytes = new Uint8Array(buffer);
    const decoder = new TextDecoder("utf-8");
    const content = decoder.decode(buffer);
    const textContent: string[] = [];

    // ── Method 1: Decompress FlateDecode streams ──
    console.log('[extractPdfNative] Searching for compressed streams...');
    const streamRegex = /\/Filter\s*\/FlateDecode[\s\S]*?stream[\r\n]+([\s\S]*?)endstream/g;
    let streamMatch;
    let compressedStreamsProcessed = 0;

    while ((streamMatch = streamRegex.exec(content)) !== null) {
      compressedStreamsProcessed++;
      // The stream data is between `stream\n` and `endstream`
      // We need to find the exact byte boundary in the raw ArrayBuffer
      const streamStart = content.indexOf('stream', streamMatch.index) + 6;
      // Skip \r\n or \n after 'stream'
      let dataStart = streamStart;
      if (bytes[dataStart] === 0x0D) dataStart++; // \r
      if (bytes[dataStart] === 0x0A) dataStart++; // \n

      const endstreamIdx = content.indexOf('endstream', dataStart);
      if (endstreamIdx === -1) continue;

      const compressedData = bytes.slice(dataStart, endstreamIdx);
      if (compressedData.length < 4) continue;

      console.log(`[extractPdfNative] Decompressing stream: ${compressedData.length} bytes`);
      const decompressed = await decompressFlateStream(compressedData);

      if (decompressed && decompressed.trim().length > 0) {
        // Extract text from decompressed content using BT...ET blocks
        const btBlocks = decompressed.match(/BT([\s\S]*?)ET/g);
        if (btBlocks) {
          for (const block of btBlocks) {
            // Extract text from Tj, TJ, ', " operators
            const tjTexts = block.match(/\(([^)]*)\)\s*Tj/g);
            if (tjTexts) {
              for (const tj of tjTexts) {
                const text = tj.match(/\(([^)]*)\)/)?.[1];
                if (text && text.trim().length > 0) textContent.push(text);
              }
            }
            // Also try TJ arrays
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
        // If no BT...ET blocks found, just use the raw decompressed text
        if (textContent.length === 0) {
          const lines = decompressed.split(/[\r\n]+/).filter(l => l.trim().length > 0);
          textContent.push(...lines);
        }
      }
    }
    console.log(`[extractPdfNative] Processed ${compressedStreamsProcessed} compressed streams`);

    // ── Method 2: Uncompressed text parsing (legacy approach) ──
    const parenMatches = content.match(/\(([^)]*)\)/g);
    if (parenMatches) {
      for (const match of parenMatches) {
        const text = match.slice(1, -1)
          .replace(/\\n/g, "\n")
          .replace(/\\r/g, "\r")
          .replace(/\\t/g, "\t")
          .replace(/\\([0-7]{3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
          .replace(/\\(.)/g, "$1")
          .trim();
        if (text.length > 1 && /[a-zA-Z0-9]/.test(text)) textContent.push(text);
      }
    }

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

    // ── Method 3: Raw stream data ──
    const rawStreamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]*endstream/g;
    let rawMatch;
    while ((rawMatch = rawStreamRegex.exec(content)) !== null) {
      const rawData = rawMatch[1].trim();
      if (rawData.length > 10 && /[a-zA-Z]{3,}/.test(rawData.slice(0, 200))) {
        textContent.push(rawData);
      }
    }

    const extracted = textContent
      .join("\n")
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '') // strip control chars
      .replace(/\s{3,}/g, '\n')
      .trim();

    console.log(`[extractPdfNative] Extracted ${extracted.length} chars from ${textContent.length} fragments`);

    if (extracted.length > 50) return extracted;
    if (extracted.length > 10) return extracted; // Even 10+ chars might be valid for small docs

    return null;
  } catch (err) {
    console.error(`[extractPdfNative] Failed: ${err instanceof Error ? err.message : 'Unknown'}`);
    return null;
  }
}

// ─── Scanned PDF → page images ───

// ─── DOCX extraction ───

async function extractDocx(buffer: ArrayBuffer): Promise<string> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(buffer);
  const docFile = zip.file("word/document.xml");
  if (!docFile) throw new Error("No document.xml found in DOCX");

  const xmlContent = await docFile.async("text");
  return xmlContent
    .replace(/<w:p[^>]*>/g, '\n')
    .replace(/<w:br[^>]*\/>/g, '\n')
    .replace(/<w:tab[^>]*\/>/g, '\t')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2019;/g, "'")
    .replace(/&#x2013;/g, "-")
    .replace(/&#x2014;/g, "--")
    .replace(/\s+/g, " ")
    .trim();
}

// ─── XLSX extraction ───

async function extractXlsx(buffer: ArrayBuffer): Promise<string> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(buffer);

  // Try shared strings first
  const sharedStrings = zip.file("xl/sharedStrings.xml");
  let sharedText = '';
  if (sharedStrings) {
    const xmlContent = await sharedStrings.async("text");
    sharedText = xmlContent
      .replace(/<[^>]*>/g, " ")
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/\s+/g, " ")
      .trim();
  }

  // Try all worksheets
  const textParts: string[] = [];
  if (sharedText.length > 5) textParts.push(sharedText);

  for (let i = 1; i <= 5; i++) {
    const sheetFile = zip.file(`xl/worksheets/sheet${i}.xml`);
    if (!sheetFile) break;
    const xmlContent = await sheetFile.async("text");
    const text = xmlContent
      .replace(/<[^>]*>/g, " ")
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/\s+/g, " ")
      .trim();
    if (text.length > 10) textParts.push(text);
  }

  if (textParts.length > 0) return textParts.join('\n');

  // Ultimate fallback
  return new TextDecoder().decode(buffer);
}

// ─── DocumentProcessor class ───

export class DocumentProcessor {
  constructor(private env: Env) {}

  async process(buffer: ArrayBuffer, fileName: string): Promise<ExtractedDocument> {
    console.log(`[DocumentProcessor] Processing: ${fileName} (${buffer.byteLength} bytes)`);
    const fileType = detectFileType(buffer, fileName);
    console.log(`[DocumentProcessor] Detected type: ${fileType}`);

    let pages: ExtractedPage[] = [];
    let warnings: string[] = [];

    switch (fileType) {
      case 'pdf': {
        console.log('[DocumentProcessor] Direct PDF path started');
        
        const imageMimeType = detectMimeType(buffer, fileName);
        const base64Image = arrayBufferToBase64(buffer);
        
        if (this.env.GEMINI_API_KEY || this.env.GOOGLE_API_KEY) {
          try {
            const { pages: extractedPages } = await geminiExtractDocument(base64Image, imageMimeType, this.env);
            pages = extractedPages;
          } catch (err) {
            console.error(`[DocumentProcessor] Gemini PDF OCR failed, falling back to native text:`, err);
            const nativeText = await extractPdfNative(buffer);
            if (nativeText && nativeText.length > 10) {
              pages = [{
                pageNumber: 1,
                text: nativeText,
                textBlocks: [{ text: nativeText, confidence: 0.5 }],
                ocrEngine: 'native-fallback',
                ocrConfidence: 0.5
              }];
            } else {
              throw new Error("Could not extract any content from this PDF document.");
            }
          }
        } else {
          throw new Error("No Gemini API key configured for PDF processing");
        }
        break;
      }

      case 'jpg':
      case 'png':
      case 'webp':
      case 'heic': {
        console.log(`[DocumentProcessor] Image path: ${fileType}`);
        const imageMimeType = detectMimeType(buffer, fileName);
        const base64Image = arrayBufferToBase64(buffer);
        
        console.log(`[DocumentProcessor] Starting direct Gemini OCR for ${fileName} (${imageMimeType})...`);

        if (this.env.GEMINI_API_KEY || this.env.GOOGLE_API_KEY) {
          try {
            const { pages: extractedPages } = await geminiExtractDocument(base64Image, imageMimeType, this.env);
            pages = extractedPages;
          } catch (err) {
            console.error(`[DocumentProcessor] Gemini image OCR failed:`, err);
            throw new Error(`Image OCR failed: ${err instanceof Error ? err.message : String(err)}`);
          }
        } else {
          throw new Error("No Gemini API key configured for image OCR");
        }
        
        if (pages.length > 0 && pages[0].ocrConfidence < 0.6) {
          warnings.push(`Image had low OCR confidence (${Math.round(pages[0].ocrConfidence * 100)}%). Try a clearer photo.`);
        }
        break;
      }

      case 'docx': {
        console.log('[DocumentProcessor] DOCX path');
        const text = await extractDocx(buffer);
        pages = [{
          pageNumber: 1,
          text,
          textBlocks: [{ text, confidence: 0.95 }],
          ocrEngine: 'native',
          ocrConfidence: 0.95
        }];
        break;
      }

      case 'xlsx': {
        console.log('[DocumentProcessor] XLSX path');
        const text = await extractXlsx(buffer);
        pages = [{
          pageNumber: 1,
          text,
          textBlocks: [{ text, confidence: 0.9 }],
          ocrEngine: 'native',
          ocrConfidence: 0.9
        }];
        break;
      }

      case 'txt':
      case 'csv': {
        console.log('[DocumentProcessor] Text/CSV path');
        const text = new TextDecoder().decode(buffer);
        pages = [{
          pageNumber: 1,
          text,
          textBlocks: [{ text, confidence: 1.0 }],
          ocrEngine: 'native',
          ocrConfidence: 1.0
        }];
        break;
      }

      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }

    const fullText = pages
      .map(p => `--- Page ${p.pageNumber} ---\n${p.text}`)
      .join('\n\n');

    const extractionConfidence = pages.length > 0
      ? pages.reduce((s, p) => s + p.ocrConfidence, 0) / pages.length
      : 0;

    console.log(`[DocumentProcessor] Complete: ${pages.length} pages, confidence: ${extractionConfidence.toFixed(2)}, warnings: ${warnings.length}`);

    // Circuit breaker — lowered from 0.5 to 0.3 since partial data is better than nothing
    if (extractionConfidence < 0.3) {
      throw new Error(
        'We could not reliably read this document. Please upload a clearer image or PDF.'
      );
    }

    return {
      fileName,
      fileType,
      pageCount: pages.length,
      pages,
      fullText,
      extractionConfidence,
      warnings
    };
  }
}