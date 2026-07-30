import type { VerifiedFinding, Finding } from "../types.js";
import { lookupFee } from "../knowledge/feeDatabase.js";

/**
 * Consumer Education Engine
 * 
 * Provides educational context for important findings:
 * - What is this? (simple explanation)
 * - Why should you care? (consumer impact)
 * - What questions to ask?
 * - Where to learn more?
 */

export interface EducationTopic {
  topic: string;
  whatIsIt: string;
  whyItMatters: string;
  questionsToAsk: string[];
  learnMore: string;
  category: 'fees' | 'contracts' | 'consumer_rights' | 'financial_literacy';
}

const EDUCATION_LIBRARY: Record<string, EducationTopic> = {
  // ── FEE EDUCATION ──
  documentation_fee: {
    topic: 'Documentation Fees',
    whatIsIt: 'A documentation fee (or "doc fee") is a charge car dealerships add for preparing sales paperwork. It is NOT a government fee — it\'s dealer profit.',
    whyItMatters: 'Doc fees can range from $75 to over $900. Some states cap them by law. You can often negotiate this fee — many consumers get it reduced or removed entirely.',
    questionsToAsk: [
      'Is this documentation fee required by law in this state?',
      'What is the state maximum for documentation fees?',
      'Can this fee be reduced or waived?',
    ],
    learnMore: 'Check your state attorney general\'s website for doc fee regulations. FTC Auto Buying Guide has additional consumer tips.',
    category: 'fees',
  },
  arbitration_clause: {
    topic: 'Arbitration Clauses',
    whatIsIt: 'An arbitration clause requires you to resolve disputes through private arbitration instead of going to court. You typically waive your right to sue, participate in class actions, or have a jury trial.',
    whyItMatters: 'Arbitration often favors companies — the arbitrator may be selected and paid by the company. Studies show consumers win less often and recover less money in arbitration than in court.',
    questionsToAsk: [
      'Is there an opt-out provision for arbitration?',
      'Who selects and pays the arbitrator?',
      'Does this prevent me from joining a class action?',
    ],
    learnMore: 'The Consumer Financial Protection Bureau (CFPB) has resources on arbitration clauses. Some states have laws limiting mandatory arbitration.',
    category: 'contracts',
  },
  auto_renewal: {
    topic: 'Auto-Renewal Clauses',
    whatIsIt: 'An auto-renewal clause means your contract will automatically extend unless you actively cancel before a specific deadline. You\'ll keep being charged until you cancel.',
    whyItMatters: 'Many consumers forget to cancel and get charged for another term. Some companies make cancellation difficult. Set a calendar reminder 60-90 days before renewal.',
    questionsToAsk: [
      'How do I cancel before the renewal date?',
      'Will I receive a reminder before renewal?',
      'Can auto-renewal be removed from this contract?',
    ],
    learnMore: 'The FTC enforces rules about auto-renewal disclosures. Your state may have additional protections. Always document your cancellation in writing.',
    category: 'contracts',
  },
  facility_fee: {
    topic: 'Medical Facility Fees',
    whatIsIt: 'A facility fee is a charge for using a hospital or clinic building, separate from the doctor\'s fee. You may pay this even for an office visit that doesn\'t use hospital equipment.',
    whyItMatters: 'Facility fees can add $100-500+ to a single visit. As hospitals acquire medical practices, these fees become more common. They\'re often unexpected and may not be covered by insurance.',
    questionsToAsk: [
      'Why am I being charged a facility fee for an office visit?',
      'Is this covered by my insurance?',
      'Do you offer financial assistance?',
    ],
    learnMore: 'Request an itemized bill. Compare to FAIR Health or Healthcare Bluebook rates. Every hospital must have a financial assistance policy.',
    category: 'fees',
  },
  hidden_fees_general: {
    topic: 'Hidden Fees and Junk Fees',
    whatIsIt: 'Hidden fees are charges not clearly included in the advertised price. Companies add them to make prices look lower than they actually are.',
    whyItMatters: 'A 2024 CFPB report found that hidden and junk fees cost American consumers billions annually. The FTC is actively working to ban certain junk fees.',
    questionsToAsk: [
      'What is the total price including ALL fees and charges?',
      'Which fees are required and which are optional?',
      'Why isn\'t this fee included in the base price?',
    ],
    learnMore: 'The CFPB (consumerfinance.gov) and FTC (ftc.gov) provide consumer guidance on fee transparency. Some states require all-in pricing disclosure.',
    category: 'consumer_rights',
  },
  negotiable_fees: {
    topic: 'Negotiating Fees and Charges',
    whatIsIt: 'Many consumer fees — especially in auto sales, rentals, subscriptions, and telecom — are negotiable. Companies expect you to ask.',
    whyItMatters: 'A simple question like "Can you waive this fee?" can save hundreds or thousands. Being polite, prepared, and willing to walk away are your best negotiation tools.',
    questionsToAsk: [
      'What fees can be reduced or waived?',
      'What do your competitors charge for this?',
      'Is there a discount for paying annually or in advance?',
    ],
    learnMore: 'Consumer Reports and NerdWallet regularly publish guides on negotiating specific fees. The key is to ask — the worst answer is "no."',
    category: 'financial_literacy',
  },
  reading_contracts: {
    topic: 'Understanding Consumer Contracts',
    whatIsIt: 'Consumer contracts contain legally binding terms. Many people sign without reading the fine print. Key areas to focus on: fees, cancellation terms, dispute resolution, and renewal provisions.',
    whyItMatters: 'The fine print often contains the most impactful terms — auto-renewals, arbitration clauses, price increases, and penalty fees. Taking time to read and ask questions can prevent future problems.',
    questionsToAsk: [
      'What are the cancellation or termination terms?',
      'Are there automatic renewals?',
      'Can terms or prices change after I sign?',
      'How are disputes resolved?',
    ],
    learnMore: 'The FTC Consumer Information website has guides on reading contracts. Consumer advocacy organizations like Consumer Reports offer contract review tips.',
    category: 'consumer_rights',
  },
};

