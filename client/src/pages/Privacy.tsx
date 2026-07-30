import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/layout/Container";

const sections = [
  ["What we process", "HiddenFeeAI processes the document you choose to upload, basic technical request information needed to operate the service, payment status, and the audit report generated from the document. No account is required."],
  ["Why we process it", "The document is processed only to complete the review you requested, create the report and PDF, verify payment, prevent abuse, and keep the service working."],
  ["Document retention and deletion", "Uploaded files are held in temporary server storage. The original file is removed after analysis completes or fails. If an upload is abandoned before analysis, the temporary audit session and associated file are purged after approximately one hour. Audit report data is held in temporary in-memory session storage for approximately one hour so you can review and download it."],
  ["Document and payment providers", "A secure AI processing provider reads document content only to create the requested audit. Stripe processes checkout and payment details on its hosted payment pages. HiddenFeeAI does not receive or store your full payment-card number."],
  ["Model training and sale of data", "HiddenFeeAI does not add uploaded documents to its own model-training dataset and does not sell document contents. Third-party processors handle data under their own service terms and privacy commitments."],
  ["Security", "Uploads and reports are transmitted over HTTPS-protected connections. Temporary storage and restricted processing reduce retention risk, but no internet service can guarantee absolute security."],
  ["What not to upload", "Do not upload passwords, authentication codes, full payment-card numbers, private keys, or information unrelated to the audit. Redact unnecessary personal information when practical."],
  ["Your choices and rights", "You may stop before uploading, cancel Stripe checkout, close the report session, or contact us about a privacy request. Applicable access, correction, deletion, or objection rights depend on your jurisdiction."],
  ["Contact", "For privacy questions or requests, contact support@hiddenfeehub.com."],
] as const;

export function Privacy() {
  return (
    <div className="premium-page min-h-screen bg-[#050911]">
      <Nav />
      <main className="py-20 sm:py-24">
        <Container className="max-w-4xl">
          <header className="max-w-3xl"><p className="text-sm font-extrabold uppercase tracking-[.18em] text-[#4da3ff]">Privacy and data handling</p><h1 className="mt-4 text-4xl font-black tracking-[-.04em] text-white sm:text-6xl">See exactly how your file is handled.</h1><p className="mt-6 text-lg font-medium leading-[1.72] text-[#dce4ec]">Last updated July 29, 2026. This policy explains the current no-account, temporary-file process.</p></header>
          <div className="mt-14 space-y-5">{sections.map(([title, text]) => <section key={title} className="rounded-[22px] border border-white/[0.11] bg-[#111d30] p-7 shadow-[0_18px_48px_rgba(0,0,0,.2)] sm:p-8"><h2 className="text-2xl font-extrabold text-white">{title}</h2><p className="mt-4 text-base font-medium leading-[1.7] text-[#dce4ec]">{text}</p></section>)}</div>
        </Container>
      </main>
      <Footer />
    </div>
  );
}
