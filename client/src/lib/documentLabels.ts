/**
 * Document type aware labels for the audit report.
 * Never hardcode "Your Contract Was Analyzed" — match the document type.
 */

export type DocTypeCategory = "contract" | "invoice" | "bill" | "lease" | "agreement" | "loan" | "insurance" | "subscription" | "receipt" | "statement" | "unknown";

function categorizeDocumentType(raw: string): DocTypeCategory {
  const lower = raw.toLowerCase();
  if (lower.includes("contract") || lower.includes("agreement") || lower.includes("terms")) return "contract";
  if (lower.includes("invoice") || lower.includes("receipt")) return "invoice";
  if (lower.includes("bill") || lower.includes("utility") || lower.includes("phone") || lower.includes("cable") || lower.includes("internet")) return "bill";
  if (lower.includes("lease") || lower.includes("rental") || lower.includes("rent")) return "lease";
  if (lower.includes("loan") || lower.includes("mortgage") || lower.includes("credit")) return "loan";
  if (lower.includes("insurance") || lower.includes("policy") || lower.includes("coverage")) return "insurance";
  if (lower.includes("subscription") || lower.includes("membership") || lower.includes("plan")) return "subscription";
  if (lower.includes("receipt") || lower.includes("purchase") || lower.includes("order")) return "receipt";
  if (lower.includes("statement") || lower.includes("bank") || lower.includes("credit card")) return "statement";
  return "unknown";
}

const documentVerbs: Record<DocTypeCategory, string> = {
  contract: "Analyzed",
  invoice: "Audited",
  bill: "Reviewed",
  lease: "Examined",
  agreement: "Analyzed",
  loan: "Reviewed",
  insurance: "Examined",
  subscription: "Reviewed",
  receipt: "Checked",
  statement: "Analyzed",
  unknown: "Analyzed",
};

const documentNouns: Record<DocTypeCategory, string> = {
  contract: "Contract",
  invoice: "Invoice",
  bill: "Bill",
  lease: "Lease",
  agreement: "Agreement",
  loan: "Loan Document",
  insurance: "Insurance Policy",
  subscription: "Subscription",
  receipt: "Receipt",
  statement: "Statement",
  unknown: "Document",
};

export function getReportTitle(documentType: string): string {
  const cat = categorizeDocumentType(documentType);
  const noun = documentNouns[cat];
  const verb = documentVerbs[cat];
  return `We ${verb} Your ${noun}`;
}

export function getReportActionLine(documentType: string, totalIssues: number): string {
  const cat = categorizeDocumentType(documentType);
  const noun = documentNouns[cat].toLowerCase();
  if (totalIssues === 0) return `We found no issues in your ${noun}.`;
  if (totalIssues === 1) return `We found 1 issue in your ${noun} that may require your attention.`;
  return `We found ${totalIssues} issues in your ${noun} that may cost you money.`;
}

export function getAnalysisDescription(documentType: string, issuer?: string): string {
  const cat = categorizeDocumentType(documentType);
  const lower = documentType.toLowerCase();
  const baseAction: Record<DocTypeCategory, string> = {
    contract: "We analyzed your agreement for hidden fees, risky clauses, pricing uncertainty, and negotiation opportunities.",
    invoice: "We examined every line item in your bill for overcharges, hidden fees, math errors, and duplicate charges.",
    bill: "We reviewed your bill for hidden fees, overcharges, math errors, and pricing issues.",
    lease: "We examined your lease agreement for hidden fees, escalating clauses, and unfavorable terms.",
    agreement: "We analyzed your agreement for hidden fees, risky clauses, pricing uncertainty, and negotiation opportunities.",
    loan: "We reviewed your loan document for hidden fees, prepayment penalties, and unfavorable interest terms.",
    insurance: "We examined your policy for hidden fees, coverage gaps, and unusual exclusions.",
    subscription: "We reviewed your subscription for hidden charges, auto-renewal traps, and price increases.",
    receipt: "We checked your receipt for overcharges, math errors, and duplicate items.",
    statement: "We analyzed your statement for hidden fees, math errors, and unusual charges.",
    unknown: `We analyzed your ${lower} for hidden fees, risky clauses, pricing uncertainty, and negotiation opportunities.`,
  };
  const issuerSuffix = issuer ? ` (with ${issuer})` : "";
  return `${baseAction[cat]}${issuerSuffix}`;
}