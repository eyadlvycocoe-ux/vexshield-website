import { useState } from "react";
import {
  AlertTriangle,
  Info,
  Lightbulb,
  OctagonAlert,
  StickyNote,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Terminal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { YouTubeEmbed } from "@/components/YouTubeEmbed";
import type { DocBlock, DocCalloutKind } from "@/data/docs/types";
import { CodeBlock } from "./CodeBlock";
import { DocText } from "./DocText";

const CALLOUT_STYLES: Record<
  DocCalloutKind,
  { wrap: string; icon: typeof Info; iconColor: string; label: string; badgeBg: string }
> = {
  note: {
    wrap: "border-cyan-500/30 bg-gradient-to-r from-cyan-950/25 to-[#050b18]/50 shadow-[0_4px_20px_rgba(6,182,212,0.06)]",
    icon: StickyNote,
    iconColor: "text-cyan-400",
    label: "Note",
    badgeBg: "bg-cyan-500/15 border-cyan-500/30 text-cyan-300",
  },
  info: {
    wrap: "border-blue-500/30 bg-gradient-to-r from-blue-950/25 to-[#050b18]/50 shadow-[0_4px_20px_rgba(59,130,246,0.06)]",
    icon: Info,
    iconColor: "text-blue-400",
    label: "Info",
    badgeBg: "bg-blue-500/15 border-blue-500/30 text-blue-300",
  },
  tip: {
    wrap: "border-emerald-500/30 bg-gradient-to-r from-emerald-950/25 to-[#050b18]/50 shadow-[0_4px_20px_rgba(16,185,129,0.06)]",
    icon: Lightbulb,
    iconColor: "text-emerald-400",
    label: "Pro Tip",
    badgeBg: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
  },
  warning: {
    wrap: "border-amber-500/35 bg-gradient-to-r from-amber-950/25 to-[#050b18]/50 shadow-[0_4px_20px_rgba(245,158,11,0.08)]",
    icon: AlertTriangle,
    iconColor: "text-amber-400",
    label: "Warning",
    badgeBg: "bg-amber-500/15 border-amber-500/30 text-amber-300",
  },
  danger: {
    wrap: "border-red-500/35 bg-gradient-to-r from-red-950/25 to-[#050b18]/50 shadow-[0_4px_20px_rgba(239,68,68,0.08)]",
    icon: OctagonAlert,
    iconColor: "text-red-400",
    label: "Caution",
    badgeBg: "bg-red-500/15 border-red-500/30 text-red-300",
  },
};

function Callout({ kind, title, body }: { kind: DocCalloutKind; title?: string; body: string }) {
  const style = CALLOUT_STYLES[kind];
  const Icon = style.icon;
  return (
    <div className={cn("my-4 flex gap-3.5 rounded-2xl border p-4 backdrop-blur-sm", style.wrap)}>
      <div className="shrink-0 pt-0.5">
        <div className={cn("flex h-8 w-8 items-center justify-center rounded-xl border", style.badgeBg)}>
          <Icon className={cn("h-4 w-4", style.iconColor)} />
        </div>
      </div>
      <div className="min-w-0 space-y-1.5 text-xs md:text-sm leading-relaxed text-zinc-300">
        <p className={cn("font-bold tracking-wide", style.iconColor)}>
          {title ?? style.label}
        </p>
        <div className="text-zinc-300/90 leading-relaxed">
          <DocText>{body}</DocText>
        </div>
      </div>
    </div>
  );
}

function DocTable({
  columns,
  rows,
  variant,
}: {
  columns: string[];
  rows: string[][];
  variant?: "default" | "commands" | "permissions";
}) {
  const monoFirst = variant === "commands" || variant === "permissions";
  return (
    <div className="my-5 overflow-hidden rounded-2xl border border-cyan-500/20 bg-[#050a16] shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
      <div className="scrollbar-air overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs md:text-sm">
          <thead>
            <tr className="border-b border-cyan-500/20 bg-gradient-to-r from-cyan-950/30 via-[#060e20] to-[#040814]">
              {columns.map((col, idx) => (
                <th
                  key={col}
                  className="px-4 py-3 font-mono text-[11px] font-bold uppercase tracking-wider text-cyan-300"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {rows.map((row, ri) => (
              <tr
                key={ri}
                className="transition-colors hover:bg-cyan-500/[0.04] odd:bg-white/[0.01]"
              >
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    className={cn(
                      "px-4 py-3 align-top text-zinc-300",
                      ci === 0 && monoFirst && "whitespace-nowrap font-mono"
                    )}
                  >
                    {ci === 0 && monoFirst ? (
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-950/40 px-2 py-0.5 font-mono text-xs font-semibold text-cyan-300 shadow-sm">
                        <Terminal className="h-3 w-3 text-cyan-400" />
                        {cell}
                      </span>
                    ) : (
                      <div className="leading-relaxed text-zinc-300">
                        <DocText>{cell}</DocText>
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DocImage({ src, alt, caption }: { src: string; alt: string; caption?: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <figure className="my-6 space-y-2">
      <div className="overflow-hidden rounded-2xl border border-cyan-500/25 bg-[#040814] shadow-[0_15px_40px_rgba(0,0,0,0.7),0_0_25px_rgba(6,182,212,0.1)]">
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          className={cn(
            "h-auto w-full object-contain transition-opacity duration-500",
            loaded ? "opacity-100" : "opacity-0"
          )}
        />
      </div>
      {caption && (
        <figcaption className="text-center font-mono text-xs text-zinc-400 tracking-wide">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

function Steps({ steps }: { steps: Extract<DocBlock, { type: "steps" }>["steps"] }) {
  return (
    <ol className="my-6 space-y-6">
      {steps.map((step, i) => (
        <li
          key={i}
          className="group relative rounded-2xl border border-cyan-500/15 bg-gradient-to-b from-[#080f22]/70 via-[#050a16]/60 to-[#03060f]/80 p-5 pl-14 md:pl-16 shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-all hover:border-cyan-500/30"
        >
          {/* Step Number Badge */}
          <span className="absolute left-3.5 top-4 flex h-8 w-8 md:h-9 md:w-9 items-center justify-center rounded-xl border border-cyan-400/40 bg-gradient-to-br from-cyan-500/25 to-blue-600/20 text-xs md:text-sm font-black font-mono text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
            0{i + 1}
          </span>

          {/* Vertical Connecting Line */}
          {i < steps.length - 1 && (
            <span className="absolute left-[31px] md:left-[33px] top-14 bottom-[-24px] w-0.5 bg-gradient-to-b from-cyan-500/50 via-blue-500/30 to-transparent" />
          )}

          <h4 className="text-sm md:text-base font-bold text-white tracking-tight flex items-center gap-2">
            <span>{step.title}</span>
          </h4>

          <div className="mt-1.5 text-xs md:text-sm leading-relaxed text-zinc-300">
            <DocText>{step.description}</DocText>
          </div>

          {step.code && (
            <div className="mt-3">
              <CodeBlock
                code={step.code.content}
                language={step.code.language}
                filename={step.code.filename}
              />
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}

export function DocBlockView({ block, highlightQuery }: { block: DocBlock; highlightQuery?: string }) {
  switch (block.type) {
    case "paragraph":
      return (
        <p
          className={cn(
            "leading-relaxed",
            block.lead
              ? "text-sm md:text-base text-zinc-200 font-normal leading-relaxed border-l-2 border-cyan-500/40 pl-3.5 my-3"
              : "text-xs md:text-sm text-zinc-400 my-2"
          )}
        >
          <DocText>{block.text}</DocText>
        </p>
      );
    case "heading":
      return block.level === 3 ? (
        <h3 className="mt-6 mb-2 text-base md:text-lg font-bold text-white tracking-tight flex items-center gap-2">
          <span className="text-cyan-400 font-mono text-sm">#</span>
          <span>{block.text}</span>
        </h3>
      ) : (
        <h4 className="mt-4 mb-2 text-sm md:text-base font-semibold text-zinc-200">
          {block.text}
        </h4>
      );
    case "list":
      return block.ordered ? (
        <ol className="my-3 list-decimal space-y-2 pl-5 text-xs md:text-sm leading-relaxed text-zinc-300 marker:text-cyan-400 font-normal">
          {block.items.map((item, i) => (
            <li key={i}>
              <DocText>{item}</DocText>
            </li>
          ))}
        </ol>
      ) : (
        <ul className="my-3 space-y-2.5 text-xs md:text-sm leading-relaxed text-zinc-300">
          {block.items.map((item, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <ChevronRight className="h-4 w-4 shrink-0 text-cyan-400 mt-0.5" />
              <div className="flex-1">
                <DocText>{item}</DocText>
              </div>
            </li>
          ))}
        </ul>
      );
    case "code":
      return (
        <CodeBlock
          code={block.code}
          language={block.language}
          filename={block.filename}
          highlightQuery={highlightQuery}
        />
      );
    case "callout":
      return <Callout kind={block.kind} title={block.title} body={block.body} />;
    case "table":
      return <DocTable columns={block.columns} rows={block.rows} variant={block.variant} />;
    case "image":
      return <DocImage src={block.src} alt={block.alt} caption={block.caption} />;
    case "video":
      return (
        <div className="my-6 relative aspect-video w-full max-w-3xl overflow-hidden rounded-2xl border border-cyan-500/25 bg-[#03060f] shadow-[0_15px_40px_rgba(0,0,0,0.8),0_0_20px_rgba(6,182,212,0.1)]">
          {block.youtubeId ? (
            <YouTubeEmbed
              videoId={block.youtubeId}
              title={block.title ?? "Video"}
              className="absolute inset-0 h-full w-full"
            />
          ) : block.src ? (
            <video src={block.src} controls playsInline className="absolute inset-0 h-full w-full" />
          ) : null}
        </div>
      );
    case "steps":
      return <Steps steps={block.steps} />;
    default:
      return null;
  }
}
