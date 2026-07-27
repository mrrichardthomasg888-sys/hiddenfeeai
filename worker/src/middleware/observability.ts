import type { Context, Next } from "hono";
import type { Env } from "../types.js";

/**
 * Production-safe observability middleware.
 * 
 * Tracks operational metrics WITHOUT logging any document content,
 * personal information, or financial details.
 * 
 * TRACKED (allowed):
 * - Processing time
 * - HTTP method + status code
 * - File size (bytes), file type extension
 * - Page count
 * - Error type
 * - Fallback activation
 * - Pipeline version (legacy/new/v2)
 * 
 * NEVER TRACKED (blocked):
 * - Document text
 * - Names, addresses
 * - Financial amounts
 * - Account numbers
 * - Personal identifiers
 */

interface MetricEvent {
  type: string;
  timestamp: string;
  durationMs?: number;
  fileSize?: number;
  fileType?: string;
  pageCount?: number;
  pipeline?: string;
  status?: number;
  error?: string;
  fallbackUsed?: boolean;
}

// In-memory metrics buffer (flushable to Cloudflare Analytics or external service)
const metricsBuffer: MetricEvent[] = [];
const MAX_BUFFER = 1000;

function flushMetrics() {
  if (metricsBuffer.length === 0) return;
  
  // In production, send to:
  // - Cloudflare Workers Analytics Engine
  // - A metrics endpoint
  // - Logpush to your observability platform
  const batch = metricsBuffer.splice(0, metricsBuffer.length);
  
  // Log as structured JSON (Cloudflare Logpush can ingest this)
  for (const event of batch) {
    console.log(`[Metric] ${JSON.stringify(event)}`);
  }
}

// Flushing is done inline when buffer fills — Workers disallow setInterval in global scope
// Also flush on recordMetric when buffer reaches threshold

export function recordMetric(event: MetricEvent) {
  metricsBuffer.push(event);
  if (metricsBuffer.length >= MAX_BUFFER) {
    flushMetrics();
  }
}

/**
 * Auto-records timing and status for every API request.
 * Attach to routes that need observability.
 */
export async function requestTracker(c: Context<{ Bindings: Env }>, next: Next) {
  const start = Date.now();
  await next();
  const durationMs = Date.now() - start;

  recordMetric({
    type: 'request',
    timestamp: new Date().toISOString(),
    durationMs,
    status: c.res.status,
  });
}

/**
 * Records document processing metrics.
 * Call this from extraction/analysis handlers.
 * NEVER pass document text or personal data.
 */
export function recordDocumentProcessed(meta: {
  fileSizeBytes: number;
  fileType: string;
  pageCount: number;
  pipeline: 'legacy' | 'new' | 'v2';
  durationMs: number;
  success: boolean;
  error?: string;
  fallbackUsed?: boolean;
}) {
  recordMetric({
    type: 'document_processed',
    timestamp: new Date().toISOString(),
    fileSize: meta.fileSizeBytes,
    fileType: meta.fileType,
    pageCount: meta.pageCount,
    pipeline: meta.pipeline,
    durationMs: meta.durationMs,
    error: meta.error,
    fallbackUsed: meta.fallbackUsed,
  });
}

/**
 * Records AI API usage for cost tracking.
 * NEVER log prompts or responses.
 */
export function recordAiUsage(meta: {
  model: string;
  purpose: string; // 'extraction' | 'fee_detection' | 'clause_analysis' | etc
  estimatedTokens: number;
  durationMs: number;
  success: boolean;
}) {
  recordMetric({
    type: 'ai_usage',
    timestamp: new Date().toISOString(),
    ...meta,
  });
}

/**
 * Get current metrics snapshot (for health check/debugging).
 */
export function getMetricsSnapshot() {
  return {
    bufferSize: metricsBuffer.length,
    maxBuffer: MAX_BUFFER,
  };
}