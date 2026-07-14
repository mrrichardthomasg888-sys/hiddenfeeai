import { ShieldCheck } from "lucide-react";

interface ReportHeaderProps {
  documentType: string;
  issuer?: string;
  reportId: string;
  analysisDate: string;
}

export function ReportHeader({ documentType, issuer, reportId, analysisDate }: ReportHeaderProps) {
  const formattedDate = new Date(analysisDate).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className="border-b border-violet-500/10 pb-6">
      <div className="flex items-center gap-2 text-sm text-violet-300/80">
        <ShieldCheck className="h-4 w-4 text-violet-300" />
        <span className="font-semibold text-violet-200">HiddenFeeAI</span>
        <span aria-hidden="true">·</span>
        <span>Audit Report</span>
      </div>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-violet-100 sm:text-3xl">
        {documentType} Audit
      </h1>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-violet-300/80">
        {issuer && <span>Issuer: <span className="font-semibold text-violet-100">{issuer}</span></span>}
        <span>Report ID: <span className="font-mono font-semibold text-violet-100">{reportId.slice(0, 8)}</span></span>
        <span>Analyzed: <span className="font-semibold text-violet-100">{formattedDate}</span></span>
      </div>
    </div>
  );
}