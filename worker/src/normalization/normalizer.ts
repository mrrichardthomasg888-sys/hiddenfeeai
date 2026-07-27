import type {
  StructuredDocument,
  NormalizedDocument,
  NormalizedFee,
  NormalizedAmount,
  StructuredTable,
} from "../types.js";

/**
 * Normalization Engine
 * 
 * Transforms raw extracted text into standardized, analyzable concepts.
 * 
 * Before ANY AI analysis, this engine:
 * 
 * 1. Identifies and normalizes ALL monetary amounts
 * 2. Standardizes currency values to a common format
 * 3. Detects recurring vs one-time charges
 * 4. Normalizes fee names ("Processing Fee" = "Administrative Processing Fee" = "Processing Charge")
 * 5. Identifies dates and billing periods
 * 6. Extracts party names (issuer, payer, recipient)
 * 7. Deduplicates near-identical text
 * 8. Normalizes tables into analyzable rows
 * 
 * Why: AI models see "Document Fee" and "Documentation Charge" as different things.
 * Normalization ensures we catch both as the same hidden fee category.
 */

// ─── Fee name normalization ───

interface FeeNameMapping {
  canonical: string;
  category: string;
  keywords: string[];
  isTypicallyHidden: boolean;
  isTypicallyMandatory: boolean;
}

/**
 * Known fee name mappings.
 * ============================================================
 * EXTEND THIS LIST as new fee types are discovered.
 * Each mapping teaches the normalizer that different wordings
 * refer to the same underlying fee concept.
 * ============================================================
 */
const FEE_NAME_MAPPINGS: FeeNameMapping[] = [
  {
    canonical: "Processing Fee",
    category: "processing",
    keywords: ["processing", "process", "handling"],
    isTypicallyHidden: true,
    isTypicallyMandatory: true,
  },
  {
    canonical: "Documentation Fee",
    category: "documentation",
    keywords: ["documentation", "document", "doc", "paperwork", "filing"],
    isTypicallyHidden: true,
    isTypicallyMandatory: true,
  },
  {
    canonical: "Administrative Fee",
    category: "administrative",
    keywords: ["administrative", "admin", "administration", "overhead"],
    isTypicallyHidden: true,
    isTypicallyMandatory: true,
  },
  {
    canonical: "Service Fee",
    category: "service",
    keywords: ["service", "servicing", "maintenance", "upkeep"],
    isTypicallyHidden: false,
    isTypicallyMandatory: true,
  },
  {
    canonical: "Convenience Fee",
    category: "convenience",
    keywords: ["convenience", "online payment", "credit card fee", "payment processing"],
    isTypicallyHidden: true,
    isTypicallyMandatory: false,
  },
  {
    canonical: "Technology Fee",
    category: "technology",
    keywords: ["technology", "tech", "software", "platform", "digital", "system"],
    isTypicallyHidden: true,
    isTypicallyMandatory: true,
  },
  {
    canonical: "Regulatory Fee",
    category: "regulatory",
    keywords: ["regulatory", "compliance", "government", "federal", "state fee"],
    isTypicallyHidden: false,
    isTypicallyMandatory: true,
  },
  {
    canonical: "Cancellation Fee",
    category: "cancellation",
    keywords: ["cancellation", "cancel", "termination", "early termination", "break fee"],
    isTypicallyHidden: true,
    isTypicallyMandatory: false,
  },
  {
    canonical: "Late Fee",
    category: "late",
    keywords: ["late", "overdue", "past due", "delinquency"],
    isTypicallyHidden: false,
    isTypicallyMandatory: false,
  },
  {
    canonical: "Membership Fee",
    category: "membership",
    keywords: ["membership", "member", "subscription", "annual fee", "joining"],
    isTypicallyHidden: true,
    isTypicallyMandatory: false,
  },
  {
    canonical: "Activation Fee",
    category: "activation",
    keywords: ["activation", "setup", "installation", "initiation", "enrollment"],
    isTypicallyHidden: true,
    isTypicallyMandatory: true,
  },
  {
    canonical: "Resort Fee",
    category: "resort",
    keywords: ["resort", "facility", "amenity", "destination", "tourism"],
    isTypicallyHidden: true,
    isTypicallyMandatory: true,
  },
  {
    canonical: "Shipping & Handling",
    category: "shipping",
    keywords: ["shipping", "handling", "freight", "delivery", "postage", "courier"],
    isTypicallyHidden: false,
    isTypicallyMandatory: true,
  },
  {
    canonical: "Mandatory Add-On",
    category: "addon",
    keywords: ["mandatory", "required", "non-optional", "must purchase", "bundle"],
    isTypicallyHidden: true,
    isTypicallyMandatory: true,
  },
  {
    canonical: "Miscellaneous Fee",
    category: "misc",
    keywords: ["miscellaneous", "misc", "other", "additional", "extra", "various"],
    isTypicallyHidden: true,
    isTypicallyMandatory: false,
  },
  {
    canonical: "Tax",
    category: "tax",
    keywords: ["tax", "vat", "gst", "sales tax", "excise", "duty"],
    isTypicallyHidden: false,
    isTypicallyMandatory: true,
  },
  {
    canonical: "Insurance",
    category: "insurance",
    keywords: ["insurance", "protection plan", "warranty", "coverage", "gap"],
    isTypicallyHidden: false,
    isTypicallyMandatory: false,
  },
];

