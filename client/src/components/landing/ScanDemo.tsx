import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, CheckCircle2 } from "lucide-react";

const steps = [
  "Reading document...",
  "Extracting financial data...",
  "Checking calculations...",
  "Searching for hidden fees...",
  "Analyzing contract language...",
  "Generating savings report...",
];

/**
 * Ambient looping preview of the real analysis-screen animation
 * (used in Phase 3/4 during actual document processing). Purely
 * decorative here — builds anticipation without faking real data.
 */
export function ScanDemo() {
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (index >= steps.length) {
      setDone(true);
      const resetTimer = setTimeout(() => {
        setDone(false);
        setIndex(0);
      }, 2200);
      return () => clearTimeout(resetTimer);
    }
    const timer = setTimeout(() => setIndex((i) => i + 1), 900);
    return () => clearTimeout(timer);
  }, [index]);

  return (
    <div className="glass-panel w-full max-w-sm rounded-2xl p-5 shadow-glass">
      <div className="mb-4 flex items-center gap-2">
        {done ? (
          <CheckCircle2 className="h-4 w-4 text-savings-400" />
        ) : (
          <Loader2 className="h-4 w-4 animate-spin text-savings-400" />
        )}
        <span className="text-xs font-medium tracking-wide text-mist-400">
          {done ? "AUDIT COMPLETE" : "AI AUDIT IN PROGRESS"}
        </span>
      </div>
      <div className="flex min-h-[120px] flex-col justify-center gap-2">
        <AnimatePresence mode="wait">
          {!done && (
            <motion.p
              key={index}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="font-mono text-sm text-white/90"
            >
              {steps[Math.min(index, steps.length - 1)]}
            </motion.p>
          )}
          {done && (
            <motion.p
              key="done"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-mono text-sm text-savings-400"
            >
              6 issues found · $347 in potential savings
            </motion.p>
          )}
        </AnimatePresence>
      </div>
      <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full rounded-full bg-savings-400"
          initial={{ width: "0%" }}
          animate={{ width: `${((index + 1) / steps.length) * 100}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>
    </div>
  );
}
