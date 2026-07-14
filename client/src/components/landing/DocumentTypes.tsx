import { motion } from "framer-motion";
import { Container } from "@/components/layout/Container";

const docs = [
  "Medical Bills",
  "Invoices",
  "Contracts",
  "Auto Agreements",
  "Subscriptions",
  "Receipts",
];

export function DocumentTypes() {
  return (
    <section className="border-t border-mist-200 bg-mist-50 py-16">
      <Container>
        <p className="mb-6 text-center text-sm font-semibold uppercase tracking-wide text-mist-500">
          Analyze documents like:
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
              className="rounded-full border border-mist-200 bg-white px-5 py-2.5 text-sm font-medium text-ink-900 shadow-sm"
            >
              {doc}
            </div>
          ))}
        </motion.div>
      </Container>
    </section>
  );
}
