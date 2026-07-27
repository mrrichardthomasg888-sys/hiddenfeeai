export type FeatureTier = 'free' | 'paid';

export interface FeatureAccess {
  documentTypeDetection: boolean;
  basicRiskScore: boolean;
  findingCount: boolean;
  fullEvidence: boolean;
  negotiationScripts: boolean;
  detailedReport: boolean;
  pdfDownload: boolean;
  actionPlan: boolean;
  comparisonReport: boolean;
}

const FREE_FEATURES: FeatureAccess = {
  documentTypeDetection: true, basicRiskScore: true, findingCount: true,
  fullEvidence: false, negotiationScripts: false, detailedReport: false,
  pdfDownload: false, actionPlan: false, comparisonReport: false,
};

const PAID_FEATURES: FeatureAccess = {
  documentTypeDetection: true, basicRiskScore: true, findingCount: true,
  fullEvidence: true, negotiationScripts: true, detailedReport: true,
  pdfDownload: true, actionPlan: true, comparisonReport: true,
};

export function getFeatureAccess(tier: FeatureTier): FeatureAccess {
  return tier === 'paid' ? PAID_FEATURES : FREE_FEATURES;
}

export function getPreviewData(report: any) {
  return {
    documentType: report?.document_meta?.document_type || 'Unknown',
    riskScore: report?.risk_score || 0,
    riskLevel: report?.risk_level || 'Unknown',
    findingsCount: report?.findings?.length || 0,
    hiddenFeesCount: report?.hidden_fees?.length || 0,
  };
}