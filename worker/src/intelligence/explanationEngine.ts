import type { VerifiedFinding, VerifiableFinding } from "../types.js";
import { lookupFee } from "../knowledge/feeDatabase.js";

/**
 * Plain Language Explanation Engine
 * 
 * Converts complex legal/financial language into consumer-friendly explanations.
 * 
 * For each finding, provides:
 * - "What this says" — plain English translation
 * - "Why it matters" — consumer impact
 * - "What you can do" — recommended action
 * 
 * This is the "expert consumer advocate reviewing your document" layer.
 */

export interface ConsumerExplanation {
  findingId: string;
  originalTitle: string;
  whatThisSays: string;
  whyItMatters: string;
  whatYouCanDo: string;
  confidence: number;
  isUnusual: boolean;
  negotiationPossible: boolean;
  relatedConcepts: string[];
  severityLabel: string;
}

const SEVERITY_LABELS: Record<string, string> = {
  Critical: "⚠️ This is a serious concern that could significantly affect your rights or finances",
  High: "🔴 This is an important issue you should address before signing",
  Medium: "🟡 This is worth reviewing and potentially negotiating",
  Low: "🟢 This is a minor concern but worth being aware of",
};

/**
 * Generate a consumer-friendly explanation for a finding.
 * Combines knowledge base lookups with template-based generation.
 */
export function explainFinding(finding: VerifiableFinding | VerifiedFinding): ConsumerExplanation {
  const feeKnowledge = lookupFee(finding.title);
  
  // Build explanation from knowledge base + finding context
  const whatThisSays = feeKnowledge?.consumerExplanation || 
    generateGenericExplanation(finding);
  
  const whyItMatters = feeKnowledge?.description
    ? `${feeKnowledge.description}. ${finding.whyItMatters || ''}`.trim()
    : finding.whyItMatters || `This ${finding.category.toLowerCase()} may affect your total cost or consumer rights.`;

  const whatYouCanDo = finding.recommendedAction || 
    buildGenericAction(finding, feeKnowledge);

  const isUnusual = feeKnowledge?.riskLevel === 'high' || feeKnowledge?.riskLevel === 'critical' ||
    (finding.severity === 'High' || finding.severity === 'Critical');

  const negotiationPossible = feeKnowledge 
    ? (feeKnowledge.negotiability === 'highly_negotiable' || feeKnowledge.negotiability === 'somewhat_negotiable')
    : (finding.negotiationMessage != null);

  const relatedConcepts = feeKnowledge?.questionsToAsk?.slice(0, 3) || [];

  return {
    findingId: finding.id,
    originalTitle: finding.title,
    whatThisSays,
    whyItMatters,
    whatYouCanDo,
    confidence: finding.confidenceScore,
    isUnusual,
    negotiationPossible,
    relatedConcepts,
    severityLabel: SEVERITY_LABELS[finding.severity] || '',
  };
}

function generateGenericExplanation(finding: VerifiableFinding): string {
  const categoryExplanations: Record<string, string> = {
    'Hidden Fee': 'This is a charge that may not have been clearly disclosed in the advertised price. The company is charging you an additional fee that appears separate from the main price.',
    'Contract Risk': 'This is a clause in your agreement that may limit your rights, increase your obligations, or expose you to unexpected costs.',
    'Math Error': 'The numbers in this document don\'t add up correctly. This could mean you\'re being overcharged.',
    'Duplicate Charge': 'You appear to be charged twice for the same item or service.',
    'Billing Error': 'There appears to be an error in how this bill was calculated.',
    'Negotiation': 'This is an item that may be negotiable — you could potentially get a better price or terms.',
  };
  
  return categoryExplanations[finding.category] || 
    `This finding requires your attention. ${finding.explanation}`;
}

function buildGenericAction(
  finding: VerifiableFinding, 
  knowledge: ReturnType<typeof lookupFee>,
): string {
  if (knowledge?.questionsToAsk?.length) {
    const questions = knowledge.questionsToAsk.slice(0, 3).map(q => `• Ask: "${q}"`).join('\n');
    return `Before accepting this, consider:\n${questions}`;
  }
  
  if (finding.negotiationMessage) {
    return `Try saying: "${finding.negotiationMessage}"`;
  }
  
  const actions: Record<string, string> = {
    'Hidden Fee': 'Ask for this fee to be explained, itemized, or removed. Compare with other providers to see if this fee is standard.',
    'Contract Risk': 'Consider requesting this clause be modified or removed before signing. You may want to consult a consumer rights organization.',
    'Math Error': 'Request a corrected statement showing the accurate calculation.',
    'Duplicate Charge': 'Contact the billing department and point out the duplicate charge. Request a corrected bill.',
  };
  
  return actions[finding.category] || 'Review this finding carefully and consider asking questions before proceeding.';
}

/**
 * Batch-explain all findings from a verification/analysis pass.
 */
export function explainFindings(
  findings: VerifiableFinding[],
): Map<string, ConsumerExplanation> {
  const explanations = new Map<string, ConsumerExplanation>();
  
  for (const finding of findings) {
    explanations.set(finding.id, explainFinding(finding));
  }
  
  return explanations;
}

// ─── Clause-specific translations ───

export function translateClause(clauseText: string): string {
  const translations: Array<{ pattern: RegExp; translation: string }> = [
    {
      pattern: /automatically\s+renew/i,
      translation: 'This contract renews itself automatically unless you cancel before the deadline',
    },
    {
      pattern: /binding\s+arbitration/i,
      translation: 'You give up your right to sue in court and must use private arbitration instead',
    },
    {
      pattern: /class\s+action\s+waiver/i,
      translation: 'You cannot join a class-action lawsuit against this company',
    },
    {
      pattern: /reserves?\s+the\s+right\s+to\s+(change|modify|alter)/i,
      translation: 'This company can change the terms at any time without your consent',
    },
    {
      pattern: /upon\s+\d+\s+days?\s+(notice|written\s+notice)/i,
      translation: 'You must give advance written notice to cancel or make changes',
    },
    {
      pattern: /non-?refundable/i,
      translation: 'You will not get this money back under any circumstances',
    },
    {
      pattern: /as\s+is/i,
      translation: 'You accept the item in its current condition with no guarantees',
    },
    {
      pattern: /entire\s+agreement/i,
      translation: 'Only what\'s written in this document counts — verbal promises may not be enforceable',
    },
    {
      pattern: /indemnif/i,
      translation: 'You may be responsible for the other party\'s legal costs if something goes wrong',
    },
    {
      pattern: /limitation\s+of\s+liability/i,
      translation: 'The company limits how much they can be held responsible for if something goes wrong',
    },
  ];

  for (const { pattern, translation } of translations) {
    if (pattern.test(clauseText)) {
      return translation;
    }
  }
  
  return 'This clause contains legal language that may affect your rights. Consider reviewing it carefully.';
}