import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Code,
  FileText,
  Fingerprint,
  Hash,
  type LucideIcon,
  Terminal,
 } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { searchDocs, type SearchResult, type SearchResultKind } from "@/data/docs";

interface DocSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const KIND_META: Record<
  SearchResultKind,
  { label: string; icon: LucideIcon; order: number }
> = {
  page: { label: "Pages", icon: FileText, order: 0 },
  command: { label: "Commands", icon: Terminal, order: 1 },
  permission: { label: "Permissions", icon: Fingerprint, order: 2 },
  section: { label: "Sections", icon: Hash, order: 3 },
  code: { label: "Code", icon: Code, order: 4 },
};

export function DocSearch({ open, onOpenChange }: DocSearchProps) {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const grouped = useMemo(() => {
    const results = searchDocs(query);
    const groups = new Map<SearchResultKind, SearchResult[]>();
    for (const result of results) {
      const list = groups.get(result.kind) ?? [];
      list.push(result);
      groups.set(result.kind, list);
    }
    return [...groups.entries()].sort(
      (a, b) => KIND_META[a[0]].order - KIND_META[b[0]].order,
    );
  }, [query]);

  const go = (result: SearchResult) => {
    const target = result.sectionId
      ? `/documentation/${result.pageId}#section-${result.sectionId}`
      : `/documentation/${result.pageId}`;
    onOpenChange(false);
    setQuery("");
    navigate(target);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search pages, commands, permissions, code…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList className="max-h-[60vh]">
        {query.trim() === "" ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            Type to search across all documentation.
          </p>
        ) : (
          <CommandEmpty>No results for “{query}”.</CommandEmpty>
        )}
        {grouped.map(([kind, results]) => {
          const meta = KIND_META[kind];
          const Icon = meta.icon;
          return (
            <CommandGroup key={kind} heading={meta.label}>
              {results.map((result, i) => (
                <CommandItem
                  key={`${kind}-${result.pageId}-${result.sectionId ?? ""}-${i}`}
                  value={`${kind}-${result.title}-${i}`}
                  onSelect={() => go(result)}
                  className="flex items-start gap-3"
                >
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={
                          kind === "command" || kind === "permission" || kind === "code"
                            ? "truncate font-mono text-[0.85em] text-primary"
                            : "truncate font-medium text-foreground"
                        }
                      >
                        {result.title}
                      </span>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {result.snippet || result.pageTitle}
                    </p>
                  </div>
                  <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground/70">
                    {result.pageTitle}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          );
        })}
      </CommandList>
    </CommandDialog>
  );
}
