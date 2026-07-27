/**
 * Privacy-Safe Document History
 * 
 * Tracks document analysis history for returning users
 * WITHOUT storing any document content or personal information.
 * 
 * Stored: analysis metadata (date, type, findings count, risk)
 * NEVER stored: document text, names, addresses, files
 */

export interface HistoryEntry {
  auditId: string;
  analyzedAt: string;
  documentType: string;
  findingsCount: number;
  riskLevel: string;
  riskScore: number;
  feesIdentified: number;
  reportId: string;
}

// In-memory (production: KV)
const history: HistoryEntry[] = [];
const MAX_ENTRIES = 50;

export function recordAnalysis(meta: {
  auditId: string;
  documentType: string;
  findingsCount: number;
  riskLevel: string;
  riskScore: number;
  feesIdentified: number;
  reportId: string;
}): void {
  history.unshift({
    auditId: meta.auditId,
    analyzedAt: new Date().toISOString(),
    documentType: meta.documentType,
    findingsCount: meta.findingsCount,
    riskLevel: meta.riskLevel,
    riskScore: meta.riskScore,
    feesIdentified: meta.feesIdentified,
    reportId: meta.reportId,
  });

  while (history.length > MAX_ENTRIES) history.pop();
}

export function getHistory(): HistoryEntry[] {
  return [...history];
}

export function getRecentAnalysis(): HistoryEntry | null {
  return history[0] || null;
}

export function clearHistory(): void {
  history.length = 0;
}