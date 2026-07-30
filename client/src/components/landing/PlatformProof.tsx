import { Clock3, FileCheck2, FileLock2, GraduationCap, ShieldCheck, Trash2 } from "lucide-react";
import { Container } from "@/components/layout/Container";

const trust = [
  { icon: FileLock2, title: "Private review", text: "Your document is processed only to create your report." },
  { icon: ShieldCheck, title: "Protected uploads", text: "Files move through HTTPS-protected connections." },
  { icon: Trash2, title: "Automatic deletion", text: "Uploaded documents are deleted after processing." },
  { icon: GraduationCap, title: "Used only for your report", text: "Your file is processed to create the requested audit. The Privacy Policy names the providers involved." },
  { icon: FileCheck2, title: "A report you can use", text: "Evidence, priorities, questions, scripts, and a downloadable PDF." },
  { icon: Clock3, title: "Clear answers in minutes", text: "Move from upload to charges and clauses worth reviewing." },
];

const proof = [
  { value: "20+", label: "supported file formats" },
  { value: "Every", label: "page reviewed for evidence" },
  { value: "$15", label: "one complete audit" },
  { value: "0", label: "subscriptions required" },
];

export function PlatformProof() {
  return (
    <section className="py-24">
      <Container>
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-extrabold uppercase tracking-[.2em] text-[#f4c542]">How your document is protected</p>
          <h2 className="mt-4 text-4xl font-black tracking-[-.04em] sm:text-5xl">Private from upload to report.</h2>
          <p className="mt-6 text-lg font-medium leading-[1.72] text-[#dce4ec]">Protected uploads, temporary file handling, and no account required.</p>
        </div>
        <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {trust.map(({ icon: Icon, title, text }) => (
            <article key={title} className="group rounded-2xl bg-[#131c2f] p-6 shadow-[0_18px_50px_rgba(0,0,0,.16)] ring-1 ring-white/[0.08] transition hover:-translate-y-1 hover:ring-[#4da3ff]/30">
              <Icon className="h-6 w-6 text-[#4da3ff] transition group-hover:drop-shadow-[0_0_10px_rgba(77,163,255,.55)]" />
              <h3 className="mt-5 text-xl font-extrabold text-white">{title}</h3>
              <p className="mt-3 text-base font-medium leading-[1.7] text-[#dce4ec]">{text}</p>
            </article>
          ))}
        </div>
        <div className="mt-8 grid overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0e1625] sm:grid-cols-4">
          {proof.map(({ value, label }) => (
            <div key={label} className="border-b border-white/[0.08] p-6 text-center last:border-0 sm:border-b-0 sm:border-r">
              <p className="text-3xl font-black text-white">{value}</p>
              <p className="mt-2 text-sm font-bold text-[#c8d3df]">{label}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
