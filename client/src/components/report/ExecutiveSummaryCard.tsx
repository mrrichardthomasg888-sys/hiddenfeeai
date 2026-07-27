import { motion } from "framer-motion";
import { Lightbulb, ArrowRight, FileSearch, MessageSquare, AlertTriangle, Target } from "lucide-react";
import type { Finding } from "@/types/audit";

interface ExecutiveSummaryCardProps {
  summary: string;
  topConcerns: Finding[];
  onViewEvidence?: (finding: Finding) => void;
  onViewNegotiation?: (finding: Finding) => void;
}

const severityConfig = {
  Critical: { color: "text-red-400", bg: "card-critical", badge: "bg-red-500/20 text-red-300" },
  High: { color: "text-amber-400", bg: "card-high", badge: "bg-amber-500/20 text-amber-300" },
  Medium: { color: "text-yellow-400", bg: "card-medium", badge: "bg-yellow-500/20 text-yellow-300" },
  Low: { color: "text-blue-400", bg: "card-low", badge: "bg-blue-500/20 text-blue-300" },
};

export function ExecutiveSummaryCard({ summary, topConcerns, onViewEvidence, onViewNegotiation }: ExecutiveSummaryCardProps) {
  if (topConcerns.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="overflow-hidden rounded-[2rem] border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent"
    >
      <div className="relative p-8 sm:p-12 pb-0">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_20%_0%,rgba(122,92,245,0.06),transparent)]" />
        <div className="relative">
          <div className="flex items-center gap-4 mb-2">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-intel-500/20 to-intel-600/10 flex items-center justify-center border border-intel-400/10">
              <Lightbulb className="h-7 w-7 text-intel-300" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-premium-primary tracking-[-0.02em]">Your Biggest Discoveries</h2>
              <p className="text-base text-premium-tertiary mt-0.5">Intelligence briefings from our analysis of your document</p>
            </div>
          </div>
          <p className="mt-6 text-lg sm:text-xl leading-relaxed text-premium-tertiary max-w-3xl">
            {summary}
          </p>
        </div>
      </div>

      <div className="px-8 sm:px-12 pb-8 sm:pb-12 mt-8 space-y-6">
        {topConcerns.slice(0, 3).map((f, i) => {
          const cfg = severityConfig[f.severity] ?? severityConfig.Medium;
          return (
            <motion.div
              key={f.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.12, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className={`relative overflow-hidden rounded-2xl ${cfg.bg} p-7 sm:p-8`}
            >
              <div className="flex items-center gap-4 mb-5">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.08] text-lg font-black text-premium-primary border border-white/[0.06]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className={`rounded-full px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider ${cfg.badge}`}>
                  {f.severity === "Critical" ? "CRITICAL RISK" : f.severity === "High" ? "HIGH SEVERITY" : f.severity === "Medium" ? "REVIEW NEEDED" : "INFO"}
                </span>
                {f.page && <span className="text-[13px] text-premium-muted font-mono">PG {f.page}</span>}
              </div>

              <h3 className="text-2xl font-bold text-premium-primary leading-snug tracking-[-0.01em]">{f.title}</h3>

              <div className="mt-6 space-y-5">
                <div>
                  <div className="flex items-center gap-2.5 mb-2">
                    <AlertTriangle className="h-4 w-4 text-amber-400/60" />
                    <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-amber-400/60">Why This Matters</p>
                  </div>
                  <p className="text-[17px] leading-relaxed text-premium-tertiary">
                    {f.why_it_matters || f.explanation}
                  </p>
                </div>

                {f.recommended_action && (
                  <div className="rounded-xl border border-savings-500/10 bg-savings-500/[0.04] p-5">
                    <div className="flex items-center gap-2.5 mb-2">
                      <Target className="h-4 w-4 text-savings-400/60" />
                      <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-savings-400/60">Your Move</p>
                    </div>
                    <p className="text-[17px] leading-relaxed text-premium-primary flex items-start gap-3">
                      <ArrowRight className="h-5 w-5 mt-0.5 shrink-0 text-savings-400" />
                      {f.recommended_action}
                    </p>
                  </div>
                )}

                {/* ── EVIDENCE PREVIEW (visible by default) ── */}
                {f.evidence && (
                  <div className="rounded-xl border-l-[3px] border-intel-400/30 bg-gradient-to-r from-intel-400/[0.04] to-transparent p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <FileSearch className="h-4 w-4 text-intel-400/60" />
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-intel-400/60">Evidence Found in Document</p>
                    </div>
                    <p className="text-[15px] leading-relaxed text-premium-secondary italic">&ldquo;{f.evidence.length > 200 ? f.evidence.slice(0, 200) + "..." : f.evidence}&rdquo;</p>
                    {f.line_reference && (
                      <p className="mt-1 text-[11px] text-premium-muted font-mono">Line reference: {f.line_reference}</p>
                    )}
                  </div>
                )}

                {/* ── NAVIGATION BUTTONS ── */}
                <div className="flex flex-wrap gap-3 pt-3">
                  {(f.negotiation_message || f.negotiation_strategy) && (
                    <button onClick={() => onViewNegotiation?.(f)}
                      className="btn-premium inline-flex items-center gap-2 rounded-xl px-5 py-3 text-[13px]">
                      <MessageSquare className="h-4 w-4" />
                      View Negotiation Script
                    </button>
                  )}
                  <button onClick={() => onViewEvidence?.(f)}
                    className="btn-ghost-premium inline-flex items-center gap-2 rounded-xl px-5 py-3 text-[13px]">
                    <FileSearch className="h-4 w-4" />
                    View All Findings
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}