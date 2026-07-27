/**
 * Finding Feedback System
 * 
 * Privacy-preserving user feedback collection.
 * 
 * Users can rate findings as: helpful, not helpful, incorrect, or missing.
 * ONLY anonymized aggregate data is stored — never document content.
 * 
 * This data feeds back into accuracy analytics to improve the system.
 */

export type FeedbackType = 'helpful' | 'not_helpful' | 'incorrect' | 'missing_something';

export interface FeedbackSubmission {
  findingType: string;   // e.g., 'Hidden Fee', 'Contract Risk'
  category: string;       // finding category
  confidenceTier: string;  // verified/high/moderate/low
  feedbackType: FeedbackType;
  timestamp: string;
  // NEVER include: document text, names, amounts, addresses
}

// In-memory store (production: write to KV or analytics)
const feedbackLog: FeedbackSubmission[] = [];
const MAX_FEEDBACK_LOG = 1000;

/**
 * Accept feedback for a finding.
 * Only stores anonymized metadata — no document content.
 */
export function submitFeedback(submission: Omit<FeedbackSubmission, 'timestamp'>): void {
  const entry: FeedbackSubmission = {
    ...submission,
    timestamp: new Date().toISOString(),
  };
  
  feedbackLog.push(entry);
  
  // Prune old entries
  while (feedbackLog.length > MAX_FEEDBACK_LOG) {
    feedbackLog.shift();
  }
}

/**
 * Get aggregate feedback statistics.
 */
export function getFeedbackStats(): {
  total: number;
  helpful: number;
  notHelpful: number;
  incorrect: number;
  missing: number;
  helpfulRate: number;
} {
  const total = feedbackLog.length;
  const helpful = feedbackLog.filter(f => f.feedbackType === 'helpful').length;
  const notHelpful = feedbackLog.filter(f => f.feedbackType === 'not_helpful').length;
  const incorrect = feedbackLog.filter(f => f.feedbackType === 'incorrect').length;
  const missing = feedbackLog.filter(f => f.feedbackType === 'missing_something').length;
  
  return {
    total,
    helpful,
    notHelpful,
    incorrect,
    missing,
    helpfulRate: total > 0 ? helpful / total : 0,
  };
}

/**
 * Get top finding types receiving negative feedback.
 * Helps identify where the AI needs improvement.
 */
export function getImprovementAreas(): Array<{
  findingType: string;
  incorrectCount: number;
}> {
  const counts: Record<string, number> = {};
  
  for (const f of feedbackLog) {
    if (f.feedbackType === 'incorrect' || f.feedbackType === 'not_helpful') {
      counts[f.findingType] = (counts[f.findingType] || 0) + 1;
    }
  }
  
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([findingType, count]) => ({ findingType, incorrectCount: count }));
}