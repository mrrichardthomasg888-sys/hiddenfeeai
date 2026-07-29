import { useEffect, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { apiUrl } from "@/config/api";
import { motion } from "framer-motion";
import { Loader2, AlertCircle, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { ReportActions } from "@/components/report/ReportActions";
import { Button } from "@/components/ui/button";
import type { AuditReport, JobStatus } from "@/types/audit";

// ── Premium report components ──
import { PremiumReportHero } from "@/components/report/PremiumReportHero";
import { ReportStickySummary } from "@/components/report/ReportStickySummary";
import { ReportNavigation } from "@/components/report/ReportNavigation";
import { ValueSummaryDashboard } from "@/components/report/ValueSummaryDashboard";
import { PremiumFindingCard } from "@/components/report/PremiumFindingCard";
import { PriorityActionCenter } from "@/components/report/PriorityActionCenter";
import { NegotiationPlaybook } from "@/components/report/NegotiationPlaybook";
import { ExecutiveSummaryCard } from "@/components/report/ExecutiveSummaryCard";
import { TrustPanel } from "@/components/report/TrustPanel";
import { ActionPlanSection } from "@/components/report/ActionPlanSection";
import { ContractRisksSection } from "@/components/report/ContractRisksSection";
import { MathErrorsSection } from "@/components/report/MathErrorsSection";
import { ConsumerRightsSection } from "@/components/report/ConsumerRightsSection";
import { NegotiationScriptsSection } from "@/components/report/NegotiationScriptsSection";

interface JobState {
  auditId: string;
  status: JobStatus;
  fileName?: string;
  error?: string;
  report?: AuditReport;
}

type PageState = "loading" | "verifying_payment" | "analyzing" | "error" | "report";

// Processing stage labels shown during analysis
const ANALYSIS_STEPS = [
  "Uploading document",
  "Reading document content",
  "Understanding financial structure",
  "Reviewing every charge",
  "Detecting hidden fees",
  "Building negotiation strategy",
  "Generating executive report",
  "Preparing downloadable PDF",
  "Finalizing results",
];

export function AuditReport() {
  const { auditId } = useParams<{ auditId: string }>();
  const [searchParams] = useSearchParams();
  const [pageState, setPageState] = useState<PageState>("loading");
  const [job, setJob] = useState<JobState | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [analysisAnimStep, setAnalysisAnimStep] = useState(0);

  useEffect(() => {
    if (!auditId) return;

    let analysisStarted = false;
    let startRetryCount = 0;
    const MAX_START_RETRIES = 10;

    const initialize = async () => {
      const sessionId = searchParams.get("session_id");
      const paidParam = searchParams.get("paid");

      if (paidParam === "true" || sessionId) {
        setPageState("verifying_payment");
        try {
          const verifyRes = await fetch(
            apiUrl(`/checkout/verify/${auditId}${sessionId ? `?session_id=${sessionId}` : ""}`)
          );
          if (!verifyRes.ok) {
            throw new Error("Payment verification failed");
          }
        } catch {
          setErrorMessage("Payment verification failed. Please try uploading again.");
          setPageState("error");
          return;
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
  }, [auditId]);

  // ── Loading / analyzing state ──────────────────────────────────────────────
  if (pageState === "loading" || pageState === "verifying_payment" || pageState === "analyzing") {
    const isVerifying = pageState === "verifying_payment";
    const steps = isVerifying
      ? ["Processing payment", "Verifying your purchase", "Starting AI analysis", "Preparing your report"]
      : ANALYSIS_STEPS;

    const currentStep = isVerifying
      ? Math.min(Math.floor(Date.now() / 1000) % 4, 3)
      : analysisAnimStep;

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-midnight-950 px-6">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-violet-500/20">
            <Loader2 className="h-10 w-10 animate-spin text-violet-300" strokeWidth={2.5} />
          </div>
          <h1 className="mt-6 text-2xl font-bold text-violet-100">
            {isVerifying ? "Processing Payment" : "AI Audit in Progress"}
          </h1>
          <p className="mt-2 text-base font-medium text-violet-300/80">
            {isVerifying
              ? "Confirming your payment and preparing analysis."
              : "Our AI is analyzing every charge, clause, and line item."}
          </p>

          <div className="mt-8 space-y-3 text-left">
            {steps.map((step, i) => (
              <div
                key={step}
                className={`flex items-center gap-3 text-base font-medium transition-colors ${
                  i < currentStep
                    ? "text-violet-100"
                    : i === currentStep
                    ? "text-violet-200"
                    : "text-violet-400/60"
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

          <p className="mt-6 text-sm text-violet-400/60 leading-relaxed">
            This may take a few minutes for larger documents. Keep this page open. If you
            accidentally leave, return to this link — your audit will continue.
          </p>
        </div>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
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
  if (!report) return null;

  // ── Derive display values from new Gemini schema ────────────────────────────
  const meta = report.documentMetadata;
  const exec = report.executiveSummary;
  const allFindings = report.allFindings ?? [];

  const totalIssues =
    (report.hiddenFees?.length ?? 0) +
    (report.questionableCharges?.length ?? 0) +
    (report.contractRisks?.length ?? 0) +
    (report.mathematicalErrors?.length ?? 0);

  const hiddenFeesCount = report.hiddenFees?.length ?? 0;
  const potentialSavings = report.estimatedSavings?.mostLikely ?? 0;
  const criticalCount = allFindings.filter((f) => f.severity === "Critical").length;

  const hasNegotiation =
    allFindings.some((f) => f.negotiationMessage || f.negotiationStrategy) ||
    (report.negotiationLeverage?.length ?? 0) > 0;

  // Top concerns: combine hiddenFees + questionableCharges sorted by severity
  const severityOrder = { Critical: 0, High: 1, Medium: 2, Low: 3 };
  const topConcerns = [...allFindings]
    .sort((a, b) => {
      const ao = severityOrder[a.severity] ?? 4;
      const bo = severityOrder[b.severity] ?? 4;
      if (ao !== bo) return ao - bo;
      return (b.amount ?? 0) - (a.amount ?? 0);
    })
    .slice(0, 5);

  return (
    <div id="overview" className="min-h-screen bg-midnight-950 print:bg-midnight-950">
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
      <div className="hidden sm:block border-b border-white/[0.04] bg-midnight-950/60">
        <Container className="flex h-12 items-center">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to home
          </Link>
        </Container>
      </div>

      <Container className="py-6 sm:py-10 pb-24 lg:pb-10">
        <div className="mx-auto max-w-5xl space-y-8">

          {/* ── PREMIUM REPORT HERO ── */}
          <PremiumReportHero
            documentType={meta.documentType}
            issuer={meta.issuer}
            riskScore={report.overallRiskScore}
            riskLevel={report.riskCategory}
            totalIssues={totalIssues}
            potentialExposure={potentialSavings}
            negotiationOpportunities={allFindings.filter(
              (f) => f.negotiationMessage || f.negotiationStrategy
            ).length}
            criticalCount={criticalCount}
            hiddenFeesCount={hiddenFeesCount}
          />

          {/* ── VALUE SUMMARY DASHBOARD ── */}
          <div id="summary-stats" className="scroll-mt-16">
            <ValueSummaryDashboard
              totalIssues={totalIssues}
              hiddenFeesCount={hiddenFeesCount}
              potentialSavings={potentialSavings}
              confidenceLevel={report.confidence}
            />
          </div>

          {/* ── EXECUTIVE SUMMARY ── */}
          <div id="discoveries" className="scroll-mt-16">
            <ExecutiveSummaryCard
              headline={exec.headline}
              overview={exec.overview}
              criticalFindings={exec.criticalFindings}
              immediateActions={exec.immediateActions}
              topConcerns={topConcerns}
            />
          </div>

          {/* ── RISK MAP ── */}
          <div id="action-plan" className="scroll-mt-16">
            <PriorityActionCenter findings={allFindings} />
          </div>

          <ActionPlanSection
            recommendedActions={report.recommendedActions ?? []}
            questionsToAsk={report.questionsToAsk ?? []}
          />

          {/* ── NEGOTIATION PLAYBOOK ── */}
          {hasNegotiation && (
            <div id="playbook" className="scroll-mt-16">
              <NegotiationPlaybook
                hiddenFees={report.hiddenFees ?? []}
                questionableCharges={report.questionableCharges ?? []}
                negotiationLeverage={report.negotiationLeverage ?? []}
              />
            </div>
          )}

          {/* ── HIDDEN FEES ── */}
          {(report.hiddenFees?.length ?? 0) > 0 && (
            <div id="findings-section" className="scroll-mt-16">
              <div className="flex items-center gap-2 mb-6">
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-[-0.02em]">
                  Hidden Fees
                </h2>
                <span className="px-3 py-1 rounded-full bg-red-500/15 border border-red-500/20 text-sm font-semibold text-red-300">
                  {report.hiddenFees.length}
                </span>
              </div>
              <div className="space-y-4">
                {report.hiddenFees.map((fee, i) => (
                  <PremiumFindingCard key={fee.id} finding={fee} index={i} />
                ))}
              </div>
            </div>
          )}

          {/* ── QUESTIONABLE CHARGES ── */}
          {(report.questionableCharges?.length ?? 0) > 0 && (
            <div id="questionable" className="scroll-mt-16">
              <div className="flex items-center gap-2 mb-6">
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-[-0.02em]">
                  Questionable Charges
                </h2>
                <span className="px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/20 text-sm font-semibold text-amber-300">
                  {report.questionableCharges.length}
                </span>
              </div>
              <div className="space-y-4">
                {report.questionableCharges.map((charge, i) => (
                  <PremiumFindingCard key={charge.id} finding={charge} index={i} />
                ))}
              </div>
            </div>
          )}

          {/* ── CONTRACT RISKS ── */}
          {(report.contractRisks?.length ?? 0) > 0 && (
            <div id="contract-risks" className="scroll-mt-16">
              <ContractRisksSection risks={report.contractRisks} />
            </div>
          )}

          {/* ── MATHEMATICAL ERRORS ── */}
          {(report.mathematicalErrors?.length ?? 0) > 0 && (
            <div id="math-errors" className="scroll-mt-16">
              <MathErrorsSection errors={report.mathematicalErrors} />
            </div>
          )}

          {/* ── EMPTY STATE ── */}
          {totalIssues === 0 && (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-12 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-savings-500" />
              <p className="mt-4 text-xl font-bold text-white">No major issues found</p>
              <p className="mt-2 text-sm text-white/40 max-w-md mx-auto">
                All charges in your document appear to be correct and properly documented.
                {exec.overview && (
                  <span className="block mt-2">{exec.overview}</span>
                )}
              </p>
            </div>
          )}

          {/* ── NEGOTIATION SCRIPTS ── */}
          {((report.phoneNegotiationScript?.length ?? 0) > 0 ||
            (report.emailNegotiationTemplate?.length ?? 0) > 0) && (
            <div id="scripts" className="scroll-mt-16">
              <NegotiationScriptsSection
                phoneScript={report.phoneNegotiationScript ?? []}
                emailTemplate={report.emailNegotiationTemplate ?? []}
              />
            </div>
          )}

          {/* ── CONSUMER RIGHTS ── */}
          {(report.consumerRights?.length ?? 0) > 0 && (
            <div id="consumer-rights" className="scroll-mt-16">
              <ConsumerRightsSection rights={report.consumerRights} />
            </div>
          )}

          {/* ── TRUST PANEL ── */}
          <div id="trust" className="scroll-mt-16">
            <TrustPanel
              confidenceScore={report.confidence}
              pagesReviewed={meta.pagesReviewed}
              lineItemsReviewed={meta.lineItemsReviewed}
              reportId={meta.reportId}
            />
          </div>
        </div>
      </Container>

      <ReportActions auditId={auditId ?? ""} />
    </div>
  );
}
