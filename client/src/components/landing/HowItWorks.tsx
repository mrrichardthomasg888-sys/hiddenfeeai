import { motion } from "framer-motion";
import { UploadCloud, ScanSearch, FileCheck2 } from "lucide-react";
import { Container } from "@/components/layout/Container";

const steps = [
  { icon: UploadCloud, step: "01", title: "Upload", desc: "Drag in any invoice, bill, receipt, or contract — PDF, photo, or scan." },
  { icon: ScanSearch, step: "02", title: "AI Audit", desc: "Our AI extracts every line and investigates it like a forensic auditor." },
  { icon: FileCheck2, step: "03", title: "Receive Savings Report", desc: "Get a professional report with evidence, explanations, and next steps." },
];

export function HowItWorks() {
  return (
    <section className="bg-midnight-800 py-16">
      <Container>
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 text-center text-2xl font-semibold tracking-tight text-violet-100 sm:text-3xl"
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
              className="rounded-2xl border border-violet-500/10 bg-midnight-900/80 p-6 glow-purple"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/15">
                <Icon className="h-5 w-5 text-violet-400" strokeWidth={1.75} />
              </div>
              <p className="mb-1 text-xs font-semibold tracking-wide text-savings-400">
                STEP {step}
              </p>
              <h3 className="mb-1.5 text-lg font-semibold text-violet-100">{title}</h3>
              <p className="text-sm text-violet-300/60">{desc}</p>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
}