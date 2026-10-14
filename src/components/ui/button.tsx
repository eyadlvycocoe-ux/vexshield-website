import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F1017] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-[#2563eb] text-white hover:bg-[#1d4ed8] shadow-[0_2px_14px_rgba(37,99,235,0.35)] hover:shadow-[0_4px_20px_rgba(37,99,235,0.5)] border border-blue-400/20 active:scale-[0.98]",
        blue:
          "bg-[#2563eb] text-white hover:bg-[#1d4ed8] shadow-[0_2px_14px_rgba(37,99,235,0.35)] hover:shadow-[0_4px_20px_rgba(37,99,235,0.5)] border border-blue-400/20 active:scale-[0.98]",
        purple:
          "bg-[#2563eb] text-white hover:bg-[#1d4ed8] shadow-[0_2px_14px_rgba(37,99,235,0.35)] hover:shadow-[0_4px_20px_rgba(37,99,235,0.5)] border border-blue-400/20 active:scale-[0.98]",
        outline:
          "border border-white/10 bg-[#141522]/90 hover:bg-white/[0.08] hover:border-white/20 text-zinc-200 active:scale-[0.98]",
        darkPill:
          "border border-white/10 bg-[#161724]/90 hover:bg-white/[0.08] hover:border-white/20 text-zinc-200 rounded-full px-3.5 py-1.5 text-xs font-medium active:scale-[0.98]",
        secondary:
          "border border-white/[0.08] bg-white/[0.05] hover:bg-white/[0.09] text-zinc-200 active:scale-[0.98]",
        ghost:
          "hover:bg-white/[0.06] hover:text-white text-zinc-400 active:scale-[0.98]",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-md hover:shadow-lg hover:shadow-destructive/20 active:scale-[0.98]",
        link: "text-blue-400 underline-offset-4 hover:underline",
        aircore: "rounded-lg bg-[#2563eb] text-white shadow-none hover:bg-[#1d4ed8] active:scale-[0.98]",
        aircoreSecondary: "rounded-lg border border-white/[0.12] bg-white/[0.04] text-slate-100 shadow-none hover:bg-white/[0.08] active:scale-[0.98]",
        neon: "bg-gradient-to-r from-[#2563eb] to-[#38bdf8] text-white font-semibold shadow-lg hover:shadow-xl hover:shadow-blue-500/30 hover:scale-[1.02] border border-blue-400/30 active:scale-[0.98]",
        cyber: "bg-gradient-to-r from-[#1d4ed8] to-[#0ea5e9] text-white font-bold shadow-lg hover:shadow-xl hover:shadow-blue-500/30 hover:scale-[1.02] border border-blue-400/20 uppercase tracking-wide active:scale-[0.98]",
        danger: "bg-gradient-to-r from-destructive to-rose-600 text-destructive-foreground font-semibold shadow-lg hover:shadow-xl hover:shadow-destructive/30 hover:scale-[1.02] border border-destructive/20 active:scale-[0.98]",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-11 rounded-xl px-7 text-sm font-semibold",
        pill: "h-8 rounded-full px-3.5 text-xs",
        icon: "h-9 w-9 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
