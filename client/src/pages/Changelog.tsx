import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/layout/Container";

const updates = [
  ["July 30, 2026", "Premium report system", "Expanded the downloadable report with a mobile-first executive cover, larger type, full-width action scripts, richer pagination, and complete decision-support sections."],
  ["July 29, 2026", "Private retention workflow", "Cleared extracted source data after review completion or failure and documented the temporary report-link retention window."],
  ["July 29, 2026", "Report reliability", "Improved report polling, payment-return handling, PDF downloads, sticky actions, and mobile save/share behavior."],
] as const;

export function Changelog() { return <div className="premium-page min-h-screen bg-[#050911]"><Nav /><main className="py-20 sm:py-24"><Container className="max-w-4xl"><header className="max-w-3xl"><p className="text-sm font-extrabold uppercase tracking-[.2em] text-[#f4c542]">Product updates</p><h1 className="mt-4 text-4xl font-black tracking-[-.04em] text-white sm:text-6xl">HiddenFeeAI changelog.</h1><p className="mt-6 text-lg font-medium leading-[1.75] text-[#dce4ec]">A concise record of product, reliability, privacy, and report improvements.</p></header><div className="mt-14 space-y-5">{updates.map(([date, title, text]) => <article key={title} className="rounded-[22px] border border-white/[0.11] bg-[#111d30] p-7 sm:p-9"><time className="text-sm font-extrabold uppercase tracking-[.18em] text-[#4da3ff]">{date}</time><h2 className="mt-3 text-2xl font-extrabold text-white">{title}</h2><p className="mt-4 text-base font-medium leading-[1.8] text-[#dce4ec]">{text}</p></article>)}</div></Container></main><Footer /></div>; }
