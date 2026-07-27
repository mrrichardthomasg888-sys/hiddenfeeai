import type { VerifiedFinding, VerifiableFinding, NegotiationStrategy } from "../types.js";
import { lookupFee } from "../knowledge/feeDatabase.js";

/**
 * Enhanced Negotiation Intelligence Engine
 * 
 * Generates consumer-friendly negotiation advice:
 * - Questions to ask the company/provider
 * - Talking points for conversations
 * - Sample scripts (phone, email)
 * - Suggested alternatives
 * 
 * This is the "here's exactly what to say" layer.
 */

export interface NegotiationAdvice {
  findingId: string;
  findingTitle: string;
  negotiability: 'high' | 'medium' | 'low' | 'none';
  difficulty: 'Easy' | 'Medium' | 'Hard';
  questions: string[];
  talkingPoints: string[];
  phoneScript: string;
  emailTemplate: string;
  alternativeActions: string[];
  expectedOutcome: string;
}

/**
 * Generate full negotiation advice for a single finding.
 */
export function generateNegotiationAdvice(finding: VerifiableFinding): NegotiationAdvice {
  const knowledge = lookupFee(finding.title);

  // Determine negotiability
  let negotiability: NegotiationAdvice['negotiability'] = 'medium';
  let difficulty: NegotiationAdvice['difficulty'] = 'Medium';

  if (knowledge) {
    switch (knowledge.negotiability) {
      case 'highly_negotiable':
        negotiability = 'high';
        difficulty = 'Easy';
        break;
      case 'somewhat_negotiable':
        negotiability = 'medium';
        difficulty = 'Medium';
        break;
      case 'rarely_negotiable':
        negotiability = 'low';
        difficulty = 'Hard';
        break;
      case 'not_negotiable':
        negotiability = 'none';
        difficulty = 'Hard';
        break;
    }
  } else if (finding.negotiationStrategy) {
    difficulty = finding.negotiationStrategy.difficulty || 'Medium';
    negotiability = difficulty === 'Easy' ? 'high' : difficulty === 'Hard' ? 'low' : 'medium';
  }

  // Build questions
  const questions = knowledge?.questionsToAsk?.slice(0, 4) || buildGenericQuestions(finding);

  // Build talking points
  const talkingPoints = knowledge
    ? [
        `I understand this is listed as a "${finding.title}" for $${finding.amount || 'an undisclosed amount'}.`,
        `I would like to understand what specific service or product this fee covers.`,
        `${knowledge.negotiabilityReason}`,
        `I am comparing costs and would appreciate your best possible terms.`,
      ]
    : buildGenericTalkingPoints(finding);

  // Build scripts
  const companyName = "your provider"; // Could be extracted from document metadata
  const phoneScript = buildPhoneScript(finding, knowledge, companyName);
  const emailTemplate = buildEmailTemplate(finding, knowledge, companyName);

  // Build alternatives
  const alternativeActions = buildAlternatives(finding, knowledge);

  // Expected outcome
  const expectedOutcome = buildExpectedOutcome(finding, knowledge);

  return {
    findingId: finding.id,
    findingTitle: finding.title,
    negotiability,
    difficulty,
    questions,
    talkingPoints,
    phoneScript,
    emailTemplate,
    alternativeActions,
    expectedOutcome,
  };
}

function buildGenericQuestions(finding: VerifiableFinding): string[] {
  const base = [
    `What exactly is the "${finding.title}" for?`,
    `Is this fee mandatory or optional?`,
    `Can this be reduced, waived, or negotiated?`,
  ];

  if (finding.amount) {
    base.push(`How was the $${finding.amount} amount determined?`);
  }

  return base;
}

function buildGenericTalkingPoints(finding: VerifiableFinding): string[] {
  return [
    `I noticed a ${finding.title.toLowerCase()} on my document.`,
    `I'd like to understand what this covers and whether it can be adjusted.`,
    `I value this relationship and would like to find a mutually fair arrangement.`,
    `Can you help me understand my options regarding this charge?`,
  ];
}

function buildPhoneScript(
  finding: VerifiableFinding, 
  knowledge: ReturnType<typeof lookupFee>,
  companyName: string,
): string {
  const amountMention = finding.amount ? `I see a $${finding.amount} ${finding.title.toLowerCase()} on my document.` : `I have a question about the ${finding.title.toLowerCase()} listed on my document.`;
  const knowledgeLine = knowledge?.consumerExplanation
    ? `From my research, I understand that ${knowledge.consumerExplanation.slice(0, 150).toLowerCase()}`
    : '';

  return [
    `Hi, I'm calling about an item on my recent document from ${companyName}.`,
    '',
    amountMention,
    '',
    knowledgeLine,
    '',
    `I'd appreciate it if you could explain this charge and let me know if there's any flexibility on it. I've been a customer and would like to continue, but I'm trying to keep my costs manageable.`,
    '',
    `Is there anything you can do to help me with this?`,
  ].filter(l => l !== null).join('\n');
}

