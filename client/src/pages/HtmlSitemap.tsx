import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/layout/Container";

const pages = [
  ["HiddenFeeAI AI document audit software", "/"], ["FAQ", "/faq"], ["About HiddenFeeAI", "/about"], ["Security", "/security"], ["Audit methodology", "/methodology"], ["Accuracy and limitations", "/accuracy"], ["Product changelog", "/changelog"], ["Contact support", "/contact"], ["Privacy policy", "/privacy"], ["Terms of service", "/terms"], ["Refund policy", "/refund"],
] as const;

export function HtmlSitemap() { return <div className="premium-page min-h-screen bg-[#050911]"><Nav /><main className="py-20 sm:py-24"><Container className="max-w-4xl"><header><p className="text-sm font-extrabold uppercase tracking-[.2em] text-[#f4c542]">Site navigation</p><h1 className="mt-4 text-4xl font-black text-white sm:text-6xl">HiddenFeeAI site map.</h1><p className="mt-6 text-lg leading-[1.75] text-[#dce4ec]">Canonical product, trust, support, and policy pages.</p></header><nav aria-label="HTML sitemap" className="mt-12 grid gap-3 sm:grid-cols-2">{pages.map(([label, href]) => <a key={href} href={href} className="rounded-2xl border border-white/[0.12] bg-[#111d30] px-5 py-4 text-base font-bold text-white transition hover:border-[#4da3ff]/60 hover:bg-[#172846]">{label}</a>)}</nav></Container></main><Footer /></div>; }
