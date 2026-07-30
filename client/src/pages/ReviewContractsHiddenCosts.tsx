import { FileSignature } from "lucide-react";
import { GuidePage } from "@/components/content/GuidePage";

export function ReviewContractsHiddenCosts() {
  return <GuidePage
    eyebrow="Contract cost review guide"
    title="How to find costs hidden in contract language"
    description="Review the clauses that can change what you pay after signing—from automatic renewals and price changes to cancellation charges, minimum commitments, and optional services."
    icon={FileSignature}
    sections={[
      { title: "Trace every way money can move", introduction: "The headline price is only one part of a contract. Look for clauses that create future, conditional, or recurring obligations.", items: [
        { title: "Recurring and usage charges", text: "Identify base fees, per-user or per-unit pricing, minimum usage, overages, service tiers, and pass-through costs." },
        { title: "Renewal and price changes", text: "Locate the renewal date, notice window, renewal term, price-escalation method, and the customer's right to reject a change." },
        { title: "Cancellation and termination", text: "Review early termination fees, nonrefundable deposits, notice requirements, return obligations, and post-termination charges." },
        { title: "Taxes and third-party costs", text: "Check how the contract treats taxes, shipping, permits, payment processing, expenses, subcontractors, and government fees." },
      ]},
      { title: "Find terms that could cost you later", introduction: "Some clauses create future costs without showing a simple fee today.", items: [
        { title: "Indemnity and liability", text: "Identify who pays for claims, losses, attorneys' fees, damage, or third-party disputes and whether any limits apply." },
        { title: "Warranties and remedies", text: "Review what is promised, excluded, time-limited, or available if the service fails to meet the agreement." },
        { title: "Disputes and governing law", text: "Locate arbitration, venue, fee-shifting, notice, and claim-deadline language that may affect how a dispute is handled." },
        { title: "Scope and change orders", text: "Check who can approve additional work, how price changes are documented, and whether silence can be treated as acceptance." },
      ]},
      { title: "Negotiate with clause-level evidence", introduction: "A strong request identifies the exact clause, the risk it creates, and a concrete alternative.", items: [
        { title: "Ask for plain-language examples", text: "Request a written example showing how a variable fee, renewal, cancellation charge, or price increase would be calculated." },
        { title: "Request objective limits", text: "Consider proposing caps, advance notice, mutual approval, cure periods, or a defined cancellation right where appropriate." },
        { title: "Resolve conflicts", text: "Ask which document controls when the proposal, order form, policy, online terms, and main agreement disagree." },
        { title: "Know when to get advice", text: "For important rights, large commitments, or unclear legal effects, have a qualified attorney review the complete agreement." },
      ]},
    ]}
    checklist={["List every fixed, variable, recurring, and conditional charge.", "Mark renewal, notice, cancellation, and refund deadlines.", "Compare the proposal, order form, exhibits, and linked policies.", "Find price-change, scope-change, and pass-through-cost clauses.", "Identify liability, indemnity, warranty, and dispute provisions.", "Save the final signed version and every incorporated document."]}
    faqs={[
      { question: "Is HiddenFeeAI a substitute for a lawyer?", answer: "No. It organizes visible terms, costs, and concerns for informational use. A qualified attorney should evaluate legal rights, enforceability, and high-stakes contract decisions." },
      { question: "Can it review linked online terms?", answer: "Only content included in the uploaded document is available to the audit. Download or include incorporated terms when you are authorized to do so and need them considered." },
      { question: "What makes a contract finding useful?", answer: "A useful finding connects the concern to specific language, explains the possible financial effect, states uncertainty, and gives you a focused question or proposed next step." },
    ]}
    cta="See the financial obligations that are easy to miss when the price is scattered across clauses."
  />;
}
