// HiddenFeeAI — Return Analysis & Churn Prevention
// Measures repeat usage patterns to identify retention opportunities.
// Never stores document contents.

import type { EngagementEvent } from "./engagementSignals";

// ── Types ──────────────────────────────────────────────────────────────────

export interface ReturnPattern {
  patternType: "same_document_type" | "different_document_type" | "comparison" | "education_then_analyze";
  frequency: "once" | "occasional" | "regular" | "power";
  averageDaysBetweenVisits: number;
  mostCommonIndustry: string;
}

export interface ChurnRisk {
  sessionId: string;
  lastActivity: string;
  daysSinceLastActivity: number;
  riskLevel: "Low" | "Medium" | "High";
  reason: string;
  reengagementSuggestion: string;
}

export interface ReturnAnalysis {
  totalSessions: number;
  returnPatterns: ReturnPattern[];
  averageSessionsPerUser: number;
  churnRisks: ChurnRisk[];
  reengagementOpportunities: string[];
}

// ── Return Pattern Analysis ────────────────────────────────────────────────

export function analyzeReturnPatterns(
  sessionId: string,
  events: EngagementEvent[],
): ReturnPattern {
  const sessionEvents = events.filter((e) => e.anonymousSessionId === sessionId);
  const analyses = sessionEvents.filter((e) => e.eventType === "analysis_completed");
  const education = sessionEvents.filter((e) => e.eventType === "education_page_viewed");

  // Determine pattern type
  let patternType: ReturnPattern["patternType"] = "same_document_type";
  if (education.length > 0 && analyses.length > 0) {
    patternType = "education_then_analyze";
  } else if (analyses.length >= 2) {
    patternType = "comparison";
  }

  // Determine frequency
  let frequency: ReturnPattern["frequency"] = "once";
  if (analyses.length >= 5) frequency = "power";
  else if (analyses.length >= 3) frequency = "regular";
  else if (analyses.length >= 2) frequency = "occasional";

  // Compute average days between visits
  const timestamps = sessionEvents
    .map((e) => new Date(e.timestamp).getTime())
    .sort((a, b) => a - b);
  let avgDays = 0;
  if (timestamps.length >= 2) {
    const gaps: number[] = [];
    for (let i = 1; i < timestamps.length; i++) {
      gaps.push((timestamps[i] - timestamps[i - 1]) / 86400000);
    }
    avgDays = Math.round(gaps.reduce((s, g) => s + g, 0) / gaps.length);
  }

  return {
    patternType,
    frequency,
    averageDaysBetweenVisits: avgDays,
    mostCommonIndustry: "automotive", // In production, derived from analysis metadata
  };
}

// ── Churn Risk Detection ───────────────────────────────────────────────────

export function detectChurnRisk(
  sessionId: string,
  lastActivity: string,
  events: EngagementEvent[],
): ChurnRisk {
  const daysSince = Math.floor(
    (Date.now() - new Date(lastActivity).getTime()) / 86400000,
  );

  let riskLevel: ChurnRisk["riskLevel"] = "Low";
  let reason = "User is actively engaged";
  let suggestion = "Continue current engagement strategy";

  if (daysSince > 60) {
    riskLevel = "High";
    reason = "No activity for 60+ days";
    suggestion = "Send re-engagement email highlighting new features and industry updates";
  } else if (daysSince > 30) {
    riskLevel = "Medium";
    reason = "No activity for 30+ days";
    suggestion = "Share relevant consumer protection news or fee alerts";
  } else if (daysSince > 14) {
    riskLevel = "Low";
    reason = "Activity slowing — 14+ days since last visit";
    suggestion = "Suggest related document types they haven't tried yet";
  }

  return {
    sessionId,
    lastActivity,
    daysSinceLastActivity: daysSince,
    riskLevel,
    reason,
    reengagementSuggestion: suggestion,
  };
}

// ── Full Analysis ──────────────────────────────────────────────────────────

export function generateReturnAnalysis(
  sessions: { sessionId: string; firstVisit: string }[],
  allEvents: EngagementEvent[],
): ReturnAnalysis {
  const patterns = sessions.map((s) => analyzeReturnPatterns(s.sessionId, allEvents));
  const churnRisks = sessions.map((s) => {
    const sessionEvents = allEvents.filter((e) => e.anonymousSessionId === s.sessionId);
    const lastActivity = sessionEvents.length > 0
      ? sessionEvents[sessionEvents.length - 1].timestamp
      : s.firstVisit;
    return detectChurnRisk(s.sessionId, lastActivity, allEvents);
  });

  return {
    totalSessions: sessions.length,
    returnPatterns: patterns,
    averageSessionsPerUser: sessions.length > 0
      ? Math.round((allEvents.filter((e) => e.eventType === "analysis_completed").length / sessions.length) * 10) / 10
      : 0,
    churnRisks: churnRisks.sort((a, b) => b.daysSinceLastActivity - a.daysSinceLastActivity),
    reengagementOpportunities: [
      "Send fee alert emails for industries users previously analyzed",
      "Offer comparison analysis: 'See how your second contract compares'",
      "Educate on adjacent industries: 'Bought a car? Now check your auto insurance'",
      "Create seasonal reminders: tax season, car buying season, lease renewal",
    ],
  };
}

export const RETURN_ANALYSIS_VERSION = "3.0.0";