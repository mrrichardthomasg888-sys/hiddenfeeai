/**
 * Error Intelligence Engine
 * 
 * Tracks production errors to identify patterns and recommend fixes.
 * NEVER stores document content or PII.
 */

export interface ErrorEvent {
  category: 'upload_failure' | 'extraction_failure' | 'analysis_failure' | 'docling_timeout' | 'deepseek_error' | 'pdf_failure' | 'unknown';
  message: string;
  pipeline: string;
  timestamp: string;
  fallbackUsed: boolean;
}

const errorLog: ErrorEvent[] = [];
const MAX_LOG = 500;

export function recordError(category: ErrorEvent['category'], message: string, pipeline: string, fallbackUsed = false): void {
  errorLog.push({ category, message: message.slice(0, 200), pipeline, timestamp: new Date().toISOString(), fallbackUsed });
  while (errorLog.length > MAX_LOG) errorLog.shift();
}

export function getErrorSummary(): {
  totalErrors: number;
  byCategory: Record<string, number>;
  byPipeline: Record<string, number>;
  fallbackRate: number;
  topErrorPatterns: string[];
} {
  const byCategory: Record<string, number> = {};
  const byPipeline: Record<string, number> = {};
  let fallbacks = 0;
  for (const e of errorLog) {
    byCategory[e.category] = (byCategory[e.category] || 0) + 1;
    byPipeline[e.pipeline] = (byPipeline[e.pipeline] || 0) + 1;
    if (e.fallbackUsed) fallbacks++;
  }

  const categoryEntries = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  return {
    totalErrors: errorLog.length,
    byCategory,
    byPipeline,
    fallbackRate: errorLog.length > 0 ? Math.round((fallbacks / errorLog.length) * 100) : 0,
    topErrorPatterns: categoryEntries.slice(0, 3).map(([cat, count]) => `${cat}: ${count} occurrences`),
  };
}