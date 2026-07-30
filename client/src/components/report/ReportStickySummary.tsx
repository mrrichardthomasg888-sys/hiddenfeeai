import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";

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
      className="report-command-bar sticky top-0 z-50 border-b border-white/[0.09] bg-[#0e1625]/92 shadow-[0_14px_45px_rgba(0,0,0,.28)] backdrop-blur-2xl print:hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 sm:px-6 max-w-screen-2xl mx-auto">
        {/* Left: Risk score */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-white/[0.09] bg-white/[0.055] px-3.5 py-2">
            <span className={`text-base font-black tabular-nums ${riskColor(riskLevel)}`}>
              {riskScore}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[.16em] text-[#c8d3df]">Attention</span>
          </div>
          <span className="h-5 w-px bg-white/[0.06]" />
          <span className="hidden items-center gap-1.5 text-[12px] font-bold text-[#e8edf4] sm:flex">
            <AlertTriangle className={`h-3.5 w-3.5 ${riskColor(riskLevel)}`} />
            {riskLevel}
          </span>
        </div>

        {/* Right: Stats */}
        <div className="flex items-center gap-5">
          <div className="text-center">
            <p className="text-sm font-bold text-white tabular-nums">{totalIssues}</p>
            <p className="text-[10px] font-bold text-[#c8d3df] uppercase tracking-wider">Items</p>
          </div>
          <div className="h-5 w-px bg-white/[0.06]" />
          <div className="text-center">
            <p className="text-sm font-bold text-savings-400 tabular-nums">
              {formatCurrency(potentialSavings)}
            </p>
            <p className="text-[10px] font-bold text-[#c8d3df] uppercase tracking-wider">Potential</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
