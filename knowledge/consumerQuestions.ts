// HiddenFeeAI — Consumer Question Database
// Stores common consumer questions about hidden fees, deceptive pricing,
// contracts, and charges. Each question connects to the fee database,
// educational answers, and relevant analyzers.

import { NODES, EDGES, type GraphNode, findNodesByType } from "./knowledgeGraph";

// ── Types ──────────────────────────────────────────────────────────────────

export interface ConsumerQuestion {
  id: string;
  question: string;
  shortAnswer: string;            // 1-2 sentence answer for snippets
  detailedAnswer: string;         // Comprehensive answer
  industry: string[];
  feeCategories: string[];
  relatedQuestions: string[];
  connectedAnalyzer: string | null; // Which analyzer tool helps answer this
  knowledgeGraphNodes: string[];   // Connected graph node IDs
  searchVolume: "High" | "Medium" | "Low";
  answerType: "yes_no" | "explanation" | "how_to" | "comparison" | "negotiation";
  featuredSnippetPotential: boolean;
}

// ── All Consumer Questions ─────────────────────────────────────────────────

export const CONSUMER_QUESTIONS: ConsumerQuestion[] = [
  {
    id: "q-001",
    question: "Can a dealership charge a documentation fee?",
    shortAnswer: "Yes, dealerships can charge documentation fees, but they must disclose them and the amount varies by state. Many states cap doc fees, and they are almost always negotiable.",
    detailedAnswer: "Yes, car dealerships are legally allowed to charge documentation fees for processing the paperwork involved in a vehicle purchase. However, there's a wide range in what's charged — from $85 in states with caps (like California) to over $1,000 in unregulated states. Documentation fees cover title processing, registration, and legal paperwork. Importantly, these fees are separate from government-mandated title and registration charges. Consumers should always request an itemized breakdown of the doc fee, compare across dealerships, and negotiate the fee down. Some states require dealers to post their doc fee publicly, and charging above what's posted may violate consumer protection laws. HiddenFeeAI's document analyzer can flag inflated doc fees in your purchase agreement and provide negotiation strategies.",
    industry: ["automotive"],
    feeCategories: ["documentation_fee", "dealer_fee"],
    relatedQuestions: ["q-002", "q-003", "q-016"],
    connectedAnalyzer: "analyzer-automotive",
    knowledgeGraphNodes: ["fee-documentation", "industry-automotive", "question-negotiability"],
    searchVolume: "High",
    answerType: "yes_no",
    featuredSnippetPotential: true,
  },
  {
    id: "q-002",
    question: "Are hidden fees illegal?",
    shortAnswer: "Hidden fees are not automatically illegal, but fees that are not clearly disclosed before purchase may violate federal and state consumer protection laws against unfair or deceptive practices.",
    detailedAnswer: "Hidden fees exist in a legal gray area. While charging fees is generally legal, the way fees are disclosed (or not disclosed) determines legality. Under the FTC Act, 'unfair or deceptive acts or practices' in commerce are prohibited. If a fee is buried in fine print, not mentioned until after purchase, or described in misleading terms, it may be illegal. The Consumer Financial Protection Bureau (CFPB) has specifically targeted 'junk fees' in banking, and the No Surprises Act protects against hidden medical billing. State consumer protection laws may provide additional protections. The key factors are: was the fee disclosed before purchase? Was the description clear and accurate? Is the fee reasonable for the service provided? HiddenFeeAI helps consumers identify fees that may violate these standards by analyzing documents for non-disclosure patterns and comparing fees against market benchmarks.",
    industry: ["automotive", "housing", "healthcare", "banking", "insurance", "subscriptions", "utilities"],
    feeCategories: ["hidden_fee", "junk_fee"],
    relatedQuestions: ["q-001", "q-004", "q-005"],
    connectedAnalyzer: "analyzer-contract",
    knowledgeGraphNodes: ["fee-junk", "reg-ftc-act", "question-legality"],
    searchVolume: "High",
    answerType: "explanation",
    featuredSnippetPotential: true,
  },
  {
    id: "q-003",
    question: "Can I negotiate dealer fees when buying a car?",
    shortAnswer: "Yes, most dealer fees are negotiable — including documentation fees, preparation fees, and add-ons. The key is to negotiate the 'out the door' total price rather than individual line items.",
    detailedAnswer: "Absolutely. While dealerships often present fees as 'mandatory' or 'non-negotiable,' the vast majority are flexible — especially documentation fees, dealer preparation fees, VIN etching charges, and extended warranty markups. The most effective negotiation strategy is to focus on the total 'out the door' price rather than haggling over individual fees. This forces the dealer to be transparent about the full cost and prevents them from removing one fee only to inflate another. Timing matters: shopping at the end of the month, quarter, or year increases leverage as dealers push to meet sales quotas. Getting pre-approved financing from your bank or credit union removes the dealer's ability to profit from financing markups. Most importantly, being genuinely willing to walk away is the single strongest negotiation tool — dealers will often drop hundreds or thousands in fees rather than lose a sale.",
    industry: ["automotive"],
    feeCategories: ["documentation_fee", "dealer_fee", "add_on_fee"],
    relatedQuestions: ["q-001", "q-016"],
    connectedAnalyzer: "analyzer-automotive",
    knowledgeGraphNodes: ["fee-documentation", "strategy-walk-away", "strategy-total-cost-focus", "question-negotiability"],
    searchVolume: "High",
    answerType: "negotiation",
    featuredSnippetPotential: true,
  },
  {
    id: "q-004",
    question: "How do I find hidden charges in a contract?",
    shortAnswer: "Scan for vague fee descriptions, check the fine print for mandatory add-ons, calculate the total cost over the full term, and compare it against the advertised price to identify discrepancies.",
    detailedAnswer: "Finding hidden charges in a contract requires a systematic approach. First, request an itemized breakdown of every charge — reputable providers should provide this willingly. Second, look for vague descriptions like 'processing fee,' 'administrative charge,' 'service fee,' or 'regulatory surcharge' that aren't clearly explained. Third, calculate the total cost over the entire contract term (not just monthly payments) — this often reveals fees that seem small monthly but add up significantly. Fourth, compare the final total against the originally advertised or quoted price — any discrepancy is a red flag. Fifth, look for mandatory add-ons, automatic renewal clauses with price increases, and early termination penalties buried in fine print. HiddenFeeAI automates this entire process using AI, scanning your documents for fee patterns, comparing against benchmarks, and producing an evidence-backed audit report that flags every questionable charge with negotiation guidance.",
    industry: ["automotive", "housing", "insurance", "banking", "subscriptions"],
    feeCategories: ["hidden_fee", "administrative_fee", "early_termination_fee"],
    relatedQuestions: ["q-005", "q-006"],
    connectedAnalyzer: "analyzer-contract",
    knowledgeGraphNodes: ["problem-non-disclosure", "strategy-itemized-breakdown", "question-find"],
    searchVolume: "High",
    answerType: "how_to",
    featuredSnippetPotential: true,
  },
  {
    id: "q-005",
    question: "What is a facility fee on my medical bill?",
    shortAnswer: "A facility fee is a separate charge added by hospitals for using their facility — even for routine office visits. These fees can add $50-$500+ per visit and are often not covered by insurance.",
    detailedAnswer: "Facility fees are charges hospitals and health systems add to medical bills for the use of their physical facility, separate from the physician's professional fee. They originated as a way for hospitals to cover overhead costs, but they've become a significant source of surprise billing. When a doctor's practice is owned by a hospital system, even a routine office visit can incur a facility fee — sometimes doubling the cost of the appointment. These fees are particularly common in hospital outpatient departments and can range from $50 to over $500 per visit. The No Surprises Act (effective 2022) provides some protection by banning surprise facility fees in emergency situations and requiring good faith estimates for scheduled care. Before any appointment, ask whether a facility fee will be charged and whether the same service is available at a non-hospital location without the fee. If you receive an unexpected facility fee, you can dispute it with the provider and your insurance company.",
    industry: ["healthcare"],
    feeCategories: ["service_fee", "administrative_fee", "hidden_fee"],
    relatedQuestions: ["q-007", "q-008"],
    connectedAnalyzer: "analyzer-medical",
    knowledgeGraphNodes: ["fee-facility", "industry-healthcare", "reg-no-surprises"],
    searchVolume: "Medium",
    answerType: "explanation",
    featuredSnippetPotential: true,
  },
  {
    id: "q-006",
    question: "What are all these extra charges on my utility bill?",
    shortAnswer: "Common hidden charges on utility bills include regulatory cost recovery fees, universal service fund contributions, franchise fees, administrative processing charges, and below-the-line taxes that can add 10-30% to your rate.",
    detailedAnswer: "Utility bills often include a confusing array of charges beyond the base rate for service. Common hidden or obscured charges include: Regulatory Cost Recovery Fees (the utility's cost of complying with government regulations, passed to you), Universal Service Fund fees (federal/state programs to subsidize service in rural areas), Franchise Fees (paid to local governments for the right to operate, passed to customers), Administrative Processing Fees (paper billing, payment processing), and various taxes and surcharges listed 'below the line.' These can add 10-30% to your stated rate. Most of these charges are legal and disclosed in tariff filings, but the disclosure is often in fine print. To challenge them: request a detailed explanation of each charge from your provider, compare rates with competitors (energy choice states let you switch suppliers), and check your state public utility commission's website for allowed fees. Some fees, like 'paper bill fees,' can be avoided by switching to electronic billing.",
    industry: ["utilities"],
    feeCategories: ["surcharge", "regulatory_fee", "administrative_fee"],
    relatedQuestions: ["q-009", "q-012"],
    connectedAnalyzer: "analyzer-contract",
    knowledgeGraphNodes: ["fee-surcharge", "industry-utilities", "problem-non-disclosure"],
    searchVolume: "Medium",
    answerType: "explanation",
    featuredSnippetPotential: true,
  },
  {
    id: "q-007",
    question: "How do I dispute a medical bill?",
    shortAnswer: "Request an itemized bill, check for errors (duplicate charges, incorrect codes, unbundled services), compare against your insurance EOB, and contact the billing department with specific disputes. Escalate to your insurance or state regulator if needed.",
    detailedAnswer: "Disputing a medical bill requires a methodical approach. Start by requesting a detailed, itemized bill from the provider — you have a legal right to this. Review it line by line, looking for: duplicate charges (same service billed twice), upcoding (billed for a more expensive service than received), unbundling (services that should be billed as a package but are listed separately), charges for services you didn't receive, and facility fees that weren't disclosed. Compare every line against your insurance Explanation of Benefits (EOB). If you find discrepancies, contact the provider's billing department in writing, citing specific charges and why you're disputing them. If the provider won't resolve it, contact your insurance company and file a formal appeal. For persistent issues, file a complaint with your state's insurance commissioner or attorney general's office. The No Surprises Act also provides a dispute resolution process for certain surprise bills. HiddenFeeAI can automate the document analysis portion — upload your medical bill to automatically flag questionable charges.",
    industry: ["healthcare"],
    feeCategories: ["hidden_fee", "service_fee"],
    relatedQuestions: ["q-005", "q-008"],
    connectedAnalyzer: "analyzer-medical",
    knowledgeGraphNodes: ["question-dispute", "strategy-itemized-breakdown", "doc-medical-bill"],
    searchVolume: "High",
    answerType: "how_to",
    featuredSnippetPotential: true,
  },
  {
    id: "q-008",
    question: "What is a reasonable documentation fee?",
    shortAnswer: "A reasonable documentation fee is $100-$200 in unregulated states. Some states cap these fees (e.g., California caps at $85). Anything over $500 is likely excessive and should be negotiated down.",
    detailedAnswer: "Documentation fee reasonableness depends on your state. States with regulated caps include California ($85), New York ($175), and others with limits between $75-$300. In unregulated states, $100-$200 is considered reasonable and reflects actual paperwork processing costs. Fees above $500 are almost certainly inflated and represent pure dealer profit. The national average doc fee is approximately $350-400, but this average includes highly inflated fees that skew the number upward. To determine if a doc fee is reasonable: check your state's DMV or consumer protection website for any caps, compare fees across multiple dealerships (doc fees are often posted or available upon request), and ask the dealer to explain exactly what the fee covers — vague answers are a red flag. Even in unregulated states, you can negotiate doc fees by comparing with other dealers, timing your purchase, or simply refusing to pay the inflated amount. HiddenFeeAI flags inflated doc fees by comparing the amount against state benchmarks.",
    industry: ["automotive"],
    feeCategories: ["documentation_fee"],
    relatedQuestions: ["q-001", "q-003"],
    connectedAnalyzer: "analyzer-automotive",
    knowledgeGraphNodes: ["fee-documentation", "question-doc-fee-reasonable"],
    searchVolume: "Medium",
    answerType: "explanation",
    featuredSnippetPotential: true,
  },
  {
    id: "q-009",
    question: "Should I pay a dealer preparation fee?",
    shortAnswer: "No. Dealer preparation fees cover standard business costs (cleaning, inspection, fueling) that should be included in the vehicle's selling price. These fees are almost always removable through negotiation.",
    detailedAnswer: "No, you should not pay a dealer preparation fee. These fees — also called 'prep fees' or 'dealer prep' — are charges for tasks that are standard operating costs for any dealership: cleaning the vehicle, performing a pre-delivery inspection, topping off fluids, and fueling the car. These costs are already factored into the dealership's business model and should be included in the vehicle's advertised price. Charging them separately effectively double-charges the customer. Prep fees typically range from $200-$800 on the itemized bill. When you see this charge, simply tell the dealer you won't pay it. If they insist it's mandatory, ask them to reduce the vehicle's selling price by the same amount — the net result is the same. Most dealers will remove the fee rather than lose a sale. If a dealer absolutely refuses, consider walking away — a dealership that won't budge on a clearly bogus fee is likely padding other charges too.",
    industry: ["automotive"],
    feeCategories: ["dealer_fee", "service_fee"],
    relatedQuestions: ["q-003", "q-016"],
    connectedAnalyzer: "analyzer-automotive",
    knowledgeGraphNodes: ["fee-dealer-prep", "strategy-walk-away"],
    searchVolume: "Medium",
    answerType: "yes_no",
    featuredSnippetPotential: true,
  },
  {
    id: "q-010",
    question: "What is a junk fee?",
    shortAnswer: "A junk fee is a charge that is hidden, inflated, or unnecessary — added by companies to increase profits without providing corresponding value. The CFPB and FTC actively target junk fees in banking, housing, and other industries.",
    detailedAnswer: "The term 'junk fee' describes charges that are hidden from consumers until payment, inflated well beyond the actual cost of the service provided, or entirely unnecessary. The Consumer Financial Protection Bureau (CFPB) defines junk fees as fees that 'far exceed the marginal cost of the service they purport to cover.' Common examples include excessive overdraft fees, resort fees at hotels, convenience fees for paying bills online, and inflated documentation fees at car dealerships. The Biden administration and CFPB launched a major initiative against junk fees in 2022-2025, resulting in new rules for banking, ticketing, and housing. Key regulations: the CFPB's overdraft fee rule, the FTC's proposed rule on unfair or deceptive fees, and various state-level junk fee laws. Junk fees collectively cost American consumers tens of billions of dollars annually. HiddenFeeAI is designed specifically to detect these types of charges in your documents by comparing fees against market benchmarks and flagging any that are excessive or poorly disclosed.",
    industry: ["banking", "automotive", "housing", "subscriptions"],
    feeCategories: ["junk_fee", "hidden_fee"],
    relatedQuestions: ["q-002"],
    connectedAnalyzer: "analyzer-contract",
    knowledgeGraphNodes: ["fee-junk", "reg-ftc-act", "reg-cfpb"],
    searchVolume: "Medium",
    answerType: "explanation",
    featuredSnippetPotential: true,
  },
  {
    id: "q-011",
    question: "What bank fees can I avoid?",
    shortAnswer: "You can avoid overdraft fees (opt out of coverage), monthly maintenance fees (meet minimum balance or set up direct deposit), ATM fees (use in-network ATMs), paper statement fees (go paperless), and wire transfer fees (use ACH instead).",
    detailedAnswer: "Most common bank fees are avoidable with the right strategies. Overdraft fees ($30-35 per occurrence): opt out of overdraft coverage entirely — if you don't opt in, debit card transactions will simply be declined rather than triggering a fee. Monthly maintenance fees ($5-15/month): meet minimum balance requirements, set up direct deposit, or switch to a fee-free online bank. ATM fees ($3-5 per out-of-network transaction): use only your bank's ATM network or choose a bank that reimburses ATM fees. Paper statement fees ($1-3/month): switch to electronic statements. Wire transfer fees ($15-50): use ACH transfers which are typically free, or use services like Zelle. Foreign transaction fees (1-3%): use a travel-friendly credit card with no foreign transaction fees. Inactivity fees: make at least one transaction per year. The CFPB estimates that Americans pay over $15 billion annually in overdraft and NSF fees alone. HiddenFeeAI can analyze your bank statements to identify recurring fees you might not notice month to month.",
    industry: ["banking"],
    feeCategories: ["overdraft_fee", "late_payment_fee", "inactivity_fee", "annual_fee"],
    relatedQuestions: ["q-012", "q-013"],
    connectedAnalyzer: "analyzer-contract",
    knowledgeGraphNodes: ["fee-overdraft", "industry-banking", "reg-cfpb"],
    searchVolume: "High",
    answerType: "how_to",
    featuredSnippetPotential: true,
  },
  {
    id: "q-012",
    question: "Are subscription services allowed to add hidden fees?",
    shortAnswer: "Companies must disclose all fees before you subscribe under FTC rules. Hidden fees added after signup or buried in fine print may violate consumer protection laws. The FTC's 'click to cancel' rule requires easy cancellation.",
    detailedAnswer: "Subscription services are legally required to clearly disclose all fees and terms before you agree to subscribe. Under the FTC Act and various state consumer protection laws, 'negative option' billing (charging you for something you didn't explicitly agree to) is prohibited. The FTC's proposed 'click to cancel' rule (2025) requires companies to make cancellation as easy as signup. Common subscription fee traps include: price increases with vague notification (often via a 'terms update' email), automatic enrollment in premium tiers after a free trial, bundled services you didn't request, and fees that appear mid-contract without clear consent. To protect yourself: always read the full terms before subscribing, take screenshots of the advertised price, check your first bill against what was promised, and set calendar reminders before free trials end. If you're charged an undisclosed fee, dispute it with the company first, then with your credit card issuer using the Fair Credit Billing Act. HiddenFeeAI can analyze subscription agreements to flag auto-renewal traps and unclear fee structures.",
    industry: ["subscriptions"],
    feeCategories: ["hidden_fee", "early_termination_fee", "add_on_fee"],
    relatedQuestions: ["q-013", "q-014"],
    connectedAnalyzer: "analyzer-contract",
    knowledgeGraphNodes: ["fee-early-termination", "industry-subscriptions", "reg-ftc-act", "problem-auto-renewal"],
    searchVolume: "Medium",
    answerType: "explanation",
    featuredSnippetPotential: true,
  },
  {
    id: "q-013",
    question: "How to cancel a subscription with hidden fees?",
    shortAnswer: "Document each cancellation attempt, cite the FTC's 'click to cancel' rule, dispute the charges with your credit card company under the Fair Credit Billing Act, and file a complaint with the FTC if the company obstructs cancellation.",
    detailedAnswer: "Canceling a subscription that uses dark patterns to prevent cancellation requires persistence and documentation. Step 1: Find the cancellation method — check the company's website, app, or terms of service for the official cancellation process (even if it's deliberately hard to find). Step 2: Document everything — screenshot every page, save every email, and note dates and times of each cancellation attempt. Step 3: If the company makes cancellation difficult, cite the FTC's 'click to cancel' rule (effective 2025), which requires cancellation to be as simple as signup. Step 4: If they continue charging you, dispute the charges with your credit card company under the Fair Credit Billing Act (you have 60 days from the statement date). Step 5: File a complaint with the FTC at ReportFraud.ftc.gov and your state attorney general's office. Step 6: Consider using a virtual credit card or privacy.com for future subscriptions to control when and how much you're charged.",
    industry: ["subscriptions"],
    feeCategories: ["early_termination_fee", "hidden_fee"],
    relatedQuestions: ["q-012", "q-014"],
    connectedAnalyzer: "analyzer-contract",
    knowledgeGraphNodes: ["problem-auto-renewal", "strategy-regulatory-threat", "reg-ftc-act"],
    searchVolume: "Medium",
    answerType: "how_to",
    featuredSnippetPotential: true,
  },
  {
    id: "q-014",
    question: "Hidden fees in rental agreements — what to look for?",
    shortAnswer: "Watch for: non-refundable application fees, administrative move-in fees, pet rent (often beyond a deposit), utility billing markups, mandatory renter's insurance through a specific provider, and automatic renewal clauses with rent increases.",
    detailedAnswer: "Rental agreements can contain numerous hidden fees beyond the stated monthly rent. Key charges to scrutinize: Application Fees ($30-100 per applicant) — some states cap these, and they should only cover actual screening costs. Administrative/Move-in Fees ($200-500) — ask what this actually covers vs. what's already covered by your security deposit. Pet Fees — beyond a refundable deposit, many leases include 'pet rent' ($25-75/month per pet) which adds up significantly. Utility Billing Markups — if the landlord uses a third-party billing service (like RUBS), they may add 10-20% administrative markup. Mandatory Renter's Insurance — requiring coverage is normal, but requiring it through a specific provider that gives the landlord a kickback is problematic. Early Termination Fees — should be reasonable and clearly defined. Automatic Renewal Clauses — may lock you in with steep rent increases unless you give notice 60-90 days in advance. Common Area Maintenance Fees — in some leases, tenants pay for hallway/elevator maintenance separately from rent.",
    industry: ["housing"],
    feeCategories: ["administrative_fee", "hidden_fee", "early_termination_fee"],
    relatedQuestions: ["q-015", "q-004"],
    connectedAnalyzer: "analyzer-contract",
    knowledgeGraphNodes: ["industry-housing", "problem-non-disclosure", "doc-lease-agreement"],
    searchVolume: "Medium",
    answerType: "explanation",
    featuredSnippetPotential: true,
  },
  {
    id: "q-015",
    question: "Hidden fees in mortgage closing costs?",
    shortAnswer: "Common hidden mortgage fees include: origination fee markup, inflated appraisal fees, unnecessary discount points, excessive title insurance, and 'junk fees' like document preparation, courier, and administration fees. Always compare the Loan Estimate with the Closing Disclosure.",
    detailedAnswer: "Mortgage closing costs are a minefield of hidden and inflated fees. Federal law requires lenders to provide a Loan Estimate within 3 days of application and a Closing Disclosure 3 days before closing — comparing these documents is your best defense. Common hidden fees to watch for: Origination Fee Markup — the origination fee should be reasonable (typically 0.5-1% of the loan amount); anything over 1.5% is excessive. Processing/Underwriting Fees — these are lender overhead and are increasingly being eliminated by competitive lenders. Discount Points — make sure you understand how points affect your rate and whether they're worth the upfront cost. Appraisal Fee — lenders sometimes mark up the actual appraisal cost; ask to see the appraiser's invoice. Title Insurance — you can (and should) shop for title insurance rather than accepting the lender's preferred provider, which often charges 20-30% more. Junk Fees — document preparation, courier, administration, and 'settlement' fees that are pure padding. The CFPB estimates that 1 in 4 consumers find errors in their closing documents.",
    industry: ["housing"],
    feeCategories: ["origination_fee", "administrative_fee", "junk_fee", "hidden_fee"],
    relatedQuestions: ["q-014", "q-004"],
    connectedAnalyzer: "analyzer-contract",
    knowledgeGraphNodes: ["fee-origination", "industry-housing", "problem-inflated-fees"],
    searchVolume: "Medium",
    answerType: "explanation",
    featuredSnippetPotential: true,
  },
  {
    id: "q-016",
    question: "What fees can I remove from my car purchase?",
    shortAnswer: "The most removable car purchase fees are: documentation fees, dealer preparation fees, VIN etching, GAP insurance markup, extended warranties, paint protection, fabric protection, and nitrogen tire fills. Focus on total 'out the door' price when negotiating.",
    detailedAnswer: "When buying a car, many add-on fees are removable or drastically reducible. Documentation Fee: negotiate it down, especially if above your state's typical range. Dealer Preparation Fee: refuse to pay this entirely — it's the dealer's cost of doing business. VIN Etching: costs dealers under $10 but is charged at $200-500; refuse it or pay no more than $25. GAP Insurance: buy through your auto insurer instead — typically 80% cheaper than dealer pricing. Extended Warranties/Service Plans: almost always unnecessary and steeply marked up; decline at the finance office. Paint/Fabric Protection: essentially a wax job and Scotchgard application worth maybe $50, often charged at $500+. Nitrogen Tire Fill: a near-scam — regular air is 78% nitrogen already. Credit Life/Disability Insurance: high-commission add-ons that duplicate your existing coverage. Key strategy: negotiate the total 'out the door' price (including all taxes and fees) rather than monthly payments or individual line items. Be prepared to walk away — the power dynamic shifts dramatically when you demonstrate you'll leave.",
    industry: ["automotive"],
    feeCategories: ["documentation_fee", "dealer_fee", "add_on_fee", "junk_fee"],
    relatedQuestions: ["q-001", "q-003", "q-009"],
    connectedAnalyzer: "analyzer-automotive",
    knowledgeGraphNodes: ["fee-junk", "strategy-total-cost-focus", "strategy-walk-away", "question-negotiability"],
    searchVolume: "High",
    answerType: "how_to",
    featuredSnippetPotential: true,
  },
];

