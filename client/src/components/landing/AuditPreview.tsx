import { useState } from "react";
import { motion } from "framer-motion";
import { FileSearch, TrendingDown } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { useCountUp } from "@/hooks/useCountUp";

export function AuditPreview() {
  const [active, setActive] = useState(false);
  const savings = useCountUp(742, active, 1400);
  const charges = useCountUp(47, active, 1000);
  const flagged = useCountUp(5, active, 800);

  return (
    <section className="bg-midnight-800 py-16">
      <Container className="flex justify-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          onViewportEnter={() => setActive(true)}
          transition={{ duration: 0.5 }}
          className="w-full max-w-xl rounded-3xl border border-violet-500/10 bg-midnight-900/80 p-8 glow-purple sm:p-10"
        >
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15">
              <FileSearch className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-violet-400/60">
                AI Audit Preview
              </p>
              <p className="text-base font-semibold text-violet-100">
                Document analyzed: Auto Purchase Agreement
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 rounded-2xl bg-midnight-800 p-6 text-center">
            <div>
              <p className="text-3xl font-semibold text-violet-100">{charges}</p>
              <p className="mt-1 text-xs text-violet-400/60">Charges reviewed</p>
            </div>
            <div>
              <p className="text-3xl font-semibold text-risk-high">{flagged}</p>
              <p className="mt-1 text-xs text-violet-400/60">Items flagged</p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1">
                <TrendingDown className="h-5 w-5 text-savings-500" />
                <p className="text-3xl font-semibold text-savings-400">${savings}</p>
              </div>
              <p className="mt-1 text-xs text-violet-400/60">Potential savings</p>
            </div>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}