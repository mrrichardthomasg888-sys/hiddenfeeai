import { useEffect, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, AlertCircle, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { ReportHeader } from "@/components/report/ReportHeader";
import { ReportSummary } from "@/components/report/ReportSummary";
import { RiskScoreCard } from "@/components/report/RiskScoreCard";
import { FindingCard } from "@/components/report/FindingCard";
import { ReportActions } from "@/components/report/ReportActions";
import { Button } from "@/components/ui/button";
import type { AuditReport, JobStatus } from "@/types/audit";

interface JobState {
  auditId: string;
  status: JobStatus;
  fileName?: string;
  error?: string;
  report?: AuditReport;
}

type PageState = "loading" | "verifying_payment" | "analyzing" | "error" | "report";

export function AuditReport() {
  const { auditId } = useParams<{ auditId: string }>();
  const [searchParams] = useSearchParams();
  const [pageState, setPageState] = useState<PageState>("loading");
  const [job, setJob] = useState<JobState | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [analysisAnimStep, setAnalysisAnimStep] = useState(0);

  useEffect(() => {
    if (!auditId) return;

    const initialize = async () => {
      // Step 1: Verify payment
      const sessionId = searchParams.get("session_id");
      const paidParam = searchParams.get("paid");

      if (paidParam === "true" || sessionId) {
        setPageState("verifying_payment");
        try {
          const verifyRes = await fetch(
            `/api/checkout/verify/${auditId}${sessionId ? `?session_id=${sessionId}` : ""}`
          );
          if (!verifyRes.ok) {
            throw new Error("Payment verification failed");
          }
        } catch (err) {
          setErrorMessage("Payment verification failed. Please try uploading again.");
          setPageState("error");
          return;
        }

        // Step 2: Trigger AI analysis
        setPageState("analyzing");
        try {
          const startRes = await fetch(`/api/analyze/${auditId}/start`, { method: "POST" });
          if (!startRes.ok) {
            const data = await startRes.json().catch(() => ({}));
            // If job not found, try polling (might have started already)
            if (startRes.status !== 404) {
              throw new Error(data.error || "Failed to start analysis");
            }
          }
        } catch (err) {
          // Continue to poll — the analysis might still be running
        }
      }

      // Step 3: Poll for results
      pollForReport();
    };

    const pollForReport = async () => {
      const poll = async () => {
        try {
          const res = await fetch(`/api/analyze/${auditId}`);
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
            setErrorMessage(data.error || "Analysis failed");
            setPageState("error");
          } else {
            // Still processing — keep polling
            setTimeout(poll, 1500);
          }
        } catch (err) {
          setErrorMessage("Unable to load your audit report. Please try again.");
          setPageState("error");
        }
      };
      poll();
    };

    initialize();

    // Animate analysis steps smoothly while polling
    const animInterval = setInterval(() => {
      setAnalysisAnimStep((prev) => (prev < 6 ? prev + 1 : 6));
    }, 1800);
    return () => clearInterval(animInterval);
  }, [auditId]);

  // Loading state
  if (pageState === "loading" || pageState === "verifying_payment" || pageState === "analyzing") {
    const scanSteps = pageState === "verifying_payment"
      ? ["Processing payment", "Verifying your purchase", "Starting AI analysis", "Preparing your report"]
      : [
          "Reading your document",
          "Understanding financial structure",
          "Reviewing every charge",
          "Checking calculations",
          "Detecting hidden fees",
          "Preparing your personalized audit",
        ];

    const currentStep = pageState === "verifying_payment"
      ? Math.min(Math.floor(Date.now() / 1000) % 4, 3)
      : analysisAnimStep;

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-midnight-950 px-6">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-violet-500/20">
            <Loader2 className="h-10 w-10 animate-spin text-violet-300" strokeWidth={2.5} />
          </div>
          <h1 className="mt-6 text-2xl font-bold text-violet-100">
            {pageState === "verifying_payment" ? "Processing Payment" : "AI Audit in Progress"}
          </h1>
          <p className="mt-2 text-base font-medium text-violet-300/80">
            {pageState === "verifying_payment"
              ? "Confirming your payment and preparing analysis."
              : "Our AI is analyzing every charge and line item."}
          </p>

          <div className="mt-8 space-y-3 text-left">
            {scanSteps.map((step, i) => (
              <div
                key={step}
                className={`flex items-center gap-3 text-base font-medium transition-colors ${
                  i <= currentStep ? "text-violet-100" : "text-violet-400/60"
                }`}
              >
                {i < currentStep ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-savings-400" />
                ) : i === currentStep ? (
                  <span className="h-5 w-5 shrink-0 animate-pulse rounded-full bg-violet-300" />
                ) : (
                  <span className="h-5 w-5 shrink-0 rounded-full border-2 border-violet-400/30" />
                )}
                {step}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (pageState === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-midnight-950 px-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-risk-critical/10">
          <AlertCircle className="h-8 w-8 text-risk-critical" strokeWidth={2} />
        </div>
        <h1 className="mt-6 text-xl font-semibold text-violet-100">Something went wrong</h1>
        <p className="mt-2 max-w-sm text-sm text-violet-400/60">
          {errorMessage || "We couldn't complete the audit. Please try uploading your document again."}
        </p>
        <Link to="/" className="mt-6">
          <Button variant="violet">Upload a new document</Button>
        </Link>
      </div>
    );
  }

  const report = job?.report;
  if (!report) {
    return null;
  }

  // Tab groups
  const tabs = [
    { id: "all", label: "All Findings", count: report.findings.length },
    { id: "hidden_fees", label: "Hidden Fees", count: report.hidden_fees.length },
    { id: "duplicate_charges", label: "Duplicates", count: report.duplicate_charges.length },
    { id: "math_errors", label: "Math Errors", count: report.math_errors.length },
    { id: "contract_risks", label: "Contract Risks", count: report.contract_risks.length },
  ].filter((t) => t.count > 0 || t.id === "all");

  const visibleFindings =
    activeTab === "all" ? report.findings
    : activeTab === "hidden_fees" ? report.hidden_fees
    : activeTab === "duplicate_charges" ? report.duplicate_charges
    : activeTab === "math_errors" ? report.math_errors
    : activeTab === "contract_risks" ? report.contract_risks
    : report.findings;

  return (
    <div className="min-h-screen bg-midnight-950 print:bg-midnight-950">
      {/* Navigation */}
      <div className="border-b border-violet-500/10 bg-midnight-950/80 print:hidden">
        <Container className="flex h-14 items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm text-violet-400/60 hover:text-violet-200 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
          <span className="text-xs text-violet-400/30">HiddenFeeAI</span>
        </Container>
      </div>

      <Container className="py-6 sm:py-10">
        <div id="report-content" className="mx-auto max-w-4xl space-y-6">
          <ReportHeader
            documentType={report.document_meta.document_type}
            issuer={report.document_meta.issuer}
            reportId={report.document_meta.report_id}
            analysisDate={report.document_meta.analysis_date}
          />

          <ReportSummary report={report} />

          <RiskScoreCard report={report} />

          {/* Findings section */}
          <div>
            <h2 className="text-lg font-semibold text-violet-100">Findings</h2>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    activeTab === tab.id
                      ? "bg-violet-600 text-white"
                      : "bg-violet-500/10 text-violet-400/60 hover:bg-violet-500/20 hover:text-violet-200"
                  }`}
                >
                  {tab.label}
                  {tab.count > 0 && <span className="ml-1.5 opacity-70">({tab.count})</span>}
                </button>
              ))}
            </div>

            <div className="mt-4 space-y-3">
              {visibleFindings.length > 0 ? (
                visibleFindings.map((finding, i) => (
                  <FindingCard key={finding.id} finding={finding} index={i} />
                ))
              ) : (
                <div className="rounded-2xl border border-violet-500/10 bg-midnight-900/80 p-8 text-center">
                  <CheckCircle2 className="mx-auto h-8 w-8 text-savings-500" />
                  <p className="mt-3 text-sm font-medium text-violet-100">
                    No issues found in this category
                  </p>
                  <p className="mt-1 text-xs text-violet-400/60">
                    All charges appear to be correct and properly documented.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Clean document summary */}
          {report.clean_document_summary && (
            <div className="rounded-2xl border border-violet-500/10 bg-midnight-900/80 p-5 sm:p-6">
              <h2 className="text-sm font-semibold text-violet-100">Document Summary</h2>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                {report.clean_document_summary.money_saving_suggestions.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-violet-400/60">Savings Suggestions</p>
                    <ul className="mt-1 space-y-1">
                      {report.clean_document_summary.money_saving_suggestions.map((s, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs text-violet-200">
                          <span className="mt-0.5 h-1 w-1 shrink-0 rounded-full bg-savings-500" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {report.clean_document_summary.questions_to_ask.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-violet-400/60">Questions to Ask</p>
                    <ul className="mt-1 space-y-1">
                      {report.clean_document_summary.questions_to_ask.map((q, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs text-violet-200">
                          <span className="mt-0.5 h-1 w-1 shrink-0 rounded-full bg-violet-400" />
                          {q}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </Container>

      <ReportActions auditId={auditId ?? ""} />
    </div>
  );
}