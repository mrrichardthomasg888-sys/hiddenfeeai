// HiddenFeeAI — Knowledge Graph Structure
// Builds relationships between industries, fee types, consumer problems,
// negotiation strategies, regulations, and documents.
// This graph powers entity recognition, semantic search, and AI answer generation.

import type { Industry, FeeCategory } from "../growth/aiAuthority";

// ── Graph Node Types ───────────────────────────────────────────────────────

export type NodeType = "Industry" | "FeeType" | "ConsumerProblem" | "NegotiationStrategy" | "Regulation" | "Document" | "Question" | "Analyzer";

export interface GraphNode {
  id: string;
  type: NodeType;
  label: string;
  description: string;
  aliases: string[];          // Alternative search terms
  weight: number;             // Importance 0-100
}

export interface GraphEdge {
  from: string;               // Source node ID
  to: string;                 // Target node ID
  relationship: string;       // e.g., "HAS_FEE", "REGULATED_BY", "RESOLVED_BY"
  bidirectional: boolean;
  strength: number;           // 0-100 relationship strength
  evidence?: string;          // Supporting evidence
}

// ── All Nodes ──────────────────────────────────────────────────────────────

export const NODES: GraphNode[] = [
  // Industries
  {
    id: "industry-automotive",
    type: "Industry",
    label: "Automotive",
    description: "Car purchases, leases, financing, and dealership transactions",
    aliases: ["car buying", "auto dealership", "vehicle purchase", "car dealer", "auto financing"],
    weight: 95,
  },
  {
    id: "industry-housing",
    type: "Industry",
    label: "Housing",
    description: "Rentals, mortgages, property purchases, and HOA agreements",
    aliases: ["real estate", "apartment rental", "mortgage", "home buying", "property"],
    weight: 85,
  },
  {
    id: "industry-healthcare",
    type: "Industry",
    label: "Healthcare",
    description: "Medical bills, hospital charges, insurance claims, and treatment costs",
    aliases: ["medical", "hospital", "doctor bill", "health insurance", "medical billing"],
    weight: 90,
  },
  {
    id: "industry-banking",
    type: "Industry",
    label: "Banking",
    description: "Bank accounts, credit cards, loans, and financial services",
    aliases: ["bank", "credit union", "checking account", "savings", "credit card"],
    weight: 80,
  },
  {
    id: "industry-insurance",
    type: "Industry",
    label: "Insurance",
    description: "Auto, home, health, life, and other insurance policies",
    aliases: ["insurance policy", "premium", "coverage", "claims", "deductible"],
    weight: 75,
  },
  {
    id: "industry-subscriptions",
    type: "Industry",
    label: "Subscriptions",
    description: "Streaming, SaaS, membership, and recurring payment services",
    aliases: ["streaming service", "membership", "SaaS", "recurring billing", "subscription box"],
    weight: 85,
  },
  {
    id: "industry-utilities",
    type: "Industry",
    label: "Utilities",
    description: "Electricity, water, gas, internet, phone, and cable services",
    aliases: ["electric bill", "water bill", "gas bill", "internet provider", "cable TV"],
    weight: 80,
  },

  // Fee Types
  {
    id: "fee-documentation",
    type: "FeeType",
    label: "Documentation Fee",
    description: "Charge for processing paperwork and documentation",
    aliases: ["doc fee", "paperwork fee", "processing charge", "document processing"],
    weight: 95,
  },
  {
    id: "fee-dealer-prep",
    type: "FeeType",
    label: "Dealer Preparation Fee",
    description: "Charge for cleaning, inspecting, and preparing a vehicle for sale",
    aliases: ["prep fee", "dealer prep", "vehicle prep", "preparation charge"],
    weight: 85,
  },
  {
    id: "fee-facility",
    type: "FeeType",
    label: "Facility Fee",
    description: "Hospital or clinic charge for using the medical facility",
    aliases: ["hospital fee", "clinic charge", "facility charge", "hospital outpatient fee"],
    weight: 90,
  },
  {
    id: "fee-surcharge",
    type: "FeeType",
    label: "Regulatory Surcharge",
    description: "Additional charge to recover regulatory compliance costs",
    aliases: ["regulatory fee", "compliance surcharge", "government fee recovery"],
    weight: 80,
  },
  {
    id: "fee-overdraft",
    type: "FeeType",
    label: "Overdraft Fee",
    description: "Fee charged when an account balance goes below zero",
    aliases: ["NSF fee", "insufficient funds fee", "overdraft protection fee", "bounced check fee"],
    weight: 88,
  },
  {
    id: "fee-early-termination",
    type: "FeeType",
    label: "Early Termination Fee",
    description: "Penalty for ending a contract before the agreed term",
    aliases: ["ETF", "cancellation fee", "early exit penalty", "contract break fee"],
    weight: 85,
  },
  {
    id: "fee-late-payment",
    type: "FeeType",
    label: "Late Payment Fee",
    description: "Penalty charged when a payment is not made by the due date",
    aliases: ["late fee", "past due charge", "delinquency fee", "penalty charge"],
    weight: 82,
  },
  {
    id: "fee-origination",
    type: "FeeType",
    label: "Origination Fee",
    description: "Fee charged by a lender for processing a new loan",
    aliases: ["loan origination", "mortgage origination", "lending fee", "processing fee"],
    weight: 78,
  },
  {
    id: "fee-resort",
    type: "FeeType",
    label: "Resort Fee",
    description: "Mandatory daily charge at hotels for amenities",
    aliases: ["destination fee", "amenity fee", "hotel resort charge", "facility fee"],
    weight: 75,
  },
  {
    id: "fee-junk",
    type: "FeeType",
    label: "Junk Fee",
    description: "Generic term for hidden, unnecessary, or inflated charges",
    aliases: ["hidden fee", "bogus charge", "surprise fee", "mystery charge", "extra fee"],
    weight: 95,
  },

  // Consumer Problems
  {
    id: "problem-non-disclosure",
    type: "ConsumerProblem",
    label: "Fee Non-Disclosure",
    description: "Fees not clearly disclosed before purchase or agreement",
    aliases: ["hidden charges", "undisclosed fees", "surprise charges", "no transparency"],
    weight: 95,
  },
  {
    id: "problem-inflated-fees",
    type: "ConsumerProblem",
    label: "Inflated Fees",
    description: "Fees charged well above market rate or actual cost",
    aliases: ["overcharged", "excessive fees", "price gouging", "marked up"],
    weight: 90,
  },
  {
    id: "problem-duplicate-charges",
    type: "ConsumerProblem",
    label: "Duplicate Charges",
    description: "Same fee or service charged more than once",
    aliases: ["double billed", "duplicate billing", "charged twice", "repeated charge"],
    weight: 88,
  },
  {
    id: "problem-bundled-services",
    type: "ConsumerProblem",
    label: "Bundled Unwanted Services",
    description: "Required purchase of services or products not wanted or needed",
    aliases: ["forced add-on", "package deal hidden fee", "bundling trick", "required extras"],
    weight: 85,
  },
  {
    id: "problem-auto-renewal",
    type: "ConsumerProblem",
    label: "Unauthorized Auto-Renewal",
    description: "Subscription or contract renewed without clear consent",
    aliases: ["auto-renew trap", "subscription trap", "cancelation obstruction", "dark pattern"],
    weight: 87,
  },

  // Negotiation Strategies
  {
    id: "strategy-itemized-breakdown",
    type: "NegotiationStrategy",
    label: "Request Itemized Breakdown",
    description: "Ask for every charge listed separately with justification",
    aliases: ["get itemized bill", "line-by-line breakdown", "detailed invoice"],
    weight: 90,
  },
  {
    id: "strategy-comparison-shopping",
    type: "NegotiationStrategy",
    label: "Comparison Shopping",
    description: "Get quotes from multiple providers to negotiate better terms",
    aliases: ["shop around", "get multiple quotes", "price comparison", "competitive bid"],
    weight: 85,
  },
  {
    id: "strategy-walk-away",
    type: "NegotiationStrategy",
    label: "Willingness to Walk Away",
    description: "Use the threat of leaving to negotiate better terms",
    aliases: ["walk away power", "leave the deal", "negotiating leverage", "don't sign"],
    weight: 92,
  },
  {
    id: "strategy-regulatory-threat",
    type: "NegotiationStrategy",
    label: "Cite Regulations",
    description: "Reference consumer protection laws and regulations during negotiation",
    aliases: ["know your rights", "cite the law", "consumer protection", "legal rights"],
    weight: 80,
  },
  {
    id: "strategy-total-cost-focus",
    type: "NegotiationStrategy",
    label: "Focus on Total Cost",
    description: "Negotiate based on total out-the-door price, not monthly payments",
    aliases: ["out the door price", "total cost negotiation", "all-in price", "final price"],
    weight: 88,
  },

  // Regulations
  {
    id: "reg-ftc-act",
    type: "Regulation",
    label: "FTC Act — Unfair or Deceptive Practices",
    description: "Federal law prohibiting unfair or deceptive acts in commerce",
    aliases: ["FTC Act", "unfair practices", "deceptive trade", "Section 5"],
    weight: 90,
  },
  {
    id: "reg-no-surprises",
    type: "Regulation",
    label: "No Surprises Act",
    description: "Federal law protecting against surprise medical billing",
    aliases: ["surprise billing protection", "medical bill law", "NSA", "balance billing ban"],
    weight: 88,
  },
  {
    id: "reg-cfpb",
    type: "Regulation",
    label: "CFPB Consumer Protection",
    description: "Consumer Financial Protection Bureau oversight of financial products",
    aliases: ["CFPB", "Consumer Financial Protection Bureau", "financial consumer protection"],
    weight: 85,
  },
  {
    id: "reg-rosenthal",
    type: "Regulation",
    label: "Rosenthal Fair Debt Collection Practices Act",
    description: "California law regulating debt collection practices",
    aliases: ["Rosenthal Act", "California debt collection", "FDCPA state equivalent"],
    weight: 65,
  },

  // Documents
  {
    id: "doc-purchase-agreement",
    type: "Document",
    label: "Purchase Agreement",
    description: "Contract for buying goods or services, especially vehicles",
    aliases: ["sales contract", "buyer's order", "purchase contract", "sales agreement"],
    weight: 90,
  },
  {
    id: "doc-medical-bill",
    type: "Document",
    label: "Medical Bill",
    description: "Invoice from healthcare provider for medical services",
    aliases: ["hospital bill", "doctor invoice", "medical statement", "healthcare invoice"],
    weight: 88,
  },
  {
    id: "doc-utility-bill",
    type: "Document",
    label: "Utility Bill",
    description: "Monthly statement for electricity, water, gas, or telecom services",
    aliases: ["electric bill", "water bill", "gas statement", "internet bill", "phone bill"],
    weight: 82,
  },
  {
    id: "doc-insurance-policy",
    type: "Document",
    label: "Insurance Policy",
    description: "Insurance contract with coverage terms and premium details",
    aliases: ["insurance contract", "policy document", "coverage agreement", "premium statement"],
    weight: 78,
  },
  {
    id: "doc-subscription-agreement",
    type: "Document",
    label: "Subscription Agreement",
    description: "Service contract with recurring billing terms",
    aliases: ["SaaS agreement", "membership terms", "streaming contract", "recurring billing terms"],
    weight: 80,
  },
  {
    id: "doc-lease-agreement",
    type: "Document",
    label: "Lease Agreement",
    description: "Rental contract for housing or vehicle lease",
    aliases: ["rental agreement", "apartment lease", "car lease", "rent contract"],
    weight: 82,
  },

  // Questions
  {
    id: "question-negotiability",
    type: "Question",
    label: "Are hidden fees negotiable?",
    description: "Consumer question about whether fees can be negotiated down or removed",
    aliases: ["can I negotiate fees", "are fees negotiable", "negotiate hidden charges"],
    weight: 92,
  },
  {
    id: "question-legality",
    type: "Question",
    label: "Are hidden fees illegal?",
    description: "Consumer question about the legality of undisclosed or inflated fees",
    aliases: ["are hidden fees legal", "is this fee legal", "illegal fees", "consumer law fees"],
    weight: 90,
  },
  {
    id: "question-dispute",
    type: "Question",
    label: "How do I dispute a hidden fee?",
    description: "Consumer question about steps to challenge a fee after being charged",
    aliases: ["dispute fee", "challenge charge", "fight hidden fee", "get money back fee"],
    weight: 88,
  },
  {
    id: "question-find",
    type: "Question",
    label: "How do I find hidden fees in a contract?",
    description: "Consumer question about identifying hidden charges before signing",
    aliases: ["spot hidden fees", "find hidden charges", "identify hidden costs", "scan contract"],
    weight: 85,
  },
  {
    id: "question-doc-fee-reasonable",
    type: "Question",
    label: "What is a reasonable documentation fee?",
    description: "Consumer question about what constitutes a fair documentation fee",
    aliases: ["fair doc fee", "reasonable documentation charge", "doc fee cap", "doc fee range"],
    weight: 80,
  },

  // Analyzers
  {
    id: "analyzer-automotive",
    type: "Analyzer",
    label: "Automotive Purchase Analyzer",
    description: "AI analysis engine for car purchase agreements and financing contracts",
    aliases: ["car purchase analyzer", "auto contract scanner", "dealership fee detector"],
    weight: 90,
  },
  {
    id: "analyzer-medical",
    type: "Analyzer",
    label: "Medical Bill Analyzer",
    description: "AI analysis engine for hospital and medical service invoices",
    aliases: ["medical bill scanner", "hospital invoice analyzer", "healthcare cost auditor"],
    weight: 85,
  },
  {
    id: "analyzer-contract",
    type: "Analyzer",
    label: "General Contract Analyzer",
    description: "AI analysis engine for any contract containing potential hidden fees",
    aliases: ["contract scanner", "document analyzer", "fee detector", "cost auditor"],
    weight: 95,
  },
];

