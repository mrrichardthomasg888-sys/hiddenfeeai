import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/layout/Container";

const faqs = [
  {
    q: "How does HiddenFeeAI work?",
    a: "Upload one document. HiddenFeeAI reads every page, looks for hidden fees, duplicate charges, billing mistakes, and costly clauses, then shows where each concern appears, why it matters, and what you can ask next.",
  },
  {
    q: "What document types are supported?",
    a: "You can upload PDFs, common image files, Word documents, spreadsheets, CSV files, and text files up to 25 MB. Clear scans and phone photos are also supported.",
  },
  {
    q: "How reliable is the report?",
    a: "Results depend on the document's quality, formatting, context, and detail. Each finding includes a confidence label and evidence when available, but HiddenFeeAI can miss or misread information. Always compare the report with the original document.",
  },
  {
    q: "What kinds of hidden fees can HiddenFeeAI find?",
    a: "It looks for vague fees, hidden markups, duplicate charges, billing mistakes, missing credits, automatic renewals, cancellation costs, minimum-use penalties, unexpected price changes, and other terms worth questioning.",
  },
  {
    q: "Can HiddenFeeAI review my medical bills?",
    a: "Yes. It can compare charges, dates, codes, payments, adjustments, and patient responsibility shown in medical bills, explanations of benefits, and insurance statements. A flagged item is a reason to ask for clarification, not proof of an error.",
  },
  {
    q: "Can HiddenFeeAI review car purchase agreements?",
    a: "Yes. It checks car purchase agreements and financing documents for dealer-added fees, optional products, markups, duplicate charges, and financing terms that may increase the total cost.",
  },
  {
    q: "Can HiddenFeeAI review contracts before I sign?",
    a: "Yes. Upload a service agreement, subscription, lease, or other contract to find automatic renewals, price changes, cancellation charges, minimum commitments, and confusing clauses before you sign.",
  },
  {
    q: "Does HiddenFeeAI provide legal advice?",
    a: "No. HiddenFeeAI provides informational analysis only. We are not a law firm, and our reports do not constitute legal advice. Always consult a qualified attorney for legal decisions.",
  },
  {
    q: "Does HiddenFeeAI provide financial advice?",
    a: "No. HiddenFeeAI's audit reports are informational tools. We do not provide financial, accounting, or tax advice. Consult a qualified financial professional for financial decisions.",
  },
  {
    q: "How long does the review take?",
    a: "Most documents are reviewed within seconds to a few minutes. Larger documents and files with many images can take longer.",
  },
  {
    q: "Can I download my audit report?",
    a: "Yes. You can view your Professional Audit Report in the browser and download it as a PDF. It includes the findings, evidence, priorities, possible cost, questions, and scripts available for your document.",
  },
  {
    q: "Is my document data private?",
    a: "Your original document is kept temporarily for the review and deleted after processing completes or fails. HiddenFeeAI does not sell document contents or add uploaded files to its own training dataset.",
  },
  {
    q: "Are documents automatically deleted?",
    a: "The original file is deleted after the review completes or fails. Your report remains available temporarily through the private link so you can review and download it.",
  },
  {
    q: "How do you handle payments?",
    a: "Payment is completed on Stripe-hosted checkout. HiddenFeeAI does not receive or store your full card details.",
  },
  {
    q: "What is your refund policy?",
    a: "Completed analyses are generally non-refundable due to the immediate nature of the digital service. We may issue refunds for technical failures on our end, duplicate charges, or service access issues. See our Refund Policy page for details.",
  },
  {
    q: "Is my information shared with third parties?",
    a: "We do not sell document contents. Google Gemini processes the document to generate the requested audit, and Stripe processes payment on its hosted checkout. See the Privacy Policy for current processor and retention details.",
  },
  {
    q: "What security measures are in place?",
    a: "Uploads and reports use HTTPS-protected connections. Files are processed in temporary storage and deleted after analysis or when the temporary session expires. No internet service can guarantee absolute security.",
  },
  {
    q: "What happens if the review fails?",
    a: "If the review cannot finish because the document is unreadable, corrupted, or interrupted by an error, you will see what went wrong. If you were charged, contact us for assistance.",
  },
  {
    q: "Can I use HiddenFeeAI on mobile?",
    a: "Yes. You can use HiddenFeeAI on a phone, tablet, or desktop and upload a document or clear photo directly from your device.",
  },
  {
    q: "How do I get support?",
    a: "You can reach us at support@hiddenfeehub.com. We typically respond within 24 hours during business days.",
  },
  {
    q: "Can I request new features?",
    a: "Absolutely. We welcome feature suggestions. Email us at support@hiddenfeehub.com with your ideas.",
  },
  {
    q: "What file size limits apply?",
    a: "HiddenFeeAI can process files up to 25MB. If your document is larger, try compressing or splitting it into smaller files.",
  },
  {
    q: "Can HiddenFeeAI process handwritten documents?",
    a: "HiddenFeeAI works best with typed text. OCR is used for scanned documents, but handwritten content may not be reliably extracted.",
  },
  {
    q: "Does HiddenFeeAI support multiple languages?",
    a: "HiddenFeeAI works best with English-language documents. Results for other languages may be less complete or accurate.",
  },
  {
    q: "Is there a subscription or free trial?",
    a: "There is no subscription. A complete audit costs $15 as a one-time payment. The site does not currently advertise a free trial.",
  },
];

export function FAQ() {
  return (
    <div className="premium-page min-h-screen bg-[#050911]">
      <Nav />
      <main className="py-20 sm:py-24">
        <Container className="max-w-4xl">
          <header className="mb-14 space-y-5 text-center">
            <p className="text-sm font-extrabold uppercase tracking-[.2em] text-[#f4c542]">Questions before you upload</p>
            <h1 className="text-4xl font-bold tracking-tight text-white text-glow">
              Know exactly what you're paying for.
            </h1>
            <p className="text-violet-300/80 max-w-2xl mx-auto text-lg">
              Everything you need to know about HiddenFeeAI. Can't find what you're looking for? 
              Email us at <a href="mailto:support@hiddenfeehub.com" className="inline-flex min-h-11 items-center font-semibold text-violet-400 underline hover:text-violet-300">support@hiddenfeehub.com</a>.
            </p>
          </header>

          <section className="space-y-4" itemScope itemType="https://schema.org/FAQPage">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="glass-panel overflow-hidden rounded-2xl"
                itemScope
                itemProp="mainEntity"
                itemType="https://schema.org/Question"
              >
                <details className="group">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between p-6 transition-colors hover:bg-violet-500/5">
                    <h3 className="pr-4 text-[17px] font-extrabold leading-7 text-white" itemProp="name">
                      {faq.q}
                    </h3>
                    <span className="text-violet-400 shrink-0 transition-transform duration-200 group-open:rotate-180">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </summary>
                  <div
                    className="px-6 pb-6 text-base font-medium leading-[1.7] text-violet-200/80"
                    itemScope
                    itemProp="acceptedAnswer"
                    itemType="https://schema.org/Answer"
                  >
                    <div itemProp="text">{faq.a}</div>
                  </div>
                </details>
              </div>
            ))}
          </section>
        </Container>
      </main>
      <Footer />
    </div>
  );
}
