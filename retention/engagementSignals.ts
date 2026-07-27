// HiddenFeeAI — User Engagement Signal Tracking
// Measures repeat analyses, comparison usage, report downloads,
// and education engagement. Never stores document contents.

// ── Types ──────────────────────────────────────────────────────────────────

export interface EngagementEvent {
  eventId: string;
  anonymousSessionId: string;
  eventType: EngagementEventType;
  timestamp: string;
  metadata?: Record<string, string>;
}

export type EngagementEventType =
  | "analysis_completed"
  | "report_viewed"
  | "report_downloaded"
  | "education_page_viewed"
  | "comparison_used"
  | "return_visit"
  | "second_analysis"
  | "third_plus_analysis"
  | "negotiation_script_copied"
  | "faq_engaged"
  | "share_clicked";

export interface EngagementScore {
  sessionId: string;
  totalEvents: number;
  analysesCompleted: number;
  reportsDownloaded: number;
  educationPagesViewed: number;
  returnVisitCount: number;
  engagementLevel: "New" | "Active" | "Engaged" | "Power User";
  lastActivity: string;
  daysSinceFirstVisit: number;
}

export interface RetentionMetrics {
  totalUsers: number;
  returnRate30Day: number;          // % returning within 30 days
  returnRate90Day: number;
  averageAnalysesPerUser: number;
  powerUserPercent: number;        // 3+ analyses
  averageEngagementScore: number;
}

// ── Event Factory ──────────────────────────────────────────────────────────

export function createEngagementEvent(
  sessionId: string,
  eventType: EngagementEventType,
  metadata?: Record<string, string>,
): EngagementEvent {
  return {
    eventId: `eng-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    anonymousSessionId: sessionId,
    eventType,
    timestamp: new Date().toISOString(),
    metadata,
  };
}

// ── Score Computation ──────────────────────────────────────────────────────

export function computeEngagementScore(
  sessionId: string,
  events: EngagementEvent[],
  firstVisitDate: string,
): EngagementScore {
  const sessionEvents = events.filter((e) => e.anonymousSessionId === sessionId);
  const analysesCompleted = sessionEvents.filter((e) => e.eventType === "analysis_completed").length;
  const reportsDownloaded = sessionEvents.filter((e) => e.eventType === "report_downloaded").length;
  const educationViews = sessionEvents.filter((e) => e.eventType === "education_page_viewed").length;
  const returnVisits = sessionEvents.filter((e) => e.eventType === "return_visit").length;

  let engagementLevel: EngagementScore["engagementLevel"] = "New";
  const total = sessionEvents.length;
  if (total >= 15 && analysesCompleted >= 3) engagementLevel = "Power User";
  else if (total >= 8 && analysesCompleted >= 2) engagementLevel = "Engaged";
  else if (total >= 3) engagementLevel = "Active";

  const daysSinceFirst = firstVisitDate
    ? Math.floor((Date.now() - new Date(firstVisitDate).getTime()) / (86400000))
    : 0;

  return {
    sessionId,
    totalEvents: total,
    analysesCompleted,
    reportsDownloaded,
    educationPagesViewed: educationViews,
    returnVisitCount: returnVisits,
    engagementLevel,
    lastActivity: sessionEvents[sessionEvents.length - 1]?.timestamp || firstVisitDate,
    daysSinceFirstVisit: daysSinceFirst,
  };
}

// ── Retention Metrics ──────────────────────────────────────────────────────

export function computeRetentionMetrics(
  allSessions: { sessionId: string; firstVisit: string }[],
  allEvents: EngagementEvent[],
): RetentionMetrics {
  const totalUsers = allSessions.length;
  const now = Date.now();
  const thirtyDays = 30 * 86400000;
  const ninetyDays = 90 * 86400000;

  const returned30 = allSessions.filter((s) => {
    const events = allEvents.filter((e) => e.anonymousSessionId === s.sessionId && e.eventType === "return_visit");
    return events.some((e) => new Date(e.timestamp).getTime() - new Date(s.firstVisit).getTime() <= thirtyDays);
  }).length;

  const returned90 = allSessions.filter((s) => {
    const events = allEvents.filter((e) => e.anonymousSessionId === s.sessionId && e.eventType === "return_visit");
    return events.some((e) => new Date(e.timestamp).getTime() - new Date(s.firstVisit).getTime() <= ninetyDays);
  }).length;

  const analysisCounts = allSessions.map((s) => {
    return allEvents.filter((e) => e.anonymousSessionId === s.sessionId && e.eventType === "analysis_completed").length;
  });

  const powerUsers = analysisCounts.filter((c) => c >= 3).length;
  const totalAnalyses = analysisCounts.reduce((s, c) => s + c, 0);

  const scores = allSessions.map((s) => computeEngagementScore(s.sessionId, allEvents, s.firstVisit));
  const avgScore = scores.length > 0 ? scores.reduce((s, sc) => s + sc.totalEvents, 0) / scores.length : 0;

  return {
    totalUsers,
    returnRate30Day: totalUsers > 0 ? Math.round((returned30 / totalUsers) * 100) : 0,
    returnRate90Day: totalUsers > 0 ? Math.round((returned90 / totalUsers) * 100) : 0,
    averageAnalysesPerUser: totalUsers > 0 ? Math.round((totalAnalyses / totalUsers) * 10) / 10 : 0,
    powerUserPercent: totalUsers > 0 ? Math.round((powerUsers / totalUsers) * 100) : 0,
    averageEngagementScore: Math.round(avgScore * 10) / 10,
  };
}

// ── Privacy ────────────────────────────────────────────────────────────────

export const ENGAGEMENT_PRIVACY = {
  anonymousOnly: true,
  noDocumentStorage: true,
  aggregateRetentionOnly: true,
  dataRetentionDays: 180,
};

export const ENGAGEMENT_SIGNALS_VERSION = "3.0.0";