import { useState } from "react";
import { motion } from "framer-motion";
import {
  FileSearch, Lightbulb, Copy, Check,
  BookOpen, Target, Scale, DollarSign,
} from "lucide-react";
import type { HiddenFee, QuestionableCharge } from "@/types/audit";

// Unified type for both HiddenFee and QuestionableCharge
type AnyFinding = HiddenFee | QuestionableCharge;

interface PremiumFindingCardProps {
  finding: AnyFinding;
  index: number;
}

const severityConfig = {
  Critical: {
    color: "text-red-400",
    bg: "card-critical",
    dot: "bg-red-400",
    badge: "bg-red-500/20 text-red-300",
    gradient: "from-red-500/8 via-transparent to-transparent",
  },
  High: {
    color: "text-amber-400",
    bg: "card-high",
    dot: "bg-amber-400",
    badge: "bg-amber-500/20 text-amber-300",
    gradient: "from-amber-500/8 via-transparent to-transparent",
  },
  Medium: {
    color: "text-yellow-400",
    bg: "card-medium",
    dot: "bg-yellow-400",
    badge: "bg-yellow-500/20 text-yellow-300",
    gradient: "from-yellow-500/6 via-transparent to-transparent",
  },
  Low: {
    color: "text-blue-400",
    bg: "card-low",
    dot: "bg-blue-400",
    badge: "bg-blue-500/20 text-blue-300",
    gradient: "from-blue-500/6 via-transparent to-transparent",
  },
};

