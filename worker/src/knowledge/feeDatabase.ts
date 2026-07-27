/**
 * HiddenFeeAI Fee Knowledge Base
 * 
 * Structured intelligence about common consumer fees.
 * Each entry provides context, negotiability, risk, and consumer questions.
 * 
 * This is the "what does this fee mean and should I worry?" database.
 * 
 * Extensible: Add new fee types, industries, and categories as they're discovered.
 */

export interface FeeKnowledgeEntry {
  feeName: string;
  canonicalName: string;
  category: string;
  industries: string[];
  description: string;
  consumerExplanation: string;
  negotiability: 'highly_negotiable' | 'somewhat_negotiable' | 'rarely_negotiable' | 'not_negotiable';
  negotiabilityReason: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  commonRange: string;
  isTypicallyHidden: boolean;
  isTypicallyRecurring: boolean;
  questionsToAsk: string[];
  redFlags: string[];
  relatedFeeNames: string[];
}

export type FeeDatabase = Map<string, FeeKnowledgeEntry>;

/**
 * Complete fee knowledge base.
 * Organized by canonical name for fast lookup.
 */
export function createFeeDatabase(): FeeDatabase {
  const db = new Map<string, FeeKnowledgeEntry>();

  const entries: FeeKnowledgeEntry[] = [
    // ═══════════════════════════════════════════════════════
    // AUTOMOTIVE FEES
    // ═══════════════════════════════════════════════════════
    {
      feeName: "Documentation Fee",
      canonicalName: "documentation_fee",
      category: "automotive_dealer",
      industries: ["automotive", "auto_dealership"],
      description: "A fee charged by car dealerships for preparing and processing sales documents.",
      consumerExplanation: "This is a dealer profit center, not a government-required fee. In most states, there is no legal requirement to charge a documentation fee. The dealer is charging you for their own paperwork.",
      negotiability: "highly_negotiable",
      negotiabilityReason: "Dealers have full discretion over doc fees. They can reduce, waive, or negotiate this fee. Some states cap doc fees by law.",
      riskLevel: "high",
      commonRange: "$75 - $899 (varies by state; some states cap at $150-300)",
      isTypicallyHidden: true,
      isTypicallyRecurring: false,
      questionsToAsk: [
        "Is this documentation fee required by law in this state?",
        "What specific documents does this fee cover?",
        "Can this fee be reduced or waived?",
        "What is the statutory maximum documentation fee in this state?",
      ],
      redFlags: ["Fee exceeds state maximum", "Listed as 'non-negotiable' but state doesn't require it", "Fee appears twice"],
      relatedFeeNames: ["doc fee", "document fee", "paperwork fee", "processing fee"],
    },
    {
      feeName: "Dealer Preparation Fee",
      canonicalName: "dealer_prep_fee",
      category: "automotive_dealer",
      industries: ["automotive", "auto_dealership"],
      description: "A fee for preparing the vehicle for sale (cleaning, inspection, minor adjustments).",
      consumerExplanation: "The manufacturer already pays dealers for vehicle preparation through the invoice price. This fee is often double-charging — the dealer is billing you for work they were already compensated for.",
      negotiability: "highly_negotiable",
      negotiabilityReason: "This fee is almost pure dealer profit. Most consumers successfully negotiate its removal, especially on new vehicles.",
      riskLevel: "high",
      commonRange: "$150 - $500",
      isTypicallyHidden: true,
      isTypicallyRecurring: false,
      questionsToAsk: [
        "What exactly does 'dealer preparation' include?",
        "Isn't the manufacturer already reimbursing you for vehicle prep?",
        "Will you remove this fee if I ask?",
      ],
      redFlags: ["Fee over $300 on a new vehicle", "Charged alongside a separate 'cleaning fee'"],
      relatedFeeNames: ["dealer prep", "vehicle prep", "pre-delivery inspection", "make-ready fee"],
    },
    {
      feeName: "Market Adjustment Fee",
      canonicalName: "market_adjustment",
      category: "automotive_dealer",
      industries: ["automotive", "auto_dealership"],
      description: "An additional markup above MSRP, claimed to reflect high demand/low supply.",
      consumerExplanation: "This is a pure dealer markup — you are paying more than the manufacturer's suggested retail price. There is usually no additional value provided. If you wait or shop at another dealer, this fee often disappears.",
      negotiability: "somewhat_negotiable",
      negotiabilityReason: "Negotiability depends on market conditions. In a seller's market, it's harder to remove. Shopping multiple dealers is your best leverage.",
      riskLevel: "critical",
      commonRange: "$1,000 - $10,000+ (varies wildly by model and demand)",
      isTypicallyHidden: false,
      isTypicallyRecurring: false,
      questionsToAsk: [
        "What additional value does this market adjustment provide?",
        "Is this fee common across other dealers for this model?",
        "Will you match a competing dealer without this markup?",
      ],
      redFlags: ["Fee exceeds $5,000", "Dealer claims it's 'standard across all dealers'", "Fee not disclosed until final paperwork"],
      relatedFeeNames: ["market adjustment", "additional dealer markup", "price adjustment", "demand surcharge"],
    },
    {
      feeName: "Extended Warranty",
      canonicalName: "extended_warranty",
      category: "automotive_addon",
      industries: ["automotive"],
      description: "An optional service contract extending vehicle coverage beyond the manufacturer warranty.",
      consumerExplanation: "Extended warranties are high-profit products for dealers. Many consumers never use them, and the manufacturer warranty already covers major issues. You can usually buy these later for less money from third-party providers.",
      negotiability: "somewhat_negotiable",
      negotiabilityReason: "Dealers can discount warranties significantly. You can also buy from third-party providers at lower cost. Never feel pressured to buy on the spot.",
      riskLevel: "medium",
      commonRange: "$1,000 - $4,000",
      isTypicallyHidden: false,
      isTypicallyRecurring: false,
      questionsToAsk: [
        "What does this cover that the manufacturer warranty doesn't?",
        "Can I buy this later at the same price?",
        "What is the deductible per claim?",
        "Can I cancel and get a prorated refund?",
      ],
      redFlags: ["Dealer says you 'must' buy it", "Price inflated 3x over market", "Warranty exclusion list is extensive"],
      relatedFeeNames: ["service contract", "vehicle protection plan", "mechanical breakdown insurance"],
    },

    // ═══════════════════════════════════════════════════════
    // HOUSING FEES
    // ═══════════════════════════════════════════════════════
    {
      feeName: "Application Fee",
      canonicalName: "application_fee",
      category: "rental_housing",
      industries: ["real_estate", "property_management", "rental"],
      description: "A fee charged to process a rental application, typically covering background/credit checks.",
      consumerExplanation: "Application fees should roughly match the actual cost of a credit check ($25-50). Anything above that is profit for the landlord. Some states cap these fees by law.",
      negotiability: "rarely_negotiable",
      negotiabilityReason: "Most landlords won't negotiate application fees, but some will credit it toward your first month's rent if approved.",
      riskLevel: "low",
      commonRange: "$25 - $100 per applicant",
      isTypicallyHidden: false,
      isTypicallyRecurring: false,
      questionsToAsk: [
        "What does this application fee cover?",
        "Will this be credited toward my first month's rent if approved?",
        "Is this fee refundable if my application is denied?",
      ],
      redFlags: ["Fee over $100", "Charging both spouses/roommates full fee", "Non-refundable and doesn't go toward rent"],
      relatedFeeNames: ["application processing", "background check fee", "credit check fee"],
    },
    {
      feeName: "Administrative Fee (Rental)",
      canonicalName: "rental_admin_fee",
      category: "rental_housing",
      industries: ["real_estate", "property_management"],
      description: "A non-refundable fee charged at lease signing for 'administrative costs.'",
      consumerExplanation: "This is a profit center for property management companies. There is rarely a specific service provided for this fee beyond standard lease processing. Some states regulate these fees.",
      negotiability: "somewhat_negotiable",
      negotiabilityReason: "In competitive rental markets, landlords may remove this fee to close a deal. Always ask — the worst they can say is no.",
      riskLevel: "medium",
      commonRange: "$100 - $500",
      isTypicallyHidden: true,
      isTypicallyRecurring: false,
      questionsToAsk: [
        "What specific administrative costs does this cover?",
        "Is this fee negotiable or removable?",
        "Is there a legal cap on this fee in this state?",
      ],
      redFlags: ["Fee over $300", "Non-refundable AND non-negotiable", "Charged alongside application fee"],
      relatedFeeNames: ["admin fee", "lease processing fee", "move-in fee", "leasing fee"],
    },
    {
      feeName: "Late Rent Fee",
      canonicalName: "late_rent_fee",
      category: "rental_housing",
      industries: ["real_estate", "property_management"],
      description: "A penalty charged when rent is not paid by the due date.",
      consumerExplanation: "Late fees must be 'reasonable' under most state laws (typically 5-10% of monthly rent). Daily escalating fees or fees over 10% may violate state law.",
      negotiability: "somewhat_negotiable",
      negotiabilityReason: "First-time late fees are often waived. Landlords prefer on-time payment over collecting penalties. Always communicate early.",
      riskLevel: "medium",
      commonRange: "$25 - $100 or 5-10% of rent",
      isTypicallyHidden: false,
      isTypicallyRecurring: false,
      questionsToAsk: [
        "Is there a grace period before the late fee applies?",
        "Can the first late fee be waived as a courtesy?",
        "What is the legal maximum late fee in this state?",
      ],
      redFlags: ["Fee exceeds 10% of monthly rent", "Daily escalating fees", "No grace period"],
      relatedFeeNames: ["late payment penalty", "delinquency fee", "past due charge"],
    },

    // ═══════════════════════════════════════════════════════
    // MEDICAL FEES
    // ═══════════════════════════════════════════════════════
    {
      feeName: "Facility Fee",
      canonicalName: "facility_fee",
      category: "medical",
      industries: ["healthcare", "hospitals", "medical_practices"],
      description: "A charge for using the hospital or clinic facility, separate from physician services.",
      consumerExplanation: "Facility fees are increasingly common as hospitals acquire medical practices. You may pay a facility fee even for an office visit that doesn't use hospital resources. These fees are often unexpected and can be $100-500+.",
      negotiability: "somewhat_negotiable",
      negotiabilityReason: "Some hospitals offer financial assistance or discounts. Ask about charity care policies. Always verify with insurance whether facility fees are covered.",
      riskLevel: "high",
      commonRange: "$100 - $500+ per visit",
      isTypicallyHidden: true,
      isTypicallyRecurring: false,
      questionsToAsk: [
        "Why am I being charged a facility fee for an office visit?",
        "Is this fee covered by my insurance?",
        "Do you offer financial assistance or sliding-scale fees?",
        "Can this fee be itemized to show what it pays for?",
      ],
      redFlags: ["Facility fee on a telehealth visit", "Fee exceeds $500 for routine visit", "Hospital doesn't disclose facility fee before visit"],
      relatedFeeNames: ["hospital facility fee", "clinic fee", "operating room charge", "facility charge"],
    },
    {
      feeName: "Medical Supply Charge",
      canonicalName: "medical_supply_charge",
      category: "medical",
      industries: ["healthcare", "hospitals"],
      description: "Charges for medical supplies used during treatment (bandages, syringes, etc.).",
      consumerExplanation: "Hospitals mark up supply costs significantly (sometimes 10x wholesale). Common items like ibuprofen can be billed at $15+ per pill. Review your itemized bill — you may find supplies you didn't receive.",
      negotiability: "somewhat_negotiable",
      negotiabilityReason: "You can dispute supply charges for items you believe weren't used. Request an itemized bill and compare against your medical record.",
      riskLevel: "medium",
      commonRange: "Varies widely by procedure",
      isTypicallyHidden: true,
      isTypicallyRecurring: false,
      questionsToAsk: [
        "Can I see the itemized list of supplies used?",
        "Why is this item priced at $X when it costs $Y at retail?",
        "Were all of these supplies actually used during my treatment?",
      ],
      redFlags: ["Charges for supplies you didn't receive", "10x+ markup over retail", "Vague descriptions like 'medical supplies' without itemization"],
      relatedFeeNames: ["supplies", "medical supplies", "surgical supplies", "consumables"],
    },

    // ═══════════════════════════════════════════════════════
    // SUBSCRIPTION / TELECOM FEES
    // ═══════════════════════════════════════════════════════
    {
      feeName: "Setup Fee",
      canonicalName: "setup_fee",
      category: "subscription",
      industries: ["saas", "telecom", "internet", "software"],
      description: "A one-time charge for creating an account or setting up service.",
      consumerExplanation: "Many companies waive setup fees during promotions or when you ask. This fee often has minimal real cost to the company — it's primarily a revenue tool.",
      negotiability: "highly_negotiable",
      negotiabilityReason: "Setup fees are frequently waived to close sales. Ask directly: 'Can you waive the setup fee?' The answer is often yes, especially for annual plans.",
      riskLevel: "medium",
      commonRange: "$50 - $500",
      isTypicallyHidden: false,
      isTypicallyRecurring: false,
      questionsToAsk: [
        "Can the setup fee be waived?",
        "Is the setup fee discounted for annual billing?",
        "What exactly does the setup fee cover?",
      ],
      redFlags: ["Setup fee exceeding first month's cost", "No waiver under any circumstances", "Hidden until checkout"],
      relatedFeeNames: ["activation fee", "installation fee", "onboarding fee", "initiation fee"],
    },
    {
      feeName: "Cancellation Fee",
      canonicalName: "cancellation_fee",
      category: "subscription",
      industries: ["saas", "telecom", "gym", "membership", "internet"],
      description: "A penalty for ending a service contract before the term ends.",
      consumerExplanation: "Early termination fees must be disclosed in your contract. Some states limit these fees. The fee should decline over the contract term (e.g., $300 initially, decreasing monthly).",
      negotiability: "somewhat_negotiable",
      negotiabilityReason: "Providers may waive or reduce cancellation fees if you're moving to an area without service, experiencing ongoing issues, or escalating to retention.",
      riskLevel: "high",
      commonRange: "$100 - $500 (or remaining contract balance)",
      isTypicallyHidden: true,
      isTypicallyRecurring: false,
      questionsToAsk: [
        "Does the cancellation fee decline over the contract term?",
        "Are there circumstances where the fee is waived (moving, military deployment, service issues)?",
        "Can I transfer my contract to someone else instead?",
      ],
      redFlags: ["Fee equals remaining contract balance", "No proration over time", "No hardship exceptions"],
      relatedFeeNames: ["early termination fee", "cancellation penalty", "break fee", "disconnection fee"],
    },
    {
      feeName: "Regulatory Recovery Fee",
      canonicalName: "regulatory_recovery_fee",
      category: "utilities",
      industries: ["telecom", "wireless", "internet", "cable"],
      description: "A fee telecom companies charge to 'recover' costs of complying with government regulations.",
      consumerExplanation: "This is NOT a government tax. It is a fee the COMPANY chooses to charge to offset their regulatory compliance costs. It's essentially part of the service price, broken out separately to make the advertised price look lower.",
      negotiability: "rarely_negotiable",
      negotiabilityReason: "These fees are typically applied to all customers uniformly. Your best option is to compare all-in pricing across providers, including these fees.",
      riskLevel: "low",
      commonRange: "$1 - $5 per month",
      isTypicallyHidden: true,
      isTypicallyRecurring: true,
      questionsToAsk: [
        "Is this a government-mandated fee or a company-imposed charge?",
        "Why isn't this included in the advertised price?",
        "What specific regulations is this fee recovering costs for?",
      ],
      redFlags: ["Fee not disclosed in advertised pricing", "Fee increases frequently", "Fee > $5/line/month"],
      relatedFeeNames: ["regulatory charge", "federal universal service charge", "regulatory cost recovery", "administrative fee"],
    },

    // ═══════════════════════════════════════════════════════
    // CONTRACT / LEGAL FEES
    // ═══════════════════════════════════════════════════════
    {
      feeName: "Arbitration Clause",
      canonicalName: "arbitration_clause",
      category: "legal",
      industries: ["all"],
      description: "A contract provision requiring disputes to be resolved through private arbitration rather than court.",
      consumerExplanation: "By agreeing to binding arbitration, you waive your right to sue in court, participate in class actions, or have a jury trial. Arbitration often favors companies — arbitrators may be selected and paid by the company.",
      negotiability: "somewhat_negotiable",
      negotiabilityReason: "Some companies allow you to opt out of arbitration clauses by sending written notice within a specific timeframe (often 30 days). Check your contract for an opt-out provision.",
      riskLevel: "critical",
      commonRange: "N/A (legal clause, not a fee)",
      isTypicallyHidden: true,
      isTypicallyRecurring: false,
      questionsToAsk: [
        "Is there an opt-out provision for arbitration?",
        "Who selects and pays the arbitrator?",
        "Does this clause prevent me from joining a class action?",
        "What rules govern the arbitration process?",
      ],
      redFlags: ["No opt-out provision", "Company selects arbitrator", "Arbitration in distant location", "Consumer pays arbitration costs"],
      relatedFeeNames: ["binding arbitration", "dispute resolution", "mandatory arbitration"],
    },
    {
      feeName: "Auto-Renewal Clause",
      canonicalName: "auto_renewal_clause",
      category: "legal",
      industries: ["subscription", "saas", "gym", "membership", "telecom"],
      description: "A contract term that automatically extends the agreement unless you actively cancel.",
      consumerExplanation: "Auto-renewal clauses mean you'll keep being charged unless you remember to cancel before the deadline. Some companies make cancellation deliberately difficult. Set a calendar reminder 60-90 days before renewal.",
      negotiability: "somewhat_negotiable",
      negotiabilityReason: "You can negotiate shorter notice periods, opt-out requirements, or removal of auto-renewal in favor of manual renewal.",
      riskLevel: "high",
      commonRange: "N/A (legal clause)",
      isTypicallyHidden: true,
      isTypicallyRecurring: true,
      questionsToAsk: [
        "How do I cancel before the auto-renewal date?",
        "Will I receive a reminder before the renewal date?",
        "Can auto-renewal be removed from this contract?",
        "What is the minimum cancellation notice period?",
      ],
      redFlags: ["90+ day cancellation notice", "No pre-renewal reminder", "Cancellation only by phone", "Renewal term equals original term"],
      relatedFeeNames: ["automatic renewal", "evergreen clause", "rolling renewal"],
    },
  ];

  for (const entry of entries) {
    // Store by canonical name AND by all related names for fuzzy lookup
    db.set(entry.canonicalName, entry);
    for (const altName of entry.relatedFeeNames) {
      const normalized = altName.toLowerCase().replace(/[^a-z0-9]/g, '_');
      if (!db.has(normalized)) {
        db.set(normalized, entry);
      }
    }
  }

  return db;
}

