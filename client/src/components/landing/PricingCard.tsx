import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/button";

const inclusions = [
  "Full document analysis",
  "Hidden fee detection",
  "Billing error review",
  "Savings recommendations",
  "Downloadable report",
];

export function PricingCard() {
  return (
    <section className="bg-ink-900 py-20">
      <Container className="flex justify-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="glass-panel w-full max-w-md rounded-3xl p-8 text-center shadow-glass"
        >
          <p className="text-sm font-medium uppercase tracking-wide text-mist-400">
            AI Financial Audit
          </p>
          <p className="mt-2 text-5xl font-semibold text-white">
            $15
            <span className="text-base font-normal text-mist-400"> one-time</span>
          </p>
          <ul className="mt-6 space-y-2.5 text-left">
            {inclusions.map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-mist-200">
                <Check className="h-4 w-4 shrink-0 text-savings-400" strokeWidth={2.5} />
                {item}
              </li>
            ))}
          </ul>
          <Button
            variant="savings"
            size="lg"
            className="mt-8 w-full"
            onClick={() => document.getElementById("upload")?.scrollIntoView({ behavior: "smooth" })}
          >
            Start AI Audit
          </Button>
        </motion.div>
      </Container>
    </section>
  );
}
