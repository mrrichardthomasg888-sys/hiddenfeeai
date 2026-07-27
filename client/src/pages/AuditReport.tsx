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
import { EducationSection } from "@/components/report/EducationSection";
import { ActionPlanSection } from "@/components/report/ActionPlanSection";

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
  const [analysisAnimStep, setAnalysisAnimStep] = useState(0);

  useEffect(() => {
    if (!auditId) return;

    // Track whether we've successfully started analysis
    let analysisStarted = false;
    let startRetryCount = 0;
    const MAX_START_RETRIES = 10;

    const initialize = async () => {
      // Step 1: Verify payment
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
        } catch (err) {
          setErrorMessage("Payment verification failed. Please try uploading again.");
          setPageState("error");
          return;
        }

        // Step 2: Trigger AI analysis
        setPageState("analyzing");
        try {
          const startRes = await fetch(apiUrl(`/analyze/${auditId}/start`), { method: "POST" });
          if (startRes.ok || startRes.status === 202) {
            analysisStarted = true;
          } else if (startRes.status !== 404) {
            // /start failed (e.g. 402 due to KV staleness) — will retry in poll loop
          }
        } catch (err) {
          // Network error — will retry in poll loop
        }
      }

      // Step 3: Poll for results
      pollForReport();
    };

    const startAnalysis = async (): Promise<boolean> => {
      try {
        const startRes = await fetch(apiUrl(`/analyze/${auditId}/start`), { method: "POST" });
        if (startRes.ok || startRes.status === 202) {
          return true;
        }
        return false;
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
            setErrorMessage(data.error || "Analysis failed");
            setPageState("error");
          } else if (data.status === "paid" || data.status === "extracted") {
            // Analysis hasn't started yet — retry /start
            if (!analysisStarted && startRetryCount < MAX_START_RETRIES) {
              startRetryCount++;
              const started = await startAnalysis();
              if (started) {
                analysisStarted = true;
              }
            }
            setTimeout(poll, 1500);
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

          <p className="mt-6 text-sm text-violet-400/60 leading-relaxed">
            This may take a few minutes for larger or more detailed documents. Please keep this page open while your audit is being completed. If you accidentally leave or refresh the page, your audit will continue and you can return to this report.
          </p>
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

  // ── Compute values for new components ──
  const documentType = report.document_meta.document_type;
  const hiddenFeesCount = report.hidden_fees.length;
  const criticalCount = report.findings.filter(f => f.severity === "Critical").length;
  const hasNegotiation = report.findings.some(f => f.negotiation_message || f.negotiation_strategy);
  const topConcerns = [...report.findings].sort(
    (a, b) => (b.amount ?? 0) - (a.amount ?? 0)
  ).slice(0, 5);
  const totalIssues = report.findings.length;

  // Education topics
  const educationTopics = [
    {
      topic: "Understanding Hidden Fees",
      whatIsIt: "Hidden fees are charges that are not clearly disclosed in the initial agreement or pricing. They often appear as small line items or vague service charges.",
      whyItMatters: "These fees can add 10-30% to your total bill without you realizing. Identifying them is the first step to getting them removed.",
      questionsToAsk: [
        "What is this fee for exactly?",
        "Is this fee mandatory or can it be waived?",
        "Was this charge disclosed in my original agreement?",
      ],
      learnMore: "Consumer Financial Protection Bureau",
      category: "fees",
    },
  ];

  return (
    <div id="overview" className="min-h-screen bg-midnight-950 print:bg-midnight-950">
      {/* Sticky summary bar at top */}
      <ReportStickySummary
        riskScore={report.risk_score}
        riskLevel={report.risk_level}
        totalIssues={totalIssues}
        potentialSavings={report.potential_savings}
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
            documentType={documentType}
            issuer={report.document_meta.issuer}
            riskScore={report.risk_score}
            riskLevel={report.risk_level}
            totalIssues={totalIssues}
            potentialExposure={report.potential_savings}
            negotiationOpportunities={report.findings.filter(f => f.negotiation_message || f.negotiation_strategy).length}
            criticalCount={criticalCount}
            hiddenFeesCount={hiddenFeesCount}
          />

          {/* ── VALUE SUMMARY DASHBOARD ── */}
          <div id="summary-stats" className="scroll-mt-16">
            <ValueSummaryDashboard
              totalIssues={totalIssues}
              hiddenFeesCount={hiddenFeesCount}
              potentialSavings={report.potential_savings}
              confidenceLevel={report.confidence_level}
            />
          </div>

          {/* ── EXECUTIVE SUMMARY ── */}
          <div id="discoveries" className="scroll-mt-16">
            <ExecutiveSummaryCard
              summary={`Our AI analysis of your ${documentType.toLowerCase()} identified ${totalIssues} ${totalIssues === 1 ? "issue" : "issues"} ${totalIssues > 0 ? "that may require your attention" : ""}.`}
              topConcerns={topConcerns}
            />
          </div>

          {/* ── PRIORITY ACTION CENTER (Risk Map) ── */}
          <div id="action-plan" className="scroll-mt-16">
            <PriorityActionCenter findings={report.findings} />
          </div>

          {/* ── ACTION PLAN ── */}
          <ActionPlanSection
            findings={report.findings}
            riskLevel={report.risk_level}
            hasNegotiation={hasNegotiation}
          />

          {/* ── NEGOTIATION PLAYBOOK ── */}
          {hasNegotiation && (
            <div id="playbook" className="scroll-mt-16">
              <NegotiationPlaybook findings={report.findings} />
            </div>
          )}

          {/* ── FINDINGS ── */}
          <div id="findings-section" className="scroll-mt-16">
            <div className="flex items-center gap-2 mb-6">
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-[-0.02em]">
                Detailed Findings
              </h2>
              <span className="px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-sm font-semibold text-white/50">
                {totalIssues}
              </span>
            </div>

            {totalIssues > 0 ? (
              <div className="space-y-4">
                {report.findings.map((finding, i) => (
                  <PremiumFindingCard key={finding.id} finding={finding} index={i} />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-12 text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-savings-500" />
                <p className="mt-4 text-xl font-bold text-white">No issues found</p>
                <p className="mt-2 text-sm text-white/40 max-w-md mx-auto">
                  All charges in your document appear to be correct and properly documented.
                </p>
              </div>
            )}
          </div>

          {/* ── CLEAN DOCUMENT SUMMARY ── */}
          {report.clean_document_summary && (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 sm:p-8">
              <h2 className="text-xl font-bold text-white mb-4">Document Summary</h2>
              <div className="grid gap-6 sm:grid-cols-2">
                {report.clean_document_summary.money_saving_suggestions.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Savings Suggestions</p>
                    <ul className="space-y-2">
                      {report.clean_document_summary.money_saving_suggestions.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-savings-500" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {report.clean_document_summary.questions_to_ask.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">Questions to Ask</p>
                    <ul className="space-y-2">
                      {report.clean_document_summary.questions_to_ask.map((q, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-intel-400/60" />
                          {q}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── CONSUMER EDUCATION ── */}
          <EducationSection topics={educationTopics} />

          {/* ── TRUST PANEL ── */}
          <div id="trust" className="scroll-mt-16">
            <TrustPanel
              confidenceScore={report.confidence_level}
              pagesReviewed={report.document_meta.pages_reviewed}
              lineItemsReviewed={report.document_meta.line_items_reviewed}
              reportId={report.document_meta.report_id}
            />
          </div>
        </div>
      </Container>

      <ReportActions auditId={auditId ?? ""} />
    </div>
  );
}
