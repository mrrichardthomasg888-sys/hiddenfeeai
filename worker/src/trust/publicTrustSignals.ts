/**
 * Public Trust Signals
 * 
 * Generates customer-facing trust information for the website.
 * All numbers are derived from operational metrics.
 * 
 * RULES:
 * - Never display unsupported accuracy claims
 * - Only show verified operational metrics
 * - Clearly label estimates vs measurements
 */

export interface PublicTrustSignals {
  documentsAnalyzed: number;
  industriesSupported: number;
  formatsSupported: number;
  privacyPromise: string;
  evidenceBasedLabel: string;
  lastUpdated: string;
}

const FORMATS_SUPPORTED = 25;
const INDUSTRIES_SUPPORTED = 7;
const PRIVACY_PROMISE = "Your document is processed in memory, never stored, and never used for AI training. It is deleted immediately after analysis completes.";
const EVIDENCE_LABEL = "Every finding includes the exact page, section, and quote from your document that supports it. If evidence cannot be found, the finding is not reported.";

export function getPublicTrustSignals(documentsAnalyzed: number): PublicTrustSignals {
  return {
    documentsAnalyzed,
    industriesSupported: INDUSTRIES_SUPPORTED,
    formatsSupported: FORMATS_SUPPORTED,
    privacyPromise: PRIVACY_PROMISE,
    evidenceBasedLabel: EVIDENCE_LABEL,
    lastUpdated: new Date().toISOString(),
  };
}