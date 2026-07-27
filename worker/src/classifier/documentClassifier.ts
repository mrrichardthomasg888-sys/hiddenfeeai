import type { StructuredDocument, DocumentCategory } from "../types.js";

/**
 * Document Classifier
 * 
 * Classifies documents into 30+ consumer document categories.
 * Uses keyword matching + structural pattern detection (no AI required).
 * 
 * Why pre-classify?
 * - Different document types have DIFFERENT hidden fee patterns
 * - Auto purchase contracts → look for dealer fees, doc fees
 * - Medical bills → look for facility fees, coding errors
 * - Apartment leases → look for hidden maintenance charges
 * - Classification guides the specialized analyzers on WHAT to look for
 * 
 * Two-tier approach:
 * 1. Fast keyword matching (sub-millisecond, runs first)
 * 2. AI confirmation for low-confidence classifications
 */

// ─── Classification profile ───

interface ClassificationProfile {
  category: DocumentCategory;
  displayName: string;
  /** Keywords that strongly indicate this document type */
  strongKeywords: string[];
  /** Keywords that weakly indicate (used as tiebreakers) */
  weakKeywords: string[];
  /** Typical fee patterns for this document type */
  typicalFees: string[];
  /** Sections/patterns we expect to find */
  expectedSections: string[];
  /** Priority for keyword matching (higher = checked first) */
  priority: number;
}

/**
 * Classification profiles.
 * ============================================================
 * EXTEND: Add new profiles as more document types are needed.
 * Each profile teaches the classifier what to look for.
 * ============================================================
 */
