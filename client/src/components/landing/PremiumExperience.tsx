import { motion } from "framer-motion";
import { ArrowRight, FileSearch, MessageSquareQuote, ShieldCheck, Sparkles, TrendingDown } from "lucide-react";
import { Container } from "@/components/layout/Container";

const outcomes = [
  { icon: FileSearch, label: "Where it appears", value: "Every finding is cited", detail: "See the exact page, line item, clause, or calculation behind each concern." },
  { icon: TrendingDown, label: "What it could cost", value: "Questionable costs made clear", detail: "Separate charges shown in the document from possible savings that still need confirmation." },
  { icon: MessageSquareQuote, label: "What to say", value: "Ask with confidence", detail: "Use tailored questions, likely pushback, and evidence-backed responses." },
];

export function PremiumExperience() {
  return (
    <section className="relative overflow-hidden bg-[#07091a] py-20 sm:py-28">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_35%,rgba(124,58,237,.16),transparent_34%),radial-gradient(circle_at_10%_75%,rgba(76,201,255,.07),transparent_28%)]" />
      <Container className="relative">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-violet-300">What your $15 audit gives you</p>
          <h2 className="mt-4 text-4xl font-extrabold tracking-[-0.04em] text-white sm:text-5xl">Turn confusing paperwork into clear answers.</h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg font-medium leading-[1.72] text-[#dce4ec]">See what looks wrong, where it appears, why it matters, and what you can say before you pay or sign.</p>
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-[1.08fr_.92fr]">
          <motion.div initial={{ y: 14 }} whileInView={{ y: 0 }} viewport={{ once: true }} className="glass-command relative min-h-[430px] overflow-hidden rounded-[32px] p-7 sm:p-10">
            <div className="relative z-10 flex items-center justify-between">
              <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-300">Example finding</p><h3 className="mt-2 text-2xl font-bold text-white">Charge worth questioning</h3></div>
              <div className="rounded-full border border-violet-300/25 bg-violet-500/10 p-3"><Sparkles className="h-5 w-5 text-cyan-300" /></div>
            </div>
            <div className="relative z-10 mt-9 rounded-2xl border border-white/[0.12] bg-[#0b1423]/95 p-5 shadow-[0_20px_50px_rgba(0,0,0,.22)] sm:p-7">
              <div className="mb-5 flex items-center justify-between text-sm font-semibold text-[#c8d3df]"><span>Auto Purchase Agreement</span><span>Page 2 of 7</span></div>
              <div className="space-y-4 text-sm sm:text-base">
                <div className="flex justify-between border-b border-white/[0.09] pb-3 text-[#c8d3df]"><span>Vehicle price</span><span>$28,400.00</span></div>
                <div className="fee-reveal-row relative flex justify-between overflow-hidden rounded-xl border border-violet-300/25 bg-violet-500/[0.07] px-4 py-4 text-white">
                  <span className="font-bold">Administrative processing fee</span><span className="font-extrabold text-cyan-200">$795.00</span>
                  <span className="shooting-scan" aria-hidden="true" />
                </div>
                <div className="flex justify-between border-b border-white/[0.09] pb-3 text-[#c8d3df]"><span>Registration</span><span>$212.00</span></div>
              </div>
              <div className="mt-6 flex items-start gap-3 rounded-xl border border-cyan-300/20 bg-cyan-300/[0.06] p-4">
                <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300" />
                <p className="text-sm font-medium leading-[1.7] text-[#dce4ec]"><strong className="text-white">Why it matters:</strong> This fee is separate from government registration and may be negotiable. Your report includes the cited evidence and a ready-to-send challenge script.</p>
              </div>
            </div>
          </motion.div>

          <div className="grid gap-5">
            {outcomes.map(({ icon: Icon, label, value, detail }, index) => (
              <motion.article key={label} initial={{ x: 8 }} whileInView={{ x: 0 }} viewport={{ once: true }} transition={{ delay: index * .04 }} className="glass-command group rounded-3xl p-7 transition-transform duration-300 hover:-translate-y-0.5">
                <div className="flex gap-5"><div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-violet-300/25 bg-violet-500/10"><Icon className="h-7 w-7 text-violet-200" /></div><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-violet-300">{label}</p><h3 className="mt-1.5 text-[21px] font-extrabold text-white">{value}</h3><p className="mt-3 text-base font-medium leading-[1.7] text-[#dce4ec]">{detail}</p></div></div>
              </motion.article>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-2xl border border-violet-300/15 bg-violet-500/[0.045] px-6 py-5 sm:flex-row">
          <div className="flex items-center gap-3 text-base font-semibold text-white"><ShieldCheck className="h-5 w-5 text-savings-400" /> Private processing · Stripe-hosted checkout · Automatic file deletion</div>
          <button onClick={() => document.getElementById("upload")?.scrollIntoView({ behavior: "smooth" })} className="inline-flex items-center gap-2 font-bold text-violet-200 hover:text-white">Start your audit for $15 <ArrowRight className="h-4 w-4" /></button>
        </div>
      </Container>
    </section>
  );
}
