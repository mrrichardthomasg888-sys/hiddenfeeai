import type { DocumentCategory, NormalizedDocument, VerifiableFinding } from "../types.js";
import { getFeesByIndustry } from "../knowledge/feeDatabase.js";

/**
 * Industry Context Engine
 * 
 * Provides industry-specific intelligence based on document classification.
 * 
 * Different industries have different:
 * - Common hidden fees
 * - Typical negotiation strategies
 * - Red flags to watch for
 * - Consumer protection resources
 * 
 * This engine connects document type → industry patterns → actionable guidance.
 */

export interface IndustryContext {
  industry: string;
  typicalFees: string[];
  watchOutFor: string[];
  commonPractices: string;
  negotiationTips: string;
  consumerResources: string[];
  redFlags: string[];
  questionsContext: string[];
}

const INDUSTRY_PROFILES: Map<DocumentCategory, IndustryContext> = new Map();

// ═══ AUTOMOTIVE ═══

INDUSTRY_PROFILES.set('auto_purchase', {
  industry: 'Automotive Sales',
  typicalFees: [
    'Documentation fee ($75-899)',
    'Dealer preparation fee ($150-500)',
    'Market adjustment (up to $10,000+)',
    'Extended warranty ($1,000-4,000)',
    'GAP insurance ($500-900)',
    'Paint protection ($300-1,000)',
    'Anti-theft/etching ($200-500)',
    'Destination charge ($1,000-1,500)',
  ],
  watchOutFor: [
    'Dealers adding fees not disclosed in advertised price',
    'Fees described as "mandatory" that are actually negotiable',
    'Add-on products presented as required by lender',
    'Documentation fees exceeding state legal maximums',
    'Duplicate fees (e.g., dealer prep + cleaning fee)',
  ],
  commonPractices: 'Dealers often advertise low vehicle prices then add fees at closing. Many fees are profit centers, not costs. The "out-the-door" price is what matters — negotiate on total price, not monthly payment.',
  negotiationTips: 'Always negotiate the out-the-door price. Ask for all fees to be itemized. Shop at month-end or quarter-end when dealers have sales targets. Get pre-approved financing from your bank/credit union before visiting the dealer.',
  consumerResources: [
    'FTC Auto Buying Guide: https://consumer.ftc.gov/articles/buying-new-car',
    'Check state doc fee caps at your state AG website',
    'CFPB Auto Loan Resources',
  ],
  redFlags: [
    'Dealer won\'t provide itemized out-the-door price in writing',
    'Pressure to sign immediately without reviewing all fees',
    'Monthly payment quoted without disclosing loan term or interest rate',
    'Documentation fee exceeds $500',
    'Dealer claims GAP insurance is required by lender',
  ],
  questionsContext: [
    'What is the total out-the-door price including all fees?',
    'Which of these fees are required by law, and which are dealer-imposed?',
    'Can I see the invoice price and compare to your selling price?',
  ],
});

INDUSTRY_PROFILES.set('auto_lease', {
  industry: 'Auto Leasing',
  typicalFees: [
    'Acquisition fee ($595-1,095)',
    'Disposition fee ($300-500)',
    'Excess mileage charges ($0.15-0.30/mile)',
    'Excess wear-and-tear charges',
    'Lease-end purchase option fee',
    'Security deposit (up to one month\'s payment)',
  ],
  watchOutFor: [
    'Acquisition fees marked up by dealer (bank fee + dealer markup)',
    'Unrealistically low mileage allowances',
    'Vague wear-and-tear standards',
    'Early termination fees not declining over term',
  ],
  commonPractices: 'Lease fees are often less transparent than purchase fees. The acquisition fee is set by the leasing company but dealers can mark it up. Always ask for the "money factor" (lease APR) and residual value.',
  negotiationTips: 'Negotiate the vehicle price first (capitalized cost), then the money factor. Ask if the acquisition fee is the bank\'s actual fee or includes dealer markup. Consider multiple security deposits to reduce the money factor.',
  consumerResources: [
    'FTC Vehicle Leasing Guide',
    'Leasehackr Calculator for checking lease math',
  ],
  redFlags: [
    'Dealer won\'t disclose money factor or residual value',
    'Acquisition fee exceeds $1,000',
    'No early termination option or penalty equals remaining payments',
  ],
  questionsContext: [
    'What is the money factor and residual value?',
    'Is the acquisition fee the bank\'s actual fee?',
    'What are the exact wear-and-tear standards?',
  ],
});

// ═══ HOUSING ═══

