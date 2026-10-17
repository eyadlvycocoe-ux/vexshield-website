import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, Search, Sparkles, Shield, Terminal, BookOpen, Layers } from "lucide-react";
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

  // Ensure category containing active page is always open
  useEffect(() => {
    const activeCategory = DOC_CATEGORIES.find((c) => c.pages.some((p) => p.id === activePageId));
    if (activeCategory) {
      setCollapsed((prev) => ({ ...prev, [activeCategory.id]: false }));
    }
  }, [activePageId]);

  const toggle = (id: string) => setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Search trigger button */}
      <button
        type="button"
        onClick={onOpenSearch}
        className="group relative flex w-full items-center gap-3 rounded-xl border border-cyan-500/20 bg-[#060a14]/90 px-3.5 py-2.5 text-xs text-zinc-400 transition-all duration-200 hover:border-cyan-400/50 hover:bg-cyan-950/20 hover:text-white shadow-[0_0_15px_rgba(6,182,212,0.06)]"
      >
        <Search className="h-4 w-4 text-cyan-400/70 transition-transform duration-200 group-hover:scale-110 group-hover:text-cyan-300" />
        <span className="flex-1 text-left font-medium tracking-wide">
          {t("docs.searchDocs", "Search VexShield documentation...")}
        </span>
        <kbd className="inline-flex items-center gap-0.5 rounded-md border border-cyan-500/30 bg-cyan-950/40 px-2 py-0.5 font-mono text-[10px] font-bold text-cyan-300 shadow-inner">
          ⌘K
        </kbd>
      </button>

      {/* Navigation categories */}
      <nav className="scrollbar-hidden -mr-2 space-y-5 overflow-y-auto pr-2 pb-8">
        {DOC_CATEGORIES.map((category) => {
          const isCollapsed = collapsed[category.id];
          const CategoryIcon = category.icon;
          return (
            <div key={category.id} className="space-y-1.5">
              {/* Category Header */}
              <button
                type="button"
                onClick={() => toggle(category.id)}
                className="group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-white/[0.03]"
              >
                {CategoryIcon ? (
                  <div className="flex h-5 w-5 items-center justify-center rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 group-hover:border-cyan-500/40 transition-colors">
                    <CategoryIcon className="h-3 w-3" aria-hidden />
                  </div>
                ) : (
                  <span className="text-xs">{category.emoji || "📁"}</span>
                )}
                <span className="flex-1 text-[11px] font-bold uppercase tracking-wider text-zinc-400 group-hover:text-cyan-300 transition-colors font-mono">
                  {category.label}
                </span>
                <span className="text-[10px] text-zinc-600 font-mono group-hover:text-zinc-400 px-1.5">
                  {category.pages.length}
                </span>
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 text-zinc-500 transition-transform duration-200 group-hover:text-zinc-300",
                    isCollapsed && "-rotate-90"
                  )}
                />
              </button>

              {/* Category Pages */}
              <div
                className={cn(
                  "grid transition-all duration-200 ease-out",
                  isCollapsed ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100"
                )}
              >
                <ul className="overflow-hidden space-y-1 pl-1">
                  {category.pages.map((page) => {
                    const active = page.id === activePageId;
                    const Icon = page.icon;
                    return (
                      <li key={page.id}>
                        <Link
                          to={`/documentation/${page.id}`}
                          onClick={onNavigate}
                          className={cn(
                            "group relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs transition-all duration-150 font-medium",
                            active
                              ? "bg-gradient-to-r from-cyan-500/15 via-blue-500/10 to-transparent border border-cyan-500/40 text-white font-semibold shadow-[0_0_20px_rgba(6,182,212,0.15)]"
                              : "border border-transparent text-zinc-400 hover:border-white/10 hover:bg-white/[0.04] hover:text-zinc-100"
                          )}
                        >
                          {/* Active Neon Left Pip */}
                          {active && (
                            <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                          )}

                          {Icon && (
                            <Icon
                              className={cn(
                                "h-4 w-4 shrink-0 transition-colors",
                                active
                                  ? "text-cyan-300"
                                  : "text-zinc-500 group-hover:text-zinc-300"
                              )}
                            />
                          )}

                          <span className="truncate flex-1">{page.title}</span>

                          {page.badge && (
                            <span
                              className={cn(
                                "shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-mono tracking-wider font-semibold",
                                active
                                  ? "border border-cyan-400/40 bg-cyan-500/20 text-cyan-200"
                                  : "border border-white/10 bg-white/5 text-zinc-500 group-hover:text-zinc-300"
                              )}
                            >
                              {page.badge}
                            </span>
                          )}
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
