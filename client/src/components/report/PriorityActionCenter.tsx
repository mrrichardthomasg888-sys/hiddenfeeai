import { useState } from "react";
import { motion } from "framer-motion";
import { Zap, ArrowRight, AlertTriangle, Clock, Shield, Eye, Gavel } from "lucide-react";
import type { Finding } from "@/types/audit";

interface PriorityActionCenterProps {
  findings: Finding[];
  onViewDetails?: (finding: Finding) => void;
}

const severityConfig = {
  Critical: { color: "text-red-400", bg: "bg-red-500/8", border: "border-red-500/20", dot: "bg-red-400", glow: "shadow-glow-critical", icon: AlertTriangle },
  High: { color: "text-amber-400", bg: "bg-amber-500/8", border: "border-amber-500/20", dot: "bg-amber-400", glow: "shadow-glow-amber", icon: Clock },
  Medium: { color: "text-yellow-400", bg: "bg-yellow-500/8", border: "border-yellow-500/20", dot: "bg-yellow-400", glow: "", icon: Eye },
  Low: { color: "text-blue-400", bg: "bg-blue-500/8", border: "border-blue-500/20", dot: "bg-blue-400", glow: "", icon: Shield },
};

const cardVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: 0.15 + i * 0.08,
      duration: 0.5,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  }),
};

export function PriorityActionCenter({ findings, onViewDetails }: PriorityActionCenterProps) {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const critical = findings.filter(f => f.severity === "Critical");
  const high = findings.filter(f => f.severity === "High");
  const medium = findings.filter(f => f.severity === "Medium");
  const low = findings.filter(f => f.severity === "Low");

  const timelineItems = [
    {
      label: "Immediate Attention",
      description: "Critical issues requiring urgent action",
      count: critical.length,
      severity: "Critical" as const,
    },
    {
      label: "Negotiation Opportunities",
      description: "High severity items to address with provider",
      count: high.length,
      severity: "High" as const,
    },
    {
      label: "Review Carefully",
      description: "Medium priority items needing evaluation",
      count: medium.length,
      severity: "Medium" as const,
    },
    {
      label: "Minor Items",
      description: "Low priority — information only",
      count: low.length,
      severity: "Low" as const,
    },
  ].filter(t => t.count > 0);

  const getIcon = (label: string) => {
    if (label === "Immediate Attention") return AlertTriangle;
    if (label === "Negotiation Opportunities") return Gavel;
    if (label === "Review Carefully") return Eye;
    return Shield;
  };

  if (timelineItems.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-[2rem] border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent"
    >
      {/* Mesh background */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_80%_0%,rgba(122,92,245,0.05),transparent)]" />

      <div className="relative p-8 sm:p-12">
        {/* Header */}
        <div className="flex items-center gap-4 mb-2">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center border border-amber-400/10">
            <Zap className="h-7 w-7 text-amber-400" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-premium-primary tracking-[-0.02em]">Your Risk Map</h2>
            <p className="text-base text-premium-tertiary mt-0.5">Visual overview of what needs your attention</p>
          </div>
        </div>

        {/* Risk Grid */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {timelineItems.map((item, i) => {
            const cfg = severityConfig[item.severity];
            const Icon = getIcon(item.label);
            const isHovered = hoveredItem === item.label;

            return (
              <motion.div
                key={item.label}
                custom={i}
                initial="hidden"
                animate="visible"
                variants={cardVariants}
                onMouseEnter={() => setHoveredItem(item.label)}
                onMouseLeave={() => setHoveredItem(null)}
                className={`group relative overflow-hidden rounded-2xl border ${cfg.border} ${cfg.bg} p-6 transition-all duration-500 ${cfg.glow}`}
                style={{
                  transform: isHovered ? "translateY(-2px)" : "translateY(0)",
                }}
              >
                {/* Hover accent */}
                <div className={`pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r ${item.severity === "Critical" ? "from-red-500/5" : item.severity === "High" ? "from-amber-500/5" : item.severity === "Medium" ? "from-yellow-500/4" : "from-blue-500/4"} to-transparent`} />

                <div className="relative">
                  {/* Top row: icon + count */}
                  <div className="flex items-center justify-between mb-4">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.06]`}>
                      <Icon className={`h-6 w-6 ${cfg.color}`} />
                    </div>
                    <span className={`text-4xl sm:text-5xl font-black tabular-nums tracking-[-0.03em] ${cfg.color} number-premium`}>
                      {item.count}
                    </span>
                  </div>

                  {/* Label and description */}
                  <div>
                    <p className="text-lg font-bold text-premium-primary">{item.label}</p>
                    <p className="mt-1 text-sm text-premium-tertiary leading-relaxed">{item.description}</p>
                  </div>

                  {/* Action button */}
                  <button
                    onClick={() => {
                      const first = findings.find(f => f.severity === item.severity);
                      if (first) onViewDetails?.(first);
                    }}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/[0.04] border border-white/[0.06] px-4 py-2.5 text-[12px] font-semibold text-premium-tertiary hover:text-premium-primary hover:bg-white/[0.08] transition-all"
                  >
                    View Items <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Total summary */}
        <div className="mt-8 flex items-center justify-center gap-6 p-4 rounded-xl bg-white/[0.015] border border-white/[0.04]">
          <span className="text-sm text-premium-tertiary">
            <span className="font-bold text-premium-primary">{findings.length}</span> total findings
          </span>
          <span className="h-4 w-px bg-white/[0.06]" />
          <span className="text-sm text-premium-tertiary">
            <span className="font-bold text-risk-critical">{critical.length}</span> critical
          </span>
          <span className="h-4 w-px bg-white/[0.06]" />
          <span className="text-sm text-premium-tertiary">
            <span className="font-bold text-amber-400">{high.length}</span> high
          </span>
          <span className="h-4 w-px bg-white/[0.06]" />
          <span className="text-sm text-premium-tertiary">
            <span className="font-bold text-yellow-400">{medium.length}</span> medium
          </span>
        </div>
      </div>
    </motion.div>
  );
}