/**
 * Match a raw fee name/description to its canonical form.
 * Returns the canonical mapping or a fallback.
 */
function matchFeeName(rawName: string): FeeNameMapping {
  const lower = rawName.toLowerCase();
  
  // Try exact match first
  for (const mapping of FEE_NAME_MAPPINGS) {
    if (mapping.keywords.some(kw => lower === kw)) {
      return mapping;
    }
  }
  
  // Try partial match
  for (const mapping of FEE_NAME_MAPPINGS) {
    if (mapping.keywords.some(kw => lower.includes(kw))) {
      return mapping;
    }
  }
  
  // Fallback: create generic mapping
  return {
    canonical: rawName,
    category: "unclassified",
    keywords: [lower],
    isTypicallyHidden: false,
    isTypicallyMandatory: false,
  };
}

// ─── Amount normalization ───

const AMOUNT_PATTERN = /\$\s*([\d,]+\.?\d*)/g;
const CURRENCY_SYMBOLS: Record<string, string> = {
  '$': 'USD',
  '€': 'EUR',
  '£': 'GBP',
  '¥': 'JPY',
  '₹': 'INR',
  'A$': 'AUD',
  'C$': 'CAD',
};

const RECURRING_INDICATORS = [
  'monthly', 'per month', '/month', '/mo',
  'annually', 'per year', '/year', '/yr', 'annual',
  'weekly', 'per week', '/week', '/wk',
  'quarterly', 'per quarter', '/quarter', '/qtr',
  'daily', 'per day', '/day',
  'recurring', 'subscription', 'ongoing', 'every month',
];

const ONE_TIME_INDICATORS = [
  'one-time', 'one time', 'once', 'single', 'initial', 'upfront',
];

/**
 * Extract and normalize all monetary amounts from text.
 */
