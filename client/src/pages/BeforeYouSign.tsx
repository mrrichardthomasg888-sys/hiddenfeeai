import { useEffect } from "react";
import {
  ArrowRight,
  BadgeDollarSign,
  CalendarClock,
  Check,
  CircleHelp,
  FileCheck2,
  FileText,
  ShieldCheck,
} from "lucide-react";
import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/layout/Container";
import { UploadCard } from "@/components/landing/UploadCard";
import { track } from "@/lib/analytics";

const reviewItems = [
  { icon: BadgeDollarSign, title: "Fees and charges", text: "See fee-related findings and questionable charges that appear in the document." },
  { icon: CalendarClock, title: "Terms worth examining", text: "Review key terms and contract-risk findings, including renewal or cancellation language when present." },
  { icon: CircleHelp, title: "Questions to ask", text: "Use the report's document-specific questions to decide what to clarify with the provider." },
  { icon: FileCheck2, title: "Negotiation opportunities", text: "Review available negotiation opportunities, recommended actions, and scripts from the existing report." },
];

export function BeforeYouSign() {
  useEffect(() => {
    track("before_you_sign_view", { funnel_route: "before_you_sign" });
  }, []);

  const openUpload = () => {
    document.getElementById("upload")?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => document.getElementById("file-upload-input")?.click(), 450);
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#050911]">
      <Nav />
      <main>
        <section className="relative overflow-hidden border-b border-white/[0.09] bg-[#050911] py-14 sm:py-20">
          <div className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[860px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(77,163,255,.16),transparent_68%)] blur-[90px]" />
          <Container className="relative">
            <div className="mx-auto max-w-4xl text-center">
              <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-[#f4c542]/25 bg-[#f4c542]/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#f8d96e]">
                <FileText className="h-4 w-4 text-[#f4c542]" /> Before You Sign
              </div>
              <h1 className="mt-6 text-balance bg-gradient-to-b from-white via-white to-[#f8d96e] bg-clip-text text-4xl font-bold leading-[1.05] tracking-tighter text-transparent sm:text-6xl text-glow">
                Know What You&apos;re Agreeing To.
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-[#dce4ec] sm:text-lg">
                Upload the contract you&apos;re considering. We&apos;ll review the document and organize the fees, important terms, potential concerns, questions to ask, and negotiation opportunities so you know what deserves a closer look before signing.
              </p>
              <p className="mt-7 text-sm font-black uppercase tracking-[0.16em] text-[#f8d96e]">$15 one-time review · No subscription</p>
              <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <button type="button" onClick={openUpload} className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-xl border border-[#f4c542]/70 bg-[#f4c542] px-7 text-base font-extrabold text-[#111827] shadow-[0_8px_28px_rgba(244,197,66,.18)] transition hover:bg-[#ffda60] hover:shadow-[0_10px_34px_rgba(244,197,66,.28)] sm:w-auto">
                  Upload My Contract <ArrowRight className="h-5 w-5" />
                </button>
              </div>
              <p className="mx-auto mt-5 max-w-xl text-xs leading-relaxed text-[#aebdcb]">
                AI-assisted document analysis for educational and informational purposes. It is not legal advice and does not replace a qualified professional.
              </p>
            </div>
          </Container>
        </section>

        <section className="border-b border-white/[0.09] py-14 sm:py-16">
          <Container>
            <div className="mx-auto max-w-5xl">
              <div className="mb-7 text-center">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#7cc4ff]">Start your review</p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">Upload or scan your contract.</h2>
              </div>
              <UploadCard />
            </div>
          </Container>
        </section>

        <section className="border-b border-white/[0.09] py-14 sm:py-16">
          <Container>
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#7cc4ff]">From general checklist to your document</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">See what deserves a closer look.</h2>
              <p className="mt-4 text-base leading-relaxed text-[#dce4ec]">
                A checklist tells you what to ask generally. A review of your actual document can organize the language and charges that are present in that document so you know what to clarify next.
              </p>
            </div>
            <div className="mx-auto mt-10 grid max-w-5xl gap-4 sm:grid-cols-2">
              {reviewItems.map(({ icon: Icon, title, text }) => (
                <div key={title} className="rounded-3xl border border-white/[0.11] bg-[#111d30] p-6 shadow-[0_18px_48px_rgba(0,0,0,.2)]">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#4da3ff]/20 bg-[#4da3ff]/10 text-[#7cc4ff]"><Icon className="h-5 w-5" /></div>
                    <div><h3 className="text-lg font-semibold text-white">{title}</h3><p className="mt-2 text-sm leading-relaxed text-[#dce4ec]">{text}</p></div>
                  </div>
                </div>
              ))}
            </div>
          </Container>
        </section>

        <section className="py-14 sm:py-16">
          <Container>
            <div className="mx-auto max-w-5xl rounded-[2rem] border border-[#f4c542]/20 bg-[linear-gradient(135deg,rgba(244,197,66,.12),rgba(77,163,255,.07))] p-7 shadow-[0_30px_100px_-55px_rgba(244,197,66,.65)] sm:p-10">
              <div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-savings-400"><ShieldCheck className="h-4 w-4" /> Simple next step</div>
                  <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">Upload the contract you&apos;re considering.</h2>
                  <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#dce4ec]">
                    Upload the contract you&apos;re considering. We&apos;ll review the document and organize the fees, important terms, potential concerns, questions to ask, and negotiation opportunities so you know what deserves a closer look before signing.
                  </p>
                  <div className="mt-6 grid gap-3 text-sm text-[#dce4ec] sm:grid-cols-3">
                    {["Upload your document", "Review organized findings", "Know what to clarify"].map((step) => <div key={step} className="flex items-center gap-2"><Check className="h-4 w-4 shrink-0 text-savings-400" /> {step}</div>)}
                  </div>
                </div>
                <button type="button" onClick={openUpload} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl border border-[#f4c542]/70 bg-[#f4c542] px-7 text-base font-extrabold text-[#111827] shadow-[0_8px_28px_rgba(244,197,66,.18)] transition hover:bg-[#ffda60] hover:shadow-[0_10px_34px_rgba(244,197,66,.28)]">
                  Upload My Contract <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </div>
  );
}
