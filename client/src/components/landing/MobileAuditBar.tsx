import { ShieldCheck } from "lucide-react";

export function MobileAuditBar() {
  const startAudit = () => {
    document.getElementById("upload")?.scrollIntoView({ behavior: "smooth" });
    window.setTimeout(() => document.getElementById("file-upload-input")?.click(), 600);
  };

  return (
    <div className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-50 flex items-center gap-3 rounded-2xl border border-white/[0.12] bg-[#0e1625]/95 p-3 shadow-[0_18px_55px_rgba(0,0,0,.42)] backdrop-blur-xl sm:hidden">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-extrabold text-white">Find hidden fees · $15</p>
        <p className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-[#dce4ec]">
          <ShieldCheck className="h-3 w-3 text-[#36d399]" aria-hidden="true" />
          Private · No subscription
        </p>
      </div>
      <button
        type="button"
        onClick={startAudit}
        aria-label="Upload a document to start your audit"
        className="h-12 min-w-24 rounded-xl bg-[#f4c542] px-5 text-sm font-black text-[#111827] shadow-[0_8px_24px_rgba(244,197,66,.2)] transition hover:bg-[#ffe076] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#78bbff]"
      >
        Upload
      </button>
    </div>
  );
}
