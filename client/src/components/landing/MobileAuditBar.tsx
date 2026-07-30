import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";

export function MobileAuditBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [uploadVisible, setUploadVisible] = useState(false);
  const [workflowActive, setWorkflowActive] = useState(false);

  useEffect(() => {
    const upload = document.getElementById("upload");
    if (!upload) { setUploadVisible(false); return; }
    const observer = new IntersectionObserver(([entry]) => setUploadVisible(entry.isIntersecting), { threshold: 0.15 });
    observer.observe(upload);
    return () => observer.disconnect();
  }, [location.pathname]);

  useEffect(() => {
    const onState = (event: Event) => setWorkflowActive((event as CustomEvent<{ active: boolean }>).detail.active);
    window.addEventListener("hiddenfee:workflow", onState);
    return () => window.removeEventListener("hiddenfee:workflow", onState);
  }, []);

  const startAudit = () => {
    const upload = document.getElementById("upload");
    if (!upload) { navigate("/#upload"); return; }
    upload.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => document.getElementById("file-upload-input")?.click(), 600);
  };

  if (location.pathname.startsWith("/report/") || uploadVisible || workflowActive) return null;

  return (
    <div data-testid="sticky-audit-cta" className="fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom))] left-1/2 z-50 flex w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 items-center gap-3 rounded-2xl border border-white/[0.12] bg-[#0e1625]/95 p-3 shadow-[0_18px_55px_rgba(0,0,0,.42)] backdrop-blur-xl sm:hidden">
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
