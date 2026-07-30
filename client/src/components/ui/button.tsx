import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-bold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4da3ff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#050911]",
  {
    variants: {
      variant: {
        primary:
          "border border-white/[0.14] bg-[#101c2e] text-white shadow-sm hover:border-[#4da3ff]/40 hover:bg-[#132238] active:scale-[0.98]",
        savings:
          "bg-savings-500 text-white shadow-sm hover:bg-savings-600 active:scale-[0.98]",
        violet:
          "border border-[#f4c542]/70 bg-[#f4c542] text-[#111827] font-extrabold shadow-[0_8px_28px_rgba(244,197,66,.18)] hover:bg-[#ffda60] hover:shadow-[0_10px_34px_rgba(244,197,66,.28)] active:scale-[0.98]",
        luxury:
          "border border-champagne-400/55 bg-gradient-to-b from-champagne-300 to-champagne-500 text-[#12100b] font-bold shadow-[0_8px_30px_rgba(201,163,93,0.16)] hover:from-[#fff0bd] hover:to-champagne-400 hover:shadow-[0_10px_36px_rgba(201,163,93,0.28)] active:scale-[0.98]",
        outline:
          "border border-white/[0.14] bg-[#101c2e] text-white hover:border-[#4da3ff]/40 hover:bg-[#132238] active:scale-[0.98]",
        ghost: "text-[#d6dfea] hover:bg-white/[0.06] hover:text-white active:scale-[0.98]",
        link: "text-[#7cc4ff] underline underline-offset-4 hover:text-white",
      },
      size: {
        default: "h-11 px-5 py-2.5",
        sm: "h-11 px-4 text-sm",
        lg: "h-14 px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
