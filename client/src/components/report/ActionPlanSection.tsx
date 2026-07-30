import { motion } from "framer-motion";
import { ClipboardCheck, Search, FileText, MessageSquare, CheckCircle2, AlertTriangle } from "lucide-react";
import type { RecommendedAction } from "@/types/audit";

interface ActionPlanSectionProps {
  recommendedActions: RecommendedAction[];
  questionsToAsk: string[];
}

const phaseConfig = {
  "Before Contact": { color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", icon: Search },
  "During Negotiation": { color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", icon: MessageSquare },
  "After Negotiation": { color: "text-savings-400", bg: "bg-savings-500/10", border: "border-savings-500/20", icon: ClipboardCheck },
};

const difficultyColor = {
  Easy: "bg-savings-500/15 text-savings-400",
  Medium: "bg-amber-500/15 text-amber-400",
  Hard: "bg-red-500/15 text-red-400",
};

export function ActionPlanSection({
  recommendedActions,
  questionsToAsk,
}: ActionPlanSectionProps) {
  if (recommendedActions.length === 0 && questionsToAsk.length === 0) return null;

  // Group actions by phase
  const byPhase: Record<string, RecommendedAction[]> = {};
  for (const action of [...recommendedActions].sort((a, b) => a.priority - b.priority)) {
    const phase = action.phase || "During Negotiation";
    byPhase[phase] = byPhase[phase] ? [...byPhase[phase], action] : [action];
  }

  const phases = ["Before Contact", "During Negotiation", "After Negotiation"] as const;
  const criticalCount = recommendedActions.filter(
    (a) => a.timeframe === "Immediate"
  ).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-[2rem] border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(122,92,245,0.04),transparent)]" />

      <div className="relative p-8 sm:p-12">
        {/* Header */}
        <div className="flex items-center gap-4 mb-2">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-500/20 to-violet-600/10 flex items-center justify-center border border-violet-400/10">
            <ClipboardCheck className="h-7 w-7 text-violet-300" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-[-0.02em]">Action Plan</h2>
            <p className="text-base text-white/60 mt-0.5">
              What to question first, what to ask, and how to follow up.
            </p>
          </div>
        </div>

        {/* Priority banner */}
        {criticalCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mt-8 rounded-2xl border border-red-500/20 bg-red-500/[0.06] p-6"
          >
            <div className="flex items-start gap-4">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/15 border border-red-400/20">
                <AlertTriangle className="h-5 w-5 text-red-300" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-400/60 mb-2">Review Before You Pay or Sign</p>
                <p className="text-lg leading-relaxed text-white/90 max-w-3xl">
                  {criticalCount} action{criticalCount > 1 ? "s" : ""} require immediate attention. Address these before signing, paying, or proceeding.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Phase-grouped actions */}
        <div className="mt-8 space-y-8">
          {phases.map((phase) => {
            const actions = byPhase[phase];
            if (!actions || actions.length === 0) return null;
            const cfg = phaseConfig[phase];
            const PhaseIcon = cfg.icon;

            return (
              <div key={phase}>
                <div className={`flex items-center gap-3 mb-4 pb-4 border-b border-white/[0.04]`}>
                  <div className={`h-8 w-8 rounded-lg ${cfg.bg} border ${cfg.border} flex items-center justify-center`}>
                    <PhaseIcon className={`h-4 w-4 ${cfg.color}`} />
                  </div>
                  <h3 className={`text-sm font-bold uppercase tracking-[0.15em] ${cfg.color}`}>{phase}</h3>
                </div>

                <div className="space-y-3">
                  {actions.map((action, i) => (
                    <motion.div
                      key={action.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + i * 0.05 }}
                      className={`rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 ${
                        action.timeframe === "Immediate" ? "border-red-500/20 bg-red-500/[0.03]" : ""
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.04] text-xs font-black ${
                          action.timeframe === "Immediate" ? "text-red-400 bg-red-500/10 border-red-500/20" : "text-premium-muted"
                        }`}>
                          {action.priority}
                        </div>
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <p className="text-base font-bold text-premium-primary">{action.action}</p>
                          </div>
                          {action.details && (
                            <p className="text-[15px] text-premium-secondary leading-relaxed">{action.details}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-2 mt-3">
                            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              action.timeframe === "Immediate" ? "bg-red-500/20 text-red-300" :
                              action.timeframe === "This Week" ? "bg-amber-500/20 text-amber-300" :
                              "bg-blue-500/20 text-blue-300"
                            }`}>
                              {action.timeframe}
                            </span>
                            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${difficultyColor[action.difficulty]}`}>
                              {action.difficulty}
                            </span>
                            {action.estimatedSavings && action.estimatedSavings > 0 && (
                              <span className="text-[12px] text-savings-400 font-semibold">
                                ~${action.estimatedSavings.toLocaleString()} savings
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Questions to ask */}
        {questionsToAsk.length > 0 && (
          <div className="mt-10 pt-8 border-t border-white/[0.04]">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-8 w-8 rounded-lg bg-intel-400/10 border border-intel-400/20 flex items-center justify-center">
                <FileText className="h-4 w-4 text-intel-400" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-intel-400">Questions to Ask</h3>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {questionsToAsk.map((q, i) => (
                <div key={i} className="flex items-start gap-3 rounded-xl border border-white/[0.04] bg-white/[0.01] p-4">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-intel-400/60" />
                  <p className="text-[14px] text-premium-secondary leading-relaxed">{q}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
