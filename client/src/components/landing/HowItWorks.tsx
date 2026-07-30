import { FileDown, FileSearch, ScanSearch, UploadCloud } from "lucide-react";
import { Container } from "@/components/layout/Container";

const steps = [
  [UploadCloud, "Upload your document", "Choose a bill, contract, statement, receipt, spreadsheet, scan, or phone photo."],
  [ScanSearch, "Every page gets checked", "HiddenFeeAI reviews line items, prices, totals, clauses, credits, dates, and disclosures."],
  [FileSearch, "See what deserves attention", "Possible hidden fees, duplicate charges, mistakes, and costly terms are ranked by urgency."],
  [FileDown, "Know what to do next", "Your report shows where each issue appears, why it matters, and what you can ask."],
] as const;

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative scroll-mt-24 overflow-hidden bg-[#08111f] py-24 sm:py-28">
      <Container className="max-w-[1240px]">
        <div className="grid gap-8 lg:grid-cols-[.85fr_1.15fr] lg:items-end lg:gap-20">
          <div><p className="text-sm font-extrabold uppercase tracking-[.22em] text-[#73b8ff]">How it works</p><h2 className="mt-5 text-4xl font-black tracking-[-.05em] text-white sm:text-6xl">Upload once. Know what deserves a second look.</h2></div>
          <p className="max-w-2xl text-lg font-medium leading-[1.72] text-[#dce4ec]">Move from confusing paperwork to clear, evidence-backed questions you can use before you pay, sign, or negotiate.</p>
        </div>

        <div className="mt-14 overflow-hidden rounded-[34px] border border-white/[0.12] bg-[#0c1728] shadow-[0_34px_90px_rgba(0,0,0,.34)]">
          <div className="grid lg:grid-cols-4">
            {steps.map(([Icon, title, text], index) => (
              <article key={title} className="relative border-b border-white/[0.09] p-7 last:border-b-0 sm:p-8 lg:border-b-0 lg:border-r lg:last:border-r-0">
                <div className="flex items-center justify-between"><span className="text-xs font-black uppercase tracking-[.2em] text-[#f8d96e]">Stage 0{index + 1}</span><Icon className="h-7 w-7 text-[#82c7ff]" /></div>
                <h3 className="mt-12 text-2xl font-black text-white">{title}</h3>
                <p className="mt-4 text-base font-medium leading-[1.72] text-[#dce4ec]">{text}</p>
                <span className="absolute bottom-0 left-0 hidden h-[3px] bg-gradient-to-r from-[#4da3ff] to-[#f4c542] lg:block" style={{ width: `${(index + 1) * 25}%` }} />
              </article>
            ))}
          </div>
          <div className="flex flex-col gap-5 border-t border-white/[0.09] bg-[#091321] px-7 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <div><p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#73b8ff]">What you get</p><p className="mt-1 text-base font-bold text-white">Clear findings, useful questions, and a downloadable report</p></div>
            <div className="flex flex-wrap gap-2 text-xs font-bold text-[#dce4ec]">{['Evidence', 'Why it matters', 'Questions', 'Next steps'].map((item) => <span key={item} className="rounded-full border border-white/[0.1] bg-white/[0.04] px-3 py-2">{item}</span>)}</div>
          </div>
        </div>
      </Container>
    </section>
  );
}
