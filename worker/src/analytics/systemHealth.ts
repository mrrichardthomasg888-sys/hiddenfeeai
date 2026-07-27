/**
 * Production Health Dashboard Data
 * 
 * Privacy-safe operational metrics for monitoring.
 * Tracks performance, cost, success rate without storing document content.
 */

export interface SystemHealth {
  processing: {
    averageTimeMs: number;
    p95TimeMs: number;
    successRate: number;
    totalAnalyses: number;
  };
  costs: {
    averageCostCents: number;
    totalCostCents: number;
    highCostRate: number; // > 50c per analysis
  };
  errors: {
    rate: number;
    topCategories: string[];
    fallbackUsageRate: number;
  };
  pipelines: {
    legacy: number;
    new: number;
    v2: number;
  };
  quality: {
    averageGrade: string;
    aRate: number;
    fRate: number;
  };
  timestamp: string;
}

interface ProcessingEntry { timeMs: number; success: boolean; pipeline: string; costCents: number; errorCategory?: string; fallbackUsed: boolean; grade?: string; }
const entries: ProcessingEntry[] = [];
const MAX = 1000;

export function recordProcessing(e: ProcessingEntry): void {
  entries.push(e); while (entries.length > MAX) entries.shift();
}

export function getSystemHealth(): SystemHealth {
  const all = entries;
  if (all.length === 0) return { processing: { averageTimeMs: 0, p95TimeMs: 0, successRate: 100, totalAnalyses: 0 }, costs: { averageCostCents: 0, totalCostCents: 0, highCostRate: 0 }, errors: { rate: 0, topCategories: [], fallbackUsageRate: 0 }, pipelines: { legacy: 0, new: 0, v2: 0 }, quality: { averageGrade: 'N/A', aRate: 0, fRate: 0 }, timestamp: new Date().toISOString() };

  const successes = all.filter(e => e.success).length;
  const times = all.map(e => e.timeMs).sort((a, b) => a - b);
  const p95 = times[Math.floor(times.length * 0.95)] || 0;

  const costs = all.map(e => e.costCents);
  const totalCents = costs.reduce((s, c) => s + c, 0);

  const pipelines = { legacy: all.filter(e => e.pipeline === 'legacy').length, new: all.filter(e => e.pipeline === 'new').length, v2: all.filter(e => e.pipeline === 'v2').length };

  const graded = all.filter(e => e.grade);
  const aCount = graded.filter(e => e.grade === 'A').length;

  const errors = all.filter(e => !e.success);
  const errCats: Record<string, number> = {};
  for (const e of errors) { if (e.errorCategory) errCats[e.errorCategory] = (errCats[e.errorCategory] || 0) + 1; }

  return {
    processing: precise(all, times, successes, p95),
    costs: { averageCostCents: costs.length > 0 ? Math.round(totalCents / costs.length * 100) / 100 : 0, totalCostCents: Math.round(totalCents * 100) / 100, highCostRate: costs.length > 0 ? Math.round((costs.filter(c => c > 50).length / costs.length) * 100) : 0 },
    errors: { rate: all.length > 0 ? Math.round((errors.length / all.length) * 100) : 0, topCategories: Object.entries(errCats).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c]) => c), fallbackUsageRate: all.length > 0 ? Math.round((all.filter(e => e.fallbackUsed).length / all.length) * 100) : 0 },
    pipelines,
    quality: { averageGrade: graded.length > 0 ? (aCount / graded.length >= 0.8 ? 'A' : aCount / graded.length >= 0.5 ? 'B' : 'C') : 'N/A', aRate: graded.length > 0 ? Math.round((aCount / graded.length) * 100) : 0, fRate: graded.length > 0 ? Math.round((graded.filter(e => e.grade === 'F').length / graded.length) * 100) : 0 },
    timestamp: new Date().toISOString(),
  };
}

function precise(all: ProcessingEntry[], times: number[], successes: number, p95: number) {
  return { averageTimeMs: all.length > 0 ? Math.round(times.reduce((s, t) => s + t, 0) / all.length) : 0, p95TimeMs: p95, successRate: all.length > 0 ? Math.round((successes / all.length) * 100) : 100, totalAnalyses: all.length };
}