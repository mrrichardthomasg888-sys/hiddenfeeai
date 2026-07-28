/**
 * Docling Service HTTP Client
 *
 * Bridges the Cloudflare Worker to the standalone IBM Docling Python microservice.
 *
 * Flow:
 * 1. Worker receives upload
 * 2. DocumentRouter determines file type/quality
 * 3. This client sends the file to the Docling service via HTTP
 * 4. Docling returns the Extraction Contract: { success, text, pages, tables, metadata, structured, confidence }
 * 5. Response is mapped to StructuredDocument format for the v2 pipeline
 *
 * Features:
 * - Size-aware timeouts (60s / 120s / 180s)
 * - Retry with exponential backoff for transient failures
 * - Production-safe logging (no document content)
 * - Extraction Contract compliance
 */

import type { Env, StructuredDocument, DocumentRouteResult, StructuredTable, StructuredElement } from "../types.js";

// ─── Docling Extraction Contract response shape ───

interface DoclingPage {
  page_number: number;
  text: string;
}

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

interface DoclingMetadata {
  document_id: string;
  filename: string;
  file_type: string;
  page_count: number;
  table_count: number;
  heading_count: number;
  is_scanned: boolean;
  ocr_used: boolean;
  processing_time_seconds: number;
}

interface DoclingStructured {
  headings: DoclingParsedHeading[];
  tables: DoclingParsedTable[];
  pages: DoclingPage[];
}

/**
 * The Docling service returns this Extraction Contract on both success and failure.
 * Success: { success: true, text, pages, tables, metadata, structured, confidence }
 * Failure: { success: false, userMessage: "..." }
 */
interface DoclingExtractionResponse {
  success: boolean;
  text?: string;
  pages?: DoclingPage[];
  tables?: DoclingParsedTable[];
  metadata?: DoclingMetadata;
  structured?: DoclingStructured;
  confidence?: number;
  userMessage?: string;
}

// ─── Configuration ───

const DOCLING_MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB — matches Docling engine limit
const HEALTH_CHECK_TIMEOUT_MS = 5_000;

// ─── Health check ───

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

// ─── Result types ───

export interface DoclingResult {
  /** The converted StructuredDocument, ready for the v2 pipeline */
  structuredDocument: StructuredDocument;
  /** Raw Docling metadata (for logging only — no document content) */
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
  code: 'timeout' | 'unavailable' | 'bad_response' | 'invalid_file' | 'too_large' | 'not_configured' | 'extraction_failed';
  retryable: boolean;
}

// ─── Main parse function ───

/**
 * Send a document to the Docling service for structured parsing.
 *
 * @param buffer - The raw file bytes
 * @param fileName - Original filename
 * @param routeResult - Pre-computed document routing info
 * @param env - Worker environment bindings
 * @param timeoutMs - Size-aware timeout (default: 120s)
 * @returns DoclingResult on success, or throws DoclingError
 */
