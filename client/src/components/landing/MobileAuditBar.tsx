import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Camera, UploadCloud } from "lucide-react";

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

  const startScan = () => {
    const upload = document.getElementById("upload");
    if (!upload) {
      navigate("/#upload");
      window.setTimeout(() => window.dispatchEvent(new Event("hiddenfee:open-scanner")), 600);
      return;
    }
    upload.scrollIntoView({ behavior: "smooth", block: "center" });
    window.dispatchEvent(new Event("hiddenfee:open-scanner"));
  };

  if (location.pathname.startsWith("/report/") || uploadVisible || workflowActive) return null;

  return (
    <div data-testid="sticky-audit-cta" className="fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom))] left-1/2 z-50 flex w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 items-center gap-2 rounded-2xl border border-white/[0.12] bg-[#0e1625]/95 p-3 shadow-[0_18px_55px_rgba(0,0,0,.42)] backdrop-blur-xl lg:hidden">
      <button
        type="button"
        onClick={startAudit}
        aria-label="Upload a document to start your audit"
        className="inline-flex h-12 min-w-0 flex-[1.15] items-center justify-center gap-2 rounded-xl bg-[#f4c542] px-3 text-sm font-black text-[#111827] shadow-[0_8px_24px_rgba(244,197,66,.2)] transition hover:bg-[#ffe076] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#78bbff]"
      >
        <UploadCloud className="h-4 w-4 shrink-0" aria-hidden="true" />
        Upload
      </button>
      <button
        type="button"
        onClick={startScan}
        className="inline-flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl border border-[#f4c542]/45 bg-[#f4c542]/[0.08] px-3 text-sm font-black text-[#f8d96e] transition hover:bg-[#f4c542]/[0.14] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#78bbff]"
      >
        <Camera className="h-4 w-4 shrink-0" aria-hidden="true" />
        Scan <span className="text-[9px] uppercase tracking-wider">Beta</span>
      </button>
    </div>
  );
}