const PROFILES: ClassificationProfile[] = [
  // ── AUTO DOCUMENTS ──
  {
    category: 'auto_purchase',
    displayName: 'Auto Purchase Contract',
    strongKeywords: [
      'vehicle purchase agreement', 'motor vehicle purchase', 'car purchase',
      'retail installment sale', 'buyer\'s order', 'vehicle buyer\'s order',
      'motor vehicle retail installment', 'auto sales contract',
    ],
    weakKeywords: ['vin', 'vehicle identification', 'odometer', 'make:', 'model:', 'year:', 'msrp'],
    typicalFees: ['documentation fee', 'dealer fee', 'processing fee', 'destination charge', 'dealer prep'],
    expectedSections: ['buyer information', 'vehicle description', 'itemization of amount financed', 'federal truth-in-lending'],
    priority: 10,
  },
  {
    category: 'auto_finance',
    displayName: 'Auto Finance Agreement',
    strongKeywords: [
      'retail installment contract', 'finance agreement', 'auto loan', 'vehicle loan',
      'simple interest', 'annual percentage rate', 'finance charge',
      'truth in lending', 'tila disclosure',
    ],
    weakKeywords: ['apr', 'interest rate', 'monthly payment', 'term:', 'amount financed', 'total of payments'],
    typicalFees: ['origination fee', 'gap insurance', 'credit life', 'service contract', 'extended warranty'],
    expectedSections: ['truth-in-lending disclosures', 'itemization of amount financed', 'payment schedule'],
    priority: 10,
  },
  {
    category: 'auto_lease',
    displayName: 'Auto Lease Agreement',
    strongKeywords: [
      'motor vehicle lease', 'closed-end lease', 'lease agreement', 'vehicle lease',
      'lease term', 'residual value', 'capitalized cost', 'money factor',
    ],
    weakKeywords: ['lease', 'lessee', 'lessor', 'mileage allowance', 'excess wear', 'disposition fee'],
    typicalFees: ['acquisition fee', 'disposition fee', 'excess mileage', 'wear and tear', 'lease-end fee'],
    expectedSections: ['lease terms', 'mileage allowance', 'early termination', 'excess wear and use'],
    priority: 10,
  },

  // ── HOUSING ──
  {
    category: 'apartment_lease',
    displayName: 'Apartment Lease',
    strongKeywords: [
      'residential lease', 'apartment lease', 'rental agreement', 'lease agreement',
      'landlord', 'tenant', 'security deposit', 'rental unit',
    ],
    weakKeywords: ['rent', 'premises', 'dwelling', 'unit', 'occupancy', 'sublease', 'eviction'],
    typicalFees: ['application fee', 'pet rent', 'parking fee', 'amenity fee', 'late rent fee', 'cleaning fee'],
    expectedSections: ['term', 'rent', 'security deposit', 'utilities', 'maintenance'],
    priority: 9,
  },
  {
    category: 'rental_agreement',
    displayName: 'Rental Agreement',
    strongKeywords: ['rental agreement', 'short-term rental', 'vacation rental', 'rental contract'],
    weakKeywords: ['rent', 'deposit', 'check-in', 'check-out', 'cleaning', 'host'],
    typicalFees: ['cleaning fee', 'service fee', 'damage deposit', 'booking fee'],
    expectedSections: ['booking details', 'house rules', 'cancellation policy'],
    priority: 8,
  },
  {
    category: 'mortgage',
    displayName: 'Mortgage Document',
    strongKeywords: [
      'mortgage', 'deed of trust', 'promissory note', 'loan estimate',
      'closing disclosure', 'settlement statement', 'hud-1',
    ],
    weakKeywords: ['lender', 'borrower', 'escrow', 'principal', 'interest', 'pmi', 'origination'],
    typicalFees: ['origination fee', 'underwriting fee', 'appraisal fee', 'title insurance', 'recording fee', 'points'],
    expectedSections: ['loan terms', 'projected payments', 'closing cost details', 'loan costs'],
    priority: 9,
  },

  // ── FINANCIAL ──
  {
    category: 'loan_agreement',
    displayName: 'Loan Agreement',
    strongKeywords: ['loan agreement', 'promissory note', 'personal loan', 'lending agreement'],
    weakKeywords: ['borrower', 'lender', 'principal', 'interest rate', 'repayment', 'installment', 'origination'],
    typicalFees: ['origination fee', 'late payment fee', 'prepayment penalty', 'returned payment fee'],
    expectedSections: ['promise to pay', 'payment', 'interest', 'default', 'prepayment'],
    priority: 8,
  },
  {
    category: 'credit_card',
    displayName: 'Credit Card Agreement',
    strongKeywords: [
      'credit card', 'cardholder agreement', 'cardmember agreement', 'credit card disclosure',
      'schumer box', 'terms and conditions of the card',
    ],
    weakKeywords: ['apr', 'annual fee', 'balance transfer', 'cash advance', 'credit limit', 'minimum payment'],
    typicalFees: ['annual fee', 'late payment fee', 'returned payment fee', 'balance transfer fee', 'foreign transaction fee', 'cash advance fee'],
    expectedSections: ['interest rates', 'fees', 'billing rights', 'rewards'],
    priority: 8,
  },
  {
    category: 'bank_statement',
    displayName: 'Bank Statement',
    strongKeywords: ['bank statement', 'account statement', 'statement of account', 'checking account', 'savings account'],
    weakKeywords: ['balance', 'deposit', 'withdrawal', 'transaction', 'ending balance', 'fees this period'],
    typicalFees: ['monthly maintenance fee', 'overdraft fee', 'atm fee', 'wire transfer fee', 'foreign transaction fee'],
    expectedSections: ['account summary', 'deposits', 'withdrawals', 'fees'],
    priority: 7,
  },

  // ── BILLS ──
  {
    category: 'utility_bill',
    displayName: 'Utility Bill',
    strongKeywords: ['utility bill', 'electric bill', 'gas bill', 'water bill', 'utility statement', 'power bill'],
    weakKeywords: ['kwh', 'therm', 'gallon', 'usage', 'meter', 'reading', 'service period'],
    typicalFees: ['service charge', 'delivery charge', 'fuel adjustment', 'franchise fee', 'late payment charge'],
    expectedSections: ['account summary', 'usage', 'charges', 'total due'],
    priority: 7,
  },
  {
    category: 'medical_bill',
    displayName: 'Medical Bill',
    strongKeywords: [
      'medical bill', 'hospital bill', 'physician bill', 'statement of services',
      'explanation of benefits', 'eob', 'patient responsibility',
    ],
    weakKeywords: ['cpt', 'icd', 'diagnosis', 'procedure', 'copay', 'deductible', 'coinsurance', 'provider'],
    typicalFees: ['facility fee', 'professional fee', 'supply charge', 'pharmacy charge', 'lab fee'],
    expectedSections: ['patient information', 'services', 'charges', 'insurance payments', 'patient balance'],
    priority: 8,
  },
  {
    category: 'insurance_policy',
    displayName: 'Insurance Policy',
    strongKeywords: ['insurance policy', 'policy declaration', 'coverage', 'premium', 'deductible', 'endorsement'],
    weakKeywords: ['insured', 'insurer', 'beneficiary', 'claim', 'coverage limit', 'exclusion', 'rider'],
    typicalFees: ['policy fee', 'processing fee', 'installment fee', 'late fee', 'reinstatement fee'],
    expectedSections: ['declarations', 'coverages', 'exclusions', 'conditions', 'premium'],
    priority: 8,
  },

  // ── CONTRACTS ──
  {
    category: 'subscription',
    displayName: 'Subscription Agreement',
    strongKeywords: ['subscription', 'membership', 'recurring billing', 'auto-renewal', 'subscription terms'],
    weakKeywords: ['monthly', 'annual', 'billing cycle', 'cancel anytime', 'free trial', 'renewal'],
    typicalFees: ['subscription fee', 'activation fee', 'cancellation fee', 'upgrade fee'],
    expectedSections: ['subscription terms', 'billing', 'cancellation', 'auto-renewal'],
    priority: 7,
  },
  {
    category: 'membership',
    displayName: 'Membership Agreement',
    strongKeywords: ['membership agreement', 'club membership', 'gym membership', 'membership terms'],
    weakKeywords: ['member', 'initiation', 'dues', 'facility', 'access', 'guest'],
    typicalFees: ['initiation fee', 'monthly dues', 'annual fee', 'cancellation fee', 'freeze fee'],
    expectedSections: ['membership', 'dues and fees', 'cancellation', 'rules'],
    priority: 7,
  },
  {
    category: 'employment_contract',
    displayName: 'Employment Contract',
    strongKeywords: ['employment agreement', 'offer letter', 'employment contract', 'compensation agreement'],
    weakKeywords: ['salary', 'benefits', 'non-compete', 'severance', 'start date', 'position'],
    typicalFees: [],
    expectedSections: ['position', 'compensation', 'benefits', 'termination', 'confidentiality'],
    priority: 7,
  },
  {
    category: 'construction_contract',
    displayName: 'Construction Contract',
    strongKeywords: ['construction contract', 'building contract', 'home improvement', 'renovation agreement', 'contractor agreement'],
    weakKeywords: ['contractor', 'subcontractor', 'materials', 'labor', 'scope of work', 'change order', 'lien'],
    typicalFees: ['change order fee', 'permit fee', 'inspection fee', 'material markup'],
    expectedSections: ['scope of work', 'payment schedule', 'change orders', 'warranty'],
    priority: 7,
  },

  // ── COMMERCE ──
  {
    category: 'invoice',
    displayName: 'Invoice',
    strongKeywords: ['invoice', 'bill', 'statement', 'due', 'balance due'],
    weakKeywords: ['invoice #', 'bill to', 'due date', 'net', 'terms', 'quantity', 'unit price', 'subtotal'],
    typicalFees: ['shipping', 'handling', 'processing', 'convenience fee'],
    expectedSections: ['bill to', 'items', 'subtotal', 'tax', 'total'],
    priority: 6,
  },
  {
    category: 'receipt',
    displayName: 'Receipt',
    strongKeywords: ['receipt', 'proof of purchase', 'payment confirmation', 'transaction receipt'],
    weakKeywords: ['thank you', 'order #', 'transaction #', 'payment method', 'authorization'],
    typicalFees: ['service charge', 'gratuity', 'convenience fee'],
    expectedSections: ['items purchased', 'total', 'payment'],
    priority: 6,
  },
  {
    category: 'estimate',
    displayName: 'Estimate / Quote',
    strongKeywords: ['estimate', 'quote', 'quotation', 'proposal', 'not a bill'],
    weakKeywords: ['estimated', 'approximate', 'estimate #', 'valid until', 'subject to change'],
    typicalFees: ['estimate fee', 'consultation fee', 'travel charge'],
    expectedSections: ['scope', 'estimated cost', 'terms', 'validity'],
    priority: 6,
  },
  {
    category: 'purchase_agreement',
    displayName: 'Purchase Agreement',
    strongKeywords: ['purchase agreement', 'sales agreement', 'bill of sale', 'sales contract', 'purchase and sale'],
    weakKeywords: ['buyer', 'seller', 'purchase price', 'closing date', 'contingency', 'earnest money'],
    typicalFees: ['escrow fee', 'title fee', 'transfer tax', 'closing fee'],
    expectedSections: ['purchase price', 'closing', 'contingencies', 'disclosures'],
    priority: 8,
  },

  // ── TECH / TELECOM ──
  {
    category: 'cell_phone',
    displayName: 'Cell Phone Contract',
    strongKeywords: ['wireless', 'cellular', 'mobile service', 'phone plan', 'device payment', 'carrier agreement'],
    weakKeywords: ['data', 'talk', 'text', 'line', 'device', 'upgrade', 'coverage'],
    typicalFees: ['activation fee', 'upgrade fee', 'late fee', 'restocking fee', 'administrative fee', 'regulatory recovery fee'],
    expectedSections: ['plan details', 'device payments', 'fees', 'terms'],
    priority: 7,
  },
  {
    category: 'internet_service',
    displayName: 'Internet Service Agreement',
    strongKeywords: ['internet service', 'broadband', 'fiber', 'dsl', 'isp agreement'],
    weakKeywords: ['bandwidth', 'speed', 'data cap', 'modem', 'router', 'installation'],
    typicalFees: ['installation fee', 'equipment rental', 'modem fee', 'data overage', 'early termination fee'],
    expectedSections: ['service', 'speed', 'pricing', 'equipment', 'terms'],
    priority: 7,
  },
  {
    category: 'cable_agreement',
    displayName: 'Cable TV Agreement',
    strongKeywords: ['cable tv', 'television service', 'satellite tv', 'tv package'],
    weakKeywords: ['channel', 'package', 'broadcast', 'dvr', 'hd', 'premium'],
    typicalFees: ['broadcast tv fee', 'regional sports fee', 'hd technology fee', 'dvr fee', 'equipment fee'],
    expectedSections: ['packages', 'pricing', 'equipment', 'terms'],
    priority: 7,
  },

  // ── TRAVEL ──
  {
    category: 'travel_booking',
    displayName: 'Travel Booking',
    strongKeywords: ['booking confirmation', 'travel itinerary', 'reservation', 'flight booking', 'hotel reservation'],
    weakKeywords: ['confirmation #', 'booking #', 'itinerary', 'departure', 'arrival', 'passenger'],
    typicalFees: ['booking fee', 'service fee', 'resort fee', 'fuel surcharge', 'baggage fee'],
    expectedSections: ['booking details', 'passenger', 'payment', 'cancellation policy'],
    priority: 7,
  },
  {
    category: 'hotel_invoice',
    displayName: 'Hotel Invoice',
    strongKeywords: ['hotel invoice', 'folio', 'hotel bill', 'lodging receipt', 'guest receipt'],
    weakKeywords: ['room charge', 'check-in', 'check-out', 'room rate', 'occupancy tax'],
    typicalFees: ['resort fee', 'parking fee', 'wi-fi fee', 'destination fee', 'tourism fee', 'minibar'],
    expectedSections: ['room charges', 'taxes', 'fees', 'total'],
    priority: 7,
  },
  {
    category: 'airline_receipt',
    displayName: 'Airline Receipt',
    strongKeywords: ['e-ticket', 'airline receipt', 'flight receipt', 'ticket receipt', 'passenger receipt'],
    weakKeywords: ['flight', 'airline', 'passenger', 'ticket #', 'booking reference', 'pnr'],
    typicalFees: ['fuel surcharge', 'security fee', 'airport fee', 'baggage fee', 'seat selection fee', 'change fee'],
    expectedSections: ['itinerary', 'fare breakdown', 'taxes and fees', 'total'],
    priority: 7,
  },

  // ── GOVERNMENT ──
  {
    category: 'government_form',
    displayName: 'Government Form',
    strongKeywords: ['form w-', 'form 10', 'tax form', 'government form', 'irs', 'official form'],
    weakKeywords: ['department of', 'agency', 'omb #', 'expiration date'],
    typicalFees: ['filing fee', 'processing fee', 'expedite fee'],
    expectedSections: [],
    priority: 6,
  },
  {
    category: 'tax_document',
    displayName: 'Tax Document',
    strongKeywords: ['tax return', 'tax assessment', 'property tax', 'tax bill', 'tax statement'],
    weakKeywords: ['tax year', 'assessment', 'appraised value', 'mill rate', 'exemption'],
    typicalFees: ['penalty', 'interest', 'late filing fee', 'processing fee'],
    expectedSections: ['property description', 'assessed value', 'tax calculation', 'payment'],
    priority: 6,
  },

  // ── TERMS / WARRANTY ──
  {
    category: 'terms_of_service',
    displayName: 'Terms of Service',
    strongKeywords: ['terms of service', 'terms and conditions', 'terms of use', 'user agreement', 'acceptable use'],
    weakKeywords: ['agree to', 'by using', 'you acknowledge', 'we reserve', 'prohibited'],
    typicalFees: [],
    expectedSections: ['acceptance', 'account', 'termination', 'liability', 'disputes'],
    priority: 5,
  },
  {
    category: 'warranty',
    displayName: 'Warranty Document',
    strongKeywords: ['warranty', 'limited warranty', 'extended warranty', 'warranty coverage', 'service contract'],
    weakKeywords: ['coverage', 'defect', 'repair', 'replace', 'exclusion', 'duration', 'transferable'],
    typicalFees: ['deductible', 'service fee', 'transfer fee'],
    expectedSections: ['what is covered', 'what is not covered', 'duration', 'how to get service'],
    priority: 6,
  },
];

