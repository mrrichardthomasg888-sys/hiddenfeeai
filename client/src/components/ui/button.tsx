import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-violet-500",
  {
    variants: {
      variant: {
        primary:
          "bg-midnight-800 text-violet-100 border border-violet-500/20 shadow-sm hover:bg-midnight-700 active:scale-[0.98]",
        savings:
          "bg-savings-500 text-white shadow-sm hover:bg-savings-600 active:scale-[0.98]",
        violet:
          "bg-violet-600 text-white shadow-sm shadow-violet-500/25 hover:bg-violet-700 active:scale-[0.98] btn-glow",
        outline:
          "border border-violet-500/20 bg-midnight-800 text-violet-300 hover:bg-midnight-700 active:scale-[0.98]",
        ghost: "text-violet-300 hover:bg-violet-500/10 active:scale-[0.98]",
        link: "text-violet-400 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5 py-2.5",
        sm: "h-9 px-4 text-sm",
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

export { Button, buttonVariants };