import { motion } from "framer-motion";
import { Download, FileSearch, ListChecks, MessageSquareText, Quote, Sparkles } from "lucide-react";

interface AuditDeliverablesProps {
  evidenceCount: number;
  actionCount: number;
  scriptCount: number;
  pagesReviewed: number;
}

export function AuditDeliverables({ evidenceCount, actionCount, scriptCount, pagesReviewed }: AuditDeliverablesProps) {
  const items = [
    { icon: FileSearch, value: `${pagesReviewed || 1}`, label: "Pages checked", detail: "Reviewed for fees, clauses, and calculation problems" },
    { icon: Quote, value: `${evidenceCount}`, label: "Exact locations", detail: "Page or line references you can point to" },
    { icon: ListChecks, value: `${actionCount}`, label: "Next steps", detail: "What to question first and how to follow up" },
    { icon: MessageSquareText, value: `${scriptCount}`, label: "Questions and scripts", detail: "Ready-to-use language for calls and emails" },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-[2rem] border border-amber-300/15 bg-gradient-to-br from-amber-300/[0.08] via-white/[0.035] to-violet-500/[0.08] p-6 sm:p-9 shadow-[0_30px_100px_-55px_rgba(251,191,36,0.65)]"
    >
      <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-amber-300/10 blur-3xl" />
      <div className="relative">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-amber-200">
              <Sparkles className="h-3.5 w-3.5" /> Your Professional Audit Report
            </div>
            <h2 className="mt-4 text-2xl font-black tracking-[-0.02em] text-white sm:text-3xl">Everything you need to take action</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/50">
              See exactly where a concern appears, why it matters, and the questions you can ask before paying, signing, or calling the provider.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 text-xs font-bold text-amber-100/70">
            <Download className="h-4 w-4" /> Included in your downloadable PDF
          </div>
        </div>

        <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {items.map(({ icon: Icon, value, label, detail }) => (
            <div key={label} className="rounded-2xl border border-white/[0.07] bg-midnight-950/55 p-5 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <Icon className="h-5 w-5 text-amber-300" />
                <span className="text-3xl font-black tabular-nums text-white">{value}</span>
              </div>
              <p className="mt-5 text-sm font-bold text-white">{label}</p>
              <p className="mt-1 text-xs leading-relaxed text-white/35">{detail}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
