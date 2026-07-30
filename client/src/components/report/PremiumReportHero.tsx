import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Shield, FileCheck, Lock, BadgeCheck, TrendingUp, Search, Gavel, AlertTriangle, DollarSign } from "lucide-react";
import { getReportTitle, getReportActionLine, getAnalysisDescription } from "@/lib/documentLabels";

interface PremiumReportHeroProps {
  documentType: string;
  issuer?: string;
  riskScore: number;
  riskLevel: string;
  totalIssues: number;
  potentialExposure: number;
  negotiationOpportunities: number;
  criticalCount: number;
  hiddenFeesCount?: number;
  severityCounts: { Critical: number; High: number; Medium: number; Low: number };
}

const riskConfig: Record<string, { color: string; bg: string; border: string; label: string; gradient: string; grade: string; gradeColor: string; dot: string; meterColor: string }> = {
  High: {
    color: "text-red-400", bg: "bg-red-500/8", border: "border-red-500/25",
    label: "HIGH PRIORITY — REVIEW BEFORE PAYING", gradient: "from-red-500/12 via-red-500/5 to-transparent",
    grade: "D", gradeColor: "text-red-300 bg-red-500/20 border-red-500/35", dot: "bg-red-400", meterColor: "#ef4444",
  },
  Elevated: {
    color: "text-amber-400", bg: "bg-amber-500/8", border: "border-amber-500/25",
    label: "NEEDS ATTENTION — REVIEW CLOSELY", gradient: "from-amber-500/12 via-amber-500/5 to-transparent",
    grade: "C", gradeColor: "text-amber-300 bg-amber-500/20 border-amber-500/35", dot: "bg-amber-400", meterColor: "#f97316",
  },
  "Review Recommended": {
    color: "text-yellow-400", bg: "bg-yellow-500/8", border: "border-yellow-500/25",
    label: "SOME ITEMS DESERVE A CLOSER LOOK", gradient: "from-yellow-500/12 via-yellow-500/5 to-transparent",
    grade: "B", gradeColor: "text-yellow-300 bg-yellow-500/20 border-yellow-500/35", dot: "bg-yellow-400", meterColor: "#fbbf24",
  },
  Low: {
    color: "text-emerald-400", bg: "bg-emerald-500/8", border: "border-emerald-500/25",
    label: "FEW CONCERNS FOUND — VERIFY BEFORE ACTING", gradient: "from-emerald-500/12 via-emerald-500/5 to-transparent",
    grade: "A", gradeColor: "text-emerald-300 bg-emerald-500/20 border-emerald-500/35", dot: "bg-emerald-400", meterColor: "#34d399",
  },
};

