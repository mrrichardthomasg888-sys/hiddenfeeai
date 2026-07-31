import { useEffect, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { apiUrl } from "@/config/api";
import { Loader2, AlertCircle, ArrowLeft, CheckCircle2, FileCheck2, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { ReportActions } from "@/components/report/ReportActions";
import { Button } from "@/components/ui/button";
import type { AuditReport, JobStatus } from "@/types/audit";

// ── Premium report components ──
import { ReportStickySummary } from "@/components/report/ReportStickySummary";
import { ReportNavigation } from "@/components/report/ReportNavigation";
import { PremiumReportSections } from "@/components/report/PremiumReportSections";
import { BrandIdentity } from "@/components/brand/BrandIdentity";

interface JobState {
  auditId: string;
  status: JobStatus;
  fileName?: string;
  error?: string;
  report?: AuditReport;
  paid?: boolean;
}

type PageState = "loading" | "verifying_payment" | "analyzing" | "error" | "report";

// Processing stage labels shown during analysis
const ANALYSIS_STEPS = [
  "Uploading document",
  "Reading document content",
  "Understanding financial structure",
  "Reviewing every charge",
  "Detecting hidden fees",
  "Preparing questions and scripts",
  "Building your Professional Audit Report",
  "Preparing downloadable PDF",
  "Finalizing results",
];

function getDocumentAwareSteps(fileName?: string): string[] {
  const extension = fileName?.split(".").pop()?.toLowerCase();
  const readingStep = extension === "pdf"
    ? "Reading every PDF page"
    : ["png", "jpg", "jpeg", "webp", "heic", "heif", "tiff", "tif", "bmp", "gif"].includes(extension ?? "")
      ? "Reading the original image at full quality"
      : ["docx", "doc"].includes(extension ?? "")
        ? "Extracting paragraphs, clauses, and tables"
        : ["xlsx", "xls", "csv"].includes(extension ?? "")
          ? "Reading worksheets, rows, and totals"
          : "Reading the complete document";
  return [
    readingStep,
    "Mapping charges, terms, and how they affect what you pay",
    "Checking calculations and duplicate line items",
    "Detecting hidden fees and disclosure gaps",
    "Evaluating contract and renewal risk",
    "Linking each finding to document evidence",
    "Building your prioritized action plan",
    "Writing negotiation scripts and counter-responses",
    "Preparing your Professional Audit Report",
  ];
}

export function AuditReport() {
  const { auditId } = useParams<{ auditId: string }>();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const paidParam = searchParams.get("paid");
  const [pageState, setPageState] = useState<PageState>("loading");
  const [job, setJob] = useState<JobState | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [analysisAnimStep, setAnalysisAnimStep] = useState(0);

  const retryAnalysis = async () => {
    if (!auditId) return;
    setErrorMessage(null);
    setPageState("analyzing");
    try {
      const response = await fetch(apiUrl(`/analyze/${auditId}/start`), { method: "POST" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error || "The audit could not be restarted.");
      }
      window.location.reload();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "The audit could not be restarted.");
      setPageState("error");
    }
  };

  useEffect(() => {
    if (!auditId) return;

    let analysisStarted = false;
    let startRetryCount = 0;
    const MAX_START_RETRIES = 10;

    const initialize = async () => {
      if (paidParam === "true" || sessionId) {
        setPageState("verifying_payment");
        try {
          const verifyRes = await fetch(
            apiUrl(`/checkout/verify/${auditId}${sessionId ? `?session_id=${sessionId}` : ""}`)
          );
          if (!verifyRes.ok) {
            // A completed report can be visible before the payment-verification
            // route sees the same KV record. Continue to the authoritative report
            // status poll instead of blocking a paid customer on that race.
            console.warn("Payment verification deferred; checking report status instead.");
          }
        } catch {
          // Network interruptions on the return URL are also recoverable: the
          // report status endpoint will confirm the paid/completed job.
          console.warn("Payment verification unavailable; checking report status instead.");
        }

        setPageState("analyzing");
        try {
          const startRes = await fetch(apiUrl(`/analyze/${auditId}/start`), { method: "POST" });
          if (startRes.ok || startRes.status === 202) {
            analysisStarted = true;
          }
        } catch {
          // Will retry in poll loop
        }
      }

      pollForReport();
    };

    const startAnalysis = async (): Promise<boolean> => {
      try {
        const startRes = await fetch(apiUrl(`/analyze/${auditId}/start`), { method: "POST" });
        return startRes.ok || startRes.status === 202;
      } catch {
        return false;
      }
    };

    const pollForReport = async () => {
      const poll = async () => {
        try {
          const res = await fetch(apiUrl(`/analyze/${auditId}`));
          if (res.status === 404) {
            setErrorMessage("We couldn't find your audit. It may have expired or the link is incorrect.");
            setPageState("error");
            return;
          }
          if (!res.ok) throw new Error(`HTTP ${res.status}`);

          const data = await res.json();
          setJob(data);

          if (data.status === "complete") {
            setPageState("report");
          } else if (data.status === "error") {
            setErrorMessage(
              data.error ||
                "We encountered an issue analyzing your document. Please try uploading again."
            );
            setPageState("error");
          } else if (data.status === "paid" || data.status === "extracted") {
            if (!analysisStarted && startRetryCount < MAX_START_RETRIES) {
              startRetryCount++;
              const started = await startAnalysis();
              if (started) analysisStarted = true;
            }
            setTimeout(poll, 1500);
          } else {
            setPageState("analyzing");
            setTimeout(poll, 1500);
          }
        } catch {
          setErrorMessage("Unable to load your audit report. Please try again.");
          setPageState("error");
        }
      };
      poll();
    };

    initialize();

    // Animate analysis steps
    const animInterval = setInterval(() => {
      setAnalysisAnimStep((prev) => (prev < ANALYSIS_STEPS.length - 1 ? prev + 1 : prev));
    }, 2200);
    return () => clearInterval(animInterval);
  }, [auditId, paidParam, sessionId]);

  // ── Loading / analyzing state ──────────────────────────────────────────────
  if (pageState === "loading" || pageState === "verifying_payment" || pageState === "analyzing") {
    const isVerifying = pageState === "verifying_payment";
    const steps = isVerifying
      ? ["Processing payment", "Verifying your purchase", "Starting your document review", "Preparing your report"]
      : getDocumentAwareSteps(job?.fileName);
    const activeFileName = job?.fileName;

    const currentStep = isVerifying
      ? Math.min(Math.floor(Date.now() / 1000) % 4, 3)
      : analysisAnimStep;

    return (
      <div className="premium-page relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#070b14] px-5 py-12">
        <div className="pointer-events-none absolute left-1/2 top-[-220px] h-[520px] w-[720px] -translate-x-1/2 rounded-full bg-[#4da3ff]/[0.07] blur-[120px]" />
        <div className="glass-command relative w-full max-w-xl rounded-[28px] p-6 text-center sm:p-10">
          <BrandIdentity className="mb-8 justify-center" />
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl border border-[#f4c542]/25 bg-[#f4c542]/10 shadow-[0_0_34px_rgba(244,197,66,.1)]">
            <Loader2 className="h-10 w-10 animate-spin text-[#f4c542]" strokeWidth={2.5} />
          </div>
          <h1 className="mt-6 text-3xl font-black tracking-[-.03em] text-white sm:text-4xl">
            {isVerifying ? "Processing Payment" : "Your Audit Is Underway"}
          </h1>
          <p className="mt-4 text-base font-semibold leading-[1.7] text-[#dce4ec] sm:text-lg">
            {isVerifying
              ? "Confirming your payment and preparing your document review."
              : "We're checking every charge, clause, calculation, and line item."}
          </p>

          {activeFileName && !isVerifying && (
            <div className="mt-7 flex items-center gap-3 rounded-2xl border border-[#4da3ff]/20 bg-[#4da3ff]/[0.06] p-4 text-left">
              <FileCheck2 className="h-5 w-5 shrink-0 text-[#73b8ff]" />
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold text-white">{activeFileName}</p>
                <p className="mt-1 text-xs font-semibold text-[#c8d3df]">Private document audit in progress</p>
              </div>
            </div>
          )}

          <div className="mt-8 space-y-2.5 text-left">
            {steps.map((step, i) => (
              <div
                key={step}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold transition-colors sm:text-base ${
                  i < currentStep
                    ? "bg-[#36d399]/[0.05] text-white"
                    : i === currentStep
                    ? "bg-[#f4c542]/[0.07] text-white"
                    : "text-[#c8d3df]"
                }`}
              >
                {i < currentStep ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-savings-400" />
                ) : i === currentStep ? (
                  <span className="h-5 w-5 shrink-0 animate-pulse rounded-full bg-[#f4c542] shadow-[0_0_14px_rgba(244,197,66,.4)]" />
                ) : (
                  <span className="h-5 w-5 shrink-0 rounded-full border-2 border-white/15" />
                )}
                {step}
              </div>
            ))}
          </div>

          <p className="mt-8 text-sm font-medium leading-[1.7] text-[#c8d3df]">
            This may take a few minutes for larger documents. Keep this page open. If you
            accidentally leave, return to this link — your audit will continue.
          </p>
          <div className="mt-6 grid grid-cols-3 gap-2 border-t border-white/[0.1] pt-5 text-xs font-bold text-[#dce4ec]">
            <span className="flex flex-col items-center gap-1.5"><LockKeyhole className="h-4 w-4 text-[#36d399]" /> Secure session</span>
            <span className="flex flex-col items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-[#36d399]" /> Private processing</span>
            <span className="flex flex-col items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-[#36d399]" /> Payment verified</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (pageState === "error") {
    return (
      <div className="premium-page flex min-h-screen flex-col items-center justify-center bg-[#070b14] px-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-risk-critical/10">
          <AlertCircle className="h-8 w-8 text-risk-critical" strokeWidth={2} />
        </div>
        <h1 className="mt-6 text-xl font-semibold text-violet-100">Something went wrong</h1>
        <p className="mt-3 max-w-sm text-base leading-[1.7] text-[#dce4ec]">
          {errorMessage || "We couldn't complete the audit. Please try uploading your document again."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {job?.paid && <Button variant="violet" onClick={retryAnalysis}>Retry audit</Button>}
          <Link to="/"><Button variant="outline">Upload a new document</Button></Link>
        </div>
      </div>
    );
  }

  const report = job?.report;
  if (!report) return null;

  // Derive every displayed value from the canonical premium report.
  const premium = report.premiumReport;
  const totalIssues = premium.executiveOverview.totalFindings;
  const potentialSavings = premium.executiveOverview.potentialSavings;

  return (
    <div id="overview" className="premium-page audit-report-page relative min-h-screen overflow-hidden bg-[#070b14] print:bg-[#070b14]">
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_18%_5%,rgba(77,163,255,.12),transparent_28%),radial-gradient(circle_at_82%_16%,rgba(244,197,66,.08),transparent_24%),linear-gradient(180deg,#070b14_0%,#09111e_46%,#070b14_100%)]" />
      <div className="pointer-events-none fixed inset-0 z-0 opacity-[.18] [background-image:linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)] [background-size:72px_72px]" />

      <header className="relative z-40 border-b border-white/[0.08] bg-[#070b14]/85 backdrop-blur-2xl print:hidden">
        <Container className="flex min-h-20 items-center justify-between gap-4 py-3">
          <Link to="/" aria-label="HiddenFeeAI home">
            <BrandIdentity compact />
          </Link>
          <div className="hidden items-center gap-3 sm:flex">
            <div className="flex items-center gap-2 rounded-full border border-[#36d399]/20 bg-[#36d399]/[0.07] px-3.5 py-2 text-xs font-extrabold text-[#b8f7df]">
              <ShieldCheck className="h-4 w-4 text-[#36d399]" />
              Private report link
            </div>
            <div className="flex items-center gap-2 rounded-full border border-[#f4c542]/20 bg-[#f4c542]/[0.07] px-3.5 py-2 text-xs font-extrabold text-[#f8d96e]">
              <Sparkles className="h-4 w-4" />
              Professional Audit Report
            </div>
          </div>
        </Container>
      </header>
      {/* Sticky summary bar */}
      <ReportStickySummary
        riskScore={report.overallRiskScore}
        riskLevel={report.riskCategory}
        totalIssues={totalIssues}
        potentialSavings={potentialSavings}
      />

      {/* Sidebar / bottom nav */}
      <ReportNavigation />

      {/* Back to home */}
      <div className="relative z-10 hidden border-b border-white/[0.08] bg-[#0e1625]/70 sm:block">
        <Container className="flex h-12 items-center">
          <Link
            to="/"
            className="flex min-h-11 items-center gap-1.5 text-sm font-bold text-[#dce4ec] transition-colors hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to home
          </Link>
        </Container>
      </div>

      <Container className="relative z-10 pb-32 pt-7 sm:pb-32 sm:pt-10 lg:pb-28">
        <div className="mx-auto max-w-5xl space-y-10 sm:space-y-12">

          <PremiumReportSections report={premium} />

          {/* ── QUESTIONABLE CHARGES ── */}
          {/* ── CONTRACT RISKS ── */}
          {/* ── MATHEMATICAL ERRORS ── */}
          {/* ── EMPTY STATE ── */}
          {/* ── NEGOTIATION SCRIPTS ── */}
          {/* ── CONSUMER RIGHTS ── */}
          {/* ── TRUST PANEL ── */}
        </div>
      </Container>

      <ReportActions
        auditId={auditId ?? ""}
        executiveSummary={`${premium.executiveOverview.decision}: ${premium.executiveOverview.decisionReasoning}\n\nTop actions:\n${premium.executiveOverview.urgentActions.map((item, index) => `${index + 1}. ${item}`).join("\n")}`}
      />
    </div>
  );
}
