import type { Env, StructuredDocument, DocumentRouteResult, StructuredTable, StructuredElement } from "../types.js";

/**
 * Docling Service HTTP Client
 * 
 * Bridges the Cloudflare Worker to the standalone IBM Docling Python microservice.
 * 
 * Flow:
 * 1. Worker receives upload
 * 2. DocumentRouter determines file type/quality
 * 3. This client sends the file to the Docling service via HTTP
 * 4. Docling returns structured Markdown + JSON
 * 5. Response is mapped to StructuredDocument format for v2 pipeline
 * 
 * Fallback: If Docling is unreachable, the existing DocumentProcessor (DeepSeek Vision)
 * is used as a degraded-but-functional backup.
 */

// ─── Docling API response shape ───

interface DoclingParsedTable {
  page: number;
  rows: string[][];
  caption: string;
}

interface DoclingParsedHeading {
  text: string;
  level: number;
  page: number;
}

interface DoclingStructuredJson {
  text: string;
  pages: Array<{
    page_number: number;
    text: string;
    elements: Array<{
      type: string;
      content: string;
      bbox?: { x: number; y: number; w: number; h: number };
    }>;
  }>;
  tables: DoclingParsedTable[];
  pictures: Array<{ page: number; bbox?: { x: number; y: number; w: number; h: number } }>;
}

interface DoclingParseResponse {
  document_id: string;
  filename: string;
  file_type: string;
  page_count: number;
  markdown: string;
  structured_json: DoclingStructuredJson;
  tables: DoclingParsedTable[];
  headings: DoclingParsedHeading[];
  metadata: {
    language: string;
    author: string;
    created_at: string;
    page_count: number;
  };
  processing_time_seconds: number;
  quality: {
    quality_score: number;
    quality_label: 'excellent' | 'good' | 'fair' | 'poor' | 'unusable';
    chars_per_page: number;
  };
  is_scanned: boolean;
  ocr_used: boolean;
  warnings: string[];
}

// ─── Configuration ───

const DOCLING_TIMEOUT_MS = 25_000; // 25 seconds — fail fast for production reliability
const DOCLING_MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const HEALTH_CHECK_TIMEOUT_MS = 5_000;

// ─── Health check (call at startup or periodically) ───