// ── All Edges (Relationships) ──────────────────────────────────────────────

export const EDGES: GraphEdge[] = [
  // Documentation Fee → Automotive
  { from: "fee-documentation", to: "industry-automotive", relationship: "FOUND_IN", bidirectional: true, strength: 95, evidence: "Common in car purchase agreements" },

  // Documentation Fee → Purchase Agreement
  { from: "fee-documentation", to: "doc-purchase-agreement", relationship: "APPEARS_ON", bidirectional: true, strength: 93 },

  // Documentation Fee → Negotiable
  { from: "fee-documentation", to: "question-negotiability", relationship: "RELATED_TO", bidirectional: true, strength: 90 },

  // Documentation Fee → Negotiation Strategy
  { from: "fee-documentation", to: "strategy-itemized-breakdown", relationship: "RESOLVED_BY", bidirectional: false, strength: 88 },

  // Documentation Fee → Consumer Questions
  { from: "fee-documentation", to: "question-doc-fee-reasonable", relationship: "ANSWERS", bidirectional: false, strength: 85 },

  // Dealer Prep → Automotive
  { from: "fee-dealer-prep", to: "industry-automotive", relationship: "FOUND_IN", bidirectional: true, strength: 90 },

  // Dealer Prep → Negotiation Strategy
  { from: "fee-dealer-prep", to: "strategy-walk-away", relationship: "RESOLVED_BY", bidirectional: false, strength: 85 },

  // Dealer Prep → Non-Disclosure
  { from: "fee-dealer-prep", to: "problem-non-disclosure", relationship: "CAUSED_BY", bidirectional: true, strength: 82 },

  // Facility Fee → Healthcare
  { from: "fee-facility", to: "industry-healthcare", relationship: "FOUND_IN", bidirectional: true, strength: 92 },

  // Facility Fee → Medical Bill
  { from: "fee-facility", to: "doc-medical-bill", relationship: "APPEARS_ON", bidirectional: true, strength: 90 },

  // Facility Fee → No Surprises Act
  { from: "fee-facility", to: "reg-no-surprises", relationship: "REGULATED_BY", bidirectional: true, strength: 85 },

  // Facility Fee → Consumer Problems
  { from: "fee-facility", to: "problem-non-disclosure", relationship: "CAUSED_BY", bidirectional: true, strength: 88 },

  // Overdraft Fee → Banking
  { from: "fee-overdraft", to: "industry-banking", relationship: "FOUND_IN", bidirectional: true, strength: 88 },

  // Overdraft Fee → CFPB
  { from: "fee-overdraft", to: "reg-cfpb", relationship: "REGULATED_BY", bidirectional: true, strength: 82 },

  // Overdraft Fee → Inflated Fees
  { from: "fee-overdraft", to: "problem-inflated-fees", relationship: "CAUSED_BY", bidirectional: true, strength: 85 },

  // Early Termination → Subscriptions
  { from: "fee-early-termination", to: "industry-subscriptions", relationship: "FOUND_IN", bidirectional: true, strength: 85 },

  // Early Termination → Subscription Agreement
  { from: "fee-early-termination", to: "doc-subscription-agreement", relationship: "APPEARS_ON", bidirectional: true, strength: 83 },

  // Early Termination → FTC Act
  { from: "fee-early-termination", to: "reg-ftc-act", relationship: "REGULATED_BY", bidirectional: true, strength: 75 },

  // Late Payment → Multiple Industries
  { from: "fee-late-payment", to: "industry-banking", relationship: "FOUND_IN", bidirectional: true, strength: 80 },
  { from: "fee-late-payment", to: "industry-subscriptions", relationship: "FOUND_IN", bidirectional: true, strength: 78 },
  { from: "fee-late-payment", to: "industry-utilities", relationship: "FOUND_IN", bidirectional: true, strength: 78 },
  { from: "fee-late-payment", to: "industry-housing", relationship: "FOUND_IN", bidirectional: true, strength: 75 },

  // Origination Fee → Housing + Banking
  { from: "fee-origination", to: "industry-housing", relationship: "FOUND_IN", bidirectional: true, strength: 85 },
  { from: "fee-origination", to: "industry-banking", relationship: "FOUND_IN", bidirectional: true, strength: 82 },

  // Surcharge → Utilities
  { from: "fee-surcharge", to: "industry-utilities", relationship: "FOUND_IN", bidirectional: true, strength: 88 },
  { from: "fee-surcharge", to: "doc-utility-bill", relationship: "APPEARS_ON", bidirectional: true, strength: 85 },

  // Surcharge → Non-Disclosure
  { from: "fee-surcharge", to: "problem-non-disclosure", relationship: "CAUSED_BY", bidirectional: true, strength: 84 },

  // Junk Fee → All problems
  { from: "fee-junk", to: "problem-non-disclosure", relationship: "MANIFESTS_AS", bidirectional: true, strength: 92 },
  { from: "fee-junk", to: "problem-inflated-fees", relationship: "MANIFESTS_AS", bidirectional: true, strength: 90 },
  { from: "fee-junk", to: "problem-duplicate-charges", relationship: "MANIFESTS_AS", bidirectional: true, strength: 78 },
  { from: "fee-junk", to: "problem-bundled-services", relationship: "MANIFESTS_AS", bidirectional: true, strength: 82 },
  { from: "fee-junk", to: "problem-auto-renewal", relationship: "MANIFESTS_AS", bidirectional: true, strength: 75 },

  // Junk Fee → FTC Act
  { from: "fee-junk", to: "reg-ftc-act", relationship: "REGULATED_BY", bidirectional: true, strength: 88 },

  // Purchase Agreement → Automotive Analyzer
  { from: "doc-purchase-agreement", to: "analyzer-automotive", relationship: "ANALYZED_BY", bidirectional: true, strength: 92 },

  // Medical Bill → Medical Analyzer
  { from: "doc-medical-bill", to: "analyzer-medical", relationship: "ANALYZED_BY", bidirectional: true, strength: 90 },

  // All documents → Contract Analyzer
  { from: "doc-purchase-agreement", to: "analyzer-contract", relationship: "ANALYZED_BY", bidirectional: true, strength: 88 },
  { from: "doc-medical-bill", to: "analyzer-contract", relationship: "ANALYZED_BY", bidirectional: true, strength: 82 },
  { from: "doc-utility-bill", to: "analyzer-contract", relationship: "ANALYZED_BY", bidirectional: true, strength: 80 },
  { from: "doc-insurance-policy", to: "analyzer-contract", relationship: "ANALYZED_BY", bidirectional: true, strength: 78 },
  { from: "doc-subscription-agreement", to: "analyzer-contract", relationship: "ANALYZED_BY", bidirectional: true, strength: 80 },
  { from: "doc-lease-agreement", to: "analyzer-contract", relationship: "ANALYZED_BY", bidirectional: true, strength: 83 },

  // Strategies resolve problems
  { from: "problem-non-disclosure", to: "strategy-itemized-breakdown", relationship: "RESOLVED_BY", bidirectional: false, strength: 88 },
  { from: "problem-inflated-fees", to: "strategy-comparison-shopping", relationship: "RESOLVED_BY", bidirectional: false, strength: 85 },
  { from: "problem-bundled-services", to: "strategy-walk-away", relationship: "RESOLVED_BY", bidirectional: false, strength: 80 },
  { from: "problem-auto-renewal", to: "strategy-regulatory-threat", relationship: "RESOLVED_BY", bidirectional: false, strength: 78 },

  // Questions connect to strategies
  { from: "question-negotiability", to: "strategy-itemized-breakdown", relationship: "ANSWERED_BY", bidirectional: false, strength: 85 },
  { from: "question-dispute", to: "strategy-regulatory-threat", relationship: "ANSWERED_BY", bidirectional: false, strength: 82 },
  { from: "question-find", to: "strategy-itemized-breakdown", relationship: "ANSWERED_BY", bidirectional: false, strength: 80 },
];