/**
 * Lazy-loaded singleton database.
 */
let _db: FeeDatabase | null = null;

export function getFeeDatabase(): FeeDatabase {
  if (!_db) {
    _db = createFeeDatabase();
  }
  return _db;
}

/**
 * Look up a fee by name (fuzzy matching).
 */
export function lookupFee(feeName: string): FeeKnowledgeEntry | undefined {
  const db = getFeeDatabase();
  const normalized = feeName.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '_');
  
  // Direct match
  if (db.has(normalized)) return db.get(normalized);
  
  // Partial match
  for (const [key, entry] of db) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return entry;
    }
    // Check against related names
    for (const alt of entry.relatedFeeNames) {
      if (feeName.toLowerCase().includes(alt.toLowerCase()) ||
          alt.toLowerCase().includes(feeName.toLowerCase())) {
        return entry;
      }
    }
  }
  
  return undefined;
}

/**
 * Get all known fee entries for a specific industry.
 */
export function getFeesByIndustry(industry: string): FeeKnowledgeEntry[] {
  const db = getFeeDatabase();
  const results: FeeKnowledgeEntry[] = [];
  const seen = new Set<string>();
  
  for (const [_, entry] of db) {
    if (entry.industries.includes(industry) && !seen.has(entry.canonicalName)) {
      results.push(entry);
      seen.add(entry.canonicalName);
    }
  }
  
  return results;
}