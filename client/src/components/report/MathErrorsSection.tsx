import { motion } from "framer-motion";
import { Calculator, AlertTriangle } from "lucide-react";
import type { MathematicalError } from "@/types/audit";

interface MathErrorsSectionProps {
  errors: MathematicalError[];
}

const severityColor = {
  Critical: "text-red-400",
  High: "text-amber-400",
  Medium: "text-yellow-400",
  Low: "text-blue-400",
};

const severityBadge = {
  Critical: "bg-red-500/20 text-red-300",
  High: "bg-amber-500/20 text-amber-300",
  Medium: "bg-yellow-500/20 text-yellow-300",
  Low: "bg-blue-500/20 text-blue-300",
};

export function MathErrorsSection({ errors }: MathErrorsSectionProps) {
  if (!errors || errors.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <Calculator className="h-5 w-5 text-red-400" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-[-0.02em]">Mathematical Errors</h2>
        <span className="px-3 py-1 rounded-full bg-red-500/15 border border-red-500/20 text-sm font-semibold text-red-300">
          {errors.length}
        </span>
      </div>

      <div className="space-y-4">
        {errors.map((err, i) => {
          const scol = severityColor[err.severity] ?? "text-amber-400";
          const sbadge = severityBadge[err.severity] ?? severityBadge.Medium;
          return (
            <motion.div
              key={err.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-2xl border border-red-500/20 bg-red-500/[0.03] p-6 sm:p-8"
            >
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${sbadge}`}>
                  {err.severity}
                </span>
                {err.pageNumber && (
                  <span className="text-[12px] text-premium-muted font-mono">Page {err.pageNumber}</span>
                )}
              </div>

              <h3 className="text-xl font-bold text-premium-primary mb-4">{err.title}</h3>

              {/* The arithmetic */}
              <div className="mb-5 grid gap-3 sm:grid-cols-3">
                {err.expectedValue !== null && (
                  <div className="rounded-xl border border-savings-500/20 bg-savings-500/[0.05] p-4 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-savings-400/60 mb-1">Expected</p>
                    <p className="text-2xl font-black text-savings-400">${err.expectedValue?.toLocaleString()}</p>
                  </div>
                )}
                {err.actualValue !== null && (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/[0.05] p-4 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-red-400/60 mb-1">Actual (Charged)</p>
                    <p className="text-2xl font-black text-red-400">${err.actualValue?.toLocaleString()}</p>
                  </div>
                )}
                {err.discrepancy !== null && (
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.05] p-4 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-amber-400/60 mb-1">Discrepancy</p>
                    <p className="text-2xl font-black text-amber-400">${Math.abs(err.discrepancy ?? 0).toLocaleString()}</p>
                  </div>
                )}
              </div>

              {err.explanation && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-amber-400/60" />
                    <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-amber-400/60">Explanation</p>
                  </div>
                  <p className="text-[16px] leading-relaxed text-premium-secondary">{err.explanation}</p>
                </div>
              )}

              {err.evidence && (
                <div className="mb-4 rounded-xl border-l-[3px] border-intel-400/30 bg-intel-400/[0.04] p-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-intel-400/60 mb-2">Evidence</p>
                  <p className="text-[14px] text-premium-secondary italic">&ldquo;{err.evidence}&rdquo;</p>
                </div>
              )}

              {err.recommendedAction && (
                <div className="rounded-xl border border-savings-500/10 bg-savings-500/[0.04] p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-savings-400/60 mb-1">Recommended Action</p>
                  <p className="text-[15px] text-premium-secondary">{err.recommendedAction}</p>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