export async function checkDoclingHealth(env: Env): Promise<{ healthy: boolean; latencyMs: number; error?: string }> {
  const serviceUrl = env.DOCLING_SERVICE_URL;
  if (!serviceUrl) {
    return { healthy: false, latencyMs: 0, error: 'DOCLING_SERVICE_URL not configured' };
  }

  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);

    const response = await fetch(`${serviceUrl}/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return { healthy: false, latencyMs: Date.now() - start, error: `HTTP ${response.status}` };
    }

    const data = await response.json() as { status?: string };
    const healthy = data.status === 'ok';
    return { healthy, latencyMs: Date.now() - start };
  } catch (err) {
    return {
      healthy: false,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

// ─── Main parse function ───

export interface DoclingResult {
  /** The converted StructuredDocument, ready for the v2 pipeline */
  structuredDocument: StructuredDocument;
  /** Raw Docling response (for debugging/logging metadata only — no document content) */
  metadata: {
    documentId: string;
    processingTimeSeconds: number;
    qualityScore: number;
    qualityLabel: string;
    isScanned: boolean;
    ocrUsed: boolean;
  };
}

export interface DoclingError {
  error: string;
  code: 'timeout' | 'unavailable' | 'bad_response' | 'invalid_file' | 'too_large' | 'not_configured';
  retryable: boolean;
}

/**
 * Send a document to the Docling service for structured parsing.
 * 
 * @param buffer - The raw file bytes
 * @param fileName - Original filename
 * @param routeResult - Pre-computed document routing info
 * @param env - Worker environment bindings
 * @returns StructuredDocument on success, or throws DoclingError
 */
export async function parseWithDocling(
  buffer: ArrayBuffer,
  fileName: string,
  routeResult: DocumentRouteResult,
  env: Env,
): Promise<DoclingResult> {
  const serviceUrl = env.DOCLING_SERVICE_URL;
  if (!serviceUrl) {
    throw { error: 'Docling service URL not configured', code: 'not_configured', retryable: false } as DoclingError;
  }

  // Size check
  if (buffer.byteLength > DOCLING_MAX_FILE_SIZE) {
    throw {
      error: `File too large for Docling (${(buffer.byteLength / 1024 / 1024).toFixed(1)}MB, max ${DOCLING_MAX_FILE_SIZE / 1024 / 1024}MB)`,
      code: 'too_large',
      retryable: false,
    } as DoclingError;
  }

  console.log(`[DoclingClient] Sending ${fileName} (${buffer.byteLength} bytes) to ${serviceUrl}/parse`);

  // Build multipart form data manually (Workers-compatible)
  const boundary = '----DoclingBoundary' + crypto.randomUUID();
  const CRLF = '\r\n';

  const parts: Uint8Array[] = [];
  const encoder = new TextEncoder();

  // Part header
  const partHeader = [
    `--${boundary}`,
    `Content-Disposition: form-data; name="file"; filename="${fileName}"`,
    `Content-Type: application/octet-stream`,
    '', '',
  ].join(CRLF);

  parts.push(encoder.encode(partHeader));
  parts.push(new Uint8Array(buffer));
  parts.push(encoder.encode(CRLF + `--${boundary}--` + CRLF));

  // Combine parts
  const totalLength = parts.reduce((sum, p) => sum + p.length, 0);
  const body = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    body.set(part, offset);
    offset += part.length;
  }

  // Send request with timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DOCLING_TIMEOUT_MS);

  try {
    const response = await fetch(`${serviceUrl}/parse`, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown');
      const code = response.status === 413 ? 'too_large' :
                   response.status === 422 ? 'invalid_file' :
                   response.status >= 500 ? 'unavailable' : 'bad_response';
      
      throw {
        error: `Docling service returned ${response.status}: ${errorText.slice(0, 200)}`,
        code,
        retryable: response.status >= 500,
      } as DoclingError;
    }

    const data = await response.json() as DoclingParseResponse;

    // Validate minimum viable response
    if (!data.markdown && !data.structured_json?.text) {
      throw {
        error: 'Docling returned empty content',
        code: 'bad_response',
        retryable: false,
      } as DoclingError;
    }

    // ── Map to StructuredDocument ──
    const structured = mapDoclingToStructured(data, fileName, routeResult);

    console.log(
      `[DoclingClient] Success: ${data.page_count} pages, ${data.tables.length} tables, ` +
      `${data.headings.length} headings in ${data.processing_time_seconds}s`
    );

    return {
      structuredDocument: structured,
      metadata: {
        documentId: data.document_id,
        processingTimeSeconds: data.processing_time_seconds,
        qualityScore: data.quality.quality_score,
        qualityLabel: data.quality.quality_label,
        isScanned: data.is_scanned,
        ocrUsed: data.ocr_used,
      },
    };
  } catch (err) {
    clearTimeout(timeoutId);

    // Already a DoclingError? Re-throw.
    if (err && typeof err === 'object' && 'code' in err && 'retryable' in err) {
      throw err;
    }

    // AbortError = timeout
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw {
        error: `Docling request timed out after ${DOCLING_TIMEOUT_MS / 1000}s`,
        code: 'timeout',
        retryable: true,
      } as DoclingError;
    }

    // Network error
    throw {
      error: err instanceof Error ? err.message : 'Unknown Docling error',
      code: 'unavailable',
      retryable: true,
    } as DoclingError;
  }
}

// ─── Response mapper: Docling JSON → StructuredDocument ───

function mapDoclingToStructured(
  data: DoclingParseResponse,
  fileName: string,
  routeResult: DocumentRouteResult,
): StructuredDocument {
  // Map elements from structured JSON
  const elements: StructuredElement[] = [];

  // Map headings to structured elements
  for (const heading of data.headings) {
    elements.push({
      type: 'heading',
      pageNumber: heading.page || 1,
      content: heading.text,
      metadata: { level: heading.level },
    });
  }

  // Map text from pages
  if (data.structured_json?.pages) {
    for (const page of data.structured_json.pages) {
      if (page.text && page.text.trim().length > 0) {
        elements.push({
          type: 'paragraph',
          pageNumber: page.page_number || 1,
          content: page.text,
        });
      }

      // Map individual elements if available
      if (page.elements) {
        for (const el of page.elements) {
          const type = el.type === 'table' ? 'table' :
                       el.type === 'heading' ? 'heading' :
                       el.type === 'list' ? 'list' :
                       'paragraph';
          elements.push({
            type,
            pageNumber: page.page_number || 1,
            content: el.content || '',
            bbox: el.bbox,
          });
        }
      }
    }
  }

  // If no structured pages, create elements from markdown
  if (elements.length === 0 && data.markdown) {
    const pages = data.markdown.split(/--- Page \d+ ---/);
    for (let i = 0; i < pages.length; i++) {
      if (pages[i].trim()) {
        elements.push({
          type: 'paragraph',
          pageNumber: i + 1,
          content: pages[i].trim(),
        });
      }
    }
  }

  // Map tables
  const tables: StructuredTable[] = (data.tables || []).map(t => ({
    pageNumber: t.page || 1,
    headers: t.rows.length > 0 ? t.rows[0].map(c => String(c)) : [],
    rows: t.rows.length > 1 ? t.rows.slice(1) : t.rows,
    caption: t.caption || undefined,
    detectedAs: detectTableType(t),
  }));

  // Build the combined markdown
  const markdown = data.markdown || 
    elements.map(e => e.content).join('\n\n') ||
    '';

  // Update route result with Docling-corrected info
  const updatedRoute: DocumentRouteResult = {
    ...routeResult,
    pageCount: data.page_count,
    isScanned: data.is_scanned,
    needsOcr: false, // Docling handles OCR internally
    hasTables: data.tables.length > 0,
    detectedLanguage: data.metadata.language || routeResult.detectedLanguage,
    documentQuality: mapQuality(data.quality.quality_label),
  };

  return {
    fileName,
    fileFormat: routeResult.fileFormat,
    pageCount: data.page_count,
    markdown,
    elements,
    tables,
    metadata: {
      title: data.filename,
      author: data.metadata.author || undefined,
      createdAt: data.metadata.created_at || undefined,
      pageCount: data.page_count,
      language: data.metadata.language || 'en',
    },
    routeResult: updatedRoute,
    extractionMethod: 'docling',
    extractionConfidence: data.quality.quality_score || 0.9,
    warnings: data.warnings || [],
  };
}

function detectTableType(table: DoclingParsedTable): StructuredTable['detectedAs'] {
  const allText = [table.caption, ...table.rows.flat().map(c => String(c))].join(' ').toLowerCase();
  
  if (allText.includes('fee') || allText.includes('charge') || allText.includes('cost')) {
    return 'fee_schedule';
  }
  if (allText.includes('item') || allText.includes('description') || allText.includes('qty')) {
    return 'line_items';
  }
  if (allText.includes('total') || allText.includes('subtotal') || allText.includes('summary')) {
    return 'summary';
  }
  return 'general';
}

function mapQuality(label: string): DocumentRouteResult['documentQuality'] {
  switch (label) {
    case 'excellent': return 'excellent';
    case 'good': return 'good';
    case 'fair': return 'fair';
    case 'poor': return 'poor';
    default: return 'poor';
  }
}

// ─── Utility: check if Docling should be used for this file ───

/**
 * Determine whether to route to Docling or use the fallback processor.
 * Docling is best for: PDF, DOCX, PPTX, XLSX (structured formats)
 * Fallback is used for: images, email, text, ZIP (formats Docling handles less well or not at all)
 */
export function shouldUseDocling(routeResult: DocumentRouteResult): boolean {
  // Docling handles all formats natively — PDF, Office docs, images, text, HTML
  const doclingFormats = [
    'pdf', 'docx', 'doc', 'pptx', 'ppt', 'xlsx', 'xls', 'html', 'rtf', 'txt', 'md', 'csv',
    'png', 'jpg', 'jpeg', 'webp', 'heic', 'tiff', 'tif', 'bmp', 'gif',
  ];
  return doclingFormats.includes(routeResult.fileFormat);
}
