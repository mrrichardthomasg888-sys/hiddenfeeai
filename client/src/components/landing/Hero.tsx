import { motion } from "framer-motion";
import {
  ArrowDown,
  BadgeDollarSign,
  Check,
  FileCheck2,
  FileDown,
  LockKeyhole,
  MessageSquareQuote,
  SearchCheck,
  ShieldCheck,
} from "lucide-react";
import { Container } from "@/components/layout/Container";
import { UploadCard } from "@/components/landing/UploadCard";

const outcomes = [
  {
    icon: SearchCheck,
    title: "Find charges worth questioning.",
    text: "See the page, line item, clause, or calculation behind every item worth reviewing.",
  },
  {
    icon: BadgeDollarSign,
    title: "See what it could cost.",
    text: "Separate charges shown in the document from possible overcharges and savings worth pursuing.",
  },
  {
    icon: MessageSquareQuote,
    title: "Know what to say next.",
    text: "Use clear questions and evidence before you pay, sign, dispute, or negotiate.",
  },
];

const assurances = [
  { icon: LockKeyhole, label: "Private review" },
  { icon: ShieldCheck, label: "Stripe-hosted checkout" },
  { icon: FileCheck2, label: "Evidence-backed findings" },
  { icon: FileDown, label: "Downloadable PDF report" },
];

