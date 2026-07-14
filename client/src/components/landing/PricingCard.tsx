import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/button";

const inclusions = [
  "Complete document review",
  "AI fee detection",
  "Billing error analysis",
  "Contract review",
  "Savings recommendations",
  "Downloadable PDF report",
];

export function PricingCard() {
  return (
    <section className="bg-midnight-800 py-20">
      <Container className="flex flex-col items-center">
        <p className="mb-2 text-center text-sm font-semibold uppercase tracking-wide text-savings-400">
          One document. One complete AI audit.
        </p>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="glass-panel mt-6 w-full max-w-md rounded-3xl border border-violet-500/10 bg-midnight-900/80 p-8 text-center glow-purple"
        >
          <p className="text-sm font-medium uppercase tracking-wide text-violet-400/60">
            HiddenFeeAI Audit
          </p>
          <p className="mt-2 text-5xl font-semibold text-violet-100">
            $15
            <span className="text-base font-normal text-violet-400/60"> one-time payment</span>
          </p>
          <ul className="mt-6 space-y-2.5 text-left">
            {inclusions.map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-violet-300">
                <Check className="h-4 w-4 shrink-0 text-savings-400" strokeWidth={2.5} />
                {item}
              </li>
            ))}
          </ul>
          <Button
            type="button"
            variant="violet"
            size="lg"
            className="mt-8 w-full"
            onClick={() => {
              document.getElementById("upload")?.scrollIntoView({ behavior: "smooth" });
              setTimeout(() => document.getElementById("file-upload-input")?.click(), 600);
            }}
          >
            Start AI Audit
          </Button>
          <p className="mt-4 text-xs text-violet-400/40">
            No subscription. No account required.
          </p>
        </motion.div>
      </Container>
    </section>
  );
}