function buildEmailTemplate(
  finding: VerifiableFinding,
  knowledge: ReturnType<typeof lookupFee>,
  companyName: string,
): string {
  const amountMention = finding.amount ? `a $${finding.amount} "${finding.title}"` : `a "${finding.title}"`;
  const knowledgeLine = knowledge?.negotiabilityReason || '';

  return [
    `Subject: Question About ${finding.title} on My Account`,
    '',
    `Dear Customer Service Team,`,
    '',
    `I recently reviewed my document from ${companyName} and noticed ${amountMention} listed.`,
    '',
    `I would like to understand:`,
    `1. What specific service or product this fee covers`,
    `2. Whether this fee is mandatory or can be adjusted`,
    '3. If there are any options to reduce or remove this charge',
    '',
    knowledgeLine ? `I understand that ${knowledgeLine}` : '',
    '',
    `I value my relationship with ${companyName} and would appreciate your help clarifying this. If there is someone specific I should speak with about this, please let me know.`,
    '',
    `Thank you for your time and assistance.`,
    '',
    `Best regards,`,
    `[Your Name]`,
    `[Account Number, if available]`,
  ].filter(l => l !== null).join('\n');
}

function buildAlternatives(
  finding: VerifiableFinding,
  knowledge: ReturnType<typeof lookupFee>,
): string[] {
  const alternatives: string[] = [];

  if (finding.amount && finding.amount > 100) {
    alternatives.push(`Ask if there's a lower-tier option that removes or reduces this fee.`);
  }

  if (knowledge?.negotiability === 'highly_negotiable' || knowledge?.negotiability === 'somewhat_negotiable') {
    alternatives.push('Get competing quotes from 2-3 other providers and ask them to match.');
    alternatives.push('Ask to speak with a supervisor or retention specialist — they often have more authority to adjust fees.');
  }

  if (knowledge?.category === 'automotive_dealer') {
    alternatives.push('Contact other dealerships and ask if they charge this fee. Use their answers as leverage.');
  }

  if (knowledge?.category === 'medical') {
    alternatives.push('Ask about financial assistance, charity care, or sliding-scale payment options.');
    alternatives.push('Request an itemized bill and verify every charge against your medical records.');
  }

  if (knowledge?.isTypicallyRecurring) {
    alternatives.push(`Calculate the long-term cost: $${finding.amount || 0} per period adds up over time. Ask if there's an annual payment discount.`);
  }

  // Always include these
  alternatives.push('If unsatisfied with the response, consider filing a complaint with the Consumer Financial Protection Bureau (CFPB) or your state attorney general.');

  return alternatives.length > 0 ? alternatives : [
    'Ask for a detailed written explanation of this charge.',
    'Research whether this fee is standard in your industry.',
  ];
}

function buildExpectedOutcome(
  finding: VerifiableFinding,
  knowledge: ReturnType<typeof lookupFee>,
): string {
  if (!knowledge) {
    return 'The outcome depends on the provider\'s policies and your negotiation approach. Being polite, prepared, and persistent improves your chances.';
  }

  switch (knowledge.negotiability) {
    case 'highly_negotiable':
      return `This fee is frequently negotiated successfully. Many consumers get it reduced or removed entirely just by asking. Be direct and polite — you have a good chance of success.`;
    case 'somewhat_negotiable':
      return `This fee can sometimes be negotiated, especially if you're prepared with competing offers or have a good payment history. Success is not guaranteed, but asking costs nothing.`;
    case 'rarely_negotiable':
      return `This fee is rarely waived, but exceptions exist (hardship, loyalty, competing offers). Your best approach is to ask about any available discounts or promotions rather than directly challenging the fee.`;
    case 'not_negotiable':
      return `This fee is generally fixed, but you may have other options: shop around, bundle services, or ask about any available promotions or loyalty discounts.`;
    default:
      return 'The outcome depends on the provider\'s policies. Being informed and asking the right questions gives you the best chance.';
  }
}

/**
 * Batch-generate negotiation advice for all findings.
 */
export function generateAllAdvice(
  findings: VerifiableFinding[],
): Map<string, NegotiationAdvice> {
  const advice = new Map<string, NegotiationAdvice>();
  
  for (const finding of findings) {
    advice.set(finding.id, generateNegotiationAdvice(finding));
  }
  
  return advice;
}

/**
 * Generate a consolidated negotiation summary (for the report).
 * Combines advice from all findings into a single actionable summary.
 */
export function generateNegotiationSummary(
  adviceMap: Map<string, NegotiationAdvice>,
): {
  totalNegotiableFees: number;
  totalNegotiableAmount: number;
  easiestItems: NegotiationAdvice[];
  hardestItems: NegotiationAdvice[];
  topQuestions: string[];
  recommendedApproach: string;
} {
  const allAdvice = Array.from(adviceMap.values());
  const negotiable = allAdvice.filter(a => a.negotiability !== 'none');
  
  // Collect unique questions
  const allQuestions = new Set<string>();
  for (const a of negotiable) {
    for (const q of a.questions) {
      allQuestions.add(q);
    }
  }

  // Sort by difficulty
  const easiest = negotiable
    .filter(a => a.difficulty === 'Easy')
    .slice(0, 3);
  
  const hardest = negotiable
    .filter(a => a.difficulty === 'Hard')
    .slice(0, 3);

  const recommendedApproach = easiest.length > 0
    ? `Start with the easiest items first: ${easiest.map(e => `"${e.findingTitle}"`).join(', ')}. These are most likely to be successfully negotiated.`
    : 'Review each item carefully and prioritize those with clear consumer protections or industry standards.';

  return {
    totalNegotiableFees: negotiable.length,
    totalNegotiableAmount: 0, // Would need finding amounts summed
    easiestItems: easiest,
    hardestItems: hardest,
    topQuestions: Array.from(allQuestions).slice(0, 5),
    recommendedApproach,
  };
}