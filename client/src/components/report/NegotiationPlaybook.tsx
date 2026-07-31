import { useState } from "react";
import { Check, Copy, Mail, Phone, Scale, Shield, Target } from "lucide-react";
import type { PremiumReport, PremiumReportSection } from "@/types/audit";

interface NegotiationPlaybookProps {
  report: PremiumReport;
  section: PremiumReportSection;
}

function ListCard({ title, items, tone = "blue" }: { title: string; items: string[]; tone?: "blue" | "gold" | "green" }) {
  const toneClass = tone === "gold" ? "border-[#f4c542]/20 bg-[#f4c542]/[0.05]" : tone === "green" ? "border-[#36d399]/20 bg-[#36d399]/[0.05]" : "border-[#4da3ff]/20 bg-[#4da3ff]/[0.05]";
  return (
    <div className={`rounded-2xl border p-5 sm:p-6 ${toneClass}`}>
      <h3 className="text-sm font-black uppercase tracking-[.14em] text-white">{title}</h3>
      <ul className="mt-4 space-y-3">
        {items.map((item, index) => <li key={`${title}-${index}`} className="flex gap-3 text-[15px] leading-7 text-[#dce4ec]"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#f4c542]" />{item}</li>)}
      </ul>
    </div>
  );
}

function ScriptCard({ id, title, icon, text, onCopy, copied }: { id: string; title: string; icon: "phone" | "mail"; text: string; onCopy: (text: string, id: string) => void; copied: string | null }) {
  return (
    <article className="break-inside-avoid rounded-2xl border border-white/[0.08] bg-[#0b1525] p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#4da3ff]/20 bg-[#4da3ff]/10">{icon === "phone" ? <Phone className="h-5 w-5 text-[#73b8ff]" /> : <Mail className="h-5 w-5 text-[#f8d96e]" />}</span>
          <h3 className="text-lg font-black text-white">{title}</h3>
        </div>
        <button type="button" onClick={() => onCopy(text, id)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 px-4 text-sm font-extrabold text-white hover:bg-white/[0.06]">
          {copied === id ? <Check className="h-4 w-4 text-[#36d399]" /> : <Copy className="h-4 w-4" />}{copied === id ? "Copied" : "Copy"}
        </button>
      </div>
      <div className="mt-5 whitespace-pre-wrap text-[15px] leading-7 text-[#dce4ec]">{text}</div>
    </article>
  );
}

export function NegotiationPlaybook({ report, section }: NegotiationPlaybookProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const playbook = report.negotiationPlaybook;
  const copy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    window.setTimeout(() => setCopied(null), 2200);
  };

  return (
    <section id={section.key} aria-labelledby={`${section.key}-title`} className="report-section relative scroll-mt-28 overflow-hidden rounded-[2rem] border border-[#f4c542]/20 bg-[linear-gradient(145deg,rgba(244,197,66,.07),rgba(77,163,255,.04)_42%,rgba(255,255,255,.02))] p-6 shadow-[0_28px_90px_rgba(0,0,0,.18)] sm:p-10">
      <div className="pointer-events-none absolute right-[-10%] top-[-35%] h-72 w-72 rounded-full bg-[#4da3ff]/10 blur-[90px]" />
      <div className="relative">
        <div className="flex items-start gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#f4c542]/25 bg-[#f4c542]/10"><Scale className="h-7 w-7 text-[#f4c542]" /></span>
          <div>
            <p className="text-xs font-black uppercase tracking-[.18em] text-[#f8d96e]">{section.eyebrow}</p>
            <h2 id={`${section.key}-title`} className="mt-1 text-3xl font-black tracking-[-.035em] text-white sm:text-4xl lg:text-[2.75rem]">{section.title}</h2>
            <p className="mt-3 max-w-3xl text-base leading-7 text-[#dce4ec]">{section.description}</p>
          </div>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/[0.08] bg-black/15 p-5 sm:p-6"><p className="text-xs font-black uppercase tracking-[.14em] text-[#73b8ff]">Negotiation objective</p><p className="mt-3 text-lg font-bold leading-8 text-white">{playbook.objective}</p></div>
          <div className="rounded-2xl border border-[#36d399]/20 bg-[#36d399]/[0.05] p-5 sm:p-6"><p className="text-xs font-black uppercase tracking-[.14em] text-[#79e6bd]">Estimated achievable savings</p><p className="mt-3 text-lg font-bold leading-8 text-white">{playbook.estimatedSavingsRange}</p></div>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2"><ListCard title="Customer leverage" items={playbook.leveragePoints} tone="green" /><ListCard title="Priority items to challenge" items={playbook.priorityItems} tone="gold" /></div>

        <div className="mt-6 rounded-2xl border border-[#4da3ff]/20 bg-[#4da3ff]/[0.05] p-5 sm:p-7">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.14em] text-[#73b8ff]"><Target className="h-4 w-4" />What to say first</div>
          <p className="mt-4 text-lg font-bold italic leading-8 text-white">&ldquo;{playbook.openingStatement}&rdquo;</p>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {playbook.likelyObjections.map((item, index) => <div key={index} className="rounded-2xl border border-white/[0.08] bg-black/15 p-5"><p className="text-xs font-black uppercase tracking-[.12em] text-[#f8a1a1]">Likely objection</p><p className="mt-2 font-bold text-white">{item.objection}</p><p className="mt-4 text-xs font-black uppercase tracking-[.12em] text-[#79e6bd]">Suggested response</p><p className="mt-2 leading-7 text-[#dce4ec]">{item.response}</p></div>)}
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2"><ListCard title="Concessions you can offer" items={playbook.concessions} /><ListCard title="Terms you should not accept" items={playbook.unacceptableTerms} tone="gold" /></div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2"><ListCard title="Escalation path" items={playbook.escalationPath} /><ListCard title="Follow-up schedule" items={playbook.followUpSchedule} tone="green" /></div>
        <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-400/[0.04] p-5 sm:p-6"><div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.14em] text-red-300"><Shield className="h-4 w-4" />Walk-away threshold</div><p className="mt-3 leading-7 text-[#dce4ec]">{playbook.walkAwayThreshold}</p></div>

      </div>
    </section>
  );
}

export function PhoneScripts({ report, section }: NegotiationPlaybookProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const playbook = report.negotiationPlaybook;
  const copy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    window.setTimeout(() => setCopied(null), 2200);
  };
  return (
    <section id={section.key} aria-labelledby={`${section.key}-title`} className="report-section scroll-mt-28 rounded-[2rem] border border-white/[0.08] bg-[linear-gradient(145deg,rgba(255,255,255,.035),rgba(255,255,255,.015))] p-6 shadow-[0_28px_90px_rgba(0,0,0,.18)] sm:p-10">
      <p className="text-xs font-black uppercase tracking-[.18em] text-[#73b8ff]">{section.eyebrow}</p>
      <h2 id={`${section.key}-title`} className="mt-2 max-w-4xl text-3xl font-black tracking-[-.04em] text-white sm:text-4xl lg:text-[2.75rem]">{section.title}</h2>
      <p className="mt-3 max-w-4xl text-base leading-7 text-[#c8d3df]">{section.description}</p>
      <div className="mt-8 space-y-4">
        <ScriptCard id="phone" title="Personalized phone script" icon="phone" text={playbook.phoneScript} onCopy={copy} copied={copied} />
        <div className="grid gap-4 lg:grid-cols-2"><ScriptCard id="short-email" title="Short executive email" icon="mail" text={playbook.shortEmail} onCopy={copy} copied={copied} /><ScriptCard id="detailed-email" title="Detailed negotiation email" icon="mail" text={playbook.detailedEmail} onCopy={copy} copied={copied} /></div>
        {(playbook.renewalScript || playbook.cancellationScript) && <div className="grid gap-4 lg:grid-cols-2">{playbook.renewalScript && <ScriptCard id="renewal" title="Renewal negotiation script" icon="phone" text={playbook.renewalScript} onCopy={copy} copied={copied} />}{playbook.cancellationScript && <ScriptCard id="cancel" title="Cancellation / opt-out script" icon="phone" text={playbook.cancellationScript} onCopy={copy} copied={copied} />}</div>}
      </div>
    </section>
  );
}
