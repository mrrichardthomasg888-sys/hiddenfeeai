import type { AuditReport } from "@/types/audit";
import { Gauge } from "lucide-react";

interface RiskScoreCardProps {
  report: AuditReport;
}

function getRiskColor(level: string): string {
  switch (level) {
    case "Low": return "text-savings-400";
    case "Review Recommended": return "text-risk-medium";
    case "Elevated": return "text-risk-high";
    case "High": return "text-risk-critical";
    default: return "text-violet-400/60";
  }
}

function getRiskHex(level: string): string {
  switch (level) {
    case "Low": return "#10b981";
    case "Review Recommended": return "#f59e0b";
    case "Elevated": return "#f97316";
    case "High": return "#ef4444";
    default: return "#8b5cf6";
  }
}

export function RiskScoreCard({ report }: RiskScoreCardProps) {
  const { risk_score, risk_level, confidence_level, financial_impact } = report;
  const colorClass = getRiskColor(risk_level);
  const riskHex = getRiskHex(risk_level);

  const circularGradient = `conic-gradient(${riskHex} ${risk_score}%, rgba(139,92,246,0.15) ${risk_score}%)`;

  return (
    <div className="rounded-2xl border border-violet-500/10 bg-midnight-900/80 p-6 glow-purple">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `${riskHex}20` }}>
          <Gauge className={`h-5 w-5 ${colorClass}`} strokeWidth={1.75} />
        </div>
        <div>
          <p className="text-sm font-medium text-violet-100">Risk Assessment</p>
          <p className={`text-xs font-semibold ${colorClass}`}>{risk_level}</p>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-6">
        <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
          <div className="absolute inset-0 rounded-full" style={{ background: circularGradient }} />
          <div className="absolute inset-[4px] rounded-full bg-midnight-900" />
          <div className="relative z-10 text-center">
            <p className="text-2xl font-bold text-violet-100">{risk_score}</p>
            <p className="text-[10px] font-medium text-violet-400/60">/100</p>
          </div>
        </div>

        <div className="flex-1 space-y-3">
          <div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-violet-400/60">Confidence</span>
              <span className="font-semibold text-violet-100">{confidence_level}%</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-violet-500/10">
              <div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${confidence_level}%` }} />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-violet-400/60">Questionable Charges</span>
              <span className="font-semibold text-risk-critical">${financial_impact.questionable_charges_total.toLocaleString()}</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-violet-500/10">
              <div className="h-full rounded-full bg-risk-critical transition-all" style={{ width: `${Math.min((financial_impact.questionable_charges_total / Math.max(financial_impact.original_total, 1)) * 100, 100)}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-violet-500/5 p-3">
        <p className="text-xs text-violet-400/60">
          <span className="font-medium text-violet-200">Corrected total: </span>
          ${financial_impact.corrected_total.toLocaleString()}
          {financial_impact.questionable_charges_total > 0 && (
            <span className="text-savings-400"> (save ${(financial_impact.original_total - financial_impact.corrected_total).toLocaleString()})</span>
          )}
        </p>
      </div>
    </div>
  );
}