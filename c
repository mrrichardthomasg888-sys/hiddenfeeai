import { motion } from "framer-motion";
import { Clock, ArrowRight, CheckCircle2 } from "lucide-react";

interface ActionItem {
  step: string;
  detail: string;
  urgency: "immediate" | "soon" | "when_convenient";
}

interface ActionPlanData {
  beforeSigning: ActionItem[];
  negotiationSteps: ActionItem[];
  afterSigning: ActionItem[];
  ongoingMonitoring: ActionItem[];
  checklist: string[];
}

interface ActionPlanSectionProps {
  data: ActionPlanData;
}

function UrgencyBadge({ urgency }: { urgency: string }) {
  switch (urgency) {
    case "immediate":
      return <span className="rounded-full bg-risk-critical/10 border border-risk-critical/20 px-2 py-0.5 text-[10px] font-bold text-risk-critical">NOW</span>;
    case "soon":
      return <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400">SOON</span>;
    default:
      return <span className="rounded-full bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 text-[10px] font-bold text-violet-400">LATER</span>;
  }
}

export function ActionPlanSection({ data }: ActionPlanSectionProps) {
  const sections = [
    { title: "Before Signing", items: data.beforeSigning, icon: "📋" },
    { title: "During Negotiation", items: data.negotiationSteps, icon: "💬" },
    { title: "After Signing", items: data.afterSigning, icon: "📁" },
    { title: "Ongoing", items: data.ongoingMonitoring, icon: "🔄" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-violet-500/10 bg-midnight-900/80 p-5 sm:p-6 glow-purple"
    >
      <div className="flex items-center gap-2 mb-4">
        <Clock className="h-4 w-4 text-violet-400" />
        <h2 className="text-sm font-semibold text-violet-100">Action Plan</h2>
      </div>

      <div className="space-y-4">
        {sections.map((section) => (
          section.items.length > 0 && (
            <div key={section.title}>
              <p className="text-xs font-semibold text-violet-300/70 mb-2">
                {section.icon} {section.title}
              </p>
              <div className="space-y-2">
                {section.items.slice(0, 3).map((item, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 rounded-lg bg-violet-500/5 p-3"
                  >
                    <ArrowRight className="h-3.5 w-3.5 mt-0.5 shrink-0 text-violet-400" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-medium text-violet-200">{item.step}</p>
                        <UrgencyBadge urgency={item.urgency} />
                      </div>
                      <p className="mt-0.5 text-[11px] text-violet-400/60">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        ))}
      </div>

      {/* Checklist */}
      {data.checklist.length > 0 && (
        <div className="mt-5 border-t border-violet-500/10 pt-4">
          <p className="text-xs font-semibold text-violet-300/70 mb-2">Checklist</p>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {data.checklist.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-violet-500/30" />
                <span className="text-[11px] text-violet-400/60">{item}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}