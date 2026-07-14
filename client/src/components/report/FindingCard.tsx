import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquareText,
  Lightbulb,
  Swords,
  Bookmark,
  BookmarkCheck,
  ChevronUp,
} from "lucide-react";
import type { Finding } from "@/types/audit";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface FindingCardProps {
  finding: Finding;
  index: number;
}

function getSeverityBadge(severity: string) {
  switch (severity) {
    case "Critical": return "critical" as const;
    case "High": return "high" as const;
    case "Medium": return "medium" as const;
    default: return "low" as const;
  }
}

function getCategoryIcon(category: string) {
  switch (category) {
    case "Hidden Fee": return "💰";
    case "Billing Error": return "📄";
    case "Math Error": return "🔢";
    case "Duplicate Charge": return "🔁";
    case "Contract Risk": return "⚖️";
    default: return "⚠️";
  }
}

function getNegotiationDifficultyColor(difficulty: string) {
  switch (difficulty) {
    case "Easy": return "text-savings-400 border-savings-500/30 bg-savings-500/10";
    case "Medium": return "text-amber-400 border-amber-500/30 bg-amber-500/10";
    case "Hard": return "text-risk-critical border-risk-critical/30 bg-risk-critical/10";
    default: return "text-violet-400 border-violet-500/30 bg-violet-500/10";
  }
}

