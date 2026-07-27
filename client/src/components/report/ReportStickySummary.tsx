import { motion } from "framer-motion";
import { AlertTriangle, TrendingDown, Shield } from "lucide-react";

interface ReportStickySummaryProps {
  riskScore: number;
  riskLevel: string;
  totalIssues: number;
  potentialSavings: number;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

const riskColor = (level: string) =>
  level === "High" ? "text-red-400" :
  level === "Elevated" ? "text-amber-400" :
  level === "Review Recommended" ? "text-yellow-400" : "text-emerald-400";

export function ReportStickySummary({
  riskScore,
  riskLevel,
  totalIssues,
  potentialSavings,
}: ReportStickySummaryProps) {
  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-50 border-b border-white/[0.04] bg-midnight-950/85 backdrop-blur-2xl print:hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 sm:px-6 max-w-screen-2xl mx-auto">
        {/* Left: Risk score */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-white/[0.04] px-3 py-1.5 border border-white/[0.04]">
            <span className={`text-base font-black tabular-nums ${riskColor(riskLevel)}`}>
              {riskScore}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Risk</span>
          </div>
          <span className="h-5 w-px bg-white/[0.06]" />
          <span className="flex items-center gap-1.5 text-[12px] font-semibold text-white/50">
            <AlertTriangle className={`h-3.5 w-3.5 ${riskColor(riskLevel)}`} />
            {riskLevel}
          </span>
        </div>

        {/* Right: Stats */}
        <div className="flex items-center gap-5">
          <div className="text-center">
            <p className="text-sm font-bold text-white tabular-nums">{totalIssues}</p>
            <p className="text-[9px] font-semibold text-white/35 uppercase tracking-wider">Issues</p>
          </div>
          <div className="h-5 w-px bg-white/[0.06]" />
          <div className="text-center">
            <p className="text-sm font-bold text-savings-400 tabular-nums">
              {formatCurrency(potentialSavings)}
            </p>
            <p className="text-[9px] font-semibold text-white/35 uppercase tracking-wider">Exposure</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}