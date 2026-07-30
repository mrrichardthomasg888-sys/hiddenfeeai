import { useId } from "react";
import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  const gradientId = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 48 48" role="img" aria-label="HiddenFeeAI mark" className={cn("h-10 w-10", className)}>
      <defs><linearGradient id={gradientId} x1="8" y1="6" x2="40" y2="42" gradientUnits="userSpaceOnUse"><stop stopColor="#FFF7B0"/><stop offset=".48" stopColor="#FFD447"/><stop offset="1" stopColor="#FF9F1C"/></linearGradient><radialGradient id={`${gradientId}Lens`}><stop stopColor="#FFFDE7"/><stop offset="1" stopColor="#FFD447"/></radialGradient></defs>
      <g stroke="#F7B928" strokeWidth="2.4" strokeLinecap="round"><path d="M24 2v5"/><path d="M24 41v5"/><path d="M2 24h5"/><path d="M41 24h5"/><path d="m8.4 8.4 3.5 3.5"/><path d="m36.1 36.1 3.5 3.5"/><path d="m39.6 8.4-3.5 3.5"/><path d="m11.9 36.1-3.5 3.5"/></g>
      <circle cx="24" cy="24" r="14.5" fill={`url(#${gradientId}Lens)`} stroke={`url(#${gradientId})`} strokeWidth="2"/>
      <path d="M17 19h14M17 24h10M17 29h14" stroke="#12345B" strokeWidth="2.2" strokeLinecap="round"/>
      <path d="M17 29h14" stroke="#0EA5E9" strokeWidth="3" strokeLinecap="round"/>
      <path d="m31.5 14 .9 2.2 2.2.9-2.2.9-.9 2.2-.9-2.2-2.2-.9 2.2-.9.9-2.2Z" fill="#FFFFFF"/>
    </svg>
  );
}

export function BrandIdentity({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <div className={cn("inline-flex items-center gap-3", className)}>
      <BrandMark className={compact ? "h-11 w-11" : "h-12 w-12"}/>
      <div className="leading-none">
        <div className={cn("brand-wordmark", compact ? "text-[20px]" : "text-2xl")}>
          <span className="text-white">HIDDEN</span><span className="text-[#f4c542]">FEE</span><span className="ml-1.5 rounded border border-[#f4c542]/30 bg-[#f4c542]/10 px-1.5 py-0.5 text-[0.55em] font-bold tracking-[0.16em] text-[#f8d96e]">AI</span>
        </div>
        {!compact && <p className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.25em] text-[#c8d3df]">Hidden Cost Review</p>}
      </div>
    </div>
  );
}
