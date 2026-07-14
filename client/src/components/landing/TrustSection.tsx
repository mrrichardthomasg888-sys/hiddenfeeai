import { motion } from "framer-motion";
import { ShieldCheck, BrainCircuit, ListChecks } from "lucide-react";
import { Container } from "@/components/layout/Container";

const cards = [
  {
    icon: ShieldCheck,
    title: "Privacy First",
    desc: "Your documents are not stored.",
  },
  {
    icon: BrainCircuit,
    title: "AI Analysis",
    desc: "Advanced AI reviews every line item.",
  },
  {
    icon: ListChecks,
    title: "Actionable Results",
    desc: "Receive a detailed financial audit.",
  },
];

export function TrustSection() {
  return (
    <section className="bg-white py-20">
      <Container>
        <h2 className="mb-10 text-center text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl">
          Why people trust HiddenFeeAI
        </h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {cards.map(({ icon: Icon, title, desc }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="rounded-2xl border border-mist-200 p-6 text-center shadow-card"
            >
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-trust-500/10">
                <Icon className="h-6 w-6 text-trust-600" strokeWidth={1.75} />
              </div>
              <p className="text-lg font-semibold text-ink-900">{title}</p>
              <p className="mt-1 text-base text-mist-500">{desc}</p>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
}
