import { motion } from "framer-motion";
import { DollarSign, AlertTriangle, Shield, TrendingDown } from "lucide-react";

interface ValueSummaryBannerProps {
  totalIssues: number;
  criticalIssues: number;
  feesIdentified: number;
  potentialSavings: number;
  riskLevel: string;
}

export function ValueSummaryBanner({
  totalIssues,
  criticalIssues,
  feesIdentified,
  potentialSavings,
  riskLevel,
}: ValueSummaryBannerProps) {
  const items = [
    {
      icon: AlertTriangle,
      label: "Issues Found",
      value: totalIssues,
      suffix: "",
      highlight: criticalIssues > 0 ? `${criticalIssues} critical` : undefined,
      color: criticalIssues > 0 ? "text-risk-critical" : "text-violet-200",
    },
    {
      icon: DollarSign,
      label: "Fees Identified",
      value: feesIdentified,
      suffix: "",
      currency: true,
      color: "text-violet-200",
    },
    {
      icon: TrendingDown,
      label: "Potential Savings",
      value: potentialSavings,
      suffix: "",
      currency: true,
      color: "text-savings-400",
    },
    {
      icon: Shield,
      label: "Risk Level",
      value: 0,
      suffix: riskLevel,
      textOnly: true,
      color:
        riskLevel === "High"
          ? "text-risk-critical"
          : riskLevel === "Elevated"
            ? "text-risk-high"
            : "text-violet-200",
    },
  ];

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(val);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-violet-500/10 bg-midnight-900/80 p-5 sm:p-6"
    >
      <h2 className="text-sm font-semibold text-violet-100 mb-4">
        Audit Summary
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-xl bg-violet-500/5 border border-violet-500/10 p-3 text-center"
          >
            <item.icon className={`mx-auto h-4 w-4 ${item.color} mb-1.5`} />
            <p className="text-[10px] font-medium text-violet-400/60 uppercase tracking-wide">
              {item.label}
            </p>
            {item.textOnly ? (
              <p className={`mt-0.5 text-sm font-bold ${item.color}`}>
                {item.suffix}
              </p>
            ) : (
              <p className={`mt-0.5 text-sm font-bold ${item.color}`}>
                {item.currency ? formatCurrency(item.value) : item.value}
              </p>
            )}
            {item.highlight && (
              <p className="mt-0.5 text-[10px] font-medium text-risk-critical/70">
                {item.highlight}
              </p>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}