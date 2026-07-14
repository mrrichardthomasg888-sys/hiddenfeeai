import type { AuditReport } from "@/types/audit";
import { FileText, DollarSign, AlertTriangle, TrendingDown } from "lucide-react";

interface ReportSummaryProps {
  report: AuditReport;
}

export function ReportSummary({ report }: ReportSummaryProps) {
  const { document_meta, financial_impact, findings, potential_savings } = report;

  const stats = [
    { icon: FileText, label: "Documents Analyzed", value: "1", sub: document_meta.document_type, iconBg: "bg-violet-500/15", iconColor: "text-violet-400" },
    { icon: DollarSign, label: "Total Amount Reviewed", value: `$${financial_impact.original_total.toLocaleString()}`, sub: "invoice total", iconBg: "bg-violet-500/15", iconColor: "text-violet-400" },
    { icon: AlertTriangle, label: "Issues Detected", value: findings.length, sub: findings.length === 1 ? "finding" : `${findings.length} findings`, iconBg: "bg-amber-500/15", iconColor: "text-amber-400" },
    { icon: TrendingDown, label: "Potential Savings", value: `$${potential_savings.toLocaleString()}`, sub: "recoverable", iconBg: "bg-savings-500/15", iconColor: "text-savings-400" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map(({ icon: Icon, label, value, sub, iconBg, iconColor }) => (
        <div key={label} className="rounded-xl border border-violet-500/10 bg-midnight-900/80 p-4 glow-purple">
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconBg}`}>
            <Icon className={`h-4 w-4 ${iconColor}`} strokeWidth={1.75} />
          </div>
          <p className="mt-3 text-xs font-semibold text-violet-300/80">{label}</p>
          <p className="mt-0.5 text-xl font-bold text-violet-100">{value}</p>
          <p className="text-xs font-medium text-violet-300/60">{sub}</p>
        </div>
      ))}
    </div>
  );
}