// ── Graph Queries ──────────────────────────────────────────────────────────

export function findNodesByType(type: NodeType): GraphNode[] {
  return NODES.filter((n) => n.type === type);
}

export function findConnectedNodes(nodeId: string): { node: GraphNode; edges: GraphEdge[] } {
  const edges = EDGES.filter((e) => e.from === nodeId || e.to === nodeId);
  const connectedIds = new Set(edges.map((e) => (e.from === nodeId ? e.to : e.from)));
  const nodes = NODES.filter((n) => connectedIds.has(n.id));
  return { node: NODES.find((n) => n.id === nodeId)!, edges };
}

export function findPath(fromId: string, toId: string, maxDepth = 3): GraphEdge[][] {
  const paths: GraphEdge[][] = [];
  const visited = new Set<string>();

  function dfs(current: string, target: string, currentPath: GraphEdge[], depth: number) {
    if (depth > maxDepth || visited.has(current)) return;
    if (current === target) {
      paths.push([...currentPath]);
      return;
    }

    visited.add(current);
    const outgoing = EDGES.filter(
      (e) => (e.from === current || (e.bidirectional && e.to === current)),
    );

    for (const edge of outgoing) {
      const next = edge.from === current ? edge.to : edge.from;
      dfs(next, target, [...currentPath, edge], depth + 1);
    }

    visited.delete(current);
  }

  dfs(fromId, toId, [], 0);
  return paths;
}