INDUSTRY_PROFILES.set('apartment_lease', {
  industry: 'Rental Housing',
  typicalFees: [
    'Application fee ($25-100)',
    'Administrative/move-in fee ($100-500)',
    'Security deposit (1-2 months\' rent)',
    'Pet rent ($25-100/month)',
    'Pet deposit ($200-500)',
    'Parking fee ($25-200/month)',
    'Late rent fee (5-10% of rent)',
    'Amenity fee ($10-50/month)',
  ],
  watchOutFor: [
    'Non-refundable fees that should be deposits',
    'Administrative fees that exceed state limits',
    'Late fees exceeding 10% of monthly rent',
    '"Move-out" cleaning fees not disclosed at move-in',
    'Auto-renewal clauses with 90-day notice requirements',
  ],
  commonPractices: 'Property managers increasingly charge non-refundable admin fees on top of security deposits. Some states cap these fees. Always document the unit condition at move-in with photos.',
  negotiationTips: 'Ask for application fee to be credited toward first month\'s rent. In competitive markets, negotiate admin fees. Ask about fee waivers for longer lease terms. Always document everything in writing.',
  consumerResources: [
    'Your state\'s landlord-tenant laws (search "[state] landlord tenant act")',
    'HUD Tenant Rights: https://www.hud.gov/topics/rental_assistance/tenantrights',
    'Local tenant advocacy organizations',
  ],
  redFlags: [
    'Total move-in costs exceed 3x monthly rent',
    'Non-refundable fees without itemized explanation',
    'Lease auto-renews without reminder',
    'No grace period before late fees',
    'Daily escalating late fees',
  ],
  questionsContext: [
    'What is the total cost to move in, including all fees and deposits?',
    'Which fees are refundable vs non-refundable?',
    'Is there a grace period for late rent?',
    'What is the notice period for non-renewal?',
  ],
});

// ═══ MEDICAL ═══

INDUSTRY_PROFILES.set('medical_bill', {
  industry: 'Healthcare',
  typicalFees: [
    'Facility fee ($100-500+)',
    'Professional fee (physician services)',
    'Laboratory fees',
    'Radiology/imaging fees',
    'Medical supply charges',
    'Pharmacy charges',
    'Administrative processing fees',
  ],
  watchOutFor: [
    'Facility fees for office visits at hospital-owned practices',
    'Out-of-network charges at in-network facilities',
    'Duplicate billing for the same service',
    'Charges for supplies you didn\'t receive',
    'Upcoding (billing for more complex service than provided)',
    'Balance billing beyond insurance agreement',
  ],
  commonPractices: 'Hospital billing is notoriously complex. Fees are often "chargemaster" rates that are far higher than actual negotiated rates. Always request an itemized bill and compare to your Explanation of Benefits (EOB).',
  negotiationTips: 'Request an itemized bill. Compare charges to fair market rates (Healthcare Bluebook, FAIR Health). Ask about financial assistance/charity care policies. Many hospitals will settle for 30-50% of the billed amount for uninsured patients.',
  consumerResources: [
    'Healthcare Bluebook: https://www.healthcarebluebook.com',
    'FAIR Health Consumer: https://www.fairhealthconsumer.org',
    'Your hospital\'s financial assistance policy (required by law)',
    'Patient Advocate Foundation: https://www.patientadvocate.org',
  ],
  redFlags: [
    'Facility fee for telehealth or office visit',
    'Charges not matching EOB from insurance',
    'No itemized bill available upon request',
    'Threats of collections while bill is being disputed',
    'Upcoding (CPT code doesn\'t match services received)',
  ],
  questionsContext: [
    'Can I receive an itemized bill with all CPT codes?',
    'Why is there a facility fee for an office visit?',
    'Do you offer financial assistance or sliding-scale payments?',
    'Can we review each charge together?',
  ],
});

// ═══ SUBSCRIPTIONS ═══

INDUSTRY_PROFILES.set('subscription', {
  industry: 'Subscription Services',
  typicalFees: [
    'Monthly/annual subscription fee',
    'Setup/activation fee ($50-500)',
    'Per-user license fees ($10-100/user/month)',
    'Premium support fees ($50-200/month)',
    'Data migration fees ($500-5,000)',
    'Cancellation/early termination fees',
    'Overage fees (data, API calls, etc.)',
  ],
  watchOutFor: [
    'Auto-renewal with long notice periods (60-90 days)',
    'Price escalation clauses (up to 15% annually)',
    'Cancellation fees equal to remaining contract value',
    'Hidden per-user minimums',
    'Data export fees on contract termination',
  ],
  commonPractices: 'SaaS companies use auto-renewal and long cancellation notice periods to lock in customers. Setup fees are often waived for annual commitments. Always negotiate before signing, not at renewal.',
  negotiationTips: 'Ask for setup fee waiver. Propose annual billing for 10-20% discount. Request a 30-day opt-out clause. Ask about startup/nonprofit/educational discounts. Get all promises in writing.',
  consumerResources: [
    'FTC guidance on auto-renewal laws',
    'Your state\'s automatic renewal law (many states require clear disclosure)',
  ],
  redFlags: [
    'Cancellation requires 90+ days notice',
    'Price can increase by more than 10% annually',
    'No opt-out or early termination provision',
    'Data inaccessible after cancellation',
  ],
  questionsContext: [
    'Can the setup fee be waived?',
    'What is the cancellation process and notice period?',
    'How much notice is given before price increases?',
    'What happens to my data if I cancel?',
  ],
});

