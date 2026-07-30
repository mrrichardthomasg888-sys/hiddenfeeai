import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Shield, Scale, Target, FileText, Copy } from "lucide-react";
import type { HiddenFee, QuestionableCharge, NegotiationLeverage } from "@/types/audit";

interface NegotiationPlaybookProps {
  hiddenFees: HiddenFee[];
  questionableCharges: QuestionableCharge[];
  negotiationLeverage: NegotiationLeverage[];
}

export function NegotiationPlaybook({
  hiddenFees,
  questionableCharges,
  negotiationLeverage,
}: NegotiationPlaybookProps) {
  const [copied, setCopied] = useState<string | null>(null);

  const negotiableFindings: HiddenFee[] = [
    ...hiddenFees.filter((f) => f.negotiationMessage || f.negotiationStrategy),
    ...questionableCharges.filter((f) => f.negotiationStrategy).map((f) => ({
      ...f,
      negotiationMessage: "",
    })),
  ];

  const totalScripts = negotiableFindings.length + negotiationLeverage.length;
  if (totalScripts === 0) return null;

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
            <h2 className="text-2xl sm:text-3xl font-black text-premium-primary tracking-[-0.02em]">What to Say</h2>
            <p className="text-base text-premium-tertiary mt-0.5">
              {totalScripts} ready-to-use question{totalScripts === 1 ? "" : "s"}, script{totalScripts === 1 ? "" : "s"}, and response{totalScripts === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        {/* Per-finding negotiation scripts */}
        <div className="mt-8 space-y-8">
          {negotiableFindings.map((f) => {
            const ns = f.negotiationStrategy;
            const msg = "negotiationMessage" in f ? f.negotiationMessage : undefined;
            return (
              <motion.div
                key={f.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.015] p-6 sm:p-8"
              >
                <h3 className="text-xl sm:text-2xl font-bold text-premium-primary mb-6">{f.title}</h3>

                {/* Their position (company's likely argument) */}
                {ns?.expectedCompanyResponse && (
                  <div className="mb-5 rounded-xl border border-red-500/10 bg-gradient-to-br from-red-500/[0.04] to-transparent p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 text-red-400/60" />
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-red-400/60">What They May Say</p>
                    </div>
                    <p className="text-[16px] text-premium-secondary italic leading-relaxed">
                      &ldquo;{ns.expectedCompanyResponse}&rdquo;
                    </p>
                  </div>
                )}

                {(msg || (ns && ns.bestCounterResponse)) && (
                  <div className="mb-5 rounded-xl border border-savings-500/10 bg-gradient-to-br from-savings-500/[0.04] to-transparent p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="h-4 w-4 text-savings-400/60" />
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-savings-400/60">What You Can Say</p>
                    </div>
                    <p className="text-[16px] text-premium-secondary italic leading-relaxed">
                      &ldquo;{(msg || (ns && ns.bestCounterResponse) || "").toString()}&rdquo;
                    </p>
                  </div>
                )}

                {/* Full strategy script */}
                {ns?.script && (
                  <div className="mb-5 rounded-xl bg-white/[0.015] border border-white/[0.06] p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Shield className="h-4 w-4 text-trust-400/60" />
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-premium-muted">Ready-to-Use Script</p>
                    </div>
                    <p className="text-[15px] text-premium-secondary leading-relaxed">{ns.script}</p>
                  </div>
                )}

                {/* Strategy steps */}
                {ns?.steps && ns.steps.length > 0 && (
                  <div className="mb-5 rounded-xl bg-white/[0.015] border border-white/[0.06] p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Shield className="h-4 w-4 text-trust-400/60" />
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-premium-muted">How to Handle the Conversation</p>
                    </div>
                    <ol className="space-y-2">
                      {ns.steps.map((s, j) => (
                        <li key={j} className="flex items-start gap-3 text-[15px] text-premium-secondary leading-relaxed">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-trust-400/10 text-[11px] font-bold text-trust-400">{j + 1}</span>
                          {s}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Manager escalation */}
                {ns?.managerEscalation && (
                  <div className="mb-5 rounded-xl border border-amber-500/10 bg-amber-500/[0.03] p-5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-amber-400/60 mb-2">If You Need to Escalate</p>
                    <p className="text-[15px] text-premium-secondary">{ns.managerEscalation}</p>
                  </div>
                )}

                {/* Documents to request */}
                {ns?.documentsToRequest && ns.documentsToRequest.length > 0 && (
                  <div className="mb-5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-premium-muted mb-2">Documents to Request</p>
                    <ul className="space-y-1">
                      {ns.documentsToRequest.map((doc, i) => (
                        <li key={i} className="flex items-start gap-2 text-[14px] text-premium-secondary">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-trust-400/60" />
                          {doc}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex flex-wrap gap-3 mt-5 pt-5 border-t border-white/[0.04]">
                  {msg && (
                    <button
                      onClick={() => handleCopy(msg as string, `script-${f.id}`)}
                      className="btn-premium inline-flex items-center gap-2 rounded-xl px-5 py-3 text-[13px]"
                    >
                      {copied === `script-${f.id}` ? (
                        <>Copied</>
                      ) : (
                        <>Copy Phone Script</>
                      )}
                    </button>
                  )}
                  {f.recommendedAction && (
                    <button
                      onClick={() => handleCopy(f.recommendedAction as string, `email-${f.id}`)}
                      className="btn-ghost-premium inline-flex items-center gap-2 rounded-xl px-5 py-3 text-[13px]"
                    >
                      {copied === `email-${f.id}` ? (
                        <>Copied</>
                      ) : (
                        <>Copy Email Draft</>
                      )}
                    </button>
                  )}
                  {ns && (
                    <span className={`ml-auto rounded-full px-3 py-1.5 text-[10px] font-bold uppercase self-center ${
                      ns.difficulty === "Easy" ? "bg-savings-500/15 text-savings-400" :
                      ns.difficulty === "Medium" ? "bg-amber-500/15 text-amber-400" :
                      "bg-red-500/15 text-red-400"
                    }`}>
                      {ns.difficulty}
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}

          {/* Negotiation Leverage items */}
          {negotiationLeverage.map((lev) => (
            <motion.div
              key={lev.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-2xl border border-violet-500/15 bg-violet-500/[0.03] p-6 sm:p-8"
            >
              <div className="flex items-center gap-3 mb-4">
                <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
                  lev.priority === "Immediate" ? "bg-red-500/20 text-red-300" :
                  lev.priority === "High" ? "bg-amber-500/20 text-amber-300" :
                  lev.priority === "Medium" ? "bg-yellow-500/20 text-yellow-300" :
                  "bg-blue-500/20 text-blue-300"
                }`}>
                  {lev.priority}
                </span>
                {lev.successProbability > 0 && (
                  <span className="text-[12px] text-premium-muted">
                    <span className="text-savings-400 font-semibold">{lev.successProbability}%</span> success rate
                  </span>
                )}
                {lev.estimatedSavings > 0 && (
                  <span className="text-[12px] text-savings-400 font-semibold">
                    ~${lev.estimatedSavings.toLocaleString()} savings
                  </span>
                )}
              </div>

              <h3 className="text-xl font-bold text-premium-primary mb-3">{lev.title}</h3>
              <p className="text-[16px] text-premium-secondary mb-5">{lev.leverage}</p>

              {lev.whyCompanyMayAgree && (
                <div className="mb-5 rounded-xl border border-savings-500/10 bg-savings-500/[0.03] p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-savings-400/60 mb-1">Why This Request May Work</p>
                  <p className="text-[15px] text-premium-secondary">{lev.whyCompanyMayAgree}</p>
                </div>
              )}

              {lev.suggestedWording && (
                <div className="mb-4 rounded-xl border-l-[3px] border-trust-400/30 bg-trust-400/[0.03] p-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-premium-muted mb-2">Suggested Wording</p>
                  <p className="text-[16px] text-premium-secondary italic">&ldquo;{lev.suggestedWording}&rdquo;</p>
                </div>
              )}

              {lev.alternativeWording && (
                <div className="mb-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-premium-muted mb-1">Alternative Wording</p>
                  <p className="text-[15px] text-premium-secondary italic">&ldquo;{lev.alternativeWording}&rdquo;</p>
                </div>
              )}

              {lev.suggestedWording && (
                <button
                  onClick={() => handleCopy(lev.suggestedWording, `lev-${lev.id}`)}
                  className="btn-premium inline-flex items-center gap-2 rounded-xl px-5 py-3 text-[13px]"
                >
                  {copied === `lev-${lev.id}` ? (
                    <><Check className="h-4 w-4" /> Copied</>
                  ) : (
                    <><Copy className="h-4 w-4" /> Copy Script</>
                  )}
                </button>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