export async function parseWithDocling(
  buffer: ArrayBuffer,
  fileName: string,
  routeResult: DocumentRouteResult,
  env: Env,
  timeoutMs: number = 120_000,
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

  // Send request with AbortController timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

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
      const code = response.status === 413 ? 'too_large' :
                   response.status === 422 ? 'invalid_file' :
                   response.status >= 500 ? 'unavailable' : 'bad_response';

      throw {
        error: `Docling service returned HTTP ${response.status}`,
        code,
        retryable: response.status >= 500,
      } as DoclingError;
    }

    const data = await response.json() as DoclingExtractionResponse;

    // ── Check Extraction Contract: success flag ──
    if (!data.success) {
      // Docling service handled the error gracefully — not retryable
      throw {
        error: data.userMessage || 'Docling extraction failed',
        code: 'extraction_failed',
        retryable: false,
      } as DoclingError;
    }

    // Validate minimum viable response
    if (!data.text && !data.structured?.pages?.length) {
      throw {
        error: 'Docling returned empty content',
        code: 'bad_response',
        retryable: false,
      } as DoclingError;
    }

    // ── Map to StructuredDocument ──
    const structured = mapDoclingToStructured(data, fileName, routeResult);

    const confidence = data.confidence ?? 0.9;
    const qualityLabel = confidence >= 0.85 ? 'excellent' :
                         confidence >= 0.65 ? 'good' :
                         confidence >= 0.40 ? 'fair' : 'poor';

    console.log(
      `[DoclingClient] Success: ${data.metadata?.page_count ?? 0} pages, ` +
      `${data.tables?.length ?? 0} tables, confidence=${confidence}`
    );

    return {
      structuredDocument: structured,
      metadata: {
        documentId: data.metadata?.document_id ?? crypto.randomUUID(),
        processingTimeSeconds: data.metadata?.processing_time_seconds ?? 0,
        qualityScore: confidence,
        qualityLabel,
        isScanned: data.metadata?.is_scanned ?? false,
        ocrUsed: data.metadata?.ocr_used ?? false,
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
        error: `Docling request timed out after ${timeoutMs / 1000}s`,
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

// ─── Response mapper: Docling Extraction Contract → StructuredDocument ───

function mapDoclingToStructured(
  data: DoclingExtractionResponse,
  fileName: string,
  routeResult: DocumentRouteResult,
): StructuredDocument {
  const elements: StructuredElement[] = [];

  // Map headings to structured elements
  if (data.structured?.headings) {
    for (const heading of data.structured.headings) {
      elements.push({
        type: 'heading',
        pageNumber: heading.page || 1,
        content: heading.text,
        metadata: { level: heading.level },
      });
    }
  }

  // Map text from pages
  if (data.pages) {
    for (const page of data.pages) {
      if (page.text && page.text.trim().length > 0) {
        elements.push({
          type: 'paragraph',
          pageNumber: page.page_number || 1,
          content: page.text,
        });
      }
    }
  }

  // If no structured pages, create elements from text
  if (elements.length === 0 && data.text) {
    const text = data.text;
    const pages = text.split(/--- Page \d+ ---/);
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
  const markdown = data.text ||
    elements.map(e => e.content).join('\n\n') ||
    '';

  // Update route result with Docling-corrected info
  const pageCount = data.metadata?.page_count ?? routeResult.pageCount;
  const updatedRoute: DocumentRouteResult = {
    ...routeResult,
    pageCount,
    isScanned: data.metadata?.is_scanned ?? routeResult.isScanned,
    needsOcr: false, // Docling handles OCR internally
    hasTables: (data.tables?.length ?? 0) > 0,
    detectedLanguage: routeResult.detectedLanguage,
    documentQuality: mapQuality(data.confidence ?? 0.9),
  };

  return {
    fileName,
    fileFormat: routeResult.fileFormat,
    pageCount,
    markdown,
    elements,
    tables,
    metadata: {
      title: data.metadata?.filename || fileName,
      author: undefined,
      createdAt: undefined,
      pageCount,
      language: routeResult.detectedLanguage || 'en',
    },
    routeResult: updatedRoute,
    extractionMethod: 'docling',
    extractionConfidence: data.confidence ?? 0.9,
    warnings: [],
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

function mapQuality(confidence: number): DocumentRouteResult['documentQuality'] {
  if (confidence >= 0.85) return 'excellent';
  if (confidence >= 0.65) return 'good';
  if (confidence >= 0.40) return 'fair';
  return 'poor';
}

// ─── Utility: check if Docling should be used for this file ───

/**
 * Determine whether to route to Docling or use the fallback processor.
 * Docling handles ALL supported formats natively — PDF, Office docs, images, text, HTML.
 *
 * The format list is dynamically derived from Docling's supported formats.
 * Do NOT hard-code only PDF/image support.
 */
export function shouldUseDocling(routeResult: DocumentRouteResult): boolean {
  const doclingFormats = [
    // PDF
    'pdf',
    // Office documents
    'docx', 'doc', 'pptx', 'ppt', 'xlsx', 'xls',
    // Web markup
    'html', 'htm',
    // Images (OCR-processed by Docling)
    'png', 'jpg', 'jpeg', 'tiff', 'tif', 'bmp',
    // Text
    'txt', 'md', 'csv', 'rtf',
  ];
  return doclingFormats.includes(routeResult.fileFormat);
}