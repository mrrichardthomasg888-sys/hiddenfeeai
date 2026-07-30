import { motion } from "framer-motion";
import { BadgeDollarSign, FileSearch, MessageSquareQuote, ShieldCheck } from "lucide-react";
import { Container } from "@/components/layout/Container";

const outcomes = [
  { icon: FileSearch, title: "Find the exact issue", text: "Every finding points back to evidence in your document." },
  { icon: BadgeDollarSign, title: "See what it may cost", text: "Separate documented charges from questionable costs and possible savings." },
  { icon: MessageSquareQuote, title: "Know what to say", text: "Use ready-to-send questions, likely pushback, and a clear response." },
  { icon: ShieldCheck, title: "Know what to do first", text: "Leave with your next steps ranked by urgency and possible cost." },
];

export function ConversionValueStrip() {
  return (
    <section className="relative border-y border-violet-500/10 bg-midnight-900/75 py-8">
      <Container>
        <div className="mb-5 flex flex-col items-center justify-between gap-2 text-center sm:flex-row sm:text-left">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-violet-300">What your $15 audit delivers</p>
          <p className="text-xs text-violet-300/45">One payment · Full report · Downloadable PDF · No subscription</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {outcomes.map(({ icon: Icon, title, text }, index) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: index * 0.06 }}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-5"
            >
              <Icon className="h-5 w-5 text-violet-400" />
              <h3 className="mt-4 text-sm font-bold text-white">{title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-violet-300/50">{text}</p>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
}
