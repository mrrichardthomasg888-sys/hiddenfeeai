/**
 * User Journey Tracking (Privacy-Safe)
 * 
 * Tracks product usage events to support retention features
 * WITHOUT storing any document content or personal information.
 * 
 * TRACKED: analysis completions, document types, report views, feedback, repeat usage
 * NEVER TRACKED: document text, names, addresses, financial data, PII
 */

export type JourneyEvent =
  | 'analysis_completed'
  | 'report_viewed'
  | 'pdf_downloaded'
  | 'feedback_submitted'
  | 'comparison_requested'
  | 'return_visit';

interface JourneyEntry {
  event: JourneyEvent;
  documentType: string;
  findingCount: number;
  riskLevel: string;
  timestamp: string;
}

// In-memory (production: KV or Analytics Engine)
const journeyLog: JourneyEntry[] = [];
const MAX_LOG = 500;

export function recordJourneyEvent(
  event: JourneyEvent,
  meta: { documentType?: string; findingCount?: number; riskLevel?: string } = {},
): void {
  journeyLog.push({
    event,
    documentType: meta.documentType || 'unknown',
    findingCount: meta.findingCount || 0,
    riskLevel: meta.riskLevel || 'unknown',
    timestamp: new Date().toISOString(),
  });

  while (journeyLog.length > MAX_LOG) journeyLog.shift();
}

export function getUserStats(): {
  totalAnalyses: number;
  topDocumentTypes: string[];
  averageFindings: number;
  repeatRate: number;
  lastAnalysis: string | null;
} {
  const analyses = journeyLog.filter(e => e.event === 'analysis_completed');
  const repeats = new Set(
    journeyLog
      .filter(e => e.event === 'return_visit')
      .map(e => e.timestamp.slice(0, 10)) // per-day uniqueness
  );

  const typeCounts: Record<string, number> = {};
  for (const a of analyses) {
    typeCounts[a.documentType] = (typeCounts[a.documentType] || 0) + 1;
  }

  return {
    totalAnalyses: analyses.length,
    topDocumentTypes: Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([t]) => t),
    averageFindings: analyses.length > 0
      ? Math.round(analyses.reduce((s, a) => s + a.findingCount, 0) / analyses.length)
      : 0,
    repeatRate: analyses.length > 0
      ? Math.round((repeats.size / analyses.length) * 100)
      : 0,
    lastAnalysis: analyses.length > 0
      ? analyses[analyses.length - 1].timestamp
      : null,
  };
}