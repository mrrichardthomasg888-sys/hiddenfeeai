import { motion } from "framer-motion";
import { ShieldCheck, BrainCircuit, ListChecks, CreditCard } from "lucide-react";
import { Container } from "@/components/layout/Container";

const cards = [
  { icon: ShieldCheck, title: "Privacy First", desc: "Your documents are automatically deleted after processing." },
  { icon: BrainCircuit, title: "Every Page Checked", desc: "HiddenFeeAI reviews charges, totals, tables, and clauses for possible problems." },
  { icon: ListChecks, title: "Clear Next Steps", desc: "See the evidence, questions, and scripts you can use to challenge a charge with confidence." },
  { icon: CreditCard, title: "Secure Checkout", desc: "Payment is completed on Stripe's hosted checkout. HiddenFeeAI does not receive or store your card details." },
];

export function TrustSection() {
  return (
    <section className="bg-midnight-900 py-16">
      <Container>
        <h2 className="mb-10 text-center text-2xl font-semibold tracking-tight text-violet-100 sm:text-3xl">
          Built for private, confident action
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map(({ icon: Icon, title, desc }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="rounded-2xl border border-violet-500/10 bg-midnight-800/80 p-6 text-center glow-purple"
            >
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/15">
                <Icon className="h-6 w-6 text-violet-400" strokeWidth={1.75} />
              </div>
              <p className="text-lg font-semibold text-violet-100">{title}</p>
              <p className="mt-1 text-base text-violet-300/60">{desc}</p>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
}
