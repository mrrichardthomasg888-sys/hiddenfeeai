import { motion } from "framer-motion";
import { AlertCircle, Eye, PiggyBank, ShieldCheck } from "lucide-react";

interface ValueSummaryDashboardProps {
  totalIssues: number;
  hiddenFeesCount: number;
  potentialSavings: number;
  confidenceLevel: number;
}

function formatCurrency(value: number): string | null {
  if (value <= 0) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

const metrics = [
  { key: "issues" as const, icon: AlertCircle, label: "Issues Detected", color: "text-red-400" },
  { key: "fees" as const, icon: Eye, label: "Hidden Fees Found", color: "text-amber-400" },
  { key: "savings" as const, icon: PiggyBank, label: "Potential Savings", color: "text-savings-400" },
  { key: "confidence" as const, icon: ShieldCheck, label: "AI Confidence", color: "text-trust-400" },
];

export function ValueSummaryDashboard({
  totalIssues,
  hiddenFeesCount,
  potentialSavings,
  confidenceLevel,
}: ValueSummaryDashboardProps) {
  const formattedSavings = formatCurrency(potentialSavings);
  const hasExactSavings = potentialSavings > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="grid grid-cols-2 gap-3 sm:grid-cols-4"
    >
      {metrics.map((m, i) => {
        let displayValue: string;
        let subtext: string | undefined;
        let isMuted = false;

        switch (m.key) {
          case "issues":
            displayValue = String(totalIssues);
            subtext = totalIssues === 0 ? "No issues found" : "across document";
            break;
          case "fees":
            displayValue = String(hiddenFeesCount);
            subtext = hiddenFeesCount === 0 ? "None detected" : "identified";
            break;
          case "savings":
            if (hasExactSavings && formattedSavings) {
              displayValue = formattedSavings;
              subtext = "estimated savings";
            } else {
              displayValue = "Unknown";
              isMuted = true;
              subtext = "requires negotiation";
            }
            break;
          case "confidence":
            displayValue = `${Math.round(confidenceLevel)}%`;
            subtext = "AI certainty";
            break;
          default:
            displayValue = "—";
        }

        return (
          <motion.div
            key={m.key}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.05 }}
            className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 backdrop-blur-sm"
          >
            <div className="flex flex-col items-center text-center gap-2">
              <div className="h-10 w-10 rounded-xl bg-white/[0.04] flex items-center justify-center">
                {(() => { const Icon = m.icon; return <Icon className={`h-5 w-5 ${isMuted ? "text-white/25" : m.color}`} />; })()}
              </div>
              <div>
                <p className={`text-3xl sm:text-4xl font-bold tabular-nums tracking-tight ${isMuted ? "text-white/35" : m.color}`}>
                  {displayValue}
                </p>
                <p className="mt-1 text-xs font-medium text-white/50 uppercase tracking-wide">
                  {m.label}
                </p>
                {subtext && (
                  <p className="mt-0.5 text-[10px] text-white/25">{subtext}</p>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}