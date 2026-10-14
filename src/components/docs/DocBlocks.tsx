import { useState } from "react";
import { AlertTriangle,
  Info,
  Lightbulb,
  OctagonAlert,
  StickyNote,
 } from "lucide-react";
import { cn } from "@/lib/utils";
import { YouTubeEmbed } from "@/components/YouTubeEmbed";
import type { DocBlock, DocCalloutKind } from "@/data/docs/types";
import { CodeBlock } from "./CodeBlock";
import { DocText } from "./DocText";

const CALLOUT_STYLES: Record<
  DocCalloutKind,
  { wrap: string; icon: typeof Info; iconColor: string; label: string }
> = {
  note: {
    wrap: "border-border/70 bg-muted/30",
    icon: StickyNote,
    iconColor: "text-slate-300",
    label: "Note",
  },
  info: {
    wrap: "border-primary/30 bg-primary/5",
    icon: Info,
    iconColor: "text-primary",
    label: "Info",
  },
  tip: {
    wrap: "border-emerald-500/30 bg-emerald-500/5",
    icon: Lightbulb,
    iconColor: "text-emerald-400",
    label: "Tip",
  },
  warning: {
    wrap: "border-amber-500/30 bg-amber-500/5",
    icon: AlertTriangle,
    iconColor: "text-amber-400",
    label: "Warning",
  },
  danger: {
    wrap: "border-red-500/30 bg-red-500/5",
    icon: OctagonAlert,
    iconColor: "text-red-400",
    label: "Danger",
  },
};

function Callout({ kind, title, body }: { kind: DocCalloutKind; title?: string; body: string }) {
  const style = CALLOUT_STYLES[kind];
  const Icon = style.icon;
  return (
    <div className={cn("flex gap-3 rounded-xl border p-4", style.wrap)}>
      <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", style.iconColor)} />
      <div className="min-w-0 space-y-1 text-sm leading-relaxed text-muted-foreground">
        <p className={cn("font-semibold", style.iconColor)}>{title ?? style.label}</p>
        <p>
          <DocText>{body}</DocText>
        </p>
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
    <div className="overflow-hidden rounded-xl border border-border/70">
      <div className="scrollbar-air overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-white/[0.03]">
              {columns.map((col) => (
                <th
                  key={col}
                  className="border-b border-border/70 px-4 py-2.5 text-left font-semibold text-foreground"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className="transition-colors hover:bg-white/[0.02]">
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    className={cn(
                      "border-b border-border/40 px-4 py-2.5 align-top text-muted-foreground last:border-r-0",
                      ci === 0 && monoFirst && "whitespace-nowrap",
                    )}
                  >
                    {ci === 0 && monoFirst ? (
                      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-primary">
                        {cell}
                      </code>
                    ) : (
                      <DocText>{cell}</DocText>
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
    <figure className="space-y-2">
      <div className="overflow-hidden rounded-xl border border-border/70 bg-muted/20">
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          className={cn(
            "h-auto w-full object-contain transition-opacity duration-500",
            loaded ? "opacity-100" : "opacity-0",
          )}
        />
      </div>
      {caption && <figcaption className="text-center text-xs text-muted-foreground">{caption}</figcaption>}
    </figure>
  );
}

function Steps({ steps }: { steps: Extract<DocBlock, { type: "steps" }>["steps"] }) {
  return (
    <ol className="space-y-5">
      {steps.map((step, i) => (
        <li key={i} className="relative pl-12">
          <span className="absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full border border-primary/30 bg-primary/15 text-sm font-bold text-primary">
            {i + 1}
          </span>
          {i < steps.length - 1 && (
            <span className="absolute left-[15px] top-9 h-[calc(100%-1rem)] w-px bg-gradient-to-b from-primary/40 to-transparent" />
          )}
          <h4 className="font-semibold text-foreground">{step.title}</h4>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            <DocText>{step.description}</DocText>
          </p>
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
            "leading-relaxed text-muted-foreground",
            block.lead ? "text-base md:text-lg text-foreground/90" : "text-sm md:text-base",
          )}
        >
          <DocText>{block.text}</DocText>
        </p>
      );
    case "heading":
      return block.level === 3 ? (
        <h3 className="text-lg font-semibold text-foreground">{block.text}</h3>
      ) : (
        <h4 className="text-base font-semibold text-foreground">{block.text}</h4>
      );
    case "list":
      return block.ordered ? (
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground md:text-base">
          {block.items.map((item, i) => (
            <li key={i}>
              <DocText>{item}</DocText>
            </li>
          ))}
        </ol>
      ) : (
        <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground md:text-base">
          {block.items.map((item, i) => (
            <li key={i}>
              <DocText>{item}</DocText>
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
        <div className="relative aspect-video w-full max-w-3xl overflow-hidden rounded-xl border border-border/70 bg-muted/40">
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
