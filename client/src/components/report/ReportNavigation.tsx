import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { LayoutDashboard, Search, FileText, MessageSquare, Shield, CircleDollarSign } from "lucide-react";

const sections = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "discoveries", label: "Decision", icon: Search },
  { id: "playbook", label: "Playbook", icon: MessageSquare },
  { id: "financial-impact", label: "Financial Impact", icon: CircleDollarSign },
  { id: "prioritized-findings", label: "Findings", icon: FileText },
  { id: "methodology", label: "Evidence", icon: Shield },
];

export function ReportNavigation() {
  const [active, setActive] = useState("overview");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(entry.target.id);
          }
        }
      },
      { rootMargin: "-10% 0px -80% 0px", threshold: 0 }
    );

    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      {/* Desktop sidebar nav */}
      <nav className="hidden lg:block fixed left-8 top-1/2 -translate-y-1/2 z-20 print:hidden">
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-1 rounded-2xl border border-white/[0.09] bg-[#0e1625]/90 p-2 shadow-[0_18px_45px_rgba(0,0,0,.28)] backdrop-blur-xl"
        >
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => scrollTo(s.id)}
              className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium transition-all w-full text-left ${
                active === s.id
                  ? "border border-[#f4c542]/20 bg-[#f4c542]/[0.08] text-white"
                  : "border border-transparent text-[#c8d3df] hover:bg-white/[0.05] hover:text-white"
              }`}
            >
              <s.icon className={`h-3.5 w-3.5 ${active === s.id ? "text-[#f4c542]" : ""}`} />
              <span>{s.label}</span>
              {active === s.id && (
                <motion.span layoutId="nav-dot" className="ml-auto h-1.5 w-1.5 rounded-full bg-[#f4c542] shadow-[0_0_10px_rgba(244,197,66,.7)]" />
              )}
            </button>
          ))}
        </motion.div>
      </nav>

      {/* Mobile bottom nav */}
      <nav className="hidden print:hidden">
        <div className="flex items-center justify-around px-2 py-2">
          {sections.slice(0, 5).map((s) => (
            <button
              key={s.id}
              onClick={() => scrollTo(s.id)}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors min-w-0 ${
                active === s.id ? "bg-[#f4c542]/10 text-[#f4c542]" : "text-[#c8d3df]"
              }`}
            >
              <s.icon className="h-4 w-4" />
              <span className="text-[9px] font-medium truncate max-w-[60px]">{s.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}