// ═══ UTILITIES ═══

INDUSTRY_PROFILES.set('utility_bill', {
  industry: 'Utilities / Telecom',
  typicalFees: [
    'Administrative fee ($1-5/month)',
    'Regulatory recovery fee ($1-5/month)',
    'Universal service charge',
    'Equipment rental fee ($5-15/month)',
    'Installation/activation fee ($25-100)',
    'Late payment fee',
    'Restoration/reconnection fee',
    'Paper billing fee ($2-5/month)',
  ],
  watchOutFor: [
    'Fees that sound like taxes but aren\'t (regulatory recovery, admin fee)',
    'Equipment rental fees that exceed equipment cost over time',
    'Add-on services you didn\'t request (device protection, cloud storage)',
    'Promotional rates expiring without clear notice',
  ],
  commonPractices: 'Telecom companies separate mandatory costs into "fees" and "surcharges" to advertise lower base prices. These fees are actually part of the cost of service. Equipment fees often exceed the device\'s value over 12-24 months.',
  negotiationTips: 'Call and ask for current promotions. Threaten to switch providers (retention departments have best offers). Buy your own equipment instead of renting. Switch to paperless billing to avoid paper fees.',
  consumerResources: [
    'FCC Consumer Complaints: https://consumercomplaints.fcc.gov',
    'Your state\'s Public Utilities Commission',
  ],
  redFlags: [
    'Equipment rental fee after device is paid off',
    'Fees labeled as government charges that aren\'t',
    'Promotional rate expiration buried in fine print',
    'Automatic service additions without consent ("cramming")',
  ],
  questionsContext: [
    'Is this fee a government charge or a company charge?',
    'Can I use my own equipment instead of renting?',
    'What is the all-in monthly price including all fees?',
    'When does my promotional rate expire?',
  ],
});

// Default profile for unknown document types
const DEFAULT_CONTEXT: IndustryContext = {
  industry: 'General Consumer',
  typicalFees: ['Processing fees', 'Service charges', 'Administrative fees'],
  watchOutFor: ['Fees not clearly explained', 'Charges that seem excessive compared to the base price'],
  commonPractices: 'Review all fees carefully. Compare total cost to similar products or services.',
  negotiationTips: 'Ask for an itemized breakdown of all charges. Question any fee that isn\'t clearly explained.',
  consumerResources: [
    'CFPB: https://www.consumerfinance.gov',
    'FTC Consumer Information: https://consumer.ftc.gov',
  ],
  redFlags: ['Vague fee descriptions', 'Total price significantly higher than quoted price'],
  questionsContext: ['Can you explain each fee on this document?', 'Which fees are mandatory and which are optional?'],
};

/**
 * Get industry-specific context for a document category.
 */
export function getIndustryContext(category: DocumentCategory): IndustryContext {
  return INDUSTRY_PROFILES.get(category) || DEFAULT_CONTEXT;
}

/**
 * Get industry-specific fee patterns to guide the analyzers.
 */
export function getIndustryFeePatterns(category: DocumentCategory): string[] {
  const context = getIndustryContext(category);
  return context.typicalFees;
}

/**
 * Apply industry context to findings — enriches each finding with
 * industry-specific explanations when the fee database doesn't have an exact match.
 */
export function enrichWithIndustryContext(
  findings: VerifiableFinding[],
  category: DocumentCategory,
): VerifiableFinding[] {
  const context = getIndustryContext(category);

  return findings.map(finding => {
    // Check if this finding matches any industry-specific red flags
    const matchingRedFlags = context.redFlags.filter(flag =>
      finding.explanation.toLowerCase().includes(flag.toLowerCase()) ||
      finding.title.toLowerCase().includes(flag.toLowerCase())
    );

    // If matching red flags found, add industry context to the explanation
    if (matchingRedFlags.length > 0 && !finding.explanation.includes('Industry context:')) {
      const enrichedExplanation = finding.explanation +
        `\n\nIndustry context: In the ${context.industry.toLowerCase()} industry, this pattern is commonly observed. ` +
        context.commonPractices;

      return {
        ...finding,
        explanation: enrichedExplanation,
      };
    }

    return finding;
  });
}

/**
 * Get actionable guidance for a specific finding in industry context.
 */
export function getActionableGuidance(
  finding: VerifiableFinding,
  category: DocumentCategory,
): string {
  const context = getIndustryContext(category);

  // Check if this is a fee-specific finding
  if (finding.category === 'Hidden Fee' || finding.category === 'Fee') {
    return `For ${context.industry.toLowerCase()} documents: ${context.negotiationTips}`;
  }

  // Check if this is a contract risk
  if (finding.category === 'Contract Risk' || finding.category === 'Clause Risk') {
    const relevantFlags = context.redFlags.slice(0, 3);
    return `In ${context.industry.toLowerCase()} agreements, watch for: ${relevantFlags.join('; ')}`;
  }

  return context.negotiationTips;
}