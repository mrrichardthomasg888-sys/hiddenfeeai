// HiddenFeeAI — Onboarding Optimization Intelligence
// Analyzes first-time visitor journey, upload hesitation,
// payment hesitation, and report understanding.
// Generates recommendations for better explanations,
// trust improvements, and friction reduction.
// Privacy-safe: anonymous journey analysis only. No PII.

// ── Types ──────────────────────────────────────────────────────────────────

export interface JourneyStage {
  stage: "landing_arrival" | "hero_engagement" | "upload_intent" | "file_selected" | "analysis_started" | "payment_decision" | "report_viewed" | "report_engaged";
  description: string;
  averageTimeSeconds: number;
  dropoffRate: number;           // % who leave at this stage
  hesitationRate: number;        // % who pause/hesitate
  frictionPoints: string[];
  optimizationSuggestions: string[];
}

export interface OnboardingInsight {
  insightId: string;
  category: "trust" | "clarity" | "speed" | "value_perception" | "friction" | "education";
  description: string;
  severity: "Critical" | "High" | "Medium" | "Low";
  affectedStage: JourneyStage["stage"];
  recommendation: string;
  expectedImpact: string;
}

export interface OnboardingReport {
  generatedAt: string;
  overallCompletionRate: number;     // landing → report viewed
  averageTimeToReport: number;       // seconds
  stages: JourneyStage[];
  insights: OnboardingInsight[];
  topRecommendations: string[];
}

// ── Journey Stages ─────────────────────────────────────────────────────────

export const DEFAULT_JOURNEY_STAGES: JourneyStage[] = [
  {
    stage: "landing_arrival",
    description: "Visitor lands on HiddenFeeAI homepage",
    averageTimeSeconds: 8,
    dropoffRate: 30,
    hesitationRate: 10,
    frictionPoints: [
      "Unclear what types of documents are supported",
      "Value proposition not immediately visible above the fold",
      "Pricing not transparent — '$0.99' unclear if per-report or subscription",
    ],
    optimizationSuggestions: [
      "Add document type icons above the fold",
      "Make primary CTA more specific: 'Upload Your Car Purchase Agreement' vs 'Get Started'",
      "Show pricing clearly: 'Free report preview / $0.99 for full audit'",
    ],
  },
  {
    stage: "hero_engagement",
    description: "User scrolls through landing page, reads trust sections, explores content",
    averageTimeSeconds: 25,
    dropoffRate: 25,
    hesitationRate: 20,
    frictionPoints: [
      "Long page — key trust signals buried below the fold",
      "No interactive demo or sample report preview",
      "TrustSection lacks data privacy specifics",
    ],
    optimizationSuggestions: [
      "Add interactive 'See a sample report' button in hero",
      "Move TrustSection above the fold",
      "Add specific privacy language: 'Your document is encrypted and auto-deleted after analysis'",
    ],
  },
  {
    stage: "upload_intent",
    description: "User clicks upload button, sees upload interface",
    averageTimeSeconds: 12,
    dropoffRate: 20,
    hesitationRate: 35,
    frictionPoints: [
      "Drag-and-drop unclear on mobile",
      "Accepted file types not prominently displayed",
      "Users worry about document privacy",
      "'What happens after I upload?' not explained",
    ],
    optimizationSuggestions: [
      "Show accepted file type icons near upload area",
      "Add privacy reassurance adjacent to upload: 'Your document is encrypted. We never store or share it.'",
      "Add step indicator: '1. Upload → 2. AI Analysis → 3. Review Findings → 4. Save Money'",
      "Mobile: Add 'Take Photo' button for document capture",
    ],
  },
  {
    stage: "file_selected",
    description: "File is selected, processing begins",
    averageTimeSeconds: 5,
    dropoffRate: 10,
    hesitationRate: 15,
    frictionPoints: [
      "No progress indicator during upload",
      "Large files time out on slow connections",
      "No estimated wait time displayed",
    ],
    optimizationSuggestions: [
      "Show upload progress bar with percentage",
      "Display estimated analysis time: 'Analyzing... typically 15-30 seconds'",
      "Add cancellation option if upload is stuck",
    ],
  },
  {
    stage: "analysis_started",
    description: "AI analysis is running, user waits for results",
    averageTimeSeconds: 20,
    dropoffRate: 15,
    hesitationRate: 25,
    frictionPoints: [
      "Empty waiting state — no engaging content",
      "No explanation of what the AI is doing",
      "Users may leave thinking it's broken",
    ],
    optimizationSuggestions: [
      "Show animated analysis steps: 'Scanning for hidden fees...', 'Checking math errors...', 'Identifying contract risks...'",
      "Add educational tip during wait: 'Did you know? Documentation fees are negotiable in most states'",
      "Add trust fact: 'We've helped consumers find over $X in hidden fees'",
    ],
  },
  {
    stage: "payment_decision",
    description: "Analysis complete, user must decide to pay for the full report",
    averageTimeSeconds: 30,
    dropoffRate: 40,
    hesitationRate: 45,
    frictionPoints: [
      "Free preview shows too little value — risk score only, no specific findings",
      "Payment amount ($0.99) seems suspiciously cheap — 'Is this a scam?'",
      "No payment trust signals (Stripe badge, refund policy, security info)",
      "Unclear what 'full report' includes vs free preview",
    ],
    optimizationSuggestions: [
      "Show one specific finding for free: 'We found a $450 Documentation Fee — 3x the state average'",
      "Add payment trust badges: Stripe, SSL, '30-day refund policy'",
      "Show side-by-side comparison: Free Preview vs Full Report features",
      "Add social proof: 'X consumers saved an average of $Y using the full report'",
    ],
  },
  {
    stage: "report_viewed",
    description: "User opens the full audit report",
    averageTimeSeconds: 45,
    dropoffRate: 10,
    hesitationRate: 10,
    frictionPoints: [
      "Report layout overwhelming — too many findings at once",
      "Technical jargon not explained",
      "No clear 'What do I do now?' guidance",
      "Financial impact not prominent enough",
    ],
    optimizationSuggestions: [
      "Lead with 'You could save $X' prominently at the top",
      "Organize findings by severity with collapsible sections",
      "Add 'Next Steps' section with numbered actions",
      "Include negotiation script copy button for each finding",
    ],
  },
  {
    stage: "report_engaged",
    description: "User interacts with findings, downloads PDF, copies negotiation scripts",
    averageTimeSeconds: 60,
    dropoffRate: 5,
    hesitationRate: 5,
    frictionPoints: [
      "PDF download not obvious",
      "No 'Save for later' or 'Share' functionality",
      "No comparison feature: 'Upload another document to compare'",
    ],
    optimizationSuggestions: [
      "Prominent 'Download PDF Report' button at top and bottom",
      "Add 'Email report to myself' feature",
      "Prompt: 'Want to check another document? Compare your car purchase with the insurance policy'",
    ],
  },
];

