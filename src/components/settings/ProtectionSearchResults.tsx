import { memo, useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import { Search } from "lucide-react";
import {
  filterProtectionOptions,
  ProtectionOptionRow,
  type AnticheatOption,
} from "@/components/settings/ProtectionCategory";

export interface ProtectionSearchSection {
  key: string;
  title: string;
  description: string;
  Icon: React.ElementType;
}

interface ProtectionSearchResultsProps {
  query: string;
  sections: ProtectionSearchSection[];
  categoryStates: Record<string, AnticheatOption[]>;
  categorySetters: Record<string, Dispatch<SetStateAction<AnticheatOption[]>>>;
  matchCounts: Record<string, number>;
}

const ProtectionSearchSectionBlock = memo(
  ({
    section,
    query,
    options,
    setOptions,
    layout = "stacked",
  }: {
    section: ProtectionSearchSection;
    query: string;
    options: AnticheatOption[];
    setOptions: Dispatch<SetStateAction<AnticheatOption[]>>;
    layout?: "stacked" | "inline";
  }) => {
    const onToggle = useCallback(
      (id: string, checked: boolean) => {
        setOptions((prev) =>
          prev.map((o) => (o.id === id ? { ...o, enabled: checked, l1: checked, l2: checked, l3: checked } : o)),
        );
      },
      [setOptions],
    );

    const onActionChange = useCallback(
      (id: string, action: "ban" | "kick" | "logs") => {
        setOptions((prev) => prev.map((o) => (o.id === id ? { ...o, action } : o)));
      },
      [setOptions],
    );

    const onLevelToggle = useCallback(
      (id: string, levelKey: "l1" | "l2" | "l3", checked: boolean) => {
        setOptions((prev) =>
          prev.map((o) => {
            if (o.id !== id) return o;
            const newL1 = levelKey === "l1" ? checked : (o.l1 ?? o.enabled);
            const newL2 = levelKey === "l2" ? checked : (o.l2 ?? o.enabled);
            const newL3 = levelKey === "l3" ? checked : (o.l3 ?? o.enabled);
            const anyEnabled = newL1 || newL2 || newL3;
            return {
              ...o,
              enabled: anyEnabled,
              l1: newL1,
              l2: newL2,
              l3: newL3,
            };
          }),
        );
      },
      [setOptions],
    );

    const visible = filterProtectionOptions(options, query);
    if (!visible.length) return null;

    const header = (
      <div
        className={
          layout === "inline"
            ? "col-span-full sticky top-0 z-10 mb-1 mt-3 flex items-center gap-2 border-b border-white/[0.06] bg-[#0b1018] py-2 first:mt-0"
            : "sticky top-0 z-10 mb-2 flex items-center gap-2 border-b border-white/[0.06] bg-[#0b1018] py-2"
        }
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-sky-500/20 bg-sky-500/10 text-sky-400">
          <section.Icon className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-xs font-semibold text-white">{section.title}</h3>
          <p className="truncate text-[10px] text-slate-500">{section.description}</p>
        </div>
        <span className="shrink-0 rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium text-slate-400">
          {visible.length}
        </span>
      </div>
    );

    if (layout === "inline") {
      return (
        <>
          {header}
          {visible.map((option) => (
            <ProtectionOptionRow
              key={option.id}
              option={option}
              onToggle={onToggle}
              onActionChange={onActionChange}
              onLevelToggle={onLevelToggle}
            />
          ))}
        </>
      );
    }

    return (
      <section className="border-b border-white/[0.05] pb-4 last:border-0 last:pb-0">
        {header}
        <div className="settings-options-grid overflow-visible">
          {visible.map((option) => (
            <ProtectionOptionRow
              key={option.id}
              option={option}
              onToggle={onToggle}
              onActionChange={onActionChange}
              onLevelToggle={onLevelToggle}
            />
          ))}
        </div>
      </section>
    );
  },
);

ProtectionSearchSectionBlock.displayName = "ProtectionSearchSectionBlock";

export const ProtectionSearchResults = memo(
  ({ query, sections, categoryStates, categorySetters, matchCounts }: ProtectionSearchResultsProps) => {
    const sectionsWithMatches = sections.filter((s) => (matchCounts[s.key] || 0) > 0);
    const totalMatches = sectionsWithMatches.reduce((n, s) => n + (matchCounts[s.key] || 0), 0);
    const trimmedQuery = query.trim();

    if (!sectionsWithMatches.length) {
      return (
        <p className="py-12 text-center text-sm text-slate-500">
          No results for &quot;{trimmedQuery}&quot;. Try another name (e.g. &quot;Noclip&quot;, &quot;Godmode&quot;,
          &quot;SuperJump&quot;).
        </p>
      );
    }

    return (
      <div className="settings-card flex min-h-0 flex-1 flex-col" data-settings-search="unified-v2">
        <div className="settings-card-header border-sky-500/20 bg-sky-500/[0.06]">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-sky-500/20 bg-sky-500/10 text-sky-400">
            <Search className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-white">Search results</h2>
            <p className="truncate text-[11px] text-slate-500">
              {totalMatches} match{totalMatches === 1 ? "" : "es"} in Player, Weapons, Network, etc. — all shown below
            </p>
          </div>
          <span className="ml-auto shrink-0 rounded-full border border-sky-500/25 bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-300">
            {trimmedQuery}
          </span>
        </div>

        <div className="settings-scroll-pane min-h-0 flex-1 p-3">
          <div className="settings-options-grid overflow-visible">
            {sectionsWithMatches.map((section) => (
              <ProtectionSearchSectionBlock
                key={section.key}
                section={section}
                query={query}
                options={categoryStates[section.key]}
                setOptions={categorySetters[section.key]}
                layout="inline"
              />
            ))}
          </div>
        </div>
      </div>
    );
  },
);

ProtectionSearchResults.displayName = "ProtectionSearchResults";
