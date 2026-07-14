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
    <section className="relative overflow-hidden bg-ink-900 py-24 sm:py-32">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-indigo-500/20 blur-[120px]" />

      <Container className="relative flex flex-col items-center text-center">
        <div className="mx-auto max-w-3xl">
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-balance bg-gradient-to-b from-white to-slate-400 bg-clip-text text-5xl font-bold leading-[1.05] tracking-tighter text-transparent sm:text-6xl"
          >
            Find Hidden Fees Before They Cost You Money.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-6 text-lg font-light leading-relaxed text-slate-200 sm:text-xl"
          >
            Upload any invoice, bill, or contract. Our AI finds the hidden
            fees, billing errors, and savings you're missing.
          </motion.p>
        </div>


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