export function PremiumFindingCard({ finding, index }: PremiumFindingCardProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [showFullEvidence, setShowFullEvidence] = useState(false);
  const cfg = severityConfig[finding.severity] ?? severityConfig.Medium;

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    } catch { /* noop */ }
  };

  const idxStr = String(index + 1).padStart(2, "0");
  const ns = finding.negotiationStrategy;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={`relative overflow-hidden rounded-2xl ${cfg.bg} transition-all duration-500`}
    >
      {/* Severity edge glow */}
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-b ${cfg.gradient}`} />

      <div className="relative p-6 sm:p-8">
        {/* ── HEADER ── */}
        <div className="flex items-start gap-5 mb-6">
          <div className="shrink-0 flex flex-col items-center gap-2">
            <span className={`text-lg font-black tabular-nums ${cfg.color} opacity-50`}>{idxStr}</span>
            <div className="relative flex h-2.5 w-2.5">
              <span className={`absolute inline-flex h-full w-full rounded-full ${cfg.dot} opacity-40 animate-ping`} />
              <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${cfg.dot}`} />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <span className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${cfg.badge}`}>
                {finding.severity}
              </span>
              <span className="text-[13px] font-semibold text-premium-muted">{finding.status?.replace("_", " ")}</span>
              <span className="inline-flex items-center gap-1.5 text-[12px] text-premium-muted">
                <span className="text-premium-secondary font-semibold">{finding.confidenceScore}%</span>
                <span>confidence</span>
              </span>
              {finding.pageNumber && (
                <span className="text-[12px] text-premium-muted font-mono border-l border-white/[0.06] pl-3">
                  Page {finding.pageNumber}
                </span>
              )}
            </div>

            <h3 className="text-xl font-bold text-premium-primary leading-snug tracking-[-0.01em]">
              {finding.title}
            </h3>

            {/* Amount */}
            {finding.amount && finding.amount > 0 && (
              <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-risk-critical/15 bg-risk-critical/5 px-3.5 py-1.5">
                <DollarSign className="h-3.5 w-3.5 text-risk-critical" />
                <span className="text-sm font-bold text-risk-critical tabular-nums">
                  ${finding.amount.toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── WHY THIS MATTERS ── */}
        <div className="mb-6">
          <div className="flex items-center gap-2.5 mb-2">
            <Lightbulb className="h-4 w-4 text-amber-400/60" />
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-amber-400/60">Why This Charge Matters</p>
          </div>
          <p className="text-[17px] leading-relaxed text-premium-secondary">
            {finding.explanation}
          </p>
        </div>

        {/* ── IMPACT ── */}
        {finding.whyItMatters && (
          <div className="mb-6">
            <div className="flex items-center gap-2.5 mb-2">
              <BookOpen className="h-4 w-4 text-intel-400/60" />
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-intel-400/60">What It Could Cost You</p>
            </div>
            <p className="text-[17px] leading-relaxed text-premium-secondary">{finding.whyItMatters}</p>
          </div>
        )}

        {/* ── RECOMMENDED ACTION ── */}
        {finding.recommendedAction && (
          <div className="mb-6 rounded-xl border border-savings-500/10 bg-savings-500/[0.04] p-5">
            <div className="flex items-center gap-2.5 mb-2">
              <Target className="h-4 w-4 text-savings-400/60" />
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-savings-400/60">What to Do Next</p>
            </div>
            <p className="text-[17px] leading-relaxed text-premium-secondary mb-3">{finding.recommendedAction}</p>
            <button
              onClick={(e) => { e.stopPropagation(); handleCopy(finding.recommendedAction!, "action"); }}
              className="inline-flex items-center gap-2 rounded-xl btn-premium px-4 py-2.5 text-[12px]"
            >
              {copied === "action" ? <><Check className="h-3.5 w-3.5" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy Action</>}
            </button>
          </div>
        )}

        {/* ── NEGOTIATION STRATEGY ── */}
        {ns && (
          <div className="mb-6 rounded-xl border border-trust-400/10 bg-trust-400/[0.03] p-5">
            <div className="flex items-center gap-2.5 mb-3">
              <Scale className="h-4 w-4 text-trust-400/60" />
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-trust-400/60">How to Question It</p>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${
                ns.difficulty === "Easy" ? "bg-savings-500/15 text-savings-400" :
                ns.difficulty === "Medium" ? "bg-amber-500/15 text-amber-400" :
                "bg-red-500/15 text-red-400"
              }`}>
                {ns.difficulty}
              </span>
              {ns.successProbability && (
                <span className="rounded-full bg-white/[0.04] px-3 py-1 text-[11px] font-medium text-premium-tertiary border border-white/[0.06]">
                  {ns.successProbability}% estimated chance
                </span>
              )}
              {ns.estimatedSavings && ns.estimatedSavings > 0 && (
                <span className="rounded-full bg-savings-500/10 px-3 py-1 text-[11px] font-medium text-savings-400 border border-savings-500/20">
                  ~${ns.estimatedSavings.toLocaleString()} savings
                </span>
              )}
              {ns.keyPoints?.slice(0, 1).map((kp, i) => (
                <span key={i} className="rounded-full bg-white/[0.04] px-3 py-1 text-[11px] font-medium text-premium-tertiary border border-white/[0.06]">
                  {kp}
                </span>
              ))}
            </div>

            <ol className="space-y-2">
              {ns.steps.map((s, j) => (
                <li key={j} className="flex items-start gap-3 text-[15px] text-premium-secondary leading-relaxed">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-trust-400/10 text-[11px] font-bold text-trust-400">{j + 1}</span>
                  {s}
                </li>
              ))}
            </ol>

            {ns.escalationPath && (
              <div className="mt-4 pt-4 border-t border-white/[0.04]">
                <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-premium-muted mb-1">If You Need to Escalate</p>
                <p className="text-[14px] text-premium-secondary">{ns.escalationPath}</p>
              </div>
            )}
          </div>
        )}

        {/* ── NEGOTIATION SCRIPT ── */}
        {"negotiationMessage" in finding && finding.negotiationMessage && (
          <div className="mb-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-savings-400/60 mb-2">What To Say (Phone Script)</p>
            <div className="relative rounded-xl border-l-[3px] border-savings-500/30 bg-gradient-to-r from-savings-500/[0.04] to-transparent p-5">
              <p className="text-[16px] leading-relaxed text-premium-secondary italic">&ldquo;{finding.negotiationMessage}&rdquo;</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); handleCopy(finding.negotiationMessage!, "script"); }}
              className="mt-3 inline-flex items-center gap-2 rounded-xl btn-premium px-4 py-2.5 text-[12px]"
            >
              {copied === "script" ? <><Check className="h-3.5 w-3.5" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy Phone Script</>}
            </button>
          </div>
        )}

        {/* ── EVIDENCE ── */}
        {finding.evidence && (
          <div className="border-t border-white/[0.04] pt-5">
            <button
              onClick={() => setShowFullEvidence(!showFullEvidence)}
              className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em] text-premium-muted hover:text-premium-secondary transition-colors"
            >
              <FileSearch className="h-4 w-4" />
              {showFullEvidence ? "Hide Where This Appears" : "Show Where This Appears"}
            </button>
            {showFullEvidence && (
              <div className="mt-3 rounded-xl border-l-[3px] border-intel-400/30 bg-gradient-to-r from-intel-400/[0.04] to-transparent p-5">
                <p className="text-[15px] leading-relaxed text-premium-secondary italic">&ldquo;{finding.evidence}&rdquo;</p>
                {finding.lineReference && (
                  <p className="mt-2 text-[12px] text-premium-muted font-mono">Line reference: {finding.lineReference}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
