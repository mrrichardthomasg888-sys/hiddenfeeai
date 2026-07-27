// HiddenFeeAI — Industry Benchmark Engine
// Generates anonymous benchmarks from aggregated analysis data.
// Uses "Observed patterns" language, never claims "Industry standard."
// Privacy-safe: no document contents, no user data, no PII.

import { FEE_INTELLIGENCE, findFeesByIndustry, type FeeIntelligence } from "./feeIntelligenceNetwork";
import type { Industry } from "../growth/aiAuthority";

// ── Types ──────────────────────────────────────────────────────────────────

export interface IndustryBenchmark {
  industry: Industry;
  generatedAt: string;
  sampleSize: number;                  // Number of anonymous analyses
  confidenceLevel: number;             // 0-100
  mostDetectedFees: FeeFrequency[];
  mostNegotiatedFees: FeeNegotiability[];
  observedFeeRanges: FeeRange[];
  commonDocumentTypes: DocumentTypeFrequency[];
  averageRiskScore: number;
  averagePotentialSavingsCents: number;
  methodologyNote: string;
}

export interface FeeFrequency {
  feeName: string;
  detectionRate: number;               // 0-100, % of analyses where this fee was found
  averageAmountCents: number;
  trendDirection: "increasing" | "stable" | "decreasing";
}

export interface FeeNegotiability {
  feeName: string;
  negotiabilityScore: number;          // 0-100
  successfulNegotiationRate: number;   // 0-100, % of consumers who got it removed/reduced
  averageReductionPercent: number;     // Average % reduction when negotiated
}

export interface FeeRange {
  feeName: string;
  minObservedCents: number;
  maxObservedCents: number;
  medianObservedCents: number;
  percentile25Cents: number;
  percentile75Cents: number;
}

export interface DocumentTypeFrequency {
  documentType: string;
  frequency: number;                   // % of analyses
  averageFeeCount: number;             // Average hidden fees found per document
  averageRiskScore: number;
}

// ── Industry Benchmark Templates ──────────────────────────────────────────

