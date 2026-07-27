import { useState } from "react";
import { motion } from "framer-motion";
import { Phone, Mail, Check, Shield, Scale, Target, FileText, Copy } from "lucide-react";
import type { Finding } from "@/types/audit";

interface NegotiationPlaybookProps {
  findings: Finding[];
}

export function NegotiationPlaybook({ findings }: NegotiationPlaybookProps) {
  const [copied, setCopied] = useState<string | null>(null);

  const negotiableFindings = findings.filter(
    (f) => f.negotiation_message || f.negotiation_strategy
  );

  if (negotiableFindings.length === 0) return null;

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 2500);
    } catch { /* fallback */ }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-[2rem] border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(99,102,241,0.05),transparent)]" />

      <div className="relative p-8 sm:p-12">
        {/* Header */}
        <div className="flex items-center gap-4 mb-2">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-trust-500/20 to-trust-600/10 flex items-center justify-center border border-trust-400/10">
            <Scale className="h-7 w-7 text-trust-400" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-premium-primary tracking-[-0.02em]">Negotiation Playbook</h2>
            <p className="text-base text-premium-tertiary mt-0.5">Professional-grade negotiation toolkit — {negotiableFindings.length} scripts available</p>
          </div>
        </div>

        {/* ── EACH FINDING: Fully visible, no accordion ── */}
        <div className="mt-8 space-y-8">
          {negotiableFindings.map((f) => (
            <motion.div
              key={f.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.015] p-6 sm:p-8"
            >
              {/* Title */}
              <h3 className="text-xl sm:text-2xl font-bold text-premium-primary mb-6">{f.title}</h3>

              {/* THEIR POSITION - always visible */}
              {f.negotiation_strategy?.key_points?.[0] && (
                <div className="mb-5 rounded-xl border border-red-500/10 bg-gradient-to-br from-red-500/[0.04] to-transparent p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-red-400/60" />
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-red-400/60">Their Position</p>
                  </div>
                  <p className="text-[16px] text-premium-secondary italic leading-relaxed">
                    &ldquo;{f.negotiation_strategy.key_points[0]}&rdquo;
                  </p>
                </div>
              )}

              {/* YOUR RESPONSE - always visible */}
              {f.negotiation_message && (
                <div className="mb-5 rounded-xl border border-savings-500/10 bg-gradient-to-br from-savings-500/[0.04] to-transparent p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-savings-400/60" />
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-savings-400/60">Your Response</p>
                  </div>
                  <p className="text-[16px] text-premium-secondary italic leading-relaxed">
                    &ldquo;{f.negotiation_message}&rdquo;
                  </p>
                </div>
              )}

              {/* STRATEGY STEPS - always visible */}
              {f.negotiation_strategy?.steps && f.negotiation_strategy.steps.length > 0 && (
                <div className="mb-5 rounded-xl bg-white/[0.015] border border-white/[0.06] p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="h-4 w-4 text-trust-400/60" />
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-premium-muted">Strategy Steps</p>
                  </div>
                  <ol className="space-y-2">
                    {f.negotiation_strategy.steps.map((s, j) => (
                      <li key={j} className="flex items-start gap-3 text-[15px] text-premium-secondary leading-relaxed">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-trust-400/10 text-[11px] font-bold text-trust-400">{j + 1}</span>
                        {s}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* ACTION BUTTONS */}
              <div className="flex flex-wrap gap-3 mt-5 pt-5 border-t border-white/[0.04]">
                {f.negotiation_message && (
                  <button
                    onClick={() => handleCopy(f.negotiation_message!, `script-${f.id}`)}
                    className="btn-premium inline-flex items-center gap-2 rounded-xl px-5 py-3 text-[13px]"
                  >
                    {copied === `script-${f.id}` ? (
                      <><Check className="h-4 w-4" /> Copied</>
                    ) : (
                      <><Phone className="h-4 w-4" /> Copy Phone Script</>
                    )}
                  </button>
                )}
                {f.recommended_action && (
                  <button
                    onClick={() => handleCopy(f.recommended_action!, `email-${f.id}`)}
                    className="btn-ghost-premium inline-flex items-center gap-2 rounded-xl px-5 py-3 text-[13px]"
                  >
                    {copied === `email-${f.id}` ? (
                      <><Check className="h-4 w-4 text-savings-400" /> Copied</>
                    ) : (
                      <><Mail className="h-4 w-4" /> Copy Email Draft</>
                    )}
                  </button>
                )}

                {/* Difficulty badge */}
                {f.negotiation_strategy && (
                  <span className={`ml-auto rounded-full px-3 py-1.5 text-[10px] font-bold uppercase self-center ${
                    f.negotiation_strategy.difficulty === "Easy" ? "bg-savings-500/15 text-savings-400" :
                    f.negotiation_strategy.difficulty === "Medium" ? "bg-amber-500/15 text-amber-400" :
                    "bg-red-500/15 text-red-400"
                  }`}>
                    {f.negotiation_strategy.difficulty}
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}