export function Hero() {
  const openUpload = () => {
    document.getElementById("upload")?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => document.getElementById("file-upload-input")?.click(), 450);
  };

  const viewReport = () => {
    document.getElementById("sample-report")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section className="relative overflow-hidden border-b border-white/[0.08] bg-[#050911] pb-[calc(140px+env(safe-area-inset-bottom))] pt-8 sm:pb-16 sm:pt-14 lg:pb-20 lg:pt-16">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_12%,rgba(77,163,255,.18),transparent_31%),radial-gradient(circle_at_10%_74%,rgba(244,197,66,.07),transparent_28%)]" />
      <div className="enterprise-grid pointer-events-none absolute inset-0 opacity-60" />

      <Container className="relative max-w-[1240px]">
        <div className="grid items-start gap-10 lg:grid-cols-[.84fr_1.16fr] lg:gap-14 xl:gap-20">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="pt-2 lg:sticky lg:top-28"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-[#36d399]/25 bg-[#36d399]/[0.07] px-4 py-1.5 text-xs font-extrabold uppercase tracking-[0.11em] text-[#76ecba]">
              <Check className="h-4 w-4 shrink-0" strokeWidth={3} /> See what&apos;s really hiding in your documents
            </div>

            <h1 className="mt-9 max-w-2xl text-[44px] font-black leading-[1.01] tracking-[-0.055em] text-white sm:text-6xl lg:text-[64px]">
              Find hidden fees <span className="text-[#f4c542]">before they cost you money.</span>
            </h1>

            <div className="mt-6 max-w-xl space-y-3 text-[18px] font-semibold leading-[1.6] text-[#dce4ec] sm:text-xl">
              <p>Upload a bill, contract, invoice, receipt, or statement.</p>
              <p>See what deserves attention, what it may cost, and what to ask next.</p>
            </div>

            <div className="mt-5 flex max-w-xl flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[13px] font-bold leading-6 text-[#c8d3df]" aria-label="Trust signals">
              <span className="text-[#76ecba]">✓</span>
              <span>Private</span><span aria-hidden="true" className="text-[#718096]">•</span>
              <span>AI Analysis in Minutes</span><span aria-hidden="true" className="text-[#718096]">•</span>
              <span>No Subscription</span><span aria-hidden="true" className="text-[#718096]">•</span>
              <span>Secure Document Processing.</span>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={openUpload}
                className="inline-flex min-h-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#ffe27a,#f4c542_55%,#dfa91f)] px-6 text-base font-black text-[#111827] shadow-[0_16px_40px_rgba(244,197,66,.2)] transition hover:-translate-y-0.5 hover:brightness-105"
              >
                Upload a document — $15
              </button>
              <button
                type="button"
                onClick={viewReport}
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-white/[0.14] bg-white/[0.05] px-6 text-base font-extrabold text-white transition hover:bg-white/[0.09]"
              >
                View sample report <ArrowDown className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-4 text-sm font-bold text-[#c8d3df]">One payment · No subscription · No account required</p>

            <div className="mt-9 hidden divide-y divide-white/[0.09] border-y border-white/[0.09] lg:block">
              {outcomes.map(({ icon: Icon, title, text }) => (
                <div key={title} className="grid grid-cols-[44px_1fr] gap-4 py-5">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#4da3ff]/20 bg-[#4da3ff]/10">
                    <Icon className="h-5 w-5 text-[#82c7ff]" />
                  </span>
                  <div>
                    <h2 className="text-base font-black text-white">{title}</h2>
                    <p className="mt-1 text-sm font-medium leading-6 text-[#c8d3df]">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08, duration: 0.5 }}
            className="relative"
          >
            <div className="pointer-events-none absolute -inset-5 rounded-[44px] bg-[#4da3ff]/[0.055] blur-2xl" />
            <div className="relative overflow-hidden rounded-[34px] border border-white/[0.14] bg-[#0b1525]/95 shadow-[0_40px_120px_rgba(0,0,0,.45),0_0_0_1px_rgba(77,163,255,.06)]">
              <div className="flex flex-col gap-4 border-b border-white/[0.09] bg-white/[0.025] px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="relative flex h-3 w-3">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#36d399] opacity-30" />
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-[#36d399]" />
                    </span>
                    <p className="text-sm font-black text-white">Find what deserves a second look</p>
                  </div>
                  <p className="mt-1 text-xs font-semibold text-[#c8d3df]">Upload once. Know exactly what deserves a second look.</p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-bold">
                  <span className="rounded-full border border-[#f4c542]/25 bg-[#f4c542]/[0.08] px-3 py-1.5 text-[#f8d96e]">$15 one time</span>
                  <span className="rounded-full border border-[#36d399]/20 bg-[#36d399]/[0.07] px-3 py-1.5 text-[#77edbd]">Secure checkout</span>
                </div>
              </div>

              <div className="p-4 sm:p-6 lg:p-7">
                <UploadCard />
              </div>

              <div className="grid gap-px border-t border-white/[0.09] bg-white/[0.08] sm:grid-cols-3">
                {["Every page checked", "Exact evidence shown", "Next steps included"].map((item) => (
                  <div key={item} className="flex items-center gap-2 bg-[#081220] px-5 py-4 text-xs font-extrabold text-[#dce4ec]">
                    <Check className="h-4 w-4 shrink-0 text-[#60e2ad]" strokeWidth={3} /> {item}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        <div className="mt-9 divide-y divide-white/[0.09] border-y border-white/[0.09] lg:hidden">
          {outcomes.map(({ icon: Icon, title, text }) => (
            <div key={title} className="grid grid-cols-[44px_1fr] gap-4 py-5">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#4da3ff]/20 bg-[#4da3ff]/10">
                <Icon className="h-5 w-5 text-[#82c7ff]" />
              </span>
              <div>
                <h2 className="text-base font-black text-white">{title}</h2>
                <p className="mt-1 text-sm font-medium leading-6 text-[#c8d3df]">{text}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 grid overflow-hidden rounded-[22px] border border-white/[0.1] bg-[#0a1422] sm:grid-cols-2 lg:grid-cols-4">
          {assurances.map(({ icon: Icon, label }) => (
            <div key={label} className="flex min-h-20 items-center gap-3 border-b border-white/[0.08] px-5 last:border-b-0 sm:border-r sm:even:border-r-0 lg:border-b-0 lg:even:border-r lg:last:border-r-0">
              <Icon className="h-5 w-5 shrink-0 text-[#73b8ff]" />
              <span className="text-sm font-extrabold text-white">{label}</span>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
