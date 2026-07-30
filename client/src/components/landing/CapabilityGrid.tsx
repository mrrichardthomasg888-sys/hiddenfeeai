import { BadgeDollarSign, Calculator, FileWarning, Percent, Scale, SearchCheck } from "lucide-react";
import { Container } from "@/components/layout/Container";

const reviewSignals = [
  { icon: BadgeDollarSign, title: "Hidden fees and markups", text: "Processing, service, dealer, facility, and other charges worth reviewing." },
  { icon: Calculator, title: "Duplicate charges and math errors", text: "Repeated services, totals, quantities, unit prices, taxes, credits, and balances." },
  { icon: Percent, title: "Missing discounts and credits", text: "Promised refunds, allowances, discounts, and credits that may be absent." },
];

const decisionSignals = [
  { icon: FileWarning, title: "Automatic renewals and costly clauses", text: "Price changes, cancellation deadlines, recurring charges, and terms that could cost you later." },
  { icon: Scale, title: "Charges you may be able to negotiate", text: "Specific questions, escalation steps, and ready-to-use language for asking for a better outcome." },
  { icon: SearchCheck, title: "Possible savings", text: "See which amounts appear in the document and which savings still need to be confirmed." },
];

export function CapabilityGrid() {
  return (
    <section id="what-we-find" className="relative scroll-mt-24 overflow-hidden bg-[#050911] py-24 sm:py-28">
      <div className="pointer-events-none absolute left-[-10%] top-[30%] h-[420px] w-[420px] rounded-full bg-[#4da3ff]/[0.055] blur-[130px]" />
      <Container className="relative max-w-[1240px]">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_.9fr] lg:items-end lg:gap-20">
          <div><p className="text-sm font-extrabold uppercase tracking-[.22em] text-[#f4c542]">What HiddenFeeAI looks for</p><h2 className="mt-5 max-w-3xl text-4xl font-black tracking-[-.05em] text-white sm:text-6xl">Hidden costs don't stay hidden.</h2></div>
          <p className="max-w-2xl text-lg font-medium leading-[1.72] text-[#dce4ec]">HiddenFeeAI compares charges, clauses, totals, credits, and dates to uncover costs that deserve a closer look.</p>
        </div>

        <div className="mt-14 overflow-hidden rounded-[34px] border border-white/[0.12] bg-[#0c1728] shadow-[0_36px_100px_rgba(0,0,0,.36)]">
          <div className="grid lg:grid-cols-[1.08fr_.92fr]">
            <div className="p-6 sm:p-9 lg:border-r lg:border-white/[0.09] lg:p-10">
              <div className="flex items-center justify-between border-b border-white/[0.09] pb-5"><div><p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#73b8ff]">Charges worth questioning</p><h3 className="mt-2 text-2xl font-black text-white">What may be costing you money</h3></div><span className="rounded-full border border-[#4da3ff]/20 bg-[#4da3ff]/10 px-3 py-1.5 text-xs font-bold text-[#82c7ff]">Backed by your document</span></div>
              <div className="divide-y divide-white/[0.08]">
                {reviewSignals.map(({ icon: Icon, title, text }, index) => (
                  <article key={title} className="grid grid-cols-[52px_1fr] gap-4 py-6 sm:grid-cols-[58px_1fr_auto] sm:items-start">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#4da3ff]/20 bg-[#4da3ff]/10"><Icon className="h-6 w-6 text-[#82c7ff]" /></span>
                    <div><h3 className="text-xl font-black text-white">{title}</h3><p className="mt-2 text-base font-medium leading-[1.7] text-[#dce4ec]">{text}</p></div>
                    <span className="hidden pt-1 text-xs font-black tracking-[.16em] text-[#c8d3df] sm:block">0{index + 1}</span>
                  </article>
                ))}
              </div>
            </div>

            <div className="border-t border-white/[0.09] bg-[#091321] p-6 sm:p-9 lg:border-t-0 lg:p-10">
              <div className="border-b border-white/[0.09] pb-5"><p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#f8d96e]">Costs hiding in the fine print</p><h3 className="mt-2 text-2xl font-black text-white">Know what could cost you later</h3></div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {decisionSignals.map(({ icon: Icon, title, text }) => (
                  <article key={title} className="rounded-[22px] border border-white/[0.1] bg-[#101d30] p-6 shadow-[inset_0_1px_rgba(255,255,255,.04)]">
                    <Icon className="h-7 w-7 text-[#f8d96e]" />
                    <h3 className="mt-5 text-xl font-black text-white">{title}</h3>
                    <p className="mt-3 text-base font-medium leading-[1.7] text-[#dce4ec]">{text}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