function formatExposure(value: number | undefined | null): string {
  if (!value || value <= 0) return "";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

// ── Premium animated risk meter — credit-score style ──
function RiskMeter({ score, level }: { score: number; level: string }) {
  const [animatedVal, setAnimatedVal] = useState(0);
  const cfg = riskConfig[level] ?? riskConfig["Review Recommended"];
  const circumference = 2 * Math.PI * 72;
  const radius = 72;

  useEffect(() => {
    const duration = 1600;
    const interval = 16;
    const totalSteps = duration / interval;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const progress = Math.min(step / totalSteps, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedVal(Math.round(eased * score));
      if (progress >= 1) clearInterval(timer);
    }, interval);
    return () => clearInterval(timer);
  }, [score]);

  return (
    <div className="relative flex items-center justify-center w-40 h-40 sm:w-48 sm:h-48">
      <div
        className="absolute inset-0 rounded-full opacity-20 blur-xl"
        style={{ background: `radial-gradient(circle, ${cfg.meterColor}44, transparent 70%)` }}
      />
      <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
        <circle cx="80" cy="80" r={radius} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="8" />
        <circle
          cx="80" cy="80" r={radius} fill="none"
          stroke={cfg.meterColor}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - animatedVal / 100)}
          style={{ transition: "stroke-dashoffset 0.08s ease-out", filter: `drop-shadow(0 0 8px ${cfg.meterColor}66)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-5xl sm:text-6xl font-black tabular-nums leading-none" style={{ color: cfg.meterColor }}>
          {animatedVal}
        </span>
        <span className="text-[11px] font-bold uppercase tracking-widest text-premium-muted mt-1">Attention Score</span>
      </div>
    </div>
  );
}

// ── Premium KPI card ──
function KpiCard({
  value, label, explanation, icon: Icon, color, delay,
}: {
  value: string | number; label: string; explanation: string; icon: React.ElementType; color: string; delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 + delay * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 hover:bg-white/[0.04] transition-all duration-500"
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(ellipse_at_50%_0%,rgba(122,92,245,0.06),transparent)]" />
      <div className="relative">
        <div className="h-10 w-10 rounded-xl flex items-center justify-center bg-white/[0.04] mb-3">
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        <p className={`text-3xl sm:text-4xl font-black tabular-nums tracking-[-0.03em] number-premium ${color}`}>
          {value}
        </p>
        <p className="mt-1.5 text-sm font-bold text-premium-primary">{label}</p>
        <p className="mt-0.5 text-[13px] text-premium-tertiary leading-relaxed">{explanation}</p>
      </div>
    </motion.div>
  );
}

export function PremiumReportHero({
  documentType, issuer, riskScore, riskLevel, totalIssues, potentialExposure, negotiationOpportunities, criticalCount, hiddenFeesCount, severityCounts,
}: PremiumReportHeroProps) {
  const cfg = riskConfig[riskLevel] ?? riskConfig["Review Recommended"];

  // Document type aware text — NEVER hardcode
  const reportTitle = getReportTitle(documentType);
  const actionLine = getReportActionLine(documentType, totalIssues);
  const analysisDescription = getAnalysisDescription(documentType, issuer);

  // Exposure bug fix — NEVER render "Unknown" / "TBD" / "N/A"
  const showExposure = potentialExposure > 0;
  const exposureDisplay = showExposure ? formatExposure(potentialExposure) : null;

  const kpiItems = useMemo(() => [
    { value: riskScore, label: "Attention Score", explanation: "How urgently this document deserves review", icon: AlertTriangle, color: cfg.color },
    { value: totalIssues, label: "Items to Review", explanation: "Possible problems worth a closer look", icon: Search, color: "text-intel-400" },
    { value: hiddenFeesCount ?? 0, label: "Possible Hidden Fees", explanation: `${negotiationOpportunities} may be worth questioning`, icon: DollarSign, color: cfg.color },
  ], [riskScore, totalIssues, hiddenFeesCount, negotiationOpportunities, cfg.color]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="relative overflow-hidden rounded-[2.5rem] border border-white/[0.06] bg-gradient-to-b from-midnight-900/90 via-midnight-950/80 to-midnight-950"
    >
      <div className="pointer-events-none absolute inset-0 mesh-bg-hero" />
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${cfg.gradient}`} />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(122,92,245,0.1),transparent)]" />
      <div className="scan-subtle" />

      <div className="relative p-8 sm:p-14 lg:p-20">
        {/* ── TOP BADGES ── */}
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.4 }}
          className="flex flex-wrap items-center justify-between gap-4 mb-16"
        >
          <div className="inline-flex items-center gap-3 rounded-full border border-white/[0.06] bg-white/[0.03] px-5 py-2">
            <Shield className="h-4 w-4 text-intel-400/60" />
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-premium-tertiary">PRIVATE PROFESSIONAL AUDIT REPORT</span>
          </div>
          <div className="flex items-center gap-5">
            {[
              { icon: FileCheck, label: "Evidence Linked" },
              { icon: BadgeCheck, label: "Evidence Confidence" },
              { icon: Lock, label: "Original File Deleted" },
            ].map((b) => (
              <span key={b.label} className="hidden sm:inline-flex items-center gap-1.5 text-[12px] font-medium text-premium-tertiary">
                <b.icon className="h-3.5 w-3.5 text-intel-400/50" />
                {b.label}
              </span>
            ))}
          </div>
        </motion.div>

        {/* ── HERO MAIN ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start mb-12">
          {/* Left: Risk Score + Grade */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center lg:items-start gap-8"
          >
            {/* Grade badge — premium credit-score style */}
            <div className={`inline-flex items-center gap-5 rounded-2xl border-2 px-7 py-5 ${cfg.gradeColor}`}>
              <span className="text-6xl sm:text-7xl lg:text-8xl font-black leading-none tracking-[-0.04em]">{cfg.grade}</span>
              <div className="border-l border-white/[0.1] pl-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-premium-secondary">HiddenFeeAI</p>
                <p className="text-sm font-bold text-premium-primary mt-0.5">Needs Attention</p>
              </div>
            </div>

            {/* Premium animated risk meter */}
            <RiskMeter score={riskScore} level={riskLevel} />

            {/* Risk level pulse badge */}
            <div className={`inline-flex items-center gap-3 rounded-full border ${cfg.border} ${cfg.bg} px-6 py-3`}>
              <span className="relative flex h-3 w-3">
                <span className={`absolute inline-flex h-full w-full rounded-full ${cfg.dot} opacity-75 animate-ping`} />
                <span className={`relative inline-flex h-3 w-3 rounded-full ${cfg.dot}`} />
              </span>
              <span className={`text-base font-bold tracking-wide ${cfg.color}`}>{cfg.label}</span>
            </div>

            {/* Risk distribution bar */}
            {totalIssues > 0 && (
              <div className="w-full max-w-xs">
                <p className="text-[11px] font-bold uppercase tracking-widest text-premium-muted mb-2">Findings by Priority</p>
                <div className="flex gap-1 h-2 overflow-hidden rounded-full bg-white/[0.04]">
                  <div className="h-full bg-red-500" style={{ width: `${(severityCounts.Critical / totalIssues) * 100}%` }} title="Critical" />
                  <div className="h-full bg-orange-500" style={{ width: `${(severityCounts.High / totalIssues) * 100}%` }} title="High" />
                  <div className="h-full bg-yellow-500" style={{ width: `${(severityCounts.Medium / totalIssues) * 100}%` }} title="Medium" />
                  <div className="h-full bg-emerald-500" style={{ width: `${(severityCounts.Low / totalIssues) * 100}%` }} title="Low" />
                </div>
                <div className="grid grid-cols-4 gap-2 mt-2 text-[10px] font-semibold text-premium-muted">
                  <span>Critical {severityCounts.Critical}</span>
                  <span>High {severityCounts.High}</span>
                  <span>Medium {severityCounts.Medium}</span>
                  <span>Low {severityCounts.Low}</span>
                </div>
              </div>
            )}
          </motion.div>

          {/* Right: Main Headline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="lg:pt-8"
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-intel-400/70 mb-6">
              PRIVATE AUDIT — {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            </p>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-premium-primary tracking-[-0.03em] leading-[1.05]">
              {reportTitle}
            </h1>

            {totalIssues > 0 ? (
              <div className="mt-4 flex items-baseline gap-3 flex-wrap">
                <span className="text-6xl sm:text-7xl lg:text-8xl font-black text-intel-300 tracking-[-0.03em] number-premium">
                  {totalIssues}
                </span>
                <span className="text-2xl sm:text-3xl font-bold text-premium-primary">
                  {totalIssues === 1 ? "Issue Found" : "Issues Found"}
                </span>
              </div>
            ) : (
              <div className="mt-4">
                <span className="text-3xl sm:text-4xl font-bold text-savings-400">No Major Concerns Found</span>
              </div>
            )}

            <p className="mt-6 text-xl sm:text-2xl font-semibold text-premium-tertiary leading-relaxed max-w-2xl">
              {actionLine}
            </p>
            <p className="mt-3 text-[17px] text-premium-tertiary leading-relaxed max-w-2xl">
              {analysisDescription}
            </p>

            {/* Key stats row */}
            <div className="mt-8 flex flex-wrap gap-6">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-premium-primary">{riskScore}</span>
                <span className="text-sm text-premium-tertiary">attention score</span>
              </div>
              {totalIssues > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-premium-primary">{totalIssues}</span>
                  <span className="text-sm text-premium-tertiary">items to review</span>
                </div>
              )}
              {criticalCount > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-risk-critical">{criticalCount}</span>
                  <span className="text-sm text-premium-tertiary">urgent</span>
                </div>
              )}
              {!showExposure && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-intel-400">—</span>
                  <span className="text-sm text-premium-tertiary">price details needed</span>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* ── DIVIDER ── */}
        <div className="mb-10 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

        {/* ── PREMIUM KPI DASHBOARD ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-10">
          {kpiItems.map((item, i) => (
            <KpiCard key={item.label} {...item} delay={i} />
          ))}
        </div>

        {/* ── FINANCIAL EXPOSURE ── */}
        {/* NEVER render "Unknown", "TBD", "N/A" */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-r from-white/[0.02] to-transparent p-6 sm:p-8"
        >
          <div className={`absolute inset-0 ${showExposure ? "bg-[radial-gradient(ellipse_60%_60%_at_30%_50%,rgba(52,211,153,0.04),transparent)]" : "bg-[radial-gradient(ellipse_60%_60%_at_30%_50%,rgba(122,92,245,0.03),transparent)]"} pointer-events-none`} />
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-premium-muted mb-4">
            {showExposure ? "CHARGES WORTH REVIEWING" : "POSSIBLE COST OR SAVINGS"}
          </p>
          <div className="relative">
            {showExposure && exposureDisplay ? (
              <>
                <div className="flex items-baseline gap-3">
                  <span className="text-5xl sm:text-6xl lg:text-7xl font-black text-savings-400 tracking-[-0.03em] number-premium">
                    {exposureDisplay}
                  </span>
                  <span className="text-sm font-semibold text-premium-tertiary">in identified charges</span>
                </div>
                <p className="mt-2 text-[16px] text-premium-tertiary max-w-2xl leading-relaxed">
                  These charges, fees, and terms may be worth questioning, negotiating, or asking to have corrected.
                </p>
              </>
            ) : (
              <>
                <span className="text-4xl sm:text-5xl lg:text-6xl font-black text-intel-300 tracking-[-0.03em]">
                  Amount Not Clear Yet
                </span>
                <div className="mt-4 space-y-2">
                  <p className="text-[16px] text-premium-tertiary leading-relaxed">
                    <span className="font-semibold text-premium-secondary">Why:</span> The document does not include enough pricing detail to calculate an amount.
                  </p>
                  <p className="text-[16px] text-premium-tertiary leading-relaxed">
                    <span className="font-semibold text-premium-secondary">Next step:</span> Use the questions below to ask the provider for the missing price details.
                  </p>
                </div>
              </>
            )}
          </div>
        </motion.div>

        {/* ── Bottom decorative element ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="mt-10 flex items-center gap-3"
        >
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
          <TrendingUp className="h-3.5 w-3.5 text-white/12" />
          <Search className="h-3.5 w-3.5 text-white/10" />
          <Gavel className="h-3.5 w-3.5 text-white/12" />
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
        </motion.div>
      </div>
    </motion.div>
  );
}
