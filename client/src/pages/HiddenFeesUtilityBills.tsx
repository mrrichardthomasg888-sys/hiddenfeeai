import { ReceiptText } from "lucide-react";
import { GuidePage } from "@/components/content/GuidePage";

export function HiddenFeesUtilityBills() {
  return <GuidePage
    eyebrow="Recurring bill review guide"
    title="How to review utility and subscription bill fees"
    description="Separate service usage from recurring add-ons, equipment, taxes, credits, plan changes, and cancellation terms so you can understand why the total changed."
    icon={ReceiptText}
    sections={[
      { title: "Reconcile the bill before judging a fee", introduction: "Recurring bills can change because of usage, rates, taxes, promotions, equipment, prior balances, or one-time adjustments.", items: [
        { title: "Billing period and usage", text: "Confirm the service dates, meter readings or units, billing days, and whether usage is actual or estimated." },
        { title: "Base plan and rate", text: "Compare the billed plan, unit price, tier, line count, speed, or service level with the agreement and prior bill." },
        { title: "Credits and promotions", text: "Check whether promised credits, introductory discounts, autopay benefits, refunds, or loyalty offers were applied and when they expire." },
        { title: "Prior balance and payments", text: "Reconcile the opening balance, payments, returned payments, late charges, adjustments, and transfers from another account." },
      ]},
      { title: "Classify unfamiliar charges", introduction: "A clear category makes it easier to find the right policy and ask the right department.", items: [
        { title: "Provider-imposed fees", text: "Ask for the policy behind administrative, recovery, convenience, activation, restoration, or processing charges." },
        { title: "Equipment and add-ons", text: "Look for routers, boxes, insurance, protection plans, premium channels, cloud storage, support packages, or other recurring extras." },
        { title: "Taxes and government charges", text: "Separate taxes and required assessments from provider surcharges that may use regulatory language." },
        { title: "Cancellation and renewal", text: "Review minimum terms, renewal dates, notice periods, early termination charges, equipment-return deadlines, and post-cancellation billing." },
      ]},
      { title: "Challenge changes with a bill timeline", introduction: "Comparing the current bill with the agreement and prior statements helps isolate exactly when and why a charge appeared.", items: [
        { title: "Compare consecutive bills", text: "Mark every changed line item, quantity, rate, credit, tax, add-on, and balance transfer." },
        { title: "Request the controlling terms", text: "Ask for the rate schedule, promotion terms, fee policy, or notice that authorized the change." },
        { title: "Ask for correction and confirmation", text: "State the disputed amount and period, request any correction in writing, and ask what future bill should show." },
        { title: "Document cancellation", text: "Keep confirmation numbers, return receipts, final-bill dates, and written confirmation that recurring service has ended." },
      ]},
    ]}
    checklist={["Compare the current bill with the prior two statements.", "Verify service dates, usage, rate, plan, and account count.", "Confirm every promotion, credit, payment, and adjustment.", "Identify equipment and optional recurring add-ons.", "Separate government charges from provider-imposed fees.", "Save cancellation, return, and billing-department confirmation numbers."]}
    faqs={[
      { question: "Does a higher bill always mean a hidden fee?", answer: "No. Usage, billing-cycle length, rates, taxes, expired discounts, prior balances, and plan changes can all affect the total. The audit helps separate those causes." },
      { question: "Can every recurring fee be negotiated?", answer: "No. Some charges may be required or fixed. The report can help you identify provider-imposed items, missing credits, or plan alternatives worth asking about, without promising a reduction." },
      { question: "Which bills can I upload?", answer: "Supported files include PDFs, clear phone photos and scans, spreadsheets, Word files, CSV data, and text documents up to 25 MB. Results depend on legibility and available detail." },
    ]}
    cta="Make every recurring charge explainable before it becomes part of your monthly routine."
  />;
}
