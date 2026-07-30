import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { LockKeyhole, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/layout/Container";
import { BrandIdentity } from "@/components/brand/BrandIdentity";

const navigation = [
  ["How It Works", "how-it-works"],
  ["What We Find", "what-we-find"],
  ["Sample Report", "sample-report"],
  ["Privacy", "privacy"],
  ["Pricing", "pricing"],
  ["FAQ", "faq"],
] as const;

export function Nav() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const goTo = (id: string, openPicker = false) => {
    setOpen(false);
    const target = location.pathname === "/" ? document.getElementById(id) : null;
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    else window.location.href = `/#${id}`;
    if (openPicker) setTimeout(() => document.getElementById("file-upload-input")?.click(), 550);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.09] bg-[#050911]/90 shadow-[0_12px_40px_rgba(0,0,0,.24)] backdrop-blur-2xl">
      <div className="h-[2px] bg-gradient-to-r from-transparent via-[#4da3ff]/70 to-[#f4c542]/70" />
      <Container className="flex h-[70px] max-w-[1240px] items-center justify-between gap-4 lg:h-[78px]">
        <Link to="/" aria-label="HiddenFeeAI home" className="shrink-0">
          <BrandIdentity compact />
        </Link>

        <nav aria-label="Primary navigation" className="hidden items-center gap-1 xl:flex">
          {navigation.map(([label, id]) => (
            <button key={id} onClick={() => goTo(id)} className="whitespace-nowrap rounded-lg px-3 py-2.5 text-[15px] font-bold text-[#dce4ec] transition hover:bg-white/[0.055] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4da3ff]">
              {label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-xs font-bold text-[#dce4ec] xl:flex"><LockKeyhole className="h-3.5 w-3.5 text-[#65e8b5]" /> Private audit · $15</div>
          <Button variant="violet" size="sm" onClick={() => goTo("upload", true)} className="hidden sm:inline-flex sm:h-11 sm:px-5">
            Check My Document
          </Button>
          <button type="button" aria-label={open ? "Close navigation menu" : "Open navigation menu"} aria-expanded={open} onClick={() => setOpen((value) => !value)} className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.1] bg-[#101c2e] text-white transition hover:border-[#4da3ff]/40 xl:hidden">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </Container>

      {open && (
        <nav aria-label="Mobile navigation" className="border-t border-white/[0.08] bg-[#08111f] px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 xl:hidden">
          <div className="mx-auto grid max-w-6xl gap-1">
            {navigation.map(([label, id]) => (
              <button key={id} onClick={() => goTo(id)} className="min-h-12 rounded-xl px-4 text-left text-base font-bold text-[#dce4ec] hover:bg-white/[0.06]">
                {label}
              </button>
            ))}
            <Button variant="violet" size="lg" onClick={() => goTo("upload", true)} className="mt-2 w-full">Check My Document</Button>
          </div>
        </nav>
      )}
    </header>
  );
}
