import type { VerifiedFinding } from "../types.js";
import { lookupFee } from "../knowledge/feeDatabase.js";

/**
 * Consumer Action Plan Engine
 * 
 * Generates a timeline-based action plan:
 * - Before signing/committing
 * - During negotiation
 * - After signing
 * - Ongoing monitoring
 */

export interface ActionPlan {
  beforeSigning: ActionItem[];
  negotiationSteps: ActionItem[];
  afterSigning: ActionItem[];
  ongoingMonitoring: ActionItem[];
  checklist: string[];
}

export interface ActionItem {
  step: string;
  detail: string;
  urgency: 'immediate' | 'soon' | 'when_convenient';
}

export function generateActionPlan(
  findings: VerifiedFinding[],
  documentType: string = 'document',
): ActionPlan {
  const active = findings.filter(f => !f.suppressed);
  const critical = active.filter(f => f.severity === 'Critical');
  const high = active.filter(f => f.severity === 'High');
  const feeFindings = active.filter(f => f.amount && f.amount > 0);

  return {
    beforeSigning: buildBeforeSigning(active, critical, documentType),
    negotiationSteps: buildNegotiationSteps(active, feeFindings, documentType),
    afterSigning: buildAfterSigning(active, documentType),
    ongoingMonitoring: buildOngoing(active, documentType),
    checklist: buildChecklist(active, documentType),
  };
}

function buildBeforeSigning(
  findings: VerifiedFinding[],
  critical: VerifiedFinding[],
  docType: string,
): ActionItem[] {
  const items: ActionItem[] = [];

  if (critical.length > 0) {
    items.push({
      step: 'Address critical concerns immediately',
      detail: `You have ${critical.length} critical finding(s) that should be resolved before signing: ${critical.map(f => f.title).join(', ')}.`,
      urgency: 'immediate',
    });
  }

  const arbitration = findings.find(f => f.evidenceQuote.toLowerCase().includes('arbitration'));
  if (arbitration) {
    items.push({
      step: 'Review arbitration clause',
      detail: 'This document requires binding arbitration. You may be waiving your right to sue or join a class action. Check for an opt-out provision.',
      urgency: 'immediate',
    });
  }

  const autoRenew = findings.find(f => f.evidenceQuote.toLowerCase().includes('renew') || f.title.toLowerCase().includes('renew'));
  if (autoRenew) {
    items.push({
      step: 'Understand auto-renewal terms',
      detail: 'This agreement auto-renews. Set a calendar reminder for the cancellation deadline so you don\'t get charged for another term.',
      urgency: 'soon',
    });
  }

  items.push({
    step: 'Get everything in writing',
    detail: 'Request an itemized breakdown of all fees and charges before committing. Verbal promises may not be enforceable.',
    urgency: 'immediate',
  });

  items.push({
    step: 'Compare with alternatives',
    detail: `Get at least 2-3 competing quotes or review alternatives before committing to this ${docType}.`,
    urgency: 'soon',
  });

  return items;
}

function buildNegotiationSteps(
  findings: VerifiedFinding[],
  feeFindings: VerifiedFinding[],
  docType: string,
): ActionItem[] {
  const items: ActionItem[] = [];

  // Highly negotiable fees first
  const negotiable = feeFindings.filter(f => {
    const k = lookupFee(f.title);
    return k?.negotiability === 'highly_negotiable' || k?.negotiability === 'somewhat_negotiable';
  });

  if (negotiable.length > 0) {
    const easyOnes = negotiable.filter(f => {
      const k = lookupFee(f.title);
      return k?.negotiability === 'highly_negotiable';
    });

    if (easyOnes.length > 0) {
      items.push({
        step: 'Negotiate the easiest items first',
        detail: `Start with: ${easyOnes.map(f => f.title).join(', ')}. These are most likely to be successfully reduced or removed.`,
        urgency: 'immediate',
      });
    }

    items.push({
      step: 'Prepare your talking points',
      detail: 'Research industry-standard fees. Know what competitors charge. Be polite but firm. Ask open-ended questions.',
      urgency: 'soon',
    });
  }

  items.push({
    step: 'Ask about all fees',
    detail: `For each fee: "Is this mandatory? What service does it cover? Can it be reduced?" Don't accept vague answers.`,
    urgency: 'soon',
  });

  items.push({
    step: 'Escalate if needed',
    detail: 'If the first person can\'t help, politely ask to speak with a supervisor or retention specialist who may have more authority.',
    urgency: 'when_convenient',
  });

  return items;
}

function buildAfterSigning(
  findings: VerifiedFinding[],
  docType: string,
): ActionItem[] {
  const items: ActionItem[] = [];

  items.push({
    step: 'Save all documentation',
    detail: `Keep a copy of the signed ${docType}, this analysis report, and all correspondence. You may need these if disputes arise.`,
    urgency: 'immediate',
  });

  const recurring = findings.filter(f => 
    f.explanation.toLowerCase().includes('recurring') || 
    f.explanation.toLowerCase().includes('monthly')
  );
  if (recurring.length > 0) {
    items.push({
      step: 'Monitor recurring charges',
      detail: `Watch your bills for ${recurring.length} potentially recurring items. Set a reminder to review after the first billing cycle.`,
      urgency: 'soon',
    });
  }

  items.push({
    step: 'Check your first bill carefully',
    detail: 'The first bill after signing is critical — verify every charge matches what was agreed to. Dispute discrepancies immediately.',
    urgency: 'soon',
  });

  return items;
}

function buildOngoing(
  findings: VerifiedFinding[],
  docType: string,
): ActionItem[] {
  const items: ActionItem[] = [];

  const renewals = findings.filter(f => 
    f.title.toLowerCase().includes('renew') || 
    f.evidenceQuote.toLowerCase().includes('renew')
  );
  if (renewals.length > 0) {
    items.push({
      step: 'Set cancellation reminders',
      detail: 'Put a reminder on your calendar 90 days before any renewal deadlines. Auto-renewal can be costly if you forget.',
      urgency: 'soon',
    });
  }

  items.push({
    step: 'Periodically review terms',
    detail: `Companies can change terms. Review your ${docType} annually and compare to current market rates.`,
    urgency: 'when_convenient',
  });

  items.push({
    step: 'Know your rights',
    detail: 'Familiarize yourself with consumer protection resources: CFPB (consumerfinance.gov), FTC (ftc.gov), and your state attorney general\'s office.',
    urgency: 'when_convenient',
  });

  return items;
}

function buildChecklist(
  findings: VerifiedFinding[],
  docType: string,
): string[] {
  return [
    '☐ Read every page — don\'t skip the fine print',
    '☐ Itemize all fees and ask about each one',
    '☐ Get competing quotes before committing',
    '☐ Confirm cancellation/termination terms in writing',
    '☐ Check for arbitration and auto-renewal clauses',
    '☐ Save a copy of everything you sign',
    '☐ Set calendar reminders for renewal deadlines',
    '☐ Review your first bill carefully',
    '☐ Report unfair practices to the CFPB or FTC',
  ];
}