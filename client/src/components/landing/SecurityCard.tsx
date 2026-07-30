import { ExternalLink, FileClock, Lock, ShieldCheck, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Container } from "@/components/layout/Container";

const protections = [
  { icon: Lock, title: "Protected in transit", desc: "Uploads and reports move through HTTPS-protected connections." },
  { icon: ExternalLink, title: "Know who handles your file", desc: "Google Gemini reads the document for your audit. Stripe hosts checkout." },
  { icon: Trash2, title: "Original file deleted", desc: "The uploaded file is removed when the review completes or fails." },
  { icon: FileClock, title: "Temporary report access", desc: "Your private report link remains available only for a limited session." },
];

export function SecurityCard() {
  return (
    <section id="privacy" className="relative scroll-mt-24 overflow-hidden bg-[#edf3f8] py-24 sm:py-28">
      <div className="pointer-events-none absolute right-[-8%] top-[-20%] h-[460px] w-[460px] rounded-full bg-[#4da3ff]/10 blur-[120px]" />
      <Container className="relative max-w-[1240px]">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_.95fr] lg:items-end lg:gap-20">
          <div><p className="text-sm font-extrabold uppercase tracking-[.22em] text-[#1769aa]">How your file is handled</p><h2 className="mt-5 max-w-3xl text-4xl font-black tracking-[-.05em] text-[#07111f] sm:text-6xl">Your document stays private.</h2></div>
          <p className="max-w-2xl text-lg font-semibold leading-[1.72] text-[#334155]">Your file is used to create your audit, sent through a protected connection, and deleted after the review finishes or fails.</p>
        </div>

        <div className="mt-14 grid gap-5 lg:grid-cols-[.74fr_1.26fr]">
          <div className="relative overflow-hidden rounded-[30px] bg-[#081321] p-8 text-white shadow-[0_30px_80px_rgba(15,23,42,.22)] sm:p-10">
            <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#36d399]/10 blur-[70px]" />
            <span className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-[#36d399]/25 bg-[#36d399]/10"><ShieldCheck className="h-8 w-8 text-[#65e8b5]" /></span>
            <p className="relative mt-8 text-xs font-extrabold uppercase tracking-[.2em] text-[#65e8b5]">Private by design</p>
            <h3 className="relative mt-3 text-3xl font-black tracking-[-.035em] text-white">No account required.</h3>
            <p className="relative mt-5 text-base font-medium leading-[1.72] text-[#dce4ec]">Your document is used only to create your report. Avoid uploading passwords, full payment-card numbers, or information unrelated to the review.</p>
            <div className="relative mt-8 grid grid-cols-2 gap-3 border-t border-white/[0.1] pt-7">
              <div><p className="text-2xl font-black text-white">0</p><p className="mt-1 text-xs font-bold uppercase tracking-[.12em] text-[#c8d3df]">Accounts required</p></div>
              <div><p className="text-2xl font-black text-white">1</p><p className="mt-1 text-xs font-bold uppercase tracking-[.12em] text-[#c8d3df]">Private report link</p></div>
            </div>
            <Link to="/privacy" className="relative mt-8 inline-flex min-h-12 items-center rounded-xl border border-white/[0.13] bg-white/[0.06] px-5 text-sm font-extrabold text-white transition hover:bg-white/[0.1]">Read the full privacy policy</Link>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {protections.map(({ icon: Icon, title, desc }, index) => (
              <article key={title} className="rounded-[26px] border border-[#cbd7e2] bg-white p-7 shadow-[0_20px_55px_rgba(15,23,42,.09)] sm:p-8">
                <div className="flex items-center justify-between"><span className="flex h-13 w-13 items-center justify-center rounded-2xl bg-[#eaf4ff]"><Icon className="h-6 w-6 text-[#1769aa]" /></span><span className="text-xs font-black tracking-[.15em] text-[#7b8da1]">0{index + 1}</span></div>
                <h3 className="mt-7 text-xl font-black text-[#07111f]">{title}</h3>
                <p className="mt-3 text-base font-semibold leading-[1.7] text-[#425466]">{desc}</p>
              </article>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
