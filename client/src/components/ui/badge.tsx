import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-ink-900 text-white",
        savings: "border-transparent bg-savings-50 text-savings-600 bg-savings-500/10",
        low: "border-transparent bg-risk-low/10 text-risk-low",
        medium: "border-transparent bg-risk-medium/10 text-risk-medium",
        high: "border-transparent bg-risk-high/10 text-risk-high",
        critical: "border-transparent bg-risk-critical/10 text-risk-critical",
        outline: "border-mist-200 text-ink-900",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge };
