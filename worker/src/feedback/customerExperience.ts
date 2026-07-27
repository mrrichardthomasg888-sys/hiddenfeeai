export type SatisfactionRating = 1 | 2 | 3 | 4 | 5;

interface ExperienceEntry {
  rating: SatisfactionRating;
  documentCategory: string;
  wouldRecommend: boolean;
  timestamp: string;
}
const expLog: ExperienceEntry[] = [];
const MAX = 500;

export function recordExperience(rating: SatisfactionRating, documentCategory: string, wouldRecommend: boolean): void {
  expLog.push({ rating, documentCategory, wouldRecommend, timestamp: new Date().toISOString() });
  while (expLog.length > MAX) expLog.shift();
}

export function getSatisfactionMetrics() {
  if (expLog.length === 0) return { averageRating: 0, recommendRate: 0, totalReviews: 0, ratings: {} };
  const avg = Math.round((expLog.reduce((s, e) => s + e.rating, 0) / expLog.length) * 10) / 10;
  const recs = expLog.filter(e => e.wouldRecommend).length;
  const dist: Record<string, number> = {};
  for (const e of expLog) dist[String(e.rating)] = (dist[String(e.rating)] || 0) + 1;
  return { averageRating: avg, recommendRate: Math.round((recs / expLog.length) * 100), totalReviews: expLog.length, ratings: dist };
}