// ─── Classifier ───

interface ClassificationResult {
  category: DocumentCategory;
  displayName: string;
  confidence: number; // 0-100
  matchedKeywords: string[];
  matchedSections: string[];
  runnerUp?: { category: DocumentCategory; displayName: string; confidence: number };
  notes: string[];
}

/**
 * Classify a structured document into one of 30+ consumer document categories.
 * 
 * How it works:
 * 1. Extract document text (first 50KB)
 * 2. Score every profile against the text
 * 3. Return the highest-scoring match with confidence
 * 4. If confidence < 50%, return 'unknown'
 */
export function classifyDocument(doc: StructuredDocument): ClassificationResult {
  const text = [
    doc.markdown.slice(0, 50000),
    ...doc.elements.map(e => e.content),
    ...doc.tables.map(t => [t.caption ?? '', t.headers.join(' '), ...t.rows.flat()].join(' ')),
  ].join(' ').toLowerCase();

  const scores: Array<{
    profile: ClassificationProfile;
    score: number;
    strongHits: string[];
    weakHits: string[];
    sectionsFound: string[];
  }> = [];

  for (const profile of PROFILES) {
    let score = 0;
    const strongHits: string[] = [];
    const weakHits: string[] = [];

    // Strong keyword matches (high weight)
    for (const kw of profile.strongKeywords) {
      if (text.includes(kw.toLowerCase())) {
        score += 15;
        strongHits.push(kw);
      }
    }

    // Weak keyword matches (lower weight)
    for (const kw of profile.weakKeywords) {
      if (text.includes(kw.toLowerCase())) {
        score += 3;
        weakHits.push(kw);
      }
    }

    // Section pattern matching
    const sectionsFound: string[] = [];
    for (const section of profile.expectedSections) {
      if (text.includes(section.toLowerCase())) {
        score += 5;
        sectionsFound.push(section);
      }
    }

    // Priority bonus
    score += profile.priority;

    scores.push({ profile, score, strongHits, weakHits, sectionsFound });
  }

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);

  if (scores.length === 0 || scores[0].score < 10) {
    return {
      category: 'unknown',
      displayName: 'Unknown Document Type',
      confidence: 0,
      matchedKeywords: [],
      matchedSections: [],
      notes: ['No matching document profile found. This is an unfamiliar document type.'],
    };
  }

  const top = scores[0];
  const runnerUp = scores.length > 1 ? scores[1] : undefined;

  // Calculate confidence:
  // - Multiple strong hits = high confidence
  // - Only weak hits = moderate confidence
  // - Scores within 20% of each other = reduced confidence (tie)
  const hasMultipleStrongHits = top.strongHits.length >= 2;
  const hasSections = top.sectionsFound.length >= 1;
  const runnerUpClose = runnerUp && (runnerUp.score / top.score > 0.8);
  
  let confidence = 0;
  if (hasMultipleStrongHits && hasSections) {
    confidence = 90; // Very confident
  } else if (hasMultipleStrongHits) {
    confidence = 80;
  } else if (top.strongHits.length === 1 && hasSections) {
    confidence = 75;
  } else if (top.strongHits.length === 1) {
    confidence = 65;
  } else if (top.weakHits.length >= 5) {
    confidence = 55;
  } else if (top.weakHits.length >= 3) {
    confidence = 45;
  } else {
    confidence = 30;
  }

  // Reduce confidence if runner-up is close
  if (runnerUpClose) {
    confidence = Math.min(confidence, 60);
  }

  // Cap at 100
  confidence = Math.min(100, confidence);

  const notes: string[] = [];
  if (confidence < 60) {
    notes.push('Low confidence classification. AI confirmation recommended.');
  }
  if (runnerUpClose) {
    notes.push(`Close runner-up: ${runnerUp?.profile.displayName} (score: ${runnerUp?.score} vs ${top.score})`);
  }
  if (top.profile.category === 'unknown') {
    notes.push('Document does not match any known consumer document type.');
  }

  return {
    category: confidence >= 50 ? top.profile.category : 'unknown',
    displayName: top.profile.displayName,
    confidence,
    matchedKeywords: [...top.strongHits, ...top.weakHits.slice(0, 5)],
    matchedSections: top.sectionsFound,
    runnerUp: runnerUp ? {
      category: runnerUp.profile.category,
      displayName: runnerUp.profile.displayName,
      confidence: Math.round(runnerUp.score / Math.max(top.score, 1) * 50),
    } : undefined,
    notes,
  };
}

