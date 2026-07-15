import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { apiUrl } from "@/config/api";
import {
  UploadCloud,
  Lock,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const ACCEPTED_EXTENSIONS = [
  "pdf", "png", "jpg", "jpeg", "heic", "webp", "tiff", "tif",
  "docx", "doc", "txt", "csv", "xlsx", "xls", "xlsm",
];
const MAX_SIZE_MB = 25;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

function getExtension(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? parts[parts.length - 1]!.toLowerCase() : "";
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type CardState = "idle" | "uploading" | "extracting" | "awaiting_payment" | "analyzing" | "complete" | "error";

const ANALYSIS_STEPS = [
  "Reading your document",
  "Understanding financial structure",
  "Reviewing every charge",
  "Checking calculations",
  "Detecting hidden fees",
  "Preparing your personalized audit",
];

export function UploadCard() {
  const navigate = useNavigate();
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<CardState>("idle");
  const [auditId, setAuditId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileError, setFileError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [analyzeStep, setAnalyzeStep] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((files: FileList | null) => {
    const selected = files?.[0];
    if (!selected) return;

    const ext = getExtension(selected.name);
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      setFileError("Unsupported file type. Please upload a PDF, image (PNG/JPG), DOCX, TXT, CSV, or spreadsheet.");
      return;
    }

    if (selected.size > MAX_SIZE_BYTES) {
      setFileError(`File is too large. Maximum size is ${MAX_SIZE_MB} MB.`);
      return;
    }

    setFileError(null);
    setErrorMessage(null);
    setFile(selected);
    startUpload(selected);
  }, []);

  const startUpload = async (fileToUpload: File) => {
    setState("uploading");
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("file", fileToUpload);

    try {
      const xhr = new XMLHttpRequest();
      const uploadPromise = new Promise<{ auditId: string }>((resolve, reject) => {
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
        });
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText));
          else {
            try { reject(new Error(JSON.parse(xhr.responseText).error || "Upload failed")); }
            catch { reject(new Error("Upload failed. Please try again.")); }
          }
        });
        xhr.addEventListener("error", () => reject(new Error("Network error. Please check your connection.")));
        xhr.open("POST", apiUrl("/upload"));
        xhr.send(formData);
      });

      const data = await uploadPromise;
      setAuditId(data.auditId);
      setState("extracting");

      // Poll until extraction complete → payment gate
      const pollInterval = setInterval(async () => {
        try {
          const res = await fetch(apiUrl(`/analyze/${data.auditId}`));
          if (res.ok) {
            const job = await res.json();
            if (job.status === "extracted") {
              clearInterval(pollInterval);
              setState("awaiting_payment");
            } else if (job.status === "error") {
              clearInterval(pollInterval);
              setState("error");
              setErrorMessage(job.error || "Document processing failed.");
            }
          }
        } catch { /* continue polling */ }
      }, 1000);
    } catch (err) {
      setState("error");
      setErrorMessage(err instanceof Error ? err.message : "Upload failed.");
    }
  };

  const handlePayment = async () => {
    if (!auditId) return;
    setPaying(true);
    setPayError(null);

    try {
      const res = await fetch(apiUrl("/checkout/create-session"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auditId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Payment failed.");
      }
      const data = await res.json();
      if (data.url) {
        // Redirect to Stripe Checkout — pay with test card 4242 4242 4242 4242
        window.location.href = data.url;
      }
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "Something went wrong.");
      setPaying(false);
    }
  };

  const startRealAnalysis = async () => {
    if (!auditId) return;
    setState("analyzing");
    setAnalyzeStep(0);

    // Animate analysis steps
    const stepTimer = setInterval(() => {
      setAnalyzeStep((prev) => Math.min(prev + 1, ANALYSIS_STEPS.length - 1));
    }, 2000);

    try {
      const res = await fetch(apiUrl(`/analyze/${auditId}/start`), { method: "POST" });
      clearInterval(stepTimer);

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to start analysis.");
      }

      setState("complete");
      setTimeout(() => navigate(`/report/${auditId}`), 1500);
    } catch (err) {
      clearInterval(stepTimer);
      setState("error");
      setErrorMessage(err instanceof Error ? err.message : "Analysis failed.");
    }
  };

  const reset = () => {
    setFile(null); setState("idle"); setUploadProgress(0);
    setFileError(null); setErrorMessage(null); setAuditId(null);
    setPayError(null); setPaying(false); setAnalyzeStep(0);
  };

  return (
    <div
      id="upload"
      className={cn(
        "w-full max-w-xl rounded-3xl transition-all duration-500",
        state === "idle" || state === "uploading" || state === "extracting" || state === "error"
          ? "bg-midnight-800/80 p-7 sm:p-9 border border-violet-500/10 glow-purple scan-border"
          : "",
        state === "awaiting_payment" ? "bg-midnight-800/80 p-7 sm:p-9 border border-violet-500/10 glow-purple" : "",
        state === "analyzing" || state === "complete" ? "bg-midnight-800/80 p-7 sm:p-9 border border-violet-500/10 glow-purple" : ""
      )}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (state === "idle") handleFiles(e.dataTransfer.files); }}
    >
      <AnimatePresence mode="wait">
        {/* IDLE — upload drop zone */}
        {state === "idle" && (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex w-full flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-violet-500/20 px-6 py-12 text-center transition-colors hover:border-violet-400/40 hover:bg-violet-500/5"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10">
                <UploadCloud className="h-7 w-7 text-violet-400" strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-lg font-semibold text-violet-100">Upload your document</p>
                <p className="mt-1 text-base text-violet-300/60">Drag and drop or click to upload</p>
              </div>
            </button>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs font-medium text-violet-400/60">
              {["PDF", "Images (PNG/JPG)", "DOCX", "TXT", "CSV", "XLSX", "Bills", "Receipts", "Contracts"].map(
                (t, i, arr) => (
                  <span key={t} className="flex items-center gap-2">
                    {t}
                    {i < arr.length - 1 && <span className="text-violet-500/30">•</span>}
                  </span>
                )
              )}
            </div>

            {fileError && (
              <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-risk-critical/10 px-4 py-3 text-sm font-medium text-risk-critical">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {fileError}
              </div>
            )}

            <div className="mt-6 flex items-start justify-center gap-2 border-t border-violet-500/10 pt-5 text-center text-sm text-violet-300/50">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-violet-400" />
              <span>
                <span className="font-medium text-violet-200">Private AI Analysis.</span>{" "}
                Your document is analyzed securely and automatically deleted after processing. No account required. No data stored.
              </span>
            </div>
          </motion.div>
        )}

        {/* UPLOADING */}
        {state === "uploading" && (
          <motion.div key="uploading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-4 py-6 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
            <p className="text-lg font-semibold text-violet-100">Uploading document...</p>
            <div className="w-full max-w-xs">
              <div className="h-2 rounded-full bg-violet-500/10">
                <div className="h-full rounded-full bg-violet-500 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
              </div>
              <p className="mt-1.5 text-xs text-violet-400/60">{uploadProgress}%</p>
            </div>
          </motion.div>
        )}

        {/* EXTRACTING */}
        {state === "extracting" && (
          <motion.div key="extracting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-4 py-6 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
            <p className="text-lg font-semibold text-violet-100">Reading document...</p>
            <p className="text-sm text-violet-300/60">Extracting text and financial information</p>
          </motion.div>
        )}

        {/* AWAITING PAYMENT */}
        {state === "awaiting_payment" && (
          <motion.div key="awaiting_payment" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/15">
              <Lock className="h-8 w-8 text-violet-400" strokeWidth={1.75} />
            </div>

            <h2 className="mt-5 text-xl font-semibold text-violet-100">
              Your AI audit is ready to begin
            </h2>
            <p className="mt-2 text-sm text-violet-400/60 max-w-sm">
              Your document has been received. Unlock the full forensic analysis for a one-time fee.
            </p>

            <div className="mt-6 w-full rounded-2xl bg-violet-500/10 p-5">
              <p className="text-3xl font-bold text-violet-100">$15</p>
              <p className="text-sm text-violet-400/60">one-time payment</p>
            </div>

            <div className="mt-5 space-y-2.5 text-left w-full">
              {[
                "No subscription — pay once, get the full report",
                "No account required — completely anonymous",
                "Private processing — document auto-deleted after analysis",
                "Detailed findings with evidence and negotiation scripts",
              ].map((point) => (
                <div key={point} className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-savings-500" strokeWidth={2.5} />
                  <span className="text-sm text-violet-300">{point}</span>
                </div>
              ))}
            </div>

            {payError && (
              <div className="mt-4 w-full rounded-xl bg-risk-critical/10 border border-risk-critical/20 px-4 py-3 text-sm font-medium text-risk-critical">
                {payError}
              </div>
            )}

            <Button
              variant="violet"
              size="lg"
              className="mt-6 w-full"
              onClick={handlePayment}
              disabled={paying}
            >
              {paying ? (
                <><Loader2 className="h-5 w-5 animate-spin" /> Processing...</>
              ) : (
                <><Lock className="h-5 w-5" /> Pay $15 & Start Audit</>
              )}
            </Button>

            <div className="mt-4 flex items-start justify-center gap-2 text-sm text-violet-400/50">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-savings-500" />
              <span>
                <span className="font-medium text-violet-200">Your document is not stored.</span>{" "}
                After analysis, it is permanently deleted.
              </span>
            </div>
          </motion.div>
        )}

        {/* ANALYZING — real AI processing */}
        {state === "analyzing" && (
          <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-5 py-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/15">
              <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
            </div>
            <p className="text-lg font-semibold text-violet-100">AI Analysis in Progress</p>
            <div className="w-full max-w-xs space-y-2 text-left">
              {ANALYSIS_STEPS.map((step, i) => (
                <div key={step} className="flex items-center gap-2.5 text-sm transition-colors">
                  {i < analyzeStep ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-savings-500" />
                  ) : i === analyzeStep ? (
                    <span className="h-4 w-4 shrink-0 animate-pulse rounded-full bg-violet-400" />
                  ) : (
                    <span className="h-4 w-4 shrink-0 rounded-full border border-violet-500/20" />
                  )}
                  <span className={i <= analyzeStep ? "text-violet-100" : "text-violet-500/40"}>
                    {step}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* COMPLETE */}
        {state === "complete" && (
          <motion.div key="complete" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-savings-500/20">
              <CheckCircle2 className="h-8 w-8 text-savings-500" />
            </div>
            <p className="text-lg font-semibold text-violet-100">Audit complete!</p>
            <p className="text-sm text-violet-400/60">Redirecting to your report...</p>
          </motion.div>
        )}

        {/* ERROR */}
        {state === "error" && (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-risk-critical/10">
              <AlertCircle className="h-8 w-8 text-risk-critical" />
            </div>
            <p className="text-lg font-semibold text-violet-100">Something went wrong</p>
            <p className="max-w-xs text-sm text-violet-300/60">{errorMessage || "Please try again."}</p>
            <Button variant="outline" size="sm" onClick={reset}>Try again</Button>
          </motion.div>
        )}
      </AnimatePresence>

      <input ref={inputRef} id="file-upload-input" type="file" accept={ACCEPTED_EXTENSIONS.map((ext) => `.${ext}`).join(",")} className="hidden" onChange={(e) => handleFiles(e.target.files)} />
    </div>
  );
}