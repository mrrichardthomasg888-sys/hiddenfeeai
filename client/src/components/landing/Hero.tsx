import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { UploadCard } from "@/components/landing/UploadCard";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-midnight-950 py-10 sm:py-14">
      {/* Purple gradient glow — smaller and tighter */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-br from-violet-600/25 via-purple-500/10 to-transparent blur-[140px]" />

      <Container className="relative flex flex-col items-center text-center">
        <div className="mx-auto max-w-3xl">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-balance bg-gradient-to-b from-violet-100 via-white to-violet-300 bg-clip-text text-4xl font-bold leading-[1.05] tracking-tighter text-transparent sm:text-5xl lg:text-6xl text-glow"
          >
            Find Hidden Fees Before They Cost You Money.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="mx-auto mt-3 max-w-xl text-base font-semibold leading-snug text-violet-200/90 sm:text-lg"
          >
            Upload any invoice, receipt, bill, or contract. HiddenFeeAI uses advanced AI analysis to uncover hidden fees, billing errors, duplicate charges, and gives you negotiation leverage to challenge questionable charges with confidence.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mt-6 flex w-full justify-center"
        >
          <UploadCard />
        </motion.div>

        {/* Trust bar */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-violet-500/10 pt-4"
        >
          {[
            { icon: ShieldCheck, text: "Your documents are private" },
            { icon: ShieldCheck, text: "Automatically deleted after analysis" },
            { icon: ShieldCheck, text: "No account required" },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-1.5 text-xs text-violet-300/60">
              <Icon className="h-3.5 w-3.5 shrink-0 text-violet-400" strokeWidth={2.5} />
              {text}
            </div>
          ))}
        </motion.div>
      </Container>
    </section>
  );
}