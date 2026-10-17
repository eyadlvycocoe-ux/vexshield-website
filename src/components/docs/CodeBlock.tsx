import { useMemo, useState } from "react";
import { Check, Copy, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";
import { highlightCode, tokensToHtml } from "@/lib/doc-syntax";
import { useTranslation } from "react-i18next";

interface CodeBlockProps {
  code: string;
  language: string;
  filename?: string;
  /** Optional query to highlight inside the code (search-in-code). */
  highlightQuery?: string;
  className?: string;
}

const LANGUAGE_LABEL: Record<string, string> = {
  lua: "Lua",
  json: "JSON",
  bash: "Shell / Bash",
  sh: "Shell",
  shell: "Shell",
  console: "Console (txAdmin)",
  cfg: "server.cfg",
  ini: "Config",
  conf: "Config",
  text: "Plain Text",
};

export function CodeBlock({ code, language, filename, highlightQuery, className }: CodeBlockProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const html = useMemo(
    () => tokensToHtml(highlightCode(code, language), highlightQuery),
    [code, language, highlightQuery]
  );

  const label = filename ?? LANGUAGE_LABEL[language.toLowerCase()] ?? language.toUpperCase();

  const copy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div
      className={cn(
        "group relative my-4 overflow-hidden rounded-2xl border border-cyan-500/20 bg-[#040813] shadow-[0_10px_30px_rgba(0,0,0,0.6),0_0_20px_rgba(6,182,212,0.06)] transition-all duration-200 hover:border-cyan-500/35",
        className
      )}
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-cyan-500/15 bg-gradient-to-r from-[#070e20] to-[#040814] px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          {/* macOS window dots */}
          <span className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500/80 shadow-[0_0_6px_rgba(239,68,68,0.5)]" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80 shadow-[0_0_6px_rgba(245,158,11,0.5)]" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
          </span>

          <div className="flex items-center gap-1.5 pl-2 border-l border-white/10">
            <Terminal className="h-3 w-3 text-cyan-400/80" />
            <span className="font-mono text-xs font-semibold text-zinc-300 tracking-wide">
              {label}
            </span>
          </div>
        </div>

        {/* Copy Button */}
        <button
          type="button"
          onClick={copy}
          aria-label={t("docs.copyCode", "Copy code")}
          className={cn(
            "flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all duration-150",
            copied
              ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
              : "border-white/10 bg-white/[0.04] text-zinc-400 hover:border-cyan-500/40 hover:bg-cyan-950/30 hover:text-white"
          )}
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400 animate-in zoom-in-75 duration-150" />
              <span className="text-emerald-400 font-mono text-[11px] font-bold">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5 text-zinc-400 group-hover:text-cyan-300 transition-colors" />
              <span className="text-[11px] font-mono">Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code Area */}
      <pre className="scrollbar-air overflow-x-auto p-4 text-[13px] leading-relaxed font-mono text-zinc-200 selection:bg-cyan-500/30 selection:text-white">
        <code
          className="font-mono"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </pre>
    </div>
  );
}
