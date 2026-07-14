import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { UploadCard } from "@/components/landing/UploadCard";

const trustPoints = [
  "No account required",
  "Private analysis",
  "Automatically deleted after processing",
  "Results in minutes",
];

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-ink-900 pb-16 pt-20 sm:pt-28">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.14),transparent_60%)]" />

      <Container className="relative flex flex-col items-center text-center">
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl text-balance text-5xl font-semibold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl"
        >
          Find Hidden Fees Before They Cost You Money.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-200 sm:text-xl"
        >
          Upload any invoice, receipt, contract, or bill. HiddenFeeAI uses
          advanced AI analysis to uncover hidden fees, billing mistakes,
          duplicate charges, and opportunities to save money.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-10 flex w-full justify-center"
        >
          <UploadCard />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-8 flex max-w-2xl flex-wrap items-center justify-center gap-x-6 gap-y-3"
        >
          {trustPoints.map((point) => (
            <div key={point} className="flex items-center gap-2 text-sm text-slate-300">
              <Check className="h-4 w-4 shrink-0 text-savings-400" strokeWidth={2.5} />
              {point}
            </div>
          ))}
        </motion.div>
      </Container>
    </section>
  );
}
