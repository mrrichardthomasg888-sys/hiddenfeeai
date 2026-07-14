import { motion } from "framer-motion";
import { Container } from "@/components/layout/Container";
import { UploadCard } from "@/components/landing/UploadCard";
import { ScanDemo } from "@/components/landing/ScanDemo";
import { TrustBar } from "@/components/landing/TrustBar";
import { Button } from "@/components/ui/button";

export function Hero() {
  const scrollToExample = () => {
    document.getElementById("example-report")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative overflow-hidden bg-ink-900 pb-6 pt-16 sm:pt-24">
      {/* subtle depth glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.15),transparent_60%)]" />

      <Container className="relative">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-balance text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
              Find Hidden Fees Before They Cost You Money.
            </h1>
            <p className="mt-5 max-w-lg text-lg text-mist-400">
              Upload any invoice, bill, receipt, or contract. HiddenFeeAI
              analyzes every charge to uncover hidden fees, billing errors,
              and opportunities to save.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button
                variant="savings"
                size="lg"
                onClick={() => document.getElementById("upload")?.scrollIntoView({ behavior: "smooth" })}
              >
                Start AI Audit
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="border-white/15 bg-transparent text-white hover:bg-white/5"
                onClick={scrollToExample}
              >
                View Sample Report
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="flex flex-col items-center gap-6 lg:items-end"
          >
            <UploadCard />
            <ScanDemo />
          </motion.div>
        </div>
      </Container>

      <Container className="mt-12">
        <TrustBar />
      </Container>
    </section>
  );
}
