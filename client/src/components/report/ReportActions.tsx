import { useState } from "react";
import { Download, Printer, Share2, Loader2, Check, AlertCircle } from "lucide-react";
import { apiUrl } from "@/config/api";
import { Button } from "@/components/ui/button";

interface ReportActionsProps {
  auditId: string;
}

export function ReportActions({ auditId }: ReportActionsProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showFeedback = (type: "success" | "error", message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3000);
  };

  const handlePrint = () => {
    try {
      window.print();
    } catch {
      showFeedback("error", "Print failed. Try using your browser's menu.");
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "My HiddenFeeAI Professional Audit Report",
          text: "Here is my HiddenFeeAI document audit report.",
          url,
        });
        showFeedback("success", "Shared successfully!");
      } else {
        await navigator.clipboard.writeText(url);
        showFeedback("success", "Link copied to clipboard!");
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(url);
        showFeedback("success", "Link copied to clipboard!");
      } catch {
        showFeedback("error", "Could not share. Copy the URL manually.");
      }
    }
  };

  const handleDownload = () => {
    setIsDownloading(true);
    try {
      // Open the server PDF endpoint — triggers browser auto-download
      window.location.href = apiUrl(`/analyze/${auditId}/pdf`);
      showFeedback("success", "PDF download started!");
    } catch {
      showFeedback("error", "Could not download PDF. Try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="report-actions print:hidden sticky bottom-0 z-50 border-t border-[#f4c542]/20 bg-[#0e1625]/95 shadow-[0_-18px_55px_rgba(0,0,0,.35)] backdrop-blur-2xl">
      {feedback && (
        <div
          className={`mx-auto flex max-w-4xl items-center justify-center gap-2 px-4 py-2 text-xs font-medium ${
            feedback.type === "success" ? "text-savings-400" : "text-risk-critical"
          }`}
        >
          {feedback.type === "success" ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <AlertCircle className="h-3.5 w-3.5" />
          )}
          {feedback.message}
        </div>
      )}
      <div className="mx-auto flex max-w-4xl items-center justify-center gap-3 px-4 py-4">
        <Button
          type="button"
          variant="violet"
          size="sm"
          onClick={handleDownload}
          disabled={isDownloading}
          className="report-download-btn font-extrabold"
        >
          {isDownloading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Downloading...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Download My Report
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handlePrint}
          className="font-medium"
        >
          <Printer className="h-4 w-4" />
          Print
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleShare}
          className="font-medium"
        >
          <Share2 className="h-4 w-4" />
          Share Report
        </Button>
      </div>
    </div>
  );
}
