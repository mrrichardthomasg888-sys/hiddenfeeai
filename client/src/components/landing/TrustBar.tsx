import { Lock, Ban, Trash2 } from "lucide-react";

const items = [
  { icon: Lock, label: "Encrypted processing" },
  { icon: Ban, label: "Never used for AI training" },
  { icon: Trash2, label: "Automatically deleted after analysis" },
];

export function TrustBar() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 border-t border-white/10 py-5">
      {items.map(({ icon: Icon, label }) => (
        <div key={label} className="flex items-center gap-2 text-xs text-mist-400">
          <Icon className="h-3.5 w-3.5 text-savings-400" strokeWidth={2} />
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}