// ── Onboarding Insights Generator ──────────────────────────────────────────

export function generateOnboardingInsights(stages: JourneyStage[] = DEFAULT_JOURNEY_STAGES): OnboardingInsight[] {
  const insights: OnboardingInsight[] = [];

  // High dropoff stages
  for (const stage of stages) {
    if (stage.dropoffRate >= 30) {
      insights.push({
        insightId: `insight-${stage.stage}-dropoff`,
        category: "friction",
        description: `${stage.dropoffRate}% of users drop off at "${stage.description}"`,
        severity: stage.dropoffRate >= 40 ? "Critical" : "High",
        affectedStage: stage.stage,
        recommendation: stage.optimizationSuggestions[0] || "Add clearer value proposition at this stage",
        expectedImpact: `Reducing dropoff by 10% could increase report views by ~${Math.round(stage.dropoffRate * 0.33)}% at this stage`,
      });
    }

    if (stage.hesitationRate >= 30) {
      insights.push({
        insightId: `insight-${stage.stage}-hesitation`,
        category: stage.stage === "payment_decision" ? "value_perception" : "trust",
        description: `${stage.hesitationRate}% of users hesitate at "${stage.description}"`,
        severity: "High",
        affectedStage: stage.stage,
        recommendation: `Add more transparency and reassurance at this stage: ${stage.optimizationSuggestions[1] || stage.optimizationSuggestions[0]}`,
        expectedImpact: "Reduced hesitation increases completion rate and user satisfaction",
      });
    }
  }

  return insights;
}

// ── Full Onboarding Report ─────────────────────────────────────────────────

export function generateOnboardingReport(): OnboardingReport {
  const stages = DEFAULT_JOURNEY_STAGES;
  const insights = generateOnboardingInsights(stages);

  // Calculate overall completion from landing to report viewed
  const remaining = stages.reduce((rate, stage) => rate * (1 - stage.dropoffRate / 100), 100);
  const completionRate = Math.round(remaining);

  const totalTime = stages.reduce((sum, s) => sum + s.averageTimeSeconds, 0);

  const criticalInsights = insights.filter((i) => i.severity === "Critical");

  return {
    generatedAt: new Date().toISOString(),
    overallCompletionRate: completionRate,
    averageTimeToReport: totalTime,
    stages,
    insights,
    topRecommendations: [
      "Priority 1: Fix payment decision stage — 40% dropoff is the largest revenue leak. Show one specific finding for free + trust badges.",
      "Priority 2: Improve landing page value clarity — 30% leave without scrolling. Add sample report preview in hero section.",
      "Priority 3: Reduce upload hesitation — 35% pause at upload. Add privacy reassurance directly adjacent to upload button.",
      ...criticalInsights.map((i) => `Critical: ${i.recommendation}`),
    ],
  };
}

// ── First-Visit vs Returning Analysis ──────────────────────────────────────

export function compareFirstVsReturning(
  firstTimeDropoff: number[],
  returningDropoff: number[],
): { stage: string; firstTimeRate: number; returningRate: number; improvement: number }[] {
  return DEFAULT_JOURNEY_STAGES.map((stage, i) => ({
    stage: stage.stage,
    firstTimeRate: firstTimeDropoff[i] || stage.dropoffRate,
    returningRate: returningDropoff[i] || stage.dropoffRate * 0.6, // Returning users typically 40% less dropoff
    improvement: Math.round(((firstTimeDropoff[i] || stage.dropoffRate) - (returningDropoff[i] || stage.dropoffRate * 0.6)) / (firstTimeDropoff[i] || stage.dropoffRate) * 100),
  }));
}

export const ONBOARDING_VERSION = "5.0.0";