import { motion } from "framer-motion";
import { Shield, FileCheck, Hash, Brain, Lock, CheckCircle2, Fingerprint, Scan } from "lucide-react";

interface TrustPanelProps {
  confidenceScore?: number;
  pagesReviewed: number;
  lineItemsReviewed: number;
  reportId: string;
}

const trustItems = [
  {
    icon: Scan,
    label: "Every Finding Cross-Referenced",
    description: "Each claim is verified against specific locations in your original document — not AI hallucination.",
  },
  {
    icon: Hash,
    label: "Exact Page & Line References",
    description: "All findings include precise page numbers and line references so you can verify in the original.",
  },
  {
    icon: Brain,
    label: "AI Confidence Scoring",
    description: "Every finding has a confidence score. We show certainty and flag uncertainty transparently.",
  },
  {
    icon: Fingerprint,
    label: "Cryptographic Report ID",
    description: "Your report has a unique identifier for verification. The data trail is preserved end-to-end.",
  },
  {
    icon: Lock,
    label: "Zero Data Retention",
    description: "Your document is encrypted in transit and at rest. We never store, share, or train on your data.",
  },
];

export function TrustPanel({ pagesReviewed, lineItemsReviewed, reportId }: TrustPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-[2rem] border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent"
    >
      {/* Mesh background */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_100%,rgba(52,211,153,0.03),transparent)]" />

      <div className="relative p-8 sm:p-12">
        {/* Header */}
        <div className="flex items-center gap-4 mb-2">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-savings-500/20 to-savings-600/10 flex items-center justify-center border border-savings-400/10">
            <Shield className="h-7 w-7 text-savings-400" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-[-0.02em]">Why You Can Trust This Analysis</h2>
            <p className="text-base text-white/50 mt-0.5">
              <span className="font-semibold text-white/70">{pagesReviewed.toLocaleString()}</span> pages reviewed ·{' '}
              <span className="font-semibold text-white/70">{lineItemsReviewed.toLocaleString()}</span> line items analyzed ·{' '}
              Report <span className="font-mono text-intel-400/70">#{reportId.slice(0, 8)}</span>
            </p>
          </div>
        </div>

        {/* Trust Grid */}
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {trustItems.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 + i * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="group relative overflow-hidden rounded-xl border border-white/[0.04] bg-white/[0.01] p-5 hover:bg-white/[0.03] transition-all duration-300"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-savings-500/10 border border-savings-400/10">
                  <CheckCircle2 className="h-4.5 w-4.5 text-savings-400" />
                </div>
                <div>
                  <p className="text-[14px] font-bold text-white">{item.label}</p>
                  <p className="mt-1 text-[13px] text-white/45 leading-relaxed">{item.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-8 flex items-center justify-center border-t border-white/[0.04] pt-6">
          <p className="text-[12px] text-white/20 tracking-wide">
            HiddenFeeAI · Independent Consumer Protection Intelligence · © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </motion.div>
  );
}