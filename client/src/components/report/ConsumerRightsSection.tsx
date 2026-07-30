import { motion } from "framer-motion";
import { Scale, BookOpen } from "lucide-react";
import type { ConsumerRight } from "@/types/audit";

interface ConsumerRightsSectionProps {
  rights: ConsumerRight[];
}

export function ConsumerRightsSection({ rights }: ConsumerRightsSectionProps) {
  if (!rights || rights.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-[2rem] border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(52,211,153,0.03),transparent)]" />

      <div className="relative p-8 sm:p-12">
        <div className="flex items-center gap-4 mb-2">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-savings-500/20 to-savings-600/10 flex items-center justify-center border border-savings-400/10">
            <Scale className="h-7 w-7 text-savings-400" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-premium-primary tracking-[-0.02em]">Consumer Rights</h2>
            <p className="text-base text-premium-tertiary mt-0.5">
              Rights and protections that may apply to your situation
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {rights.map((right, i) => (
            <motion.div
              key={right.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 hover:bg-white/[0.04] transition-colors"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="mt-0.5 h-8 w-8 shrink-0 flex items-center justify-center rounded-lg bg-savings-500/10 border border-savings-400/10">
                  <BookOpen className="h-4 w-4 text-savings-400" />
                </div>
                <h3 className="text-[15px] font-bold text-premium-primary">{right.right}</h3>
              </div>
              <p className="text-[14px] text-premium-secondary leading-relaxed mb-3">{right.description}</p>
              {right.howToExercise && (
                <div className="rounded-lg bg-savings-500/[0.05] border border-savings-500/10 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-savings-400/60 mb-1">How to Exercise</p>
                  <p className="text-[13px] text-premium-secondary">{right.howToExercise}</p>
                </div>
              )}
              {right.applicableLaw && (
                <p className="mt-2 text-[11px] text-premium-muted font-mono">Law: {right.applicableLaw}</p>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
