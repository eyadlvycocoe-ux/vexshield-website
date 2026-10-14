import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { DocSection } from "@/data/docs/types";
import { useTranslation } from "react-i18next";

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
      { rootMargin: "-80px 0px -70% 0px", threshold: 0 },
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
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("docs.onThisPage")}</p>
      <ul className="space-y-1 border-l border-border/60">
        {sections.map((section) => {
          const active = section.id === activeId;
          return (
            <li key={section.id}>
              <button
                type="button"
                onClick={() => scrollTo(section.id)}
                className={cn(
                  "-ml-px block border-l-2 py-1 pl-3 text-left text-sm transition-colors",
                  active
                    ? "border-primary font-medium text-primary"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
                )}
              >
                {section.title}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