/**
 * Get expected fee categories for a document type.
 * Tells analyzers WHAT to look for specifically.
 */
export function getExpectedFees(category: DocumentCategory): string[] {
  const profile = PROFILES.find(p => p.category === category);
  return profile?.typicalFees ?? [];
}

/**
 * Get the display name for a document category.
 */
export function getCategoryDisplayName(category: DocumentCategory): string {
  const profile = PROFILES.find(p => p.category === category);
  return profile?.displayName ?? 'Unknown Document';
}

/**
 * Check if this document type typically contains recurring charges.
 */
export function hasRecurringCosts(category: DocumentCategory): boolean {
  const recurringTypes: DocumentCategory[] = [
    'subscription', 'membership', 'cell_phone', 'internet_service',
    'cable_agreement', 'utility_bill', 'insurance_policy',
    'apartment_lease', 'rental_agreement',
  ];
  return recurringTypes.includes(category);
}

/**
 * Check if this is a contract document (has clauses to review).
 */
export function isContract(category: DocumentCategory): boolean {
  const contractTypes: DocumentCategory[] = [
    'auto_purchase', 'auto_finance', 'auto_lease',
    'apartment_lease', 'rental_agreement', 'mortgage',
    'loan_agreement', 'credit_card',
    'subscription', 'membership',
    'employment_contract', 'construction_contract',
    'purchase_agreement', 'terms_of_service', 'warranty',
  ];
  return contractTypes.includes(category);
}

/**
 * Get all registered categories for inspection/debugging.
 */
export function listCategories(): Array<{ id: DocumentCategory; displayName: string }> {
  return PROFILES.map(p => ({ id: p.category, displayName: p.displayName }));
}