import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/layout/Container";

const faqs = [
  {
    q: "How does HiddenFeeAI work?",
    a: "HiddenFeeAI uses artificial intelligence to analyze your uploaded documents — contracts, bills, invoices, medical statements, and more. It scans for hidden fees, billing errors, duplicate charges, and contract risks, then generates a detailed audit report with findings, severity ratings, and negotiation recommendations.",
  },
  {
    q: "What document types are supported?",
    a: "HiddenFeeAI supports PDF, PNG, JPG, WEBP, TIFF, DOCX, TXT, CSV, and XLSX files. Whether you have a scanned contract, a digital invoice, a medical bill PDF, or a spreadsheet of charges, we can process it.",
  },
  {
    q: "How accurate is the AI analysis?",
    a: "HiddenFeeAI's AI is highly effective at identifying common hidden fee patterns, billing errors, and contract risks. However, no AI is perfect. Accuracy depends on document quality, formatting, and complexity. We recommend reviewing the original documents alongside our report.",
  },
  {
    q: "What kinds of hidden fees can HiddenFeeAI detect?",
    a: "HiddenFeeAI detects a wide range of issues including vague additional fees, unilateral fee change clauses, automatic renewal traps, minimum usage penalties, processing and service fees not clearly disclosed, duplicate charges, billing errors, and contract terms that favor the provider.",
  },
  {
    q: "Can HiddenFeeAI review my medical bills?",
    a: "Yes. HiddenFeeAI can analyze medical bills, explanation of benefits (EOB) documents, and insurance statements to identify questionable charges, billing codes that may not match services rendered, and potential overcharges.",
  },
  {
    q: "Can HiddenFeeAI review car purchase agreements?",
    a: "Yes. HiddenFeeAI is excellent at analyzing car purchase agreements and financing contracts to spot dealer-added markups, hidden fees, unnecessary add-ons, and unfavorable financing terms.",
  },
  {
    q: "Can HiddenFeeAI review contracts before I sign?",
    a: "Absolutely. HiddenFeeAI is a powerful tool for pre-signature contract review. Upload any contract — service agreements, subscription terms, vendor contracts — and get a risk assessment highlighting problematic clauses.",
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
    q: "How long does an analysis take?",
    a: "Most documents are analyzed within seconds to a few minutes. Processing time depends on document length, complexity, and current server load.",
  },
  {
    q: "Can I download my audit report?",
    a: "Yes. After analysis, you can view the full audit report in your browser and download it as a PDF. The PDF report includes all findings, severity ratings, financial impact analysis, and negotiation recommendations.",
  },
  {
    q: "Is my document data private?",
    a: "Yes. Your documents are processed temporarily and automatically deleted from our servers after analysis is complete. We do not retain copies, sell your data, or use your documents to train AI models.",
  },
  {
    q: "Are documents automatically deleted?",
    a: "Yes. Uploaded documents and extracted text are permanently deleted from our servers immediately after the analysis finishes. Only the generated audit report is retained for your access.",
  },
  {
    q: "How do you handle payments?",
    a: "Payments are processed securely through our third-party payment processor. We do not store credit card numbers or payment credentials on our servers.",
  },
  {
    q: "What is your refund policy?",
    a: "Completed analyses are generally non-refundable due to the immediate nature of the digital service. We may issue refunds for technical failures on our end, duplicate charges, or service access issues. See our Refund Policy page for details.",
  },
  {
    q: "Is my information shared with third parties?",
    a: "No. We do not sell or share your personal information or document contents with third parties. Anonymous usage analytics may be collected to improve our service, but this data cannot identify you personally.",
  },
  {
    q: "What security measures are in place?",
    a: "HiddenFeeAI uses encryption in transit and at rest, secure temporary document processing, and follows security best practices. We regularly assess our systems for vulnerabilities.",
  },
  {
    q: "What happens if the analysis fails?",
    a: "If the analysis cannot complete — due to an unreadable document, corrupt file, or system error — you will receive a clear error message. If you were charged, contact us for assistance.",
  },
  {
    q: "Can I use HiddenFeeAI on mobile?",
    a: "Yes. HiddenFeeAI is fully responsive and works on mobile browsers, tablets, and desktop devices. You can upload documents directly from your phone or tablet.",
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
    a: "The AI is primarily trained on English-language documents. Analysis of non-English documents may be less accurate.",
  },
  {
    q: "Is there a free trial?",
    a: "Check our pricing page for current offers. We regularly offer free trials so you can experience the power of AI-driven document analysis.",
  },
];

export function FAQ() {
  return (
    <div className="min-h-screen bg-midnight-950">
      <Nav />
      <main className="py-16">
        <Container className="max-w-4xl">
          <header className="text-center mb-12 space-y-4">
            <h1 className="text-4xl font-bold tracking-tight text-white text-glow">
              Frequently Asked Questions
            </h1>
            <p className="text-violet-300/80 max-w-2xl mx-auto text-lg">
              Everything you need to know about HiddenFeeAI. Can't find what you're looking for? 
              Email us at <a href="mailto:support@hiddenfeehub.com" className="text-violet-400 hover:text-violet-300 underline">support@hiddenfeehub.com</a>.
            </p>
          </header>

          <section className="space-y-4" itemScope itemType="https://schema.org/FAQPage">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="glass-panel rounded-xl overflow-hidden"
                itemScope
                itemProp="mainEntity"
                itemType="https://schema.org/Question"
              >
                <details className="group">
                  <summary className="flex items-center justify-between p-5 cursor-pointer list-none hover:bg-violet-500/5 transition-colors">
                    <h3 className="text-base font-semibold text-white pr-4" itemProp="name">
                      {faq.q}
                    </h3>
                    <span className="text-violet-400 shrink-0 transition-transform duration-200 group-open:rotate-180">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </summary>
                  <div
                    className="px-5 pb-5 text-violet-200/80 leading-relaxed text-sm"
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