function extractAmounts(text: string, pageNumber: number): NormalizedAmount[] {
  const amounts: NormalizedAmount[] = [];
  let match;

  AMOUNT_PATTERN.lastIndex = 0;
  while ((match = AMOUNT_PATTERN.exec(text)) !== null) {
    const raw = match[0];
    const value = parseFloat(match[1].replace(/,/g, ''));
    
    if (isNaN(value) || value <= 0) continue;

    // Detect currency
    let currency = 'USD';
    for (const [symbol, code] of Object.entries(CURRENCY_SYMBOLS)) {
      if (raw.includes(symbol)) {
        currency = code;
        break;
      }
    }

    // Detect recurrence
    const context = text.slice(Math.max(0, match.index - 50), match.index + raw.length + 100).toLowerCase();
    
    let isRecurring = false;
    let period: NormalizedAmount['period'] = 'one_time';
    
    for (const indicator of RECURRING_INDICATORS) {
      if (context.includes(indicator)) {
        isRecurring = true;
        if (indicator.includes('month') || indicator === '/mo') period = 'monthly';
        else if (indicator.includes('year') || indicator.includes('annual') || indicator === '/yr') period = 'annually';
        else if (indicator.includes('week') || indicator === '/wk') period = 'weekly';
        else if (indicator.includes('quarter') || indicator === '/qtr') period = 'quarterly';
        else if (indicator.includes('day')) period = 'daily';
        break;
      }
    }
    
    for (const indicator of ONE_TIME_INDICATORS) {
      if (context.includes(indicator)) {
        isRecurring = false;
        period = 'one_time';
        break;
      }
    }

    // Check if this is an estimated amount
    const isEstimated = context.includes('estimated') || context.includes('approx') || 
                        context.includes('estimate') || context.includes('~');

    amounts.push({
      raw,
      value,
      currency,
      isEstimated,
      isRecurring,
      period,
    });
  }

  return amounts;
}

// ─── Fee extraction from tables ───

/**
 * Extract fee-like entries from structured tables.
 * Fee tables typically have: name/description + amount columns.
 */
function extractFeesFromTables(tables: StructuredTable[]): {
  rawName: string;
  amount: NormalizedAmount | null;
  pageNumber: number;
  evidenceText: string;
}[] {
  const fees: {
    rawName: string;
    amount: NormalizedAmount | null;
    pageNumber: number;
    evidenceText: string;
  }[] = [];

  for (const table of tables) {
    // Only process fee-related tables
    const isFeeTable = table.detectedAs === 'fee_schedule' || 
                       table.detectedAs === 'line_items' ||
                       table.headers.some(h => 
                         h.toLowerCase().includes('fee') ||
                         h.toLowerCase().includes('charge') ||
                         h.toLowerCase().includes('description') ||
                         h.toLowerCase().includes('amount')
                       );

    if (!isFeeTable && table.detectedAs === 'general') continue;

    // Find the description and amount columns
    const descColIdx = table.headers.findIndex(h =>
      h.toLowerCase().includes('description') ||
      h.toLowerCase().includes('fee') ||
      h.toLowerCase().includes('charge') ||
      h.toLowerCase().includes('item') ||
      h.toLowerCase().includes('service')
    );
    
    const amtColIdx = table.headers.findIndex(h =>
      h.toLowerCase().includes('amount') ||
      h.toLowerCase().includes('cost') ||
      h.toLowerCase().includes('price') ||
      h.toLowerCase().includes('fee') ||
      h.toLowerCase().includes('total') ||
      h.toLowerCase().includes('charge')
    );

    for (const row of table.rows) {
      const desc = descColIdx >= 0 ? row[descColIdx] : row[0] || '';
      const amtStr = amtColIdx >= 0 ? row[amtColIdx] : row[row.length - 1] || '';
      
      const amounts = extractAmounts(amtStr, table.pageNumber);
      
      if (desc.trim().length > 0) {
        fees.push({
          rawName: desc.trim(),
          amount: amounts.length > 0 ? amounts[0] : null,
          pageNumber: table.pageNumber,
          evidenceText: `${desc.trim()}: ${amtStr.trim()}`,
        });
      }
    }
  }

  return fees;
}

// ─── Fee extraction from text ───

/**
 * Scan full document text for fee-like patterns.
 */
