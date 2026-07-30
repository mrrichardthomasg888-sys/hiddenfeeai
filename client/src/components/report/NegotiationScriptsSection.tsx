import { useState } from "react";
import { motion } from "framer-motion";
import { Phone, Mail, Copy, Check } from "lucide-react";

interface NegotiationScriptsSectionProps {
  phoneScript: string[];
  emailTemplate: string[];
}

export function NegotiationScriptsSection({
  phoneScript,
  emailTemplate,
}: NegotiationScriptsSectionProps) {
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const handleCopyPhone = async () => {
    try {
      await navigator.clipboard.writeText(phoneScript.join("\n\n"));
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2500);
    } catch { /* noop */ }
  };

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(emailTemplate.join("\n\n"));
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2500);
    } catch { /* noop */ }
  };

  if (phoneScript.length === 0 && emailTemplate.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-[2rem] border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(99,102,241,0.04),transparent)]" />

      <div className="relative p-8 sm:p-12">
        <h2 className="text-2xl sm:text-3xl font-black text-premium-primary tracking-[-0.02em] mb-8">
          Ready-to-Use Scripts
        </h2>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Phone Script */}
          {phoneScript.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-trust-400/10 border border-trust-400/20 flex items-center justify-center">
                    <Phone className="h-5 w-5 text-trust-400" />
                  </div>
                  <h3 className="text-lg font-bold text-premium-primary">What to Say on the Phone</h3>
                </div>
                <button
                  onClick={handleCopyPhone}
                  className="btn-premium inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[12px]"
                >
                  {copiedPhone ? <><Check className="h-3.5 w-3.5" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy All</>}
                </button>
              </div>
              <div className="rounded-xl border border-trust-400/10 bg-trust-400/[0.03] p-5 space-y-4">
                {phoneScript.map((line, i) => (
                  <div key={i} className="text-[15px] leading-relaxed text-premium-secondary">
                    {line.startsWith("OPENING:") ||
                     line.startsWith("WHEN") ||
                     line.startsWith("ESCALATION:") ||
                     line.startsWith("CLOSING:") ||
                     line.startsWith("IF") ? (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-premium-muted mb-1">
                          {line.split(":")[0]}
                        </p>
                        <p className="italic">&ldquo;{line.split(":").slice(1).join(":").trim()}&rdquo;</p>
                      </div>
                    ) : (
                      <p>{line}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Email Template */}
          {emailTemplate.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-savings-400/10 border border-savings-400/20 flex items-center justify-center">
                    <Mail className="h-5 w-5 text-savings-400" />
                  </div>
                  <h3 className="text-lg font-bold text-premium-primary">Email You Can Send</h3>
                </div>
                <button
                  onClick={handleCopyEmail}
                  className="btn-premium inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[12px]"
                >
                  {copiedEmail ? <><Check className="h-3.5 w-3.5" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy All</>}
                </button>
              </div>
              <div className="rounded-xl border border-savings-500/10 bg-savings-500/[0.03] p-5 space-y-3 font-mono text-[14px]">
                {emailTemplate.map((para, i) => (
                  <p key={i} className={`leading-relaxed ${
                    i === 0 ? "font-bold text-premium-primary" : "text-premium-secondary"
                  }`}>
                    {para}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
