import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { DocSection } from "@/data/docs/types";
import { useTranslation } from "react-i18next";
import { Compass, Headphones, MessageSquare, ExternalLink } from "lucide-react";

interface DocTocProps {
  sections: DocSection[];
}

export function DocToc({ sections }: DocTocProps) {
  const { t } = useTranslation();
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? "");

  useEffect(() => {
    setActiveId(sections[0]?.id ?? "");
    const headings = sections
      .map((s) => document.getElementById(`section-${s.id}`))
      .filter((el): el is HTMLElement => Boolean(el));
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) {
          setActiveId(visible[0].target.id.replace("section-", ""));
        }
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: 0 }
    );

    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [sections]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(`section-${id}`);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 90;
      window.scrollTo({ top, behavior: "smooth" });
      setActiveId(id);
    }
  };

  if (sections.length === 0) return null;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Compass className="h-3.5 w-3.5 text-cyan-400" />
          <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-300 font-mono">
            {t("docs.onThisPage", "On This Page")}
          </p>
        </div>

        <ul className="space-y-1 relative border-l border-white/10 pl-2">
          {sections.map((section) => {
            const active = section.id === activeId;
            return (
              <li key={section.id}>
                <button
                  type="button"
                  onClick={() => scrollTo(section.id)}
                  className={cn(
                    "group relative block w-full text-left py-1.5 pl-3 text-xs transition-all duration-150 rounded-lg",
                    active
                      ? "text-cyan-300 font-semibold bg-cyan-500/10"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.02]"
                  )}
                >
                  {/* Left indicator pip */}
                  {active && (
                    <span className="absolute left-[-9px] top-2 bottom-2 w-0.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                  )}
                  <span className="truncate block">{section.title}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Mini Support Box */}
      <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-b from-[#081226]/80 to-[#040814]/90 p-3.5 shadow-lg space-y-2.5">
        <div className="flex items-center gap-2 text-xs font-bold text-white">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-400">
            <Headphones className="h-3 w-3" />
          </div>
          <span>Need Assistance?</span>
        </div>
        <p className="text-[11px] text-zinc-400 leading-relaxed">
          Stuck on setup or custom framework integration? Our engineers are on standby 24/7.
        </p>
        <a
          href="https://discord.gg/vexshield"
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-1.5 w-full rounded-xl border border-cyan-500/30 bg-cyan-500/15 py-1.5 text-[11px] font-bold text-cyan-300 hover:bg-cyan-500/25 transition-colors font-mono"
        >
          <MessageSquare className="h-3 w-3" />
          <span>Join VexShield Discord</span>
          <ExternalLink className="h-2.5 w-2.5 ml-0.5 opacity-60" />
        </a>
      </div>
    </div>
  );
}