export function findFeesByIndustry(industryId: string): GraphNode[] {
  const edges = EDGES.filter(
    (e) =>
      (e.from === industryId && e.relationship === "FOUND_IN") ||
      (e.to === industryId && e.relationship === "FOUND_IN" && e.bidirectional),
  );
  const feeIds = new Set(edges.map((e) => (e.from.includes("fee-") ? e.from : e.to)));
  return NODES.filter((n) => feeIds.has(n.id));
}

export function findRegulationsByFee(feeId: string): GraphNode[] {
  const edges = EDGES.filter((e) => e.from === feeId && e.relationship === "REGULATED_BY");
  return NODES.filter((n) => edges.some((e) => e.to === n.id));
}

export function findStrategiesByProblem(problemId: string): GraphNode[] {
  const edges = EDGES.filter((e) => e.from === problemId && e.relationship === "RESOLVED_BY");
  return NODES.filter((n) => edges.some((e) => e.to === n.id));
}

// ── Graph Statistics ───────────────────────────────────────────────────────

export function computeGraphStats() {
  const nodeCount = NODES.length;
  const edgeCount = EDGES.length;
  const nodeTypes = [...new Set(NODES.map((n) => n.type))].length;
  const industries = findNodesByType("Industry").length;
  const feeTypes = findNodesByType("FeeType").length;
  const regulations = findNodesByType("Regulation").length;
  const questions = findNodesByType("Question").length;
  const strategies = findNodesByType("NegotiationStrategy").length;
  const averageDegree = Math.round((edgeCount * 2) / nodeCount * 10) / 10;

  return {
    totalNodes: nodeCount,
    totalEdges: edgeCount,
    nodeTypes,
    industries,
    feeTypes,
    regulations,
    questions,
    strategies,
    averageDegree,
    density: Math.round((edgeCount / (nodeCount * (nodeCount - 1) / 2)) * 1000) / 1000,
  };
}

export const KNOWLEDGE_GRAPH_VERSION = "2.0.0";