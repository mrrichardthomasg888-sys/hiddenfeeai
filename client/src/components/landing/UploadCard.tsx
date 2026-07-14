import { useCallback, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  UploadCloud,
  FileText,
  Lock,
  X,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const ACCEPTED = ".pdf,.png,.jpg,.jpeg,.webp,.tiff,.docx,.xlsx,.csv";

const SCAN_STEPS = [
  "Document received",
  "Extracting financial information",
  "Checking calculations",
  "Searching for hidden fees",
  "Generating audit",
];

type CardState = "idle" | "processing" | "complete";

interface UploadCardProps {
  onFileSelected?: (file: File) => void;
}

export function UploadCard({ onFileSelected }: UploadCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<CardState>("idle");
  const [stepIndex, setStepIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const runDemoScan = useCallback(() => {
    setState("processing");
    setStepIndex(0);
    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      if (i >= SCAN_STEPS.length) {
        clearInterval(interval);
        setState("complete");
        return;
      }
      setStepIndex(i);
    }, 750);
  }, []);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const selected = files?.[0];
      if (!selected) return;
      setFile(selected);
      onFileSelected?.(selected);
    },
    [onFileSelected]
  );

  const reset = () => {
    setFile(null);
    setState("idle");
    setStepIndex(0);
  };

  return (
    <div
      id="upload"
      className={cn(
        "scan-border w-full max-w-xl rounded-3xl bg-white p-7 shadow-[0_20px_60px_-15px_rgba(2,6,23,0.35)] transition-colors sm:p-9",
        isDragging && "bg-trust-500/5"
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
    >
      <AnimatePresence mode="wait">
        {state === "idle" && !file && (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex w-full flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-mist-200 px-6 py-12 text-center transition-colors hover:border-trust-500 hover:bg-trust-500/5"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-900/5">
                <UploadCloud className="h-7 w-7 text-ink-900" strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-lg font-semibold text-ink-900">
                  Upload your document
                </p>
                <p className="mt-1 text-base text-mist-500">
                  Drag and drop or click to upload
                </p>
              </div>
            </button>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs font-medium text-mist-500">
              {["PDF", "Images", "Invoices", "Receipts", "Contracts", "Bills"].map(
                (t, i, arr) => (
                  <span key={t} className="flex items-center gap-2">
                    {t}
                    {i < arr.length - 1 && <span className="text-mist-300">•</span>}
                  </span>
                )
              )}
            </div>
          </motion.div>
        )}

        {state === "idle" && file && (
          <motion.div
            key="selected"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-4"
          >
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-mist-200 bg-mist-50 px-4 py-3.5">
              <div className="flex min-w-0 items-center gap-3">
                <FileText className="h-5 w-5 shrink-0 text-trust-600" />
                <span className="truncate text-sm font-medium text-ink-900">
                  {file.name}
                </span>
              </div>
              <button
                type="button"
                onClick={reset}
                className="shrink-0 rounded-full p-1 text-mist-400 hover:bg-mist-100 hover:text-ink-900"
                aria-label="Remove file"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <Button variant="savings" size="lg" className="w-full" onClick={runDemoScan}>
              Start AI Audit
            </Button>
          </motion.div>
        )}

        {state === "processing" && (
          <motion.div
            key="processing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-5 py-6 text-center"
          >
            <p className="text-lg font-semibold text-ink-900">
              AI Audit in progress
            </p>
            <div className="w-full max-w-xs space-y-2.5 text-left">
              {SCAN_STEPS.map((step, i) => (
                <div
                  key={step}
                  className={cn(
                    "flex items-center gap-2.5 text-sm transition-colors",
                    i <= stepIndex ? "text-ink-900" : "text-mist-300"
                  )}
                >
                  {i < stepIndex ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-savings-500" />
                  ) : i === stepIndex ? (
                    <span className="h-4 w-4 shrink-0 animate-pulse rounded-full bg-trust-500" />
                  ) : (
                    <span className="h-4 w-4 shrink-0 rounded-full border border-mist-200" />
                  )}
                  {step}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {state === "complete" && (
          <motion.div
            key="complete"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-3 py-8 text-center"
          >
            <CheckCircle2 className="h-10 w-10 text-savings-500" />
            <p className="text-lg font-semibold text-ink-900">
              Your financial audit is ready
            </p>
            <p className="max-w-xs text-sm text-mist-500">
              Full document analysis unlocks after checkout — available in the
              next build phase.
            </p>
            <Button variant="outline" size="sm" onClick={reset}>
              Try another document
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        capture="environment"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      <div className="mt-6 flex items-start justify-center gap-2 border-t border-mist-100 pt-5 text-center text-sm text-mist-500">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-savings-500" />
        <span>
          <span className="font-medium text-ink-900">Private AI Analysis.</span>{" "}
          Your document is analyzed securely and automatically deleted after
          processing. No account required.
        </span>
      </div>
    </div>
  );
}
