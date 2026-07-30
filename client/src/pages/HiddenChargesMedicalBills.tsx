import { HeartPulse } from "lucide-react";
import { GuidePage } from "@/components/content/GuidePage";

export function HiddenChargesMedicalBills() {
  return <GuidePage
    eyebrow="Medical bill review guide"
    title="How to review a medical bill for questionable charges"
    description="Compare the provider bill, itemized services, insurance explanation of benefits, payments, and adjustments so you can ask focused questions about the balance."
    icon={HeartPulse}
    sections={[
      { title: "Gather the documents that explain the balance", introduction: "A summary statement rarely contains enough detail to understand a medical balance. Build the clearest possible record first.", items: [
        { title: "Itemized provider bill", text: "Request dates, service descriptions, billing codes, quantities, unit prices, payments, adjustments, and the remaining patient balance." },
        { title: "Explanation of benefits", text: "Compare the billed amount, allowed amount, insurer payment, adjustment, deductible, coinsurance, and patient responsibility." },
        { title: "Your own records", text: "Use appointment summaries, discharge paperwork, receipts, and prior statements to confirm dates and services." },
        { title: "Current account ledger", text: "If the balance changed, ask for a transaction history showing payments, refunds, reversals, transfers, and collection activity." },
      ]},
      { title: "Look for discrepancies worth clarifying", introduction: "A flagged item is a prompt for verification—not proof that the provider made an error.", items: [
        { title: "Possible duplicates", text: "Check repeated codes, descriptions, dates, quantities, or amounts and ask whether each entry represents a separate service." },
        { title: "Services or dates you do not recognize", text: "Compare the bill with your visit record and request documentation for unfamiliar items." },
        { title: "Insurance mismatches", text: "Ask why the provider balance differs from the explanation of benefits, especially after adjustments or insurer payments." },
        { title: "Separate facility or professional fees", text: "Confirm which organization billed each charge and whether a hospital, clinician, lab, imaging group, or other entity issued a separate statement." },
      ]},
      { title: "Use a documented dispute process", introduction: "Clear records and specific questions make it easier for a billing department or insurer to investigate.", items: [
        { title: "Ask for a billing review", text: "Identify the exact date, code, line item, or calculation and request a written explanation or corrected bill." },
        { title: "Contact the insurer when relevant", text: "Ask how the claim was processed, which appeal deadline applies, and what supporting records are required." },
        { title: "Discuss affordability separately", text: "For a valid but unaffordable balance, ask about financial assistance, payment plans, prompt-pay policies, or other available programs." },
        { title: "Escalate high-stakes issues", text: "For large, urgent, collection-related, or legally complex disputes, consider a patient advocate, regulator, attorney, or other qualified professional." },
      ]},
    ]}
    checklist={["Request an itemized bill and current account ledger.", "Match dates and services to your own records.", "Compare every balance component with the explanation of benefits.", "Check payments, credits, adjustments, and prior balances.", "Write down the exact line items you want reviewed.", "Keep names, dates, reference numbers, and copies of correspondence."]}
    faqs={[
      { question: "Does a flagged medical charge mean the bill is wrong?", answer: "No. It means the item deserves clarification based on the available documents. The provider or insurer may have additional records that explain it." },
      { question: "Can HiddenFeeAI interpret my insurance coverage?", answer: "It can summarize language visible in the uploaded file and compare figures, but it cannot replace the plan administrator, insurer, medical billing specialist, or attorney." },
      { question: "Should I upload medical records?", answer: "Upload only the billing documents needed for the audit. Avoid unrelated clinical details, passwords, full payment-card numbers, or other information that is not necessary to review charges." },
    ]}
    cta="Turn a confusing medical balance into a precise list of evidence-backed questions."
  />;
}
