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
    <section className="bg-white py-20">
      <Container className="flex justify-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          onViewportEnter={() => setActive(true)}
          transition={{ duration: 0.5 }}
          className="w-full max-w-xl rounded-3xl border border-mist-200 p-8 shadow-card sm:p-10"
        >
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-trust-500/10">
              <FileSearch className="h-5 w-5 text-trust-600" />
            </div>
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-mist-500">
                AI Audit Preview
              </p>
              <p className="text-base font-semibold text-ink-900">
                Document analyzed: Auto Purchase Agreement
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 rounded-2xl bg-mist-50 p-6 text-center">
            <div>
              <p className="text-3xl font-semibold text-ink-900">{charges}</p>
              <p className="mt-1 text-xs text-mist-500">Charges reviewed</p>
            </div>
            <div>
              <p className="text-3xl font-semibold text-risk-high">{flagged}</p>
              <p className="mt-1 text-xs text-mist-500">Items flagged</p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1">
                <TrendingDown className="h-5 w-5 text-savings-600" />
                <p className="text-3xl font-semibold text-savings-600">
                  ${savings}
                </p>
              </div>
              <p className="mt-1 text-xs text-mist-500">Potential savings</p>
            </div>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