/**
 * Get educational content for a specific finding.
 */
export function getEducationForFinding(finding: VerifiedFinding): EducationTopic | null {
  // Try direct knowledge base lookup first
  const knowledge = lookupFee(finding.title);
  
  if (knowledge?.canonicalName && EDUCATION_LIBRARY[knowledge.canonicalName]) {
    return EDUCATION_LIBRARY[knowledge.canonicalName];
  }

  // Try category-based fallbacks
  if (finding.title.toLowerCase().includes('arbitration')) {
    return EDUCATION_LIBRARY.arbitration_clause;
  }
  if (finding.title.toLowerCase().includes('renew') || finding.evidenceQuote.toLowerCase().includes('renew')) {
    return EDUCATION_LIBRARY.auto_renewal;
  }
  if (finding.title.toLowerCase().includes('facility') || finding.category.includes('medical')) {
    return EDUCATION_LIBRARY.facility_fee;
  }

  // General fallbacks
  if (finding.category === 'Hidden Fee' || finding.category === 'Fee') {
    return EDUCATION_LIBRARY.hidden_fees_general;
  }
  if (finding.category === 'Contract Risk' || finding.category === 'Clause Risk') {
    return EDUCATION_LIBRARY.reading_contracts;
  }

  return null;
}

/**
 * Get all recommended education topics based on findings.
 * Deduplicates and returns the most relevant 5 topics.
 */
export function getRecommendedEducation(findings: VerifiedFinding[]): EducationTopic[] {
  const topics = new Map<string, EducationTopic>();
  
  for (const f of findings) {
    if (f.suppressed) continue;
    const edu = getEducationForFinding(f);
    if (edu && !topics.has(edu.topic)) {
      topics.set(edu.topic, edu);
    }
  }

  return Array.from(topics.values()).slice(0, 5);
}

/**
 * Adapter wrapper for analyze.ts — accepts Finding[] and returns
 * EducationTopic[] by converting to VerifiedFinding[] shape.
 */
export function generateEducationTopics(findings: Finding[]): EducationTopic[] {
  const verified: VerifiedFinding[] = (findings ?? []).map((f: Finding) => ({
    id: f.id,
    title: f.title,
    category: f.category,
    severity: f.severity,
    confidenceScore: f.confidence_score,
    confidenceTier: 'high' as const,
    amount: f.amount,
    page: f.page,
    sectionHeading: null,
    evidenceQuote: f.evidence,
    explanation: f.explanation,
    whyItMatters: f.why_it_matters,
    recommendedAction: f.recommended_action,
    negotiationMessage: f.negotiation_message,
    negotiationStrategy: f.negotiation_strategy,
    sourceAnalyzer: 'legacy',
    evidencePresent: !!f.evidence,
    evidenceMatchScore: 1,
    verificationNotes: '',
    suppressed: false,
  }));

  return getRecommendedEducation(verified);
}
