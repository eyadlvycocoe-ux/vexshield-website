import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Tag, Check, Copy, Shield  } from "lucide-react";

interface LincerisPartnerButtonProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
}

export function LincerisPartnerButton({
  className,
  size = "md",
  fullWidth = false,
}: LincerisPartnerButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    void navigator.clipboard.writeText("VexShield.Ac");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isSmall = size === "sm";
  const isLarge = size === "lg";

  return (
    <a
      href="https://www.linceris.com/"
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-xl border border-white/10 bg-black p-3 text-white shadow-[0_1px_0_rgba(255,255,255,0.06)_inset] transition-all duration-300 hover:border-blue-500/50 active:scale-[0.99]",
        fullWidth ? "w-full" : "w-auto max-w-full",
        isSmall && "p-2.5 rounded-lg",
        isLarge && "p-4.5 rounded-2xl",
        className
      )}
    >
      {/* Signature: single blue edge-light along the left border */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-[2px] bg-gradient-to-b from-transparent via-blue-500 to-transparent opacity-70 transition-opacity duration-300 group-hover:opacity-100" />
      {/* Subtle top sheen, kept quiet */}
      <div className="pointer-events-none absolute -top-16 left-0 h-32 w-full bg-gradient-to-b from-white/[0.04] to-transparent" />

      {/* Main Row: Logo, Separator, Tagline */}
      <div className="relative z-10 flex items-center justify-between gap-3 w-full">
        {/* Left: Logo & Company Name */}
        <div className="flex items-center gap-2.5 min-w-0 shrink-0">
          <div
            className={cn(
              "relative flex items-center justify-center shrink-0 rounded-md border border-white/10 bg-white/[0.03]",
              isSmall ? "h-6 w-6" : isLarge ? "h-10 w-10" : "h-8 w-8"
            )}
          >
            <img
              src="/Linceris.png"
              alt="Linceris"
              className="h-full w-full object-contain p-1"
            />
          </div>
          <div className="flex flex-col leading-none min-w-0">
            <span
              className={cn(
                "font-black tracking-wider text-white uppercase truncate",
                isSmall ? "text-xs" : isLarge ? "text-base" : "text-sm"
              )}
            >
              LINCERIS
            </span>
            <span
              className={cn(
                "font-semibold text-blue-400 uppercase tracking-widest truncate mt-0.5",
                isSmall ? "text-[8px]" : isLarge ? "text-[10px]" : "text-[9px]"
              )}
            >
              HOSTING
            </span>
          </div>
        </div>

        {/* Vertical Separator */}
        <div
          className={cn(
            "w-[1px] bg-white/10 shrink-0 mx-1",
            isSmall ? "h-6" : isLarge ? "h-9" : "h-7"
          )}
        />

        {/* Right: Partner Tagline */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Shield className="h-3 w-3 text-blue-400 shrink-0" />
          <div className="flex flex-col text-right leading-none">
            <span
              className={cn(
                "font-semibold tracking-widest text-white/50 uppercase truncate",
                isSmall ? "text-[8px]" : isLarge ? "text-[11px]" : "text-[9px]"
              )}
            >
              AUTHORIZED
            </span>
            <span
              className={cn(
                "font-bold tracking-tight text-white uppercase truncate mt-0.5",
                isSmall ? "text-[9px]" : isLarge ? "text-[12px]" : "text-[10px]"
              )}
            >
              PARTNER
            </span>
          </div>
        </div>
      </div>

      {/* Integrated Promo Strip inside card */}
      <div
        onClick={handleCopyCode}
        title="Click to copy promo code"
        className={cn(
          "relative z-10 mt-2.5 flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs transition-colors hover:border-blue-500/40 hover:bg-white/[0.06] cursor-pointer w-full gap-2",
          isSmall && "mt-2 py-1 px-2 text-[10px]"
        )}
      >
        <div className="flex items-center gap-1.5 min-w-0 shrink">
          <Tag className="h-3 w-3 text-blue-400 shrink-0" />
          <span className="text-white/40 font-medium text-[9px] uppercase tracking-wider shrink-0">
            {isSmall ? "CODE:" : "PROMO CODE:"}
          </span>
          <code className="font-mono font-bold text-white text-[10.5px] tracking-wide shrink-0">
            VexShield.Ac
          </code>
        </div>
        <div className="flex items-center gap-1 border-l border-white/10 pl-2 text-blue-400 text-[10px] font-semibold shrink-0">
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-400 shrink-0" />
              <span className="text-emerald-400 font-bold">COPIED</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3 opacity-75 group-hover:opacity-100 shrink-0" />
              <span className="opacity-90">Copy</span>
            </>
          )}
        </div>
      </div>
    </a>
  );
}