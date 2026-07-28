/**
 * Extraction Pipeline Types
 *
 * Shared contracts for the unified document extraction service.
 * These types are intentionally compatible with the existing
 * ExtractionResult and StructuredDocument shapes so the upload
 * route and analysis pipeline can consume them without changes.
 */

import type {
  ExtractionResult,
  StructuredDocument,
  DocumentRouteResult,
  SupportedFileFormat,
} from "../../types.js";

// ─── Unified extraction result ───

/**
 * The output of every extractor in the pipeline.
 * `text` + `context` is the legacy-compatible shape used by the
 * upload route. `structured` is populated when Docling succeeds and
 * is consumed by the v2 analysis pipeline.
 */
export interface UnifiedExtractionResult {
  /** Plain extracted text — always populated on success. */
  text: string;
  /** Legacy-compatible context stored on the job. */
  context: {
    pages: number;
    lineItems: number;
    fileType: string;
    extractionMethod: ExtractionMethod;
    confidenceScore: number;
  };
  /** Structured document when available (Docling path). */
  structured?: StructuredDocument;
  /** Which provider produced this result. */
  provider: ExtractionProvider;
  /** Whether extraction succeeded. */
  success: boolean;
  /** Sanitized customer-facing message on failure. */
  customerMessage?: string;
}

// ─── Provider & method enums ───

export type ExtractionProvider =
  | "docling"
  | "image-ocr"
  | "pdf-native"
  | "docx-native"
  | "xlsx-native"
  | "txt-direct"
  | "fallback";

export type ExtractionMethod =
  | "docling"
  | "ocr"
  | "image-ocr"
  | "native"
  | "direct";

// ─── Extractor interface ───

/**
 * Every extractor implements this contract.
 * Extractors return null on soft failure (so the router can fallback)
 * and throw only on hard, unexpected errors.
 */
export interface Extractor {
  readonly name: ExtractionProvider;
  canHandle(route: DocumentRouteResult): boolean;
  extract(
    buffer: ArrayBuffer,
    fileName: string,
    route: DocumentRouteResult,
    env: import("../../types.js").Env,
  ): Promise<UnifiedExtractionResult | null>;
}

// ─── Logging helpers ───

export interface ExtractionLogContext {
  filename: string;
  mime: string;
  size: number;
  format: SupportedFileFormat;
  provider: ExtractionProvider;
}

// ─── Error classification ───

export type ExtractionErrorCode =
  | "timeout"
  | "unavailable"
  | "bad_response"
  | "invalid_file"
  | "too_large"
  | "not_configured"
  | "empty_result"
  | "unknown";

export interface ExtractionError {
  code: ExtractionErrorCode;
  message: string;
  retryable: boolean;
  provider: ExtractionProvider;
}

// ─── Customer-facing messages (never leak internals) ───

export const CUSTOMER_MESSAGES = {
  // ── Customer-facing failure messages — never leak internals ──
  generic:
    "We couldn't read this document. Please try uploading a clearer copy.",
  image:
    "We couldn't read this document. Please try uploading a clearer copy.",
  pdf: "We couldn't read this document. Please try uploading a clearer copy.",
  unsupported:
    "We couldn't read this document. Please try uploading a clearer copy.",
  empty: "We couldn't read this document. Please try uploading a clearer copy.",
} as const;

// ─── Timeout configuration by document size ───

export const TIMEOUTS = {
  /** Small documents (< 1MB): 60s target. */
  smallMs: 60_000,
  /** Medium documents (1-10MB): 120s target. */
  mediumMs: 120_000,
  /** Large documents (> 10MB): 180s target (3 min). */
  largeMs: 180_000,
  /** Health check timeout. */
  healthMs: 5_000,
  /** Image OCR timeout. */
  ocrMs: 90_000,
} as const;

export const RETRIES = {
  /** Docling retry attempts for retryable errors. */
  docling: 2,
  /** Image OCR retry attempts. */
  ocr: 1,
} as const;

export const LIMITS = {
  /** Max file size for Docling (50MB — matches engine limit). */
  doclingMaxBytes: 50 * 1024 * 1024,
  /** Max image dimension before resize. */
  imageMaxDim: 2048,
  /** Minimum text length to consider extraction successful. */
  minTextLength: 10,
} as const;

// ─── Helper: pick timeout by file size ───

export function timeoutForSize(byteLength: number): number {
  if (byteLength < 1_000_000) return TIMEOUTS.smallMs;
  if (byteLength < 10_000_000) return TIMEOUTS.mediumMs;
  return TIMEOUTS.largeMs;
}

// ─── Helper: build legacy-compatible ExtractionResult ───

export function toLegacyResult(
  result: UnifiedExtractionResult,
): ExtractionResult {
  return {
    text: result.text,
    pages: result.context.pages,
    lineItems: result.context.lineItems,
    fileType: result.context.fileType,
    extractionMethod: result.context.extractionMethod as any,
    confidenceScore: result.context.confidenceScore,
  };
}