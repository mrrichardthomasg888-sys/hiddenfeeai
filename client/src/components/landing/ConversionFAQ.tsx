import { Container } from "@/components/layout/Container";

const questions = [
  ["What does HiddenFeeAI look for?", "It checks your document for hidden fees, markups, duplicate charges, billing mistakes, math errors, missing credits, automatic renewals, cancellation restrictions, confusing clauses, and charges worth negotiating."],
  ["What exactly do I receive for $15?", "One Professional Audit Report showing what deserves attention, where it appears, why it matters, what it may cost, and what you can ask next. A downloadable PDF is included. There is no subscription."],
  ["Which files can I upload?", "Supported formats include PDF, PNG, JPG, JPEG, WEBP, HEIC, HEIF, TIFF, TIF, BMP, GIF, DOCX, DOC, XLSX, XLS, CSV, TXT, RTF, MD, HTML, and HTM. Files can be up to 25 MB."],
  ["Can I upload scans or phone photos?", "Yes. Clear, well-lit scans and photos can be reviewed. Cropped, blurry, handwritten, rotated, or low-contrast pages may be harder to read and could affect the results."],
  ["How long does the review take?", "Most files finish in seconds to a few minutes. Larger documents and files with many images can take longer."],
  ["Is my payment information handled by HiddenFeeAI?", "Payment is completed on Stripe-hosted checkout. HiddenFeeAI does not receive or store your full payment-card details."],
  ["What happens to my uploaded document?", "The original file is kept temporarily while your report is created and removed when the review completes or fails. The report remains available temporarily through your private link so you can review and download it."],
  ["Is my file used to train AI?", "HiddenFeeAI does not add uploaded files to its own training dataset. Your file is processed only to create the requested audit; see the Privacy Policy for details."],
  ["Can HiddenFeeAI guarantee savings or a refund?", "No. The report identifies document-backed concerns and possible opportunities. Results depend on the document and provider, and no refund, savings, legal result, or negotiation outcome is guaranteed."],
  ["Is this legal, tax, accounting, or financial advice?", "No. HiddenFeeAI provides an informational document review. Important decisions and high-value disputes may require a qualified attorney, accountant, tax professional, or financial adviser."],
  ["What if the document is difficult to read?", "HiddenFeeAI will try to read the file. If it is password-protected, corrupted, blank, or too unclear, you will see what went wrong and can upload a clearer or unlocked version."],
  ["Can I download the report?", "Yes. You can view the completed audit in your browser and download your Professional Audit Report as a PDF while the private report link is active."],
] as const;

export function ConversionFAQ() {
  return (
    <section id="faq" className="scroll-mt-24 bg-[#08111f] py-20 sm:py-28" aria-labelledby="conversion-faq-heading">
      <Container>
        <div className="mx-auto max-w-3xl text-center"><p className="text-sm font-extrabold uppercase tracking-[0.2em] text-[#4da3ff]">Clear answers before you upload</p><h2 id="conversion-faq-heading" className="mt-4 text-4xl font-black tracking-[-.04em] text-white sm:text-5xl">Know exactly what you are paying for.</h2></div>
        <div className="mx-auto mt-12 grid max-w-5xl gap-4 md:grid-cols-2">
          {questions.map(([question, answer]) => <details key={question} className="group rounded-2xl border border-white/[0.11] bg-[#101c2e] p-6 shadow-[0_14px_38px_rgba(0,0,0,.16)] open:border-[#4da3ff]/35"><summary className="min-h-11 cursor-pointer list-none pr-7 text-[17px] font-extrabold leading-7 text-white marker:hidden">{question}<span className="float-right text-[#f4c542] transition-transform group-open:rotate-45" aria-hidden="true">+</span></summary><p className="mt-4 text-base font-medium leading-[1.7] text-[#dce4ec]">{answer}</p></details>)}
        </div>
      </Container>
    </section>
  );
}
