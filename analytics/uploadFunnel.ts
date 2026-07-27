// HiddenFeeAI — Upload Conversion Analytics
// Tracks: Visitor → Upload Started → File Selected →
// Analysis Started → Payment → Report Viewed
// Measures drop-off points, conversion rates, device differences.
// Privacy-safe: anonymous session tracking only. No PII, no document data.

// ── Types ──────────────────────────────────────────────────────────────────

export interface FunnelStep {
  step: "visitor" | "upload_started" | "file_selected" | "analysis_started" | "payment_initiated" | "payment_completed" | "report_viewed";
  label: string;
  count: number;
  conversionFromPrevious: number;  // %
  conversionFromTop: number;       // % from visitor
  averageTimeFromPrevious: number; // seconds
}

export interface DeviceBreakdown {
  device: "desktop" | "mobile" | "tablet";
  visitors: number;
  uploadStartRate: number;      // %
  analysisCompletionRate: number; // %
  paymentConversionRate: number;  // %
}

export interface FunnelReport {
  generatedAt: string;
  period: string;
  totalVisitors: number;
  totalReportsViewed: number;
  overallConversionRate: number;  // visitor → report
  steps: FunnelStep[];
  deviceBreakdown: DeviceBreakdown[];
  biggestDropoff: { step: string; rate: number; recommendation: string };
  recommendations: string[];
}

// ── Funnel Data Model ──────────────────────────────────────────────────────

export const FUNNEL_STEPS: FunnelStep["step"][] = [
  "visitor",
  "upload_started",
  "file_selected",
  "analysis_started",
  "payment_initiated",
  "payment_completed",
  "report_viewed",
];

export const STEP_LABELS: Record<FunnelStep["step"], string> = {
  visitor: "Landing Page Visitor",
  upload_started: "Upload Started",
  file_selected: "File Selected",
  analysis_started: "Analysis Started",
  payment_initiated: "Payment Initiated",
  payment_completed: "Payment Completed",
  report_viewed: "Report Viewed",
};

// ── Funnel Generator ───────────────────────────────────────────────────────

export function generateUploadFunnel(
  counts: Record<FunnelStep["step"], number>,
  times: Partial<Record<FunnelStep["step"], number>> = {},
): FunnelStep[] {
  const steps: FunnelStep[] = [];

  for (let i = 0; i < FUNNEL_STEPS.length; i++) {
    const stepKey = FUNNEL_STEPS[i];
    const count = counts[stepKey] || 0;
    const previousKey = i > 0 ? FUNNEL_STEPS[i - 1] : null;
    const previousCount = previousKey ? (counts[previousKey] || 1) : count;

    steps.push({
      step: stepKey,
      label: STEP_LABELS[stepKey],
      count,
      conversionFromPrevious: Math.round((count / Math.max(previousCount, 1)) * 100),
      conversionFromTop: Math.round((count / Math.max(counts.visitor || 1, 1)) * 100),
      averageTimeFromPrevious: times[stepKey] || 0,
    });
  }

  return steps;
}

// ── Device Breakdown ───────────────────────────────────────────────────────

export function generateDeviceBreakdown(
  deviceData: {
    device: "desktop" | "mobile" | "tablet";
    visitors: number;
    uploadsStarted: number;
    analysesCompleted: number;
    paymentsCompleted: number;
  }[],
): DeviceBreakdown[] {
  return deviceData.map((d) => ({
    device: d.device,
    visitors: d.visitors,
    uploadStartRate: Math.round((d.uploadsStarted / Math.max(d.visitors, 1)) * 100),
    analysisCompletionRate: Math.round((d.analysesCompleted / Math.max(d.uploadsStarted, 1)) * 100),
    paymentConversionRate: Math.round((d.paymentsCompleted / Math.max(d.analysesCompleted, 1)) * 100),
  }));
}

// ── Full Funnel Report ─────────────────────────────────────────────────────

export function generateFunnelReport(
  period: string,
  counts: Record<FunnelStep["step"], number>,
  deviceData?: DeviceBreakdown[],
): FunnelReport {
  const steps = generateUploadFunnel(counts);
  const overallConversion = steps[steps.length - 1]?.conversionFromTop || 0;

  // Find biggest dropoff
  let biggestDropoff = { step: "unknown", rate: 0, recommendation: "" };
  let maxDropoff = 0;
  for (let i = 1; i < steps.length; i++) {
    const dropoff = 100 - steps[i].conversionFromPrevious;
    if (dropoff > maxDropoff) {
      maxDropoff = dropoff;
      biggestDropoff = {
        step: steps[i].label,
        rate: dropoff,
        recommendation: getDropoffRecommendation(steps[i].step),
      };
    }
  }

  const recommendations = steps
    .filter((s, i) => i > 0 && s.conversionFromPrevious < 70)
    .map((s) => getDropoffRecommendation(s.step));

  return {
    generatedAt: new Date().toISOString(),
    period,
    totalVisitors: counts.visitor || 0,
    totalReportsViewed: counts.report_viewed || 0,
    overallConversionRate: overallConversion,
    steps,
    deviceBreakdown: deviceData || [],
    biggestDropoff,
    recommendations,
  };
}

function getDropoffRecommendation(step: FunnelStep["step"]): string {
  const recs: Record<FunnelStep["step"], string> = {
    visitor: "Improve landing page value proposition and above-the-fold messaging",
    upload_started: "Add clearer CTA, show supported file types, add privacy reassurance",
    file_selected: "Show upload progress, reduce file size requirements",
    analysis_started: "Add engaging waiting state with educational content and trust facts",
    payment_initiated: "Show one free finding, add payment trust badges, clarify full report value",
    payment_completed: "Streamline payment flow, reduce steps, add Apple Pay/Google Pay",
    report_viewed: "Make report immediately accessible after payment with clear navigation",
  };
  return recs[step] || "Investigate dropoff cause";
}

// ── Privacy ────────────────────────────────────────────────────────────────

export const UPLOAD_FUNNEL_PRIVACY = {
  anonymousOnly: true,
  noDocumentData: true,
  aggregateStepCounts: true,
  noIndividualTracking: true,
};

export const UPLOAD_FUNNEL_VERSION = "5.0.0";