import { motion } from "framer-motion";
import { Container } from "@/components/layout/Container";

const docs = [
  "Medical Bills", "Invoices", "Contracts",
  "Auto Agreements", "Subscriptions", "Receipts",
];

export function DocumentTypes() {
  return (
    <section className="border-t border-violet-500/5 bg-midnight-900 py-14">
      <Container>
        <p className="mb-6 text-center text-sm font-semibold uppercase tracking-wide text-violet-400/60">
          Check documents like:
        </p>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex flex-wrap justify-center gap-3"
        >
          {docs.map((doc) => (
            <div
              key={doc}
              className="rounded-full border border-violet-500/10 bg-midnight-800 px-5 py-2.5 text-sm font-medium text-violet-300"
            >
              {doc}
            </div>
          ))}
        </motion.div>
      </Container>
    </section>
  );
}
