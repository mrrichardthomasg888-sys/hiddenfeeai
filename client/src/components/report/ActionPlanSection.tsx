import { motion } from "framer-motion";
import { ClipboardCheck, Search, FileText, MessageSquare, CheckCircle2, AlertTriangle } from "lucide-react";
import type { Finding } from "@/types/audit";

interface ActionPlanSectionProps {
  findings: Finding[];
  riskLevel: string;
  hasNegotiation: boolean;
}

const stepIcons = [Search, FileText, MessageSquare, ClipboardCheck];

const timelineSteps = [
  { label: "NOW", sub: "Review Critical and High-severity findings" },
  { label: "BEFORE SIGNING OR PAYING", sub: "Request clarification and review the supporting documents" },
  { label: "DURING THE CONVERSATION", sub: "Use the report findings and negotiation scripts" },
  { label: "AFTER THE RESPONSE", sub: "Confirm all agreed changes in writing" },
];

export function ActionPlanSection({ findings, riskLevel, hasNegotiation }: ActionPlanSectionProps) {
  const criticalCount = findings.filter(f => f.severity === "Critical").length;
  const highCount = findings.filter(f => f.severity === "High").length;
  const priorityCount = criticalCount + highCount;

  // ── Dynamic "Your Next Priority" summary ──
  const nextPriority =
    criticalCount > 0
      ? "Address the highest-risk findings before signing, accepting, or making additional payments. Review the evidence for each issue and request written clarification before proceeding."
      : highCount > 0
        ? "Review the high-priority findings carefully and request clarification or supporting documentation before proceeding."
        : "Use the findings below to clarify the agreement, confirm charges, and document any changes in writing.";

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-[2rem] border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(122,92,245,0.04),transparent)]" />

      <div className="relative p-8 sm:p-12">
        {/* ── Header ── */}
        <div className="flex items-center gap-4 mb-2">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-500/20 to-violet-600/10 flex items-center justify-center border border-violet-400/10">
            <ClipboardCheck className="h-7 w-7 text-violet-300" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-[-0.02em]">Action Plan</h2>
            <p className="text-base text-white/60 mt-0.5">
              Your personalized roadmap for reviewing the findings, preparing your questions, and taking the next best steps.
            </p>
          </div>
        </div>

        {/* ── Your Next Priority summary panel ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mt-8 rounded-2xl border border-violet-500/20 bg-gradient-to-r from-violet-500/[0.06] to-transparent p-6 sm:p-8"
        >
          <div className="flex items-start gap-4">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 border border-violet-400/20">
              <AlertTriangle className="h-5 w-5 text-violet-300" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-400/60 mb-2">Your Next Priority</p>
              <p className="text-lg leading-relaxed text-white/90 max-w-3xl">
                {nextPriority}
              </p>
              {priorityCount > 0 && (
                <p className="mt-3 text-sm font-semibold text-violet-300">
                  Priority findings to review: {priorityCount}
                  {criticalCount > 0 && (
                    <span className="ml-2 text-red-400">({criticalCount} critical)</span>
                  )}
                  {highCount > 0 && (
                    <span className="ml-2 text-amber-400">({highCount} high)</span>
                  )}
                </p>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── Numbered Priority Roadmap ── */}
        <div className="mt-10 space-y-8">
          {timelineSteps.map((step, i) => {
            const Icon = stepIcons[i];
            return (
              <motion.div
                key={step.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="group relative"
              >
                {/* Step number badge */}
                <div className="absolute -left-1 top-0 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-violet-500 bg-violet-500 text-white font-black text-sm">
                  {i + 1}
                </div>

                <div className="ml-10 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 sm:p-8 group-hover:bg-white/[0.04] transition-all duration-300">
                  <div className="flex items-center gap-3 mb-4">
                    <Icon className="h-5 w-5 text-violet-400" />
                    <h3 className="text-xl font-bold text-white">{step.label}</h3>
                  </div>

                  {i === 0 && (
                    <div className="space-y-4">
                      <p className="text-sm leading-relaxed text-white/80">
                        Start with Critical and High-severity findings. Open each finding and review the supporting evidence, affected language, charge information, and recommended action.
                      </p>
                      {priorityCount > 0 && (
                        <button
                          onClick={() => scrollTo("findings-section")}
                          className="inline-flex items-center gap-2 rounded-xl bg-violet-500/15 border border-violet-400/30 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-500/25 transition-all"
                        >
                          Review Priority Findings
                        </button>
                      )}
                    </div>
                  )}

                  {i === 1 && (
                    <div className="space-y-4">
                      <p className="text-sm leading-relaxed text-white/80">
                        Before contacting the provider, collect the relevant contract pages, invoices, fee schedules, and supporting details referenced in this report.
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {[
                          "Save a copy of this audit",
                          "Highlight the relevant contract language or charges",
                          "Note the finding title and severity",
                          "Write down the specific clarification you need",
                          "Keep copies of any related invoices, statements, or estimates",
                        ].map((item) => (
                          <div key={item} className="flex items-start gap-2.5">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-savings-400" />
                            <span className="text-sm text-white/80">{item}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 rounded-xl border border-amber-500/10 bg-amber-500/[0.04] p-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-amber-400/60 mb-1">Tip</p>
                        <p className="text-sm text-white/80">
                          Ask for explanations in writing whenever possible. Written responses are easier to review and compare with the original document.
                        </p>
                      </div>
                    </div>
                  )}

                  {i === 2 && (
                    <div className="space-y-4">
                      <p className="text-sm leading-relaxed text-white/80">
                        Use the report findings to ask clear, specific questions. Focus on the charge, contract term, or pricing practice identified by the audit.
                      </p>
                      <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-violet-400/60 mb-3">Ask:</p>
                        <ol className="space-y-2 text-sm text-white/80">
                          <li className="flex items-start gap-2.5"><span className="font-semibold text-violet-300">1.</span> What is this charge or contract term intended to cover?</li>
                          <li className="flex items-start gap-2.5"><span className="font-semibold text-violet-300">2.</span> Where was it disclosed before the agreement was accepted?</li>
                          <li className="flex items-start gap-2.5"><span className="font-semibold text-violet-300">3.</span> Is the amount fixed, optional, or subject to change?</li>
                          <li className="flex items-start gap-2.5"><span className="font-semibold text-violet-300">4.</span> Can the charge be removed, reduced, capped, or explained in writing?</li>
                          <li className="flex items-start gap-2.5"><span className="font-semibold text-violet-300">5.</span> Can the agreement be updated to reflect the final terms?</li>
                        </ol>
                      </div>
                      {hasNegotiation && (
                        <button
                          onClick={() => scrollTo("playbook")}
                          className="inline-flex items-center gap-2 rounded-xl bg-violet-500/15 border border-violet-400/30 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-500/25 transition-all"
                        >
                          Open Negotiation Scripts
                        </button>
                      )}
                    </div>
                  )}

                  {i === 3 && (
                    <div className="space-y-4">
                      <p className="text-sm leading-relaxed text-white/80">
                        After speaking with the provider, compare the response with the findings in this report. Confirm that any agreed changes appear in the final contract, invoice, statement, or written confirmation.
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {[
                          "Record the date and method of communication",
                          "Note the name or department of the person contacted",
                          "Save emails, messages, estimates, and revised documents",
                          "Follow up in writing after phone conversations",
                          "Verify that agreed changes appear in the final document",
                          "Review the next statement or invoice for unexpected changes",
                        ].map((item) => (
                          <div key={item} className="flex items-start gap-2.5">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-savings-400" />
                            <span className="text-sm text-white/80">{item}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 rounded-xl border border-red-500/10 bg-red-500/[0.04] p-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-red-400/60 mb-1">Important</p>
                        <p className="text-sm text-white/80">
                          Do not rely only on a verbal promise. Review the final written document before signing or making payment.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* ── Recommended Order Timeline ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mt-12"
        >
          <h3 className="text-lg font-bold text-white mb-6">Recommended Order</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {timelineSteps.map((t, i) => (
              <div key={t.label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-violet-500 text-white font-black text-sm mb-2">
                  {i + 1}
                </span>
                <p className="text-xs font-bold uppercase tracking-wider text-violet-400/60 mb-1">
                  {t.label}
                </p>
                <p className="text-xs text-white/60 leading-relaxed">
                  {t.sub}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
