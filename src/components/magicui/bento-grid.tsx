import { ArrowRight } from "lucide-react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BentoGridProps extends ComponentPropsWithoutRef<"div"> {
  children: ReactNode;
  className?: string;
}

interface BentoCardProps extends ComponentPropsWithoutRef<"div"> {
  name: string;
  className: string;
  background: ReactNode;
  Icon: React.ElementType;
  description: string;
  href: string;
  cta: string;
}

const BentoGrid = ({ children, className, ...props }: BentoGridProps) => {
  return (
    <div
      className={cn(
        "grid w-full auto-rows-[22rem] grid-cols-1 md:grid-cols-3 gap-4",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

const BentoCard = ({
  name,
  className,
  background,
  Icon,
  description,
  href,
  cta,
  ...props
}: BentoCardProps) => (
  <div
    key={name}
    className={cn(
      "group relative col-span-3 flex flex-col justify-between overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-950/70 p-1 backdrop-blur-xl transition-all duration-300 hover:border-cyan-500/40 hover:shadow-[0_0_30px_rgba(6,182,212,0.15)]",
      className
    )}
    {...props}
  >
    <div className="absolute inset-0 z-0">{background}</div>
    <div className="pointer-events-none z-10 flex transform-gpu flex-col gap-1 p-6 transition-all duration-300 group-hover:-translate-y-6">
      <Icon className="h-10 w-10 origin-left transform-gpu text-cyan-400 transition-all duration-300 ease-in-out group-hover:scale-110" />
      <h3 className="text-xl font-semibold text-zinc-100 mt-2">
        {name}
      </h3>
      <p className="max-w-lg text-sm text-zinc-400 leading-relaxed">{description}</p>
    </div>

    <div
      className={cn(
        "pointer-events-none absolute bottom-0 z-20 flex w-full translate-y-10 transform-gpu flex-row items-center p-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100"
      )}
    >
      <Button variant="ghost" asChild size="sm" className="pointer-events-auto text-cyan-400 hover:text-cyan-300 hover:bg-cyan-950/40">
        <a href={href} className="flex items-center gap-2">
          {cta}
          <ArrowRight className="h-4 w-4 rtl:rotate-180" />
        </a>
      </Button>
    </div>
    <div className="pointer-events-none absolute inset-0 transform-gpu transition-all duration-300 group-hover:bg-cyan-500/[0.03]" />
  </div>
);

export { BentoCard, BentoGrid };
