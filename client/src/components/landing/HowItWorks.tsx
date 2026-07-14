import { motion } from "framer-motion";
import { UploadCloud, ScanSearch, FileCheck2 } from "lucide-react";
import { Container } from "@/components/layout/Container";

const steps = [
  {
    icon: UploadCloud,
    step: "01",
    title: "Upload",
    desc: "Drag in any invoice, bill, receipt, or contract — PDF, photo, or scan.",
  },
  {
    icon: ScanSearch,
    step: "02",
    title: "AI Audit",
    desc: "Our AI extracts every line and investigates it like a forensic auditor.",
  },
  {
    icon: FileCheck2,
    step: "03",
    title: "Receive Savings Report",
    desc: "Get a professional report with evidence, explanations, and next steps.",
  },
];

export function HowItWorks() {
  return (
    <section className="bg-mist-50 py-20">
      <Container>
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 text-center text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl"
        >
          How HiddenFeeAI works
        </motion.h2>
        <div className="grid gap-8 sm:grid-cols-3">
          {steps.map(({ icon: Icon, step, title, desc }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="rounded-2xl border border-mist-200 bg-white p-6 shadow-card"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-ink-900/5">
                <Icon className="h-5 w-5 text-ink-900" strokeWidth={1.75} />
              </div>
              <p className="mb-1 text-xs font-semibold tracking-wide text-savings-600">
                STEP {step}
              </p>
              <h3 className="mb-1.5 text-lg font-semibold text-ink-900">{title}</h3>
              <p className="text-sm text-mist-500">{desc}</p>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
}
