import { useMemo, useState } from "react";
import { Check, Copy  } from "lucide-react";
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
  bash: "Shell",
  sh: "Shell",
  shell: "Shell",
  console: "Console",
  cfg: "server.cfg",
  ini: "ENV",
  conf: "Config",
  text: "Text",
};

export function CodeBlock({ code, language, filename, highlightQuery, className }: CodeBlockProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const html = useMemo(
    () => tokensToHtml(highlightCode(code, language), highlightQuery),
    [code, language, highlightQuery],
  );

  const label = filename ?? LANGUAGE_LABEL[language.toLowerCase()] ?? language;

  const copy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border/70 bg-[#0b0d12] shadow-sm",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-border/60 bg-white/[0.02] px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
          </span>
          <span className="ml-1 font-mono text-xs text-muted-foreground">{label}</span>
        </div>
        <button
          type="button"
          onClick={copy}
          aria-label={t("docs.copyCode")}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-green-400" />
              <span className="text-green-400">{t("docs.copied")}</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>{t("common.copy")}</span>
            </>
          )}
        </button>
      </div>
      <pre className="scrollbar-air overflow-x-auto p-4 text-[13px] leading-relaxed">
        <code
          className="font-mono"
          // Highlighted output is generated from our own escaped tokenizer.
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </pre>
    </div>
  );
}
