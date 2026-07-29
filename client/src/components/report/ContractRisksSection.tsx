import { motion } from "framer-motion";
import { FileWarning, AlertTriangle, FileSearch, Scale } from "lucide-react";
import type { ContractRisk } from "@/types/audit";

interface ContractRisksSectionProps {
  risks: ContractRisk[];
}

const severityConfig = {
  Critical: { color: "text-red-400", bg: "card-critical", badge: "bg-red-500/20 text-red-300" },
  High: { color: "text-amber-400", bg: "card-high", badge: "bg-amber-500/20 text-amber-300" },
  Medium: { color: "text-yellow-400", bg: "card-medium", badge: "bg-yellow-500/20 text-yellow-300" },
  Low: { color: "text-blue-400", bg: "card-low", badge: "bg-blue-500/20 text-blue-300" },
};

export function ContractRisksSection({ risks }: ContractRisksSectionProps) {
  if (!risks || risks.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
          <FileWarning className="h-5 w-5 text-amber-400" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-[-0.02em]">Contract Risks</h2>
        <span className="px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/20 text-sm font-semibold text-amber-300">
          {risks.length}
        </span>
      </div>

      <div className="space-y-4">
        {risks.map((risk, i) => {
          const cfg = severityConfig[risk.severity] ?? severityConfig.Medium;
          return (
            <motion.div
              key={risk.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className={`rounded-2xl ${cfg.bg} p-6 sm:p-8`}
            >
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${cfg.badge}`}>
                  {risk.severity}
                </span>
                <span className="text-[13px] font-semibold text-premium-muted">{risk.status?.replace("_", " ")}</span>
                <span className="text-[12px] text-premium-muted">
                  <span className="text-premium-secondary font-semibold">{risk.confidenceScore}%</span> confidence
                </span>
                {risk.pageNumber && (
                  <span className="text-[12px] text-premium-muted font-mono border-l border-white/[0.06] pl-3">
                    Page {risk.pageNumber}
                  </span>
                )}
              </div>

              <h3 className="text-xl font-bold text-premium-primary mb-4">{risk.title}</h3>

              {risk.clauseText && (
                <div className="mb-5 rounded-xl border-l-[3px] border-amber-400/30 bg-amber-400/[0.04] p-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-amber-400/60 mb-2">Contract Clause</p>
                  <p className="text-[15px] leading-relaxed text-premium-secondary italic">&ldquo;{risk.clauseText}&rdquo;</p>
                </div>
              )}

              {risk.explanation && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-amber-400/60" />
                    <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-amber-400/60">Why This Is Risky</p>
                  </div>
                  <p className="text-[16px] leading-relaxed text-premium-secondary">{risk.explanation}</p>
                </div>
              )}

              {risk.whyItMatters && (
                <p className="text-[15px] text-premium-tertiary leading-relaxed mb-4">{risk.whyItMatters}</p>
              )}

              {risk.recommendedAction && (
                <div className="rounded-xl border border-savings-500/10 bg-savings-500/[0.04] p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-savings-400/60 mb-1">Recommended Action</p>
                  <p className="text-[15px] text-premium-secondary">{risk.recommendedAction}</p>
                </div>
              )}

              {risk.negotiationStrategy?.steps && risk.negotiationStrategy.steps.length > 0 && (
                <div className="mt-4 rounded-xl border border-trust-400/10 bg-trust-400/[0.03] p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Scale className="h-4 w-4 text-trust-400/60" />
                    <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-trust-400/60">Negotiation Steps</p>
                  </div>
                  <ol className="space-y-2">
                    {risk.negotiationStrategy.steps.map((s, j) => (
                      <li key={j} className="flex items-start gap-3 text-[14px] text-premium-secondary">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-trust-400/10 text-[10px] font-bold text-trust-400">{j + 1}</span>
                        {s}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