function extractFeesFromText(markdown: string): {
  rawName: string;
  amount: NormalizedAmount | null;
  pageNumber: number;
  evidenceText: string;
}[] {
  const fees: typeof result = [];
  const pageBlocks = markdown.split(/--- Page (\d+) ---/);
  
  for (let i = 1; i < pageBlocks.length; i += 2) {
    const pageNum = parseInt(pageBlocks[i]);
    const pageText = pageBlocks[i + 1] || '';
    
    // Find lines that contain both a description and a dollar amount
    const lines = pageText.split('\n');
    for (const line of lines) {
      const amounts = extractAmounts(line, pageNum);
      if (amounts.length === 0) continue;
      
      // Check if the line looks like a fee description
      const descPart = line.replace(AMOUNT_PATTERN, '').trim();
      if (descPart.length < 3 || descPart.length > 200) continue;
      
      // Look for fee indicators in the description
      const lowerDesc = descPart.toLowerCase();
      const isFeeLike = FEE_NAME_MAPPINGS.some(m => 
        m.keywords.some(kw => lowerDesc.includes(kw))
      ) || lowerDesc.includes('fee') || lowerDesc.includes('charge') || lowerDesc.includes('cost');
      
      if (isFeeLike || amounts.length > 0) {
        fees.push({
          rawName: descPart,
          amount: amounts[0],
          pageNumber: pageNum,
          evidenceText: line.trim(),
        });
      }
    }
  }
  
  return fees;
}

// ─── Deduplication ───

interface RawFee {
  rawName: string;
  amount: NormalizedAmount | null;
  pageNumber: number;
  evidenceText: string;
}

/**
 * Group similar raw fees into normalized fee groups.
 * Two fees are the same if they share the same canonical name AND similar amounts.
 */
function groupAndNormalizeFees(rawFees: RawFee[]): NormalizedFee[] {
  const groups: Map<string, RawFee[]> = new Map();

  for (const raw of rawFees) {
    const mapping = matchFeeName(raw.rawName);
    const key = mapping.canonical;
    
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(raw);
  }

  const normalized: NormalizedFee[] = [];

  for (const [canonicalName, raws] of groups) {
    const mapping = matchFeeName(canonicalName);
    const uniqueRawNames = [...new Set(raws.map(r => r.rawName))];
    const amounts = raws.filter(r => r.amount !== null).map(r => r.amount!);
    const pageRefs = [...new Set(raws.map(r => r.pageNumber))];
    const evidenceTexts = raws.map(r => r.evidenceText);

    // Deduplicate amounts (same value => one entry)
    const uniqueAmounts: NormalizedAmount[] = [];
    const seenValues = new Set<number>();
    for (const amt of amounts) {
      if (!seenValues.has(amt.value)) {
        seenValues.add(amt.value);
        uniqueAmounts.push(amt);
      }
    }

    normalized.push({
      canonicalName,
      rawNames: uniqueRawNames,
      amounts: uniqueAmounts,
      pageReferences: pageRefs,
      evidenceTexts,
      category: mapping.category,
      isHidden: mapping.isTypicallyHidden,
      isMandatory: mapping.isTypicallyMandatory,
    });
  }

  return normalized;
}

// ─── Date extraction ───

const DATE_PATTERNS = [
  /\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/g,  // MM/DD/YYYY or DD/MM/YYYY
  /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b/gi,
  /\b\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}\b/gi,
  /\b\d{4}[-/]\d{1,2}[-/]\d{1,2}\b/g,           // YYYY-MM-DD
];

function extractDates(text: string): Date[] {
  const dates: Date[] = [];
  
  for (const pattern of DATE_PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      try {
        const parsed = new Date(match[0]);
        if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 2000 && parsed.getFullYear() < 2100) {
          dates.push(parsed);
        }
      } catch { /* skip invalid dates */ }
    }
  }

  return dates;
}

// ─── Party name extraction ───

/**
 * Extract likely party names (companies, individuals) from the document.
 * Looks for common patterns: "From:", "To:", "Bill To:", "Issuer:", etc.
 */
function extractParties(text: string): string[] {
  const parties: string[] = [];
  const partyPatterns = [
    /(?:From|Issuer|Company|Provider|Seller|Vendor|Merchant):\s*([^\n]{3,80})/gi,
    /(?:To|Bill To|Ship To|Buyer|Customer|Client|Purchaser):\s*([^\n]{3,80})/gi,
    /(?:Pay to|Payable to|Make check payable to):\s*([^\n]{3,80})/gi,
  ];

  for (const pattern of partyPatterns) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const name = match[1].trim();
      if (name.length > 2 && !name.match(/^\d+$/)) {
        parties.push(name);
      }
    }
  }

  return [...new Set(parties)];
}

