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

const uploadHref = "/#upload";

const reviewItems = [
  { icon: BadgeDollarSign, title: "Fees and charges", text: "See fee-related findings and questionable charges that appear in the document." },
  { icon: CalendarClock, title: "Terms worth examining", text: "Review key terms and contract-risk findings, including renewal or cancellation language when present." },
  { icon: CircleHelp, title: "Questions to ask", text: "Use the report's document-specific questions to decide what to clarify with the provider." },
  { icon: FileCheck2, title: "Negotiation opportunities", text: "Review available negotiation opportunities, recommended actions, and scripts from the existing report." },
];

export function BeforeYouSign() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-midnight-950">
      <Nav />
      <main>
        <section className="relative overflow-hidden border-b border-violet-500/10 bg-midnight-950 py-14 sm:py-20">
          <div className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[860px] -translate-x-1/2 rounded-full bg-gradient-to-br from-violet-600/25 via-purple-500/10 to-transparent blur-[150px]" />
          <Container className="relative">
            <div className="mx-auto max-w-4xl text-center">
              <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-violet-200">
                <FileText className="h-4 w-4 text-violet-300" /> Before You Sign
              </div>
              <h1 className="mt-6 text-balance bg-gradient-to-b from-violet-100 via-white to-violet-300 bg-clip-text text-4xl font-bold leading-[1.05] tracking-tighter text-transparent sm:text-6xl text-glow">
                Know What You&apos;re Agreeing To.
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-violet-200/85 sm:text-lg">
                Have a contract ready? Upload it for a personalized AI-assisted review that organizes the fees, terms, questions, and possible negotiation points worth examining before you agree.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <a href={uploadHref} className="btn-glow inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 px-7 text-base font-bold text-white transition hover:scale-[1.02] sm:w-auto">
                  Upload My Contract <ArrowRight className="h-5 w-5" />
                </a>
                <div className="flex items-center gap-2 text-sm text-violet-300/75">
                  <BadgeDollarSign className="h-5 w-5 text-savings-400" />
                  <span><strong className="text-violet-100">$15</strong> one-time review · No subscription</span>
                </div>
              </div>
              <p className="mx-auto mt-5 max-w-xl text-xs leading-relaxed text-violet-400/65">
                AI-assisted document analysis for educational and informational purposes. It is not legal advice and does not replace a qualified professional.
              </p>
            </div>
          </Container>
        </section>

        <section className="border-b border-violet-500/10 py-14 sm:py-16">
          <Container>
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-400">From general checklist to your document</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">See what deserves a closer look.</h2>
              <p className="mt-4 text-base leading-relaxed text-violet-200/75">
                A checklist tells you what to ask generally. A review of your actual document can organize the language and charges that are present in that document so you know what to clarify next.
              </p>
            </div>
            <div className="mx-auto mt-10 grid max-w-5xl gap-4 sm:grid-cols-2">
              {reviewItems.map(({ icon: Icon, title, text }) => (
                <div key={title} className="glass-panel-dark rounded-3xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-300"><Icon className="h-5 w-5" /></div>
                    <div><h3 className="text-lg font-semibold text-white">{title}</h3><p className="mt-2 text-sm leading-relaxed text-violet-200/70">{text}</p></div>
                  </div>
                </div>
              ))}
            </div>
          </Container>
        </section>

        <section className="py-14 sm:py-16">
          <Container>
            <div className="mx-auto max-w-5xl rounded-[2rem] border border-violet-400/15 bg-gradient-to-br from-midnight-800/90 via-midnight-900 to-violet-950/30 p-7 shadow-glass-lg sm:p-10">
              <div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-savings-400"><ShieldCheck className="h-4 w-4" /> Simple next step</div>
                  <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">Upload the contract you&apos;re considering.</h2>
                  <p className="mt-4 max-w-2xl text-base leading-relaxed text-violet-200/75">
                    The existing HiddenFeeAI flow accepts supported documents, processes the file, and presents an organized audit report after payment confirmation. Your document remains in the existing product flow; this page is simply a focused entry point for a pre-sign review.
                  </p>
                  <div className="mt-6 grid gap-3 text-sm text-violet-200/80 sm:grid-cols-3">
                    {["Upload your document", "Review organized findings", "Know what to clarify"].map((step) => <div key={step} className="flex items-center gap-2"><Check className="h-4 w-4 shrink-0 text-savings-400" /> {step}</div>)}
                  </div>
                </div>
                <a href={uploadHref} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-white px-7 text-base font-bold text-midnight-950 transition hover:bg-violet-100">
                  Upload My Contract <ArrowRight className="h-5 w-5" />
                </a>
              </div>
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </div>
  );
}