export function FindingCard({ finding, index }: FindingCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [showNegotiation, setShowNegotiation] = useState(true);
  const [isSaved, setIsSaved] = useState(false);

  // Use AI-provided negotiation strategy if available, otherwise generate a fallback
  const strategy = finding.negotiation_strategy ?? {
    difficulty: "Medium" as const,
    steps: [
      `Request an itemized breakdown of the ${finding.title.toLowerCase()}`,
      `Ask if the fee is mandatory or if any discounts are available`,
      `Request a formal review or appeal of the charge`,
    ],
    script: finding.negotiation_message ?? `Contact the issuer and ask for clarification on this charge. Reference your audit findings when discussing.`,
    key_points: [
      `This charge totals $${finding.amount?.toLocaleString() ?? "N/A"}`,
      `The confidence score on this finding is ${finding.confidence_score}%`,
    ],
  };

  const handleToggleNegotiation = () => {
    setShowNegotiation(!showNegotiation);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="rounded-2xl border border-violet-500/10 bg-midnight-900/80 shadow-sm glow-purple"
    >
      {/* Always-visible header: icon, title, amount, severity */}
      <div className="flex items-start gap-3 p-4 sm:p-5">
        {/* Category icon */}
        <div className={cn(
          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base",
          finding.severity === "Critical" || finding.severity === "High"
            ? "bg-risk-critical/15"
            : "bg-risk-medium/15"
        )}>
          {getCategoryIcon(finding.category)}
        </div>

        <div className="min-w-0 flex-1">
          {/* Title row with amount and severity */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-violet-100">{finding.title}</p>
              <p className="mt-0.5 text-xs text-violet-400/60">{finding.category}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {finding.amount != null && (
                <span className="text-sm font-bold text-risk-critical">
                  ${finding.amount.toLocaleString()}
                </span>
              )}
              <Badge variant={getSeverityBadge(finding.severity)}>
                {finding.severity.toLowerCase()}
              </Badge>
            </div>
          </div>

          {/* Confidence + page row */}
          <div className="mt-1.5 flex items-center gap-3 text-xs text-violet-300/80">
            <span>
              Confidence:{" "}
              <span className="font-semibold text-violet-100">
                {finding.confidence_score}%
              </span>
            </span>
            {finding.page && <span>Page {finding.page}</span>}
            {finding.line_reference && <span>{finding.line_reference}</span>}
          </div>

          {/* Evidence (always visible) */}
          {finding.evidence && (
            <div className="mt-2 rounded-lg bg-violet-500/10 px-3 py-2">
              <p className="text-xs font-semibold text-violet-300/90">Evidence</p>
              <p className="mt-0.5 text-xs italic text-violet-200/90">
                &ldquo;{finding.evidence}&rdquo;
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                showDetails
                  ? "bg-violet-600/20 text-violet-300"
                  : "bg-violet-500/15 text-violet-300 hover:bg-violet-500/25 hover:text-violet-100"
              )}
            >
              <Lightbulb className="h-3.5 w-3.5" />
              {showDetails ? "Hide explanation" : "Explain This Charge"}
            </button>

            <button
              type="button"
              onClick={handleToggleNegotiation}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all duration-200",
                showNegotiation
                  ? "bg-amber-500/20 text-amber-300 border border-amber-400/30 shadow-[0_0_12px_rgba(251,191,36,0.25)]"
                  : "bg-amber-500/20 text-amber-300 border border-amber-400/30 shadow-[0_0_12px_rgba(251,191,36,0.25)] hover:bg-amber-500/30 hover:shadow-[0_0_20px_rgba(251,191,36,0.4)]"
              )}
            >
              <Swords className="h-3.5 w-3.5" />
              {showNegotiation ? "Hide strategy" : "Challenge This Charge"}
            </button>

            <button
              type="button"
              onClick={() => setIsSaved(!isSaved)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                isSaved
                  ? "bg-amber-500/20 text-amber-300"
                  : "bg-violet-500/15 text-violet-300 hover:bg-violet-500/25 hover:text-violet-100"
              )}
            >
              {isSaved ? (
                <BookmarkCheck className="h-3.5 w-3.5" />
              ) : (
                <Bookmark className="h-3.5 w-3.5" />
              )}
              {isSaved ? "Saved" : "Save This Finding"}
            </button>
          </div>
        </div>
      </div>

      {/* Expandable: Explanation + Why it matters + Recommended action */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 border-t border-violet-500/10 px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
              {finding.explanation && (
                <div>
                  <p className="text-xs font-medium text-violet-400/60">Explanation</p>
                  <p className="mt-0.5 text-sm text-violet-200">{finding.explanation}</p>
                </div>
              )}
              {finding.why_it_matters && (
                <div>
                  <p className="text-xs font-medium text-violet-400/60">Why it matters</p>
                  <p className="mt-0.5 text-sm text-violet-200">{finding.why_it_matters}</p>
                </div>
              )}
              {finding.recommended_action && (
                <div className="rounded-xl bg-violet-600/10 p-3">
                  <p className="text-xs font-medium text-violet-400">Recommended Action</p>
                  <p className="mt-0.5 text-sm text-violet-200">{finding.recommended_action}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Negotiation Assistant Panel (inline, visible when toggled) */}
      <AnimatePresence>
        {showNegotiation && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="border-t border-violet-500/10 px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
              <div className="rounded-xl border border-savings-500/20 bg-gradient-to-br from-midnight-900 to-savings-500/5 p-4">
                {/* Panel header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-savings-500/20">
                      <MessageSquareText className="h-4 w-4 text-savings-400" />
                    </div>
                    <p className="text-sm font-semibold text-savings-300">
                      Negotiation Assistant
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowNegotiation(false)}
                    className="rounded-lg p-1 text-violet-400/40 hover:text-violet-200"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                </div>

                {/* Negotiation Opportunity */}
                <p className="mt-3 text-xs font-medium text-savings-400/80">
                  Negotiation Opportunity
                </p>
                <p className="text-sm font-semibold text-violet-100">
                  {finding.title}: ${finding.amount?.toLocaleString() ?? "N/A"}
                </p>

                {/* Difficulty badge */}
                <div className="mt-2 flex items-center gap-2">
                  <span className={cn(
                    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
                    getNegotiationDifficultyColor(strategy.difficulty)
                  )}>
                    {strategy.difficulty} difficulty
                  </span>
                  <span className="text-xs text-violet-400/40">
                    Confidence: {finding.confidence_score}%
                  </span>
                </div>

                {/* Steps */}
                <div className="mt-3">
                  <p className="text-xs font-medium text-violet-400/60">Recommended approach</p>
                  <ol className="mt-1.5 space-y-1">
                    {strategy.steps.map((step, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-violet-200">
                        <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-savings-500/20 text-[10px] font-bold text-savings-400">
                          {i + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Script */}
                <div className="mt-3 rounded-lg bg-midnight-950/60 p-3">
                  <p className="text-xs font-medium text-violet-400/60">What to say</p>
                  <p className="mt-1 text-xs italic text-violet-200/80">
                    &ldquo;{strategy.script}&rdquo;
                  </p>
                </div>

                {/* Key points */}
                {strategy.key_points.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-violet-400/60">Key talking points</p>
                    <ul className="mt-1 space-y-0.5">
                      {strategy.key_points.map((point, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs text-violet-300/70">
                          <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-savings-500" />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}