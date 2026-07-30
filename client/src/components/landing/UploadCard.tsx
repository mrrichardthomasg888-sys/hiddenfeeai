import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { apiUrl } from "@/config/api";
import {
  UploadCloud,
  Lock,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  CreditCard,
  FileCheck2,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { prepareUploadFile, uploadDocument } from "@/lib/upload";

const ACCEPTED_EXTENSIONS = [
  // PDF
  "pdf",
  // Images — Gemini performs native OCR on all of these
  "png", "jpg", "jpeg", "webp", "heic", "heif", "tiff", "tif", "bmp", "gif",
  // Microsoft Office — Gemini reads natively (text + tables + structure)
  "docx", "doc", "xlsx", "xls",
  // Rich Text
  "rtf",
  // Plain text / data
  "csv", "txt", "md",
  // Web markup
  "html", "htm",
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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("hiddenfee:workflow", { detail: { active: state !== "idle" && state !== "error" } }));
    return () => { window.dispatchEvent(new CustomEvent("hiddenfee:workflow", { detail: { active: false } })); };
  }, [state]);

  useEffect(() => {
    if (!file?.type.startsWith("image/") || file.type === "image/heic" || file.type === "image/heif") {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleFiles = useCallback(async (files: FileList | null) => {
    const selected = files?.[0];
    if (!selected) return;

    const ext = getExtension(selected.name);
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      setFileError("Unsupported file type. Please upload a PDF, image (PNG/JPG/WEBP/TIFF/HEIC/BMP), Word document (DOCX/DOC), spreadsheet (XLSX/XLS/CSV), or text file (TXT/RTF).");
      return;
    }

    setFileError(null);
    setErrorMessage(null);
    setState("uploading");
    setUploadProgress(5);
    const prepared = await prepareUploadFile(selected);

    if (prepared.size > MAX_SIZE_BYTES) {
      setFileError(`File is too large. Maximum size is ${MAX_SIZE_MB} MB.`);
      setState("idle");
      return;
    }

    setFile(prepared);
    await startUpload(prepared);
  }, []);

  const startUpload = async (fileToUpload: File) => {
    setState("uploading");
    setUploadProgress(0);

    try {
      setUploadProgress(20);
      const data = await uploadDocument(fileToUpload);
      setUploadProgress(100);
      setAuditId(data.auditId);
      setState("extracting");

      // Poll until extraction complete → payment gate
      const pollingStartedAt = Date.now();
      const pollInterval = setInterval(async () => {
        if (Date.now() - pollingStartedAt > 120_000) {
          clearInterval(pollInterval);
          setState("error");
          setErrorMessage("Document reading timed out. Try a smaller file, fewer pages, or a clearer image.");
          return;
        }
        try {
          const res = await fetch(apiUrl(`/analyze/${data.auditId}`));
          if (res.ok) {
            const job = await res.json().catch(() => null);
            if (!job) throw new Error("Invalid processing response");
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
        body: JSON.stringify({ auditId, origin: window.location.origin }),
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

  const reset = () => {
    setFile(null); setState("idle"); setUploadProgress(0);
    setFileError(null); setErrorMessage(null); setAuditId(null);
    setPayError(null); setPaying(false); setAnalyzeStep(0);
  };

  return (
    <div
      id="upload"
      className={cn(
        "w-full max-w-none rounded-3xl transition-all duration-500",
        state === "idle" || state === "uploading" || state === "extracting" || state === "error"
          ? "bg-[linear-gradient(145deg,#162239,#101a2d)] p-7 sm:p-10 border border-white/[0.14] shadow-[0_34px_90px_rgba(0,0,0,.38),0_0_34px_rgba(77,163,255,.09)] scan-border"
          : "",
        state === "awaiting_payment" ? "bg-[#131c2f] p-7 sm:p-9 border border-white/[0.1] shadow-[0_30px_80px_rgba(0,0,0,.34)]" : "",
        state === "analyzing" || state === "complete" ? "bg-[#131c2f] p-7 sm:p-9 border border-white/[0.1] shadow-[0_30px_80px_rgba(0,0,0,.34)]" : "",
        isDragging && state === "idle" ? "ring-2 ring-[#4da3ff] ring-offset-4 ring-offset-[#050911]" : ""
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
              className="flex min-h-[280px] w-full flex-col items-center justify-center gap-5 rounded-[22px] border border-dashed border-[#73b8ff]/55 bg-[#4da3ff]/[0.055] px-6 py-11 text-center transition-all duration-300 hover:border-[#73b8ff]/85 hover:bg-[#4da3ff]/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4da3ff]"
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-[22px] border border-violet-300/30 bg-gradient-to-br from-violet-500/20 to-cyan-400/10 shadow-[0_0_26px_rgba(77,163,255,.14),inset_0_1px_rgba(255,255,255,.1)]">
                <UploadCloud className="h-10 w-10 text-violet-200" strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-2xl font-extrabold tracking-tight text-white">Upload your document</p>
                <p className="mt-2 text-base font-semibold leading-7 text-[#dce4ec]">Drag and drop, tap, or choose a photo</p>
              </div>
            </button>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5 text-xs font-semibold text-[#c8d3df]">
              {["PDF", "PNG / JPG / WEBP", "HEIC / TIFF", "DOCX / DOC", "XLSX / XLS", "CSV", "TXT / RTF"].map(
                (t, i, arr) => (
                  <span key={t} className="flex items-center gap-2">
                    {t}
                    {i < arr.length - 1 && <span className="text-violet-500/30">•</span>}
                  </span>
                )
              )}
            </div>

            <p className="mt-4 text-center text-sm font-semibold leading-6 text-[#c8d3df]">PDFs, documents, spreadsheets, clear scans, and phone photos supported</p>

            {fileError && (
              <div role="alert" aria-live="polite" className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-risk-critical/10 px-4 py-3 text-sm font-medium text-risk-critical">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {fileError}
              </div>
            )}

            <div className="mt-7 flex items-start justify-center gap-2 border-t border-white/[0.1] pt-6 text-center text-sm leading-6 text-[#c8d3df]">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-violet-400" />
              <span>
                <span className="font-bold text-white">Private document review.</span>{" "}
                Your file is kept temporarily and deleted when the review finishes. No account or subscription required.
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
            <p className="text-sm text-violet-300/60">Reading charges, totals, tables, and terms</p>
          </motion.div>
        )}

        {/* AWAITING PAYMENT */}
        {state === "awaiting_payment" && (
          <motion.div key="awaiting_payment" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center text-center">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-300/30 bg-gradient-to-br from-violet-500/25 to-cyan-400/10 shadow-[0_0_35px_rgba(139,92,246,.22)]">
              <Lock className="h-8 w-8 text-violet-100" strokeWidth={1.75} />
              <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(103,232,249,.9)]" />
            </div>

            <h2 className="mt-5 text-2xl font-extrabold text-white">
              Your document is ready for clear answers
            </h2>
            <p className="mt-3 max-w-md text-base leading-7 text-[#dce4ec]">
              Get the full report: hidden fees, duplicate charges, billing mistakes, costly clauses, exact evidence, and questions you can use.
            </p>

            {file && (
              <div className="mt-5 flex w-full items-center gap-3 rounded-2xl border border-violet-400/15 bg-midnight-950/50 p-4 text-left">
                {previewUrl ? (
                  <img src={previewUrl} alt="Selected document preview" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
                ) : (
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/15">
                  <FileCheck2 className="h-5 w-5 text-violet-300" />
                </div>
                )}
                <div className="min-w-0">
              <p className="break-words text-sm font-semibold text-violet-100">{file.name}</p>
                  <p className="mt-1 text-xs font-semibold text-[#c8d3df]">{formatFileSize(file.size)} · Ready for private review</p>
                </div>
              </div>
            )}

            <div className="mt-6 w-full rounded-2xl border border-violet-300/20 bg-gradient-to-r from-violet-500/15 via-indigo-500/10 to-cyan-400/[0.07] p-5 shadow-[inset_0_1px_rgba(255,255,255,.06)]">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-300">Clarity, evidence, and next steps</p>
              <div className="mt-1 flex items-end justify-center gap-2"><p className="text-4xl font-extrabold text-white">$15</p><p className="pb-1 text-sm font-semibold text-[#bfc6d9]">one time</p></div>
              <p className="mt-2 text-sm font-medium text-violet-200">No subscription · No account · Full report included</p>
            </div>

            <div className="mt-5 w-full space-y-3 text-left">
              {[
                "No subscription — pay once, get the full report",
                "No account required",
                "Private review — original file deleted afterward",
                "Every finding includes evidence and a clear next step",
              ].map((point) => (
                <div key={point} className="flex items-start gap-3 rounded-xl border border-white/[0.07] bg-white/[0.035] px-4 py-3 shadow-[inset_0_1px_rgba(255,255,255,.04)]">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300 drop-shadow-[0_0_8px_rgba(103,232,249,.5)]" strokeWidth={2.5} />
                  <span className="text-base font-bold leading-6 text-white">{point}</span>
                </div>
              ))}
            </div>

            {payError && (
              <div role="alert" aria-live="polite" className="mt-4 w-full rounded-xl bg-risk-critical/10 border border-risk-critical/20 px-4 py-3 text-sm font-medium text-risk-critical">
                {payError}
              </div>
            )}

            <Button
              variant="violet"
              size="lg"
              className="mt-6 h-[68px] w-full border border-white/25 text-base font-extrabold shadow-[0_14px_48px_rgba(139,92,246,.55),0_0_26px_rgba(76,201,255,.15)]"
              onClick={handlePayment}
              disabled={paying}
            >
              {paying ? (
                <><Loader2 className="h-5 w-5 animate-spin" /> Opening secure checkout...</>
              ) : (
                <><Lock className="h-5 w-5" /> Get My Complete Report · $15</>
              )}
            </Button>

            <p className="mt-4 text-sm leading-6 text-[#c8d3df]">Stripe-hosted checkout · Review our <Link to="/refund" className="font-semibold text-[#7cc4ff] underline underline-offset-4">Refund Policy</Link> and <Link to="/privacy" className="font-semibold text-[#7cc4ff] underline underline-offset-4">Privacy Policy</Link>.</p>

            <div className="mt-4 flex items-start justify-center gap-2 text-sm text-violet-400/50">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-savings-500" />
              <span>
                <span className="font-medium text-violet-200">Your original file is temporary.</span>{" "}
                It is deleted when the review completes or fails.
              </span>
            </div>
            <div className="mt-4 grid w-full grid-cols-1 gap-2 sm:grid-cols-3">
              <div className="flex items-center justify-center gap-1.5 rounded-xl bg-white/[0.025] px-3 py-2 text-[11px] text-violet-300/60"><CreditCard className="h-3.5 w-3.5 text-savings-400" /> Stripe-hosted checkout</div>
              <div className="flex items-center justify-center gap-1.5 rounded-xl bg-white/[0.025] px-3 py-2 text-[11px] text-violet-300/60"><ShieldCheck className="h-3.5 w-3.5 text-savings-400" /> Full card details stay with Stripe</div>
              <div className="flex items-center justify-center gap-1.5 rounded-xl bg-white/[0.025] px-3 py-2 text-[11px] text-violet-300/60"><Trash2 className="h-3.5 w-3.5 text-savings-400" /> File auto-deleted</div>
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
            <p className="text-lg font-semibold text-violet-100">Your Document Review Is Underway</p>
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
