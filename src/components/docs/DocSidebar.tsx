import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, Search  } from "lucide-react";
import { cn } from "@/lib/utils";
import { DOC_CATEGORIES } from "@/data/docs";
import { useTranslation } from "react-i18next";

interface DocSidebarProps {
  activePageId: string;
  onNavigate?: () => void;
  onOpenSearch: () => void;
}

export function DocSidebar({ activePageId, onNavigate, onOpenSearch }: DocSidebarProps) {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // Make sure the category containing the active page is always expanded.
  useEffect(() => {
    const activeCategory = DOC_CATEGORIES.find((c) => c.pages.some((p) => p.id === activePageId));
    if (activeCategory) {
      setCollapsed((prev) => ({ ...prev, [activeCategory.id]: false }));
    }
  }, [activePageId]);

  const toggle = (id: string) => setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="flex h-full flex-col gap-4">
      <button
        type="button"
        onClick={onOpenSearch}
        className="flex w-full items-center gap-2.5 rounded-xl border border-white/[0.08] bg-[#121214] px-3.5 py-2 text-sm text-zinc-400 transition-all hover:border-zinc-700 hover:text-white"
      >
        <Search className="h-4 w-4 text-zinc-500" />
        <span className="flex-1 text-left">{t("docs.searchDocs")}</span>
        <kbd className="rounded-md border border-white/[0.08] bg-zinc-900 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
          Ctrl K
        </kbd>
      </button>

      <nav className="scrollbar-hidden -mr-2 space-y-4 overflow-y-auto pr-2">
        {DOC_CATEGORIES.map((category) => {
          const isCollapsed = collapsed[category.id];
          return (
            <div key={category.id}>
              <button
                type="button"
                onClick={() => toggle(category.id)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left transition-colors hover:text-white"
              >
                {category.icon ? (
                  <category.icon className="h-3.5 w-3.5 shrink-0 text-zinc-400" aria-hidden />
                ) : null}
                <span className="flex-1 text-xs font-bold uppercase tracking-wider text-zinc-500 font-['Inter',sans-serif]">
                  {category.label}
                </span>
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 text-zinc-500 transition-transform duration-200",
                    isCollapsed && "-rotate-90",
                  )}
                />
              </button>

              <div
                className={cn(
                  "grid transition-all duration-200 ease-out",
                  isCollapsed ? "grid-rows-[0fr] opacity-0" : "mt-1.5 grid-rows-[1fr] opacity-100",
                )}
              >
                <ul className="overflow-hidden space-y-1.5">
                  {category.pages.map((page) => {
                    const active = page.id === activePageId;
                    const Icon = page.icon;
                    return (
                      <li key={page.id}>
                        <Link
                          to={`/documentation/${page.id}`}
                          onClick={onNavigate}
                          className={cn(
                            "flex items-center gap-2.5 rounded-xl border px-3.5 py-2 text-sm transition-all font-medium",
                            active
                              ? "border-white bg-white text-black font-semibold shadow-sm shadow-white/10 [&_svg]:text-black"
                              : "border-white/[0.08] bg-[#121214] text-zinc-300 hover:border-zinc-700 hover:bg-[#1a1a1e] hover:text-white [&_svg]:text-zinc-400 [&_svg]:hover:text-zinc-200",
                          )}
                        >
                          {Icon && <Icon className="h-4 w-4 shrink-0 opacity-90" />}
                          <span className="truncate">{page.title}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          );
        })}
      </nav>
    </div>
  );
}
