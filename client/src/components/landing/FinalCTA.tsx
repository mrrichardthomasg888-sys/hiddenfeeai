import { ShieldCheck } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/button";

export function FinalCTA() {
  const upload = () => {
    document.getElementById("upload")?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => document.getElementById("file-upload-input")?.click(), 550);
  };
  return (
    <section className="relative overflow-hidden py-20 sm:py-28">
      <Container>
        <div className="relative overflow-hidden rounded-[28px] border border-[#f4c542]/25 bg-[#101c2e] px-6 py-12 text-center shadow-[0_28px_80px_rgba(0,0,0,.3)] sm:px-12 sm:py-16">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(244,197,66,.1),transparent_42%)]" />
          <div className="relative mx-auto max-w-3xl">
            <p className="text-sm font-extrabold uppercase tracking-[.2em] text-[#f4c542]">One document. One clear report.</p>
            <h2 className="mt-4 text-4xl font-black tracking-[-.04em] text-white sm:text-5xl">Don&apos;t let the fine print cost you money.</h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg font-medium leading-[1.72] text-[#dce4ec]">See hidden fees, duplicate charges, billing mistakes, and costly clauses—along with the evidence and questions you can use.</p>
            <Button variant="violet" size="lg" onClick={upload} className="mt-8 h-14 w-full text-base sm:w-auto">Check My Document — $15</Button>
            <p className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm font-bold text-[#dce4ec]"><ShieldCheck className="h-4 w-4 text-[#42d392]" /> One-time $15 audit <span>·</span> No subscription <span>·</span> No account required</p>
          </div>
        </div>
      </Container>
    </section>
  );
}