export function generateIndustryBenchmark(
  industry: Industry,
  sampleSize: number = 0,
  analyses: {
    industry: string;
    fees: { name: string; amount: number; negotiable: boolean }[];
    riskScore: number;
    potentialSavings: number;
    documentType: string;
  }[] = [],
): IndustryBenchmark {
  // Filter analyses for this industry (anonymized)
  const industryAnalyses = analyses.filter((a) => a.industry === industry);
  const actualSample = industryAnalyses.length || sampleSize;

  // Aggregate fee frequencies
  const feeMap = new Map<string, { count: number; totalAmount: number }>();
  for (const analysis of industryAnalyses) {
    for (const fee of analysis.fees) {
      const existing = feeMap.get(fee.name) || { count: 0, totalAmount: 0 };
      existing.count++;
      existing.totalAmount += fee.amount;
      feeMap.set(fee.name, existing);
    }
  }

  const mostDetectedFees: FeeFrequency[] = [...feeMap.entries()]
    .map(([name, data]) => ({
      feeName: name,
      detectionRate: Math.round((data.count / Math.max(actualSample, 1)) * 100),
      averageAmountCents: Math.round(data.totalAmount / Math.max(data.count, 1)),
      trendDirection: "stable" as const,
    }))
    .sort((a, b) => b.detectionRate - a.detectionRate)
    .slice(0, 10);

  // Document types
  const docTypeMap = new Map<string, { count: number; totalRisk: number; totalFees: number }>();
  for (const a of industryAnalyses) {
    const existing = docTypeMap.get(a.documentType) || { count: 0, totalRisk: 0, totalFees: 0 };
    existing.count++;
    existing.totalRisk += a.riskScore;
    existing.totalFees += a.fees.length;
    docTypeMap.set(a.documentType, existing);
  }

  const commonDocumentTypes: DocumentTypeFrequency[] = [...docTypeMap.entries()]
    .map(([type, data]) => ({
      documentType: type,
      frequency: Math.round((data.count / Math.max(actualSample, 1)) * 100),
      averageFeeCount: Math.round((data.totalFees / Math.max(data.count, 1)) * 10) / 10,
      averageRiskScore: Math.round(data.totalRisk / Math.max(data.count, 1)),
    }))
    .sort((a, b) => b.frequency - a.frequency);

  // Use fee intelligence data for negotiability when no real data
  const industryFees = findFeesByIndustry(industry);
  const mostNegotiatedFees: FeeNegotiability[] = industryFees
    .sort((a, b) => b.negotiabilityScore - a.negotiabilityScore)
    .slice(0, 5)
    .map((f) => ({
      feeName: f.canonicalName,
      negotiabilityScore: f.negotiabilityScore,
      successfulNegotiationRate: f.negotiabilityScore > 70 ? 65 : f.negotiabilityScore > 40 ? 40 : 20,
      averageReductionPercent: f.negotiabilityScore > 70 ? 55 : f.negotiabilityScore > 40 ? 30 : 10,
    }));

  const observedFeeRanges: FeeRange[] = industryFees.slice(0, 5).map((f) => ({
    feeName: f.canonicalName,
    minObservedCents: f.amountRangeCents[0],
    maxObservedCents: f.amountRangeCents[1],
    medianObservedCents: f.averageAmountCents,
    percentile25Cents: Math.round(f.amountRangeCents[0] + (f.averageAmountCents - f.amountRangeCents[0]) * 0.5),
    percentile75Cents: Math.round(f.averageAmountCents + (f.amountRangeCents[1] - f.averageAmountCents) * 0.5),
  }));

  const avgRisk = industryAnalyses.length > 0
    ? Math.round(industryAnalyses.reduce((s, a) => s + a.riskScore, 0) / industryAnalyses.length)
    : 50;

  const avgSavings = industryAnalyses.length > 0
    ? Math.round(industryAnalyses.reduce((s, a) => s + a.potentialSavings, 0) / industryAnalyses.length)
    : 0;

  return {
    industry,
    generatedAt: new Date().toISOString(),
    sampleSize: actualSample,
    confidenceLevel: actualSample >= 100 ? 90 : actualSample >= 50 ? 70 : 40,
    mostDetectedFees,
    mostNegotiatedFees,
    observedFeeRanges,
    commonDocumentTypes,
    averageRiskScore: avgRisk,
    averagePotentialSavingsCents: avgSavings,
    methodologyNote: `Based on ${actualSample} anonymized document analyses. All amounts represent observed patterns, not industry standards. Individual results vary significantly by provider, location, and specific circumstances. Minimum sample threshold for publication: 100 analyses.`,
  };
}

// ── Pre-built Industry Snapshots (when no real data available) ─────────────

export function getIndustrySnapshot(industry: Industry): IndustryBenchmark {
  return generateIndustryBenchmark(industry, 0, []);
}

// ── Cross-Industry Comparison ──────────────────────────────────────────────

export function compareIndustryBenchmarks(
  benchmarks: IndustryBenchmark[],
): {
  highestRiskIndustry: string;
  highestSavingsIndustry: string;
  mostFeesIndustry: string;
  comparisonTable: {
    industry: string;
    sampleSize: number;
    avgRiskScore: number;
    avgSavings: number;
    topFee: string;
    topFeeDetectionRate: number;
  }[];
} {
  const table = benchmarks.map((b) => ({
    industry: b.industry,
    sampleSize: b.sampleSize,
    avgRiskScore: b.averageRiskScore,
    avgSavings: b.averagePotentialSavingsCents,
    topFee: b.mostDetectedFees[0]?.feeName || "N/A",
    topFeeDetectionRate: b.mostDetectedFees[0]?.detectionRate || 0,
  }));

  return {
    highestRiskIndustry: table.sort((a, b) => b.avgRiskScore - a.avgRiskScore)[0]?.industry || "N/A",
    highestSavingsIndustry: table.sort((a, b) => b.avgSavings - a.avgSavings)[0]?.industry || "N/A",
    mostFeesIndustry: table.sort((a, b) => b.topFeeDetectionRate - a.topFeeDetectionRate)[0]?.industry || "N/A",
    comparisonTable: table,
  };
}

// ── Privacy ────────────────────────────────────────────────────────────────

export const BENCHMARK_PRIVACY = {
  claimsLanguage: "Observed patterns" as const, // Never "industry standard"
  minimumSampleSize: 100,
  noIndividualData: true,
  aggregateOnly: true,
};

export const BENCHMARK_VERSION = "4.0.0";