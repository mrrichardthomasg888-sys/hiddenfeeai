import { motion } from "framer-motion";
import { TrendingDown, AlertTriangle, Gauge } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { Badge } from "@/components/ui/badge";

const sampleFindings = [
  {
    title: "Administrative Processing Fee",
    note: "Possible unnecessary charge",
    amount: "$125.00",
    severity: "high" as const,
  },
  {
    title: "Duplicate Line Item",
    note: "Same service billed twice on page 2",
    amount: "$89.00",
    severity: "critical" as const,
  },
];

export function ExampleReport() {
  return (
    <section id="example-report" className="bg-white py-20">
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-medium uppercase tracking-wide text-mist-500">
            See exactly what the AI finds
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl">
            A real audit, in seconds
          </h2>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mx-auto mt-10 max-w-2xl rounded-3xl border border-mist-200 bg-white p-6 shadow-card sm:p-8"
        >
          <div className="mb-6 grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-savings-500/10">
                <TrendingDown className="h-4 w-4 text-savings-600" />
              </div>
              <p className="text-2xl font-semibold text-savings-600">$347</p>
              <p className="text-xs text-mist-500">Potential Savings</p>
            </div>
            <div>
              <div className="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-risk-high/10">
                <Gauge className="h-4 w-4 text-risk-high" />
              </div>
              <p className="text-2xl font-semibold text-ink-900">87/100</p>
              <p className="text-xs text-mist-500">Risk Score</p>
            </div>
            <div>
              <div className="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-ink-900/5">
                <AlertTriangle className="h-4 w-4 text-ink-900" />
              </div>
              <p className="text-2xl font-semibold text-ink-900">6</p>
              <p className="text-xs text-mist-500">Issues Detected</p>
            </div>
          </div>

          <div className="space-y-3">
            {sampleFindings.map((f) => (
              <div
                key={f.title}
                className="flex items-center justify-between gap-4 rounded-xl border border-mist-200 p-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink-900">{f.title}</p>
                  <p className="text-xs text-mist-500">{f.note}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant={f.severity}>{f.severity}</Badge>
                  <span className="text-sm font-semibold text-ink-900">{f.amount}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-center text-xs text-mist-400">
            Sample data shown for illustration.
          </p>
        </motion.div>
      </Container>
    </section>
  );
}
