import { motion } from "framer-motion";
import { Gauge, TrendingDown, AlertTriangle } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { Badge } from "@/components/ui/badge";

export function ReportShowcase() {
  return (
    <section className="bg-midnight-900 py-16">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-violet-400/60">
            What you receive
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-violet-100 sm:text-3xl">
            A professional audit report — not just AI text
          </h2>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mx-auto mt-10 max-w-2xl rounded-3xl border border-violet-500/10 bg-midnight-800/80 p-6 glow-purple sm:p-8"
        >
          <div className="mb-6 grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-savings-500/15">
                <TrendingDown className="h-4 w-4 text-savings-400" />
              </div>
              <p className="text-2xl font-semibold text-savings-400">$347</p>
              <p className="text-xs text-violet-400/60">Potential Savings</p>
            </div>
            <div>
              <div className="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-risk-high/15">
                <Gauge className="h-4 w-4 text-risk-high" />
              </div>
              <p className="text-2xl font-semibold text-violet-100">87/100</p>
              <p className="text-xs text-violet-400/60">Risk Score</p>
            </div>
            <div>
              <div className="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-violet-500/15">
                <AlertTriangle className="h-4 w-4 text-violet-400" />
              </div>
              <p className="text-2xl font-semibold text-violet-100">6</p>
              <p className="text-xs text-violet-400/60">Issues Detected</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4 rounded-xl border border-violet-500/10 bg-midnight-900/60 p-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-violet-100">
                  Administrative Processing Fee
                </p>
                <p className="text-xs text-violet-400/60">
                  Evidence: line 14, page 2 · Confidence 96%
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant="high">high</Badge>
                <span className="text-sm font-semibold text-violet-100">$125.00</span>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-xl border border-violet-500/10 bg-midnight-900/60 p-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-violet-100">
                  Duplicate Line Item
                </p>
                <p className="text-xs text-violet-400/60">
                  Same service billed twice · Confidence 99%
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant="critical">critical</Badge>
                <span className="text-sm font-semibold text-violet-100">$89.00</span>
              </div>
            </div>
          </div>
          <p className="mt-4 text-center text-xs text-violet-400/40">
            Sample data shown for illustration.
          </p>
        </motion.div>
      </Container>
    </section>
  );
}