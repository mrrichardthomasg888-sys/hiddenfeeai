import { Building2, Car, FileText, HardHat, HeartPulse, Home, Landmark, Receipt, Shield, Smartphone } from "lucide-react";
import { Container } from "@/components/layout/Container";

const types = [
  [FileText, "Contracts"], [Receipt, "Invoices and receipts"], [HeartPulse, "Medical bills"], [Shield, "Insurance documents"],
  [HardHat, "Construction estimates"], [Home, "Rental leases"], [Car, "Vehicle financing"], [Landmark, "Bank statements"],
  [Smartphone, "Phone and utility bills"], [Building2, "Business agreements"],
] as const;

export function DocumentCoverage() {
  return (
    <section id="documents" className="relative scroll-mt-24 overflow-hidden bg-[#0c1626] py-24 sm:py-28">
      <div className="pointer-events-none absolute bottom-[-180px] left-1/2 h-[380px] w-[760px] -translate-x-1/2 rounded-full bg-[#f4c542]/[0.045] blur-[120px]" />
      <Container className="relative max-w-[1240px]">
        <div className="grid gap-10 lg:grid-cols-[.72fr_1.28fr] lg:items-start lg:gap-20">
          <div className="lg:sticky lg:top-28">
            <p className="text-sm font-extrabold uppercase tracking-[.22em] text-[#f8d96e]">Documents we review</p>
            <h2 className="mt-5 text-4xl font-black tracking-[-.05em] text-white sm:text-5xl">Review the paperwork behind expensive decisions.</h2>
            <p className="mt-6 text-lg font-medium leading-[1.72] text-[#dce4ec]">Upload a PDF, phone photo, scan, Word file, spreadsheet, CSV, or text document. HiddenFeeAI checks the charges, totals, and terms it can read.</p>
            <div className="mt-8 flex flex-wrap gap-2 text-xs font-bold text-[#c8d3df]"><span className="rounded-full border border-white/[0.1] px-3 py-2">Digital documents</span><span className="rounded-full border border-white/[0.1] px-3 py-2">Clear scans</span><span className="rounded-full border border-white/[0.1] px-3 py-2">Phone photos</span></div>
          </div>

          <div className="overflow-hidden rounded-[30px] border border-white/[0.12] bg-[#0a1423] shadow-[0_30px_80px_rgba(0,0,0,.28)]">
            <div className="flex items-center justify-between border-b border-white/[0.09] px-6 py-5 sm:px-8"><p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#73b8ff]">Common documents</p><span className="text-xs font-bold text-[#c8d3df]">10 types we can review</span></div>
            <div className="grid sm:grid-cols-2">
              {types.map(([Icon, label], index) => (
                <div key={label} className={`flex items-center gap-4 border-b border-white/[0.08] px-6 py-5 sm:px-8 ${index % 2 === 0 ? 'sm:border-r' : ''}`}>
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#4da3ff]/10"><Icon className="h-5 w-5 text-[#82c7ff]" /></span>
                  <div><p className="text-base font-black text-white">{label}</p><p className="mt-1 text-xs font-semibold text-[#c8d3df]">Checked for hidden costs</p></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
