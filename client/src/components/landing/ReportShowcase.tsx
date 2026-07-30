import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  FileDown,
  FileSearch,
  FileText,
  Gauge,
  MessageSquareQuote,
  ShieldCheck,
  TrendingDown,
} from "lucide-react";
import { Container } from "@/components/layout/Container";

const reportValue = [
  "A plain-English summary",
  "The exact page or line behind each finding",
  "Charges ranked by urgency",
  "Questions, scripts, and next steps",
];

export function ReportShowcase() {
  return (
    <section
      id="sample-report"
      className="relative scroll-mt-24 overflow-hidden bg-[#edf3f8] py-24 sm:py-28"
    >
      <div className="pointer-events-none absolute -right-32 -top-40 h-[520px] w-[520px] rounded-full bg-[#4da3ff]/10 blur-[130px]" />

      <Container className="relative max-w-[1240px]">
        <div className="grid min-w-0 gap-12 lg:grid-cols-[.68fr_1.32fr] lg:items-start lg:gap-16 xl:gap-20">
          <div className="min-w-0 lg:sticky lg:top-28">
            <p className="inline-flex max-w-full flex-wrap items-center gap-2 break-words text-sm font-extrabold uppercase tracking-[0.2em] text-[#1769aa]">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Hidden costs become obvious.
            </p>

            <h2 className="mt-5 break-words text-3xl font-black leading-tight tracking-[-0.05em] text-[#07111f] sm:text-6xl">
              See exactly what deserves a second look.
            </h2>

            <p className="mt-6 max-w-full break-words text-base font-semibold leading-[1.72] text-[#334155] sm:text-lg">
              Your Professional Audit Report shows where a charge appears, why
              it matters, what it could cost, and what to ask before you pay or
              sign.
            </p>

            <div className="mt-8 space-y-3">
              {reportValue.map((item) => (
                <div
                  key={item}
                  className="flex min-w-0 items-start gap-3 rounded-2xl border border-[#cbd7e2] bg-white px-4 py-3.5 shadow-[0_10px_28px_rgba(15,23,42,.06)]"
                >
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#13865f]" />

                  <span className="min-w-0 break-words text-sm font-extrabold leading-6 text-[#172033]">
                    {item}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-8 flex min-w-0 items-start gap-3 text-sm font-extrabold text-[#334155]">
              <FileDown className="mt-0.5 h-5 w-5 shrink-0 text-[#1769aa]" />

              <span className="min-w-0 break-words">
                Browser report + downloadable PDF
              </span>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            className="relative min-w-0"
          >
            <div className="pointer-events-none absolute -inset-4 rounded-[42px] bg-[#07111f]/[0.08] blur-2xl" />

            <div className="relative min-w-0 overflow-hidden rounded-[28px] border border-[#1b2a3d] bg-[#091321] shadow-[0_38px_100px_rgba(15,23,42,.3)] sm:rounded-[32px]">
              <div className="flex min-w-0 flex-col gap-4 border-b border-white/[0.09] bg-[#111e31] px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
                <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#4da3ff]/25 bg-[#4da3ff]/10 sm:h-12 sm:w-12">
                    <FileText className="h-6 w-6 text-[#82c7ff]" />
                  </span>

                  <div className="min-w-0">
                    <p className="break-words text-[10px] font-extrabold uppercase leading-5 tracking-[.12em] text-[#f8d96e] sm:text-xs sm:tracking-[.16em]">
                      HiddenFeeAI Professional Audit Report
                    </p>

                    <p className="mt-1 truncate text-sm font-extrabold text-white sm:text-base">
                      Auto Purchase Agreement · Demo
                    </p>
                  </div>
                </div>

                <span className="w-fit shrink-0 rounded-full border border-[#36d399]/25 bg-[#36d399]/10 px-3 py-1.5 text-xs font-extrabold text-[#76ecba]">
                  Report ready
                </span>
              </div>

              <div className="p-4 sm:p-7 lg:p-8">
                <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#73b8ff]">
                      At a glance
                    </p>

                    <h3 className="mt-2 break-words text-xl font-black leading-tight text-white sm:text-3xl">
                      Charges and terms worth reviewing
                    </h3>
                  </div>

                  <span className="w-fit shrink-0 rounded-full border border-orange-300/25 bg-orange-300/[0.08] px-3 py-1.5 text-xs font-extrabold text-orange-200">
                    Elevated attention
                  </span>
                </div>

                <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {[
                    {
                      icon: TrendingDown,
                      value: "$347",
                      label: "Potential savings",
                      color: "text-[#55dfaa]",
                    },
                    {
                      icon: Gauge,
                      value: "87",
                      label: "Risk score",
                      color: "text-orange-200",
                    },
                    {
                      icon: AlertTriangle,
                      value: "6",
                      label: "Issues found",
                      color: "text-[#f8d96e]",
                    },
                  ].map(({ icon: Icon, value, label, color }) => (
                    <div
                      key={label}
                      className="min-w-0 rounded-2xl border border-white/[0.1] bg-[#101d30] p-4 sm:p-5"
                    >
                      <Icon className={`h-5 w-5 ${color}`} />

                      <p
                        className={`mt-4 break-words text-2xl font-black tracking-tight sm:text-3xl ${color}`}
                      >
                        {value}
                      </p>

                      <p className="mt-2 break-words text-xs font-bold leading-5 text-[#c8d3df] sm:text-sm">
                        {label}
                      </p>
                    </div>
                  ))}
                </div>

                <article className="mt-6 min-w-0 overflow-hidden rounded-[22px] border border-orange-300/20 bg-orange-300/[0.055]">
                  <div className="grid min-w-0 gap-4 p-4 sm:grid-cols-[1fr_auto] sm:items-start sm:p-6">
                    <div className="min-w-0">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <span className="rounded-md bg-orange-300/15 px-2 py-1 text-[10px] font-black uppercase tracking-[.12em] text-orange-200">
                          High priority
                        </span>

                        <span className="break-words text-xs font-bold text-[#c8d3df]">
                          Page 2 · Line 14 · 96% confidence
                        </span>
                      </div>

                      <h4 className="mt-3 break-words text-lg font-black text-white sm:text-xl">
                        Administrative processing fee
                      </h4>

                      <p className="mt-2 max-w-2xl break-words text-sm font-medium leading-6 text-[#dce4ec]">
                        Appears separate from required registration costs and may
                        be negotiable.
                      </p>
                    </div>

                    <p className="break-words text-2xl font-black text-white">
                      $125.00
                    </p>
                  </div>

                  <div className="grid min-w-0 gap-px border-t border-white/[0.09] bg-white/[0.08] md:grid-cols-2">
                    <div className="min-w-0 bg-[#0d192a] p-4 sm:p-5">
                      <div className="flex min-w-0 items-center gap-2 break-words text-xs font-extrabold uppercase tracking-[.14em] text-[#73b8ff]">
                        <FileSearch className="h-4 w-4 shrink-0" />
                        Why it matters
                      </div>

                      <p className="mt-3 break-words text-sm font-semibold leading-6 text-[#dce4ec]">
                        The fee is not identified as a government charge. Ask
                        for its basis, authorization, and whether it can be
                        removed.
                      </p>
                    </div>

                    <div className="min-w-0 bg-[#0b1b22] p-4 sm:p-5">
                      <div className="flex min-w-0 items-center gap-2 break-words text-xs font-extrabold uppercase tracking-[.14em] text-[#72eaba]">
                        <MessageSquareQuote className="h-4 w-4 shrink-0" />
                        Negotiation script
                      </div>

                      <p className="mt-3 break-words text-sm font-bold leading-6 text-white">
                        “Please explain what this fee covers and whether it can
                        be waived or reduced.”
                      </p>
                    </div>
                  </div>
                </article>

                <div className="mt-4 grid min-w-0 gap-4 sm:grid-cols-2">
                  <div className="min-w-0 rounded-[20px] border border-white/[0.1] bg-[#101d30] p-4 sm:p-5">
                    <div className="flex min-w-0 items-center justify-between gap-3">
                      <p className="min-w-0 break-words text-xs font-extrabold uppercase tracking-[.14em] text-[#c8d3df]">
                        Next finding
                      </p>

                      <ArrowUpRight className="h-4 w-4 shrink-0 text-[#73b8ff]" />
                    </div>

                    <p className="mt-3 break-words text-base font-black text-white">
                      Duplicate service line item
                    </p>

                    <p className="mt-2 break-words text-sm font-bold text-red-200">
                      $89.00 · Critical
                    </p>
                  </div>

                  <div className="min-w-0 rounded-[20px] border border-[#36d399]/20 bg-[#36d399]/[0.055] p-4 sm:p-5">
                    <div className="flex min-w-0 items-center gap-2">
                      <ShieldCheck className="h-4 w-4 shrink-0 text-[#60e2ad]" />

                      <p className="min-w-0 break-words text-xs font-extrabold uppercase tracking-[.14em] text-[#72eaba]">
                        What to do next
                      </p>
                    </div>

                    <p className="mt-3 break-words text-base font-black text-white">
                      Your 3 most important next steps
                    </p>

                    <p className="mt-2 break-words text-sm font-semibold text-[#dce4ec]">
                      Ordered by evidence, urgency, and possible cost.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <p className="mt-5 break-words px-1 text-center text-sm font-semibold leading-6 text-[#526477]">
              Demonstration data only. Actual findings depend on the evidence in
              the uploaded document.
            </p>
          </motion.div>
        </div>
      </Container>
    </section>
  );
}