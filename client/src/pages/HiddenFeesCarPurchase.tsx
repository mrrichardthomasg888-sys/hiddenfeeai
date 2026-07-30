import { Car } from "lucide-react";
import { GuidePage } from "@/components/content/GuidePage";

export function HiddenFeesCarPurchase() {
  return <GuidePage
    eyebrow="Vehicle purchase guide"
    title="How to review fees in a car purchase agreement"
    description="Separate the vehicle price from dealer products, government charges, financing costs, and optional add-ons—then know which questions to ask before you sign."
    icon={Car}
    sections={[
      { title: "Start with the out-the-door total", introduction: "A monthly payment can hide the effect of term length, interest, add-ons, and upfront charges. Review the complete transaction instead.", items: [
        { title: "Vehicle and trade figures", text: "Confirm the agreed vehicle price, trade allowance, payoff balance, deposit, rebates, and credits appear exactly as discussed." },
        { title: "Dealer-added charges", text: "Identify documentation, preparation, inspection, reconditioning, advertising, electronic filing, or administrative fees and ask what each one covers." },
        { title: "Government charges", text: "Separate taxes, title, registration, and required filing costs from dealer-imposed fees with similar-sounding names." },
        { title: "Optional products", text: "Look for service contracts, maintenance plans, protection packages, GAP coverage, theft products, and insurance products you did not knowingly select." },
      ]},
      { title: "Review financing as its own purchase", introduction: "The loan terms can change the total cost even when the vehicle price looks correct.", items: [
        { title: "APR and finance charge", text: "Compare the disclosed annual percentage rate, amount financed, finance charge, payment schedule, and total of payments." },
        { title: "Rolled-in products", text: "Check whether optional products or old-loan balances were added to the amount financed and how they affect the payment." },
        { title: "Conditional discounts", text: "Verify whether any rebate or quoted price depends on lender choice, financing, trade-in, military status, loyalty, or another condition." },
        { title: "Cancellation terms", text: "For optional products, locate the cancellation procedure, deadline, refund method, and whether a refund reduces the loan balance rather than the payment." },
      ]},
      { title: "Turn concerns into specific questions", introduction: "A useful challenge names the line item, cites the document, and asks for a written explanation or corrected agreement.", items: [
        { title: "Request an itemization", text: "Ask the dealer to identify the service, policy, or government requirement behind every unfamiliar fee." },
        { title: "Compare versions", text: "Compare the buyer's order, retail installment contract, add-on forms, and final disclosure for changed prices or repeated charges." },
        { title: "Ask before signing", text: "Request a revised out-the-door worksheet with disputed optional items removed so you can compare totals." },
        { title: "Escalate with records", text: "Keep advertisements, quotes, messages, and signed documents. For unresolved or material issues, consider a qualified consumer attorney or regulator." },
      ]},
    ]}
    checklist={["Verify the VIN, vehicle price, trade allowance, payoff, deposit, and rebates.", "Recalculate the out-the-door total and amount financed.", "Mark every optional product and confirm you knowingly accepted it.", "Separate government charges from dealer-imposed fees.", "Read cancellation, refund, arbitration, and delivery language.", "Keep a copy of every document and quote before leaving."]}
    faqs={[
      { question: "Is every dealer fee improper?", answer: "No. Some fees may be lawful, disclosed, or required, and rules vary by location. The goal is to distinguish government charges and agreed products from unclear, duplicated, inflated, or optional items." },
      { question: "Can HiddenFeeAI tell me whether a fee is illegal?", answer: "The audit can identify relevant language and concerns in the document, but it is not a legal determination. Use the evidence to ask the dealer, regulator, or a qualified attorney." },
      { question: "What should I upload?", answer: "Upload the most complete signed or proposed agreement available. If multiple documents form one transaction, combine them into one PDF when practical so relationships between charges are visible." },
    ]}
    cta="Understand the full vehicle deal before an unfamiliar fee becomes your obligation."
  />;
}