// ─── Main normalization function ───

/**
 * Normalize a StructuredDocument into a NormalizedDocument.
 * This is the bridge between extraction and analysis.
 */
export function normalizeDocument(doc: StructuredDocument): NormalizedDocument {
  console.log(`[Normalizer] Processing ${doc.fileName} — ${doc.pageCount} pages, ${doc.tables.length} tables`);

  // ── Extract fees from tables ──
  const tableFees = extractFeesFromTables(doc.tables);
  console.log(`[Normalizer] Table fees: ${tableFees.length}`);

  // ── Extract fees from text ──
  const textFees = extractFeesFromText(doc.markdown);
  console.log(`[Normalizer] Text fees: ${textFees.length}`);

  // ── Group and normalize fees ──
  const allRawFees = [...tableFees, ...textFees];
  const normalizedFees = groupAndNormalizeFees(allRawFees);
  console.log(`[Normalizer] Normalized fees: ${normalizedFees.length} unique`);

  // ── Extract all amounts ──
  const allAmounts = extractAmounts(doc.markdown, 0);

  // ── Classify amounts as totals vs line items ──
  const totals = allAmounts.filter(a => {
    const context = a.raw.toLowerCase();
    return context.includes('total') || context.includes('balance due') || 
           context.includes('amount due') || context.includes('grand total');
  });

  // ── Extract dates ──
  const dates = extractDates(doc.markdown);

  // ── Extract parties ──
  const parties = extractParties(doc.markdown);

  // ── Detect currency ──
  const currencyCounts: Record<string, number> = {};
  for (const amt of allAmounts) {
    currencyCounts[amt.currency] = (currencyCounts[amt.currency] || 0) + 1;
  }
  const currency = Object.entries(currencyCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'USD';

  // ── Detect language ──
  const language = doc.routeResult.detectedLanguage;

  // ── Build normalized document ──
  const normalized: NormalizedDocument = {
    ...doc,
    fees: normalizedFees,
    totals,
    dates,
    parties,
    currency,
    language,
  };

  console.log(
    `[Normalizer] Complete: ${normalized.fees.length} fee groups, ` +
    `${allAmounts.length} amounts, ${dates.length} dates, ${parties.length} parties`
  );

  return normalized;
}

// ─── Utility exports ───

/**
 * Get a human-readable summary of the normalization.
 */
export function getNormalizationSummary(doc: NormalizedDocument): string {
  const totalFeeAmount = doc.fees.reduce((sum, f) => 
    sum + f.amounts.reduce((s, a) => s + a.value, 0), 0
  );
  const hiddenFees = doc.fees.filter(f => f.isHidden);
  const recurringFees = doc.fees.filter(f => f.amounts.some(a => a.isRecurring));

  return [
    `Document: ${doc.fileName} (${doc.pageCount} pages, ${doc.language})`,
    `Currency: ${doc.currency}`,
    `Fee Groups: ${doc.fees.length} (${hiddenFees.length} potentially hidden, ${recurringFees.length} recurring)`,
    `Total Detected Amount: $${totalFeeAmount.toLocaleString()}`,
    `Parties: ${doc.parties.join(', ') || 'None detected'}`,
    `Dates: ${doc.dates.length} found`,
    `Tables: ${doc.tables.length} extracted`,
  ].join('\n');
}

/**
 * Check if the document has enough extractable content to be analyzed.
 * Returns false for documents that are essentially empty.
 */
export function hasSufficientContent(doc: NormalizedDocument): boolean {
  const hasText = doc.markdown.replace(/\s/g, '').length > 50;
  const hasAmounts = doc.totals.length > 0 || doc.fees.some(f => f.amounts.length > 0);
  
  return hasText && hasAmounts;
}