// ── Query Helpers ──────────────────────────────────────────────────────────

export function findQuestionsByIndustry(industry: string): ConsumerQuestion[] {
  return CONSUMER_QUESTIONS.filter((q) => q.industry.includes(industry));
}

export function findQuestionsByFeeCategory(feeCategory: string): ConsumerQuestion[] {
  return CONSUMER_QUESTIONS.filter((q) => q.feeCategories.includes(feeCategory));
}

export function findQuestionsByAnalyzer(analyzerId: string): ConsumerQuestion[] {
  return CONSUMER_QUESTIONS.filter((q) => q.connectedAnalyzer === analyzerId);
}

export function getFeaturedSnippetQuestions(): ConsumerQuestion[] {
  return CONSUMER_QUESTIONS.filter((q) => q.featuredSnippetPotential);
}

export function getHighVolumeQuestions(): ConsumerQuestion[] {
  return CONSUMER_QUESTIONS.filter((q) => q.searchVolume === "High");
}

export function getQuestionById(id: string): ConsumerQuestion | undefined {
  return CONSUMER_QUESTIONS.find((q) => q.id === id);
}

// ── Statistics ─────────────────────────────────────────────────────────────

export function computeQuestionStats() {
  const industries = new Set(CONSUMER_QUESTIONS.flatMap((q) => q.industry));
  const feeCategories = new Set(CONSUMER_QUESTIONS.flatMap((q) => q.feeCategories));
  const snippetReady = CONSUMER_QUESTIONS.filter((q) => q.featuredSnippetPotential).length;
  const highVolume = CONSUMER_QUESTIONS.filter((q) => q.searchVolume === "High").length;

  return {
    totalQuestions: CONSUMER_QUESTIONS.length,
    industriesCovered: industries.size,
    feeCategoriesCovered: feeCategories.size,
    featuredSnippetReady: snippetReady,
    featuredSnippetPercent: Math.round((snippetReady / CONSUMER_QUESTIONS.length) * 100),
    highVolumeQuestions: highVolume,
    answerTypes: {
      yes_no: CONSUMER_QUESTIONS.filter((q) => q.answerType === "yes_no").length,
      explanation: CONSUMER_QUESTIONS.filter((q) => q.answerType === "explanation").length,
      how_to: CONSUMER_QUESTIONS.filter((q) => q.answerType === "how_to").length,
      negotiation: CONSUMER_QUESTIONS.filter((q) => q.answerType === "negotiation").length,
    },
  };
}

export const CONSUMER_QUESTIONS_VERSION = "2.0.0";