import type { LucideIcon } from "lucide-react";
import { ArrowRight, CheckCircle2, HelpCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { BrandMark } from "@/components/brand/BrandIdentity";
import { Container } from "@/components/layout/Container";
import { Footer } from "@/components/layout/Footer";
import { Nav } from "@/components/layout/Nav";
import { Button } from "@/components/ui/button";

interface GuideSection {
  title: string;
  introduction: string;
  items: Array<{ title: string; text: string }>;
}

interface GuidePageProps {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  sections: GuideSection[];
  checklist: string[];
  faqs: Array<{ question: string; answer: string }>;
  cta: string;
}

export function GuidePage({ eyebrow, title, description, icon: Icon, sections, checklist, faqs, cta }: GuidePageProps) {
  return (
    <div className="premium-page min-h-screen bg-[#050911] text-white">
      <Nav />
      <main>
        <section className="relative overflow-hidden border-b border-white/[0.07] py-16 sm:py-24">
          <div className="pointer-events-none absolute left-1/2 top-[-260px] h-[620px] w-[820px] -translate-x-1/2 rounded-full bg-[#4da3ff]/[0.08] blur-[130px]" />
          <Container className="relative max-w-5xl text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[#f4c542]/25 bg-[#f4c542]/10 shadow-[0_0_34px_rgba(244,197,66,.12)]">
              <Icon className="h-8 w-8 text-[#f4c542]" aria-hidden="true" />
            </div>
            <p className="mt-7 text-xs font-extrabold uppercase tracking-[.2em] text-[#78bbff]">{eyebrow}</p>
            <h1 className="mx-auto mt-4 max-w-4xl text-4xl font-black tracking-[-.04em] text-white sm:text-6xl">{title}</h1>
            <p className="mx-auto mt-7 max-w-3xl text-lg font-medium leading-[1.72] text-[#dce4ec] sm:text-xl">{description}</p>
            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <Link to="/#upload"><Button variant="violet" size="lg">Check My Document <ArrowRight className="h-4 w-4" /></Button></Link>
              <Link to="/faq"><Button variant="outline" size="lg">Read the FAQ</Button></Link>
            </div>
          </Container>
        </section>

        <Container className="max-w-5xl py-16 sm:py-24">
          <div className="space-y-20 sm:space-y-24">
            {sections.map((section, sectionIndex) => (
              <section key={section.title} className="grid gap-7 lg:grid-cols-[.45fr_1fr] lg:gap-12">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#f4c542]">Guide {String(sectionIndex + 1).padStart(2, "0")}</p>
                  <h2 className="mt-3 text-3xl font-black tracking-[-.03em] text-white">{section.title}</h2>
                  <p className="mt-5 font-medium leading-[1.7] text-[#dce4ec]">{section.introduction}</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {section.items.map((item) => (
                    <article key={item.title} className="rounded-2xl border border-white/[0.11] bg-[#111d30] p-7 shadow-[0_18px_48px_rgba(0,0,0,.2)]">
                      <h3 className="text-xl font-extrabold text-white">{item.title}</h3>
                      <p className="mt-3 text-base font-medium leading-[1.7] text-[#dce4ec]">{item.text}</p>
                    </article>
                  ))}
                </div>
              </section>
            ))}

            <section className="rounded-[28px] border border-[#4da3ff]/20 bg-[#0e1625] p-7 sm:p-10">
              <div className="flex items-center gap-4">
                <BrandMark className="h-12 w-12" />
                <div><p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#78bbff]">Before you act</p><h2 className="mt-1 text-2xl font-black text-white">Document review checklist</h2></div>
              </div>
              <div className="mt-7 grid gap-4 sm:grid-cols-2">
                {checklist.map((item) => <div key={item} className="flex gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-4 text-sm font-semibold leading-6 text-[#dce4ee]"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#36d399]" aria-hidden="true" />{item}</div>)}
              </div>
            </section>

            <section aria-labelledby="guide-faq-heading">
              <div className="flex items-center gap-3"><HelpCircle className="h-6 w-6 text-[#f4c542]" aria-hidden="true" /><h2 id="guide-faq-heading" className="text-3xl font-black text-white">Common questions</h2></div>
              <div className="mt-7 grid gap-4">
                {faqs.map((faq) => <article key={faq.question} className="rounded-2xl border border-white/[0.11] bg-[#111d30] p-7 shadow-[0_16px_42px_rgba(0,0,0,.18)]"><h3 className="text-xl font-extrabold text-white">{faq.question}</h3><p className="mt-3 font-medium leading-[1.7] text-[#dce4ec]">{faq.answer}</p></article>)}
              </div>
            </section>

            <section className="rounded-[30px] border border-[#f4c542]/25 bg-[linear-gradient(135deg,rgba(244,197,66,.12),rgba(77,163,255,.07))] p-8 text-center sm:p-12">
              <p className="text-xs font-extrabold uppercase tracking-[.2em] text-[#f4c542]">Private document audit</p>
              <h2 className="mx-auto mt-4 max-w-3xl text-3xl font-black text-white sm:text-4xl">{cta}</h2>
              <p className="mx-auto mt-5 max-w-2xl font-medium leading-[1.7] text-[#dce4ec]">One document, one $15 audit, no subscription. Findings depend on the evidence available in your file and do not guarantee savings or a particular outcome.</p>
              <Link to="/#upload" className="mt-7 inline-flex"><Button variant="violet" size="lg">Check My Document — $15 <ArrowRight className="h-4 w-4" /></Button></Link>
            </section>
          </div>
        </Container>
      </main>
      <Footer />
    </div>
  );
}
