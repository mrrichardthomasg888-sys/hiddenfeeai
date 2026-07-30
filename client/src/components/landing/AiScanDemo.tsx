import { FileText, Sparkles, Zap, TrendingDown, UploadCloud, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AiScanDemoProps {
  onStartUpload: () => void;
}

const SCAN_STEPS = [
  "Document received",
  "Reading document content",
  "Extracting financial data",
  "Reviewing every charge",
  "Checking calculations",
  "Finding potential issues",
  "Generating audit report",
];

export function AiScanDemo({ onStartUpload }: AiScanDemoProps) {
  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="rounded-3xl border border-violet-500/15 bg-gradient-to-b from-midnight-800 to-midnight-900 p-6 sm:p-8 backdrop-blur-sm">
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15">
            <Sparkles className="h-4 w-4 text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-violet-100">Example Audit Report</p>
            <p className="text-xs text-violet-400/60">Sample demonstration — not your document</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* LEFT: Demo document preview */}
          <div className="rounded-2xl border border-violet-500/10 bg-midnight-900/80 p-4">
            <div className="mb-3 flex items-center gap-2 border-b border-violet-500/10 pb-2">
              <FileText className="h-4 w-4 text-violet-400" />
              <span className="text-xs font-medium text-violet-300">Sample Invoice.pdf</span>
            </div>
            <div className="space-y-1.5">
              {[
                { label: "Software License", amount: 299.00 },
                { label: "Setup Fee", amount: 99.00 },
                { label: "Processing Fee", amount: 49.00 },
                { label: "Sales Tax (8.5%)", amount: 48.70 },
                { label: "Shipping & Handling", amount: 25.00 },
                { label: "Documentation Fee", amount: 75.00 },
                { label: "Subtotal", amount: 595.70 },
                { label: "Total", amount: 595.70 },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-violet-300/70">
                  <span className="truncate">{item.label}</span>
                  <span className="ml-2 tabular-nums shrink-0">${item.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: AI steps */}
          <div className="rounded-2xl border border-violet-500/10 bg-midnight-900/80 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="h-4 w-4 text-violet-400" />
              <span className="text-xs font-medium text-violet-400/80 uppercase tracking-wider">What HiddenFeeAI checks</span>
            </div>
            <div className="space-y-2">
              {SCAN_STEPS.map((step, i) => (
                <div key={step} className="flex items-center gap-2.5 text-xs transition-all"
                  style={{ opacity: i < 3 ? 1 : 0.4 + (i - 3) * 0.12 }}
                >
                  {i < 4 ? (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-savings-500" />
                  ) : i === 4 ? (
                    <span className="h-3.5 w-3.5 shrink-0 animate-pulse rounded-full bg-violet-400" />
                  ) : (
                    <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-violet-500/20" />
                  )}
                  <span className={i <= 4 ? "text-violet-100" : "text-violet-500/40"}>{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Summary preview */}
        <div className="mt-4 rounded-2xl border border-violet-500/10 bg-midnight-900/80 p-4 text-center">
          <p className="text-xs text-violet-400/60 uppercase tracking-wider font-medium">Example Summary</p>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <div>
              <p className="text-lg font-bold text-violet-100">47</p>
              <p className="text-[10px] text-violet-400/60">Charges Reviewed</p>
            </div>
            <div>
              <p className="text-lg font-bold text-amber-400">5</p>
              <p className="text-[10px] text-violet-400/60">Issues Found</p>
            </div>
            <div>
              <TrendingDown className="h-4 w-4 mx-auto text-savings-400" />
              <p className="text-lg font-bold text-savings-400">$742</p>
              <p className="text-[10px] text-violet-400/60">Potential Savings</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-5 text-center">
          <p className="text-xs text-violet-400/40 mb-3">
            This is demonstration data. Upload your document to see what deserves a closer look.
          </p>
          <Button
            variant="violet"
            size="lg"
            className="w-full"
            onClick={onStartUpload}
          >
            <UploadCloud className="h-5 w-5" />
            Check My Document — $15
          </Button>
        </div>
      </div>
    </div>
  );
}
