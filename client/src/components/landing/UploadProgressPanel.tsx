import type { Ref } from "react";
import { AlertCircle, FileCheck2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export type UploadStage = "preparing_scans" | "creating_document" | "uploading" | "reading";

export interface UploadFileSummary {
  name: string;
  type: string;
  size?: number;
  pageCount?: number;
}

interface UploadProgressPanelProps {
  stage: UploadStage;
  file: UploadFileSummary;
  error?: string | null;
  isScan?: boolean;
  containerRef?: Ref<HTMLDivElement>;
  headingRef?: Ref<HTMLHeadingElement>;
  onRetry?: () => void;
  onReturnToScanner?: () => void;
  onChooseAnother?: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const stageCopy: Record<UploadStage, { status: string; detail: string }> = {
  preparing_scans: {
    status: "Preparing scanned pages…",
    detail: "Keeping every accepted page in the reviewed order.",
  },
  creating_document: {
    status: "Creating document…",
    detail: "Combining the accepted pages into one readable document on this device.",
  },
  uploading: {
    status: "Uploading document…",
    detail: "Sending the selected document through the existing private upload flow.",
  },
  reading: {
    status: "Reading document…",
    detail: "Reviewing charges, totals, tables, and terms before checkout.",
  },
};

export function UploadProgressPanel({
  stage,
  file,
  error,
  isScan,
  containerRef,
  headingRef,
  onRetry,
  onReturnToScanner,
  onChooseAnother,
}: UploadProgressPanelProps) {
  const current = stageCopy[stage];
  const title = error ? "Upload needs attention" : stage === "reading" ? "Reading document…" : "Uploading document…";
  const details = [
    file.type,
    file.size === undefined ? null : formatFileSize(file.size),
    file.pageCount ? `${file.pageCount} page${file.pageCount === 1 ? "" : "s"}` : null,
  ].filter(Boolean).join(" · ");

  return (
    <div
      id="upload-progress"
      data-testid="upload-progress"
      ref={containerRef}
      className="scroll-mt-[calc(6rem+env(safe-area-inset-top))] pb-[calc(0.5rem+env(safe-area-inset-bottom))]"
      role={error ? "alert" : "status"}
      aria-live={error ? "assertive" : "polite"}
      aria-atomic="true"
    >
      <div className="flex flex-col items-center gap-4 py-5 text-center sm:py-7">
        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${error ? "bg-risk-critical/10" : "bg-[#4da3ff]/10"}`}>
          {error ? <AlertCircle className="h-7 w-7 text-risk-critical" /> : <Loader2 className="h-7 w-7 animate-spin text-[#73b8ff]" />}
        </div>
        <div>
          <h2 ref={headingRef} tabIndex={-1} className="text-xl font-black text-white outline-none sm:text-2xl">{title}</h2>
          <p className={`mt-2 text-sm font-extrabold ${error ? "text-red-200" : "text-[#b9dcff]"}`}>{error || current.status}</p>
          {!error && <p className="mt-1.5 max-w-md text-sm font-semibold leading-6 text-[#c8d3df]">{current.detail}</p>}
        </div>

        <div className="flex w-full max-w-lg items-center gap-3 rounded-2xl border border-[#4da3ff]/20 bg-[#4da3ff]/[0.055] p-4 text-left">
          <FileCheck2 className="h-5 w-5 shrink-0 text-[#73b8ff]" aria-hidden="true" />
          <div className="min-w-0">
            <p className="break-words text-sm font-extrabold text-white">{file.name}</p>
            <p className="mt-1 text-xs font-semibold text-[#c8d3df]">{details || "Document details are being prepared"}</p>
          </div>
        </div>

        {error && (
          <div className="flex w-full max-w-lg flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
            {onRetry && <Button variant="violet" onClick={onRetry}>Retry Upload</Button>}
            {isScan && onReturnToScanner && <Button variant="outline" onClick={onReturnToScanner}>Return to Scanner</Button>}
            {onChooseAnother && <Button variant="outline" onClick={onChooseAnother}>Choose Another File</Button>}
          </div>
        )}
      </div>
    </div>
  );
}
