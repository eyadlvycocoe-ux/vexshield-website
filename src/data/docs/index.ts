import { DOC_CATEGORIES } from "./content";
import type { DocBlock, DocCategory, DocPage } from "./types";

export { DOC_CATEGORIES };
export type { DocBlock, DocCategory, DocPage } from "./types";

export interface FlatPage {
  page: DocPage;
  category: DocCategory;
  index: number;
}

/** All pages flattened in sidebar order, with their category and global index. */
export const FLAT_PAGES: FlatPage[] = (() => {
  const list: FlatPage[] = [];
  for (const category of DOC_CATEGORIES) {
    for (const page of category.pages) {
      list.push({ page, category, index: list.length });
    }
  }
  return list;
})();

export const DEFAULT_PAGE_ID = FLAT_PAGES[0]?.page.id ?? "introduction";

const PAGE_BY_ID = new Map(FLAT_PAGES.map((entry) => [entry.page.id, entry]));

export function getPage(id: string | undefined): FlatPage | undefined {
  if (!id) return undefined;
  return PAGE_BY_ID.get(id);
}

export function getAdjacentPages(id: string): { prev?: FlatPage; next?: FlatPage } {
  const entry = PAGE_BY_ID.get(id);
  if (!entry) return {};
  return {
    prev: FLAT_PAGES[entry.index - 1],
    next: FLAT_PAGES[entry.index + 1],
  };
}

/* -------------------------------------------------------------------------- */
/*  Search index                                                              */
/* -------------------------------------------------------------------------- */

export type SearchResultKind = "page" | "section" | "command" | "permission" | "code";

export interface SearchResult {
  kind: SearchResultKind;
  pageId: string;
  pageTitle: string;
  categoryLabel: string;
  /** Section anchor to scroll to, when applicable. */
  sectionId?: string;
  title: string;
  snippet: string;
  /** Lowercased haystack used for matching. */
  haystack: string;
}

function blockText(block: DocBlock): string {
  switch (block.type) {
    case "paragraph":
      return block.text;
    case "heading":
      return block.text;
    case "list":
      return block.items.join(" ");
    case "callout":
      return `${block.title ?? ""} ${block.body}`;
    case "code":
      return block.code;
    case "table":
      return [...block.columns, ...block.rows.flat()].join(" ");
    case "image":
      return `${block.alt} ${block.caption ?? ""}`;
    case "video":
      return block.title ?? "";
    case "steps":
      return block.steps
        .map((s) => `${s.title} ${s.description} ${s.code?.content ?? ""}`)
        .join(" ");
    default:
      return "";
  }
}

/** Build a flat, searchable index across pages, sections, commands and permissions. */
export const SEARCH_INDEX: SearchResult[] = (() => {
  const results: SearchResult[] = [];

  for (const { page, category } of FLAT_PAGES) {
    results.push({
      kind: "page",
      pageId: page.id,
      pageTitle: page.title,
      categoryLabel: category.label,
      title: page.title,
      snippet: page.description,
      haystack: `${page.title} ${page.description} ${(page.tags ?? []).join(" ")}`.toLowerCase(),
    });

    for (const section of page.sections) {
      results.push({
        kind: "section",
        pageId: page.id,
        pageTitle: page.title,
        categoryLabel: category.label,
        sectionId: section.id,
        title: section.title,
        snippet: page.title,
        haystack: `${section.title} ${section.blocks.map(blockText).join(" ")}`.toLowerCase(),
      });

      for (const block of section.blocks) {
        if (block.type === "code") {
          results.push({
            kind: "code",
            pageId: page.id,
            pageTitle: page.title,
            categoryLabel: category.label,
            sectionId: section.id,
            title: block.filename ?? `${block.language} snippet`,
            snippet: block.code.split("\n")[0]?.slice(0, 80) ?? "",
            haystack: block.code.toLowerCase(),
          });
        }

        if (block.type === "table" && block.variant === "commands") {
          for (const row of block.rows) {
            results.push({
              kind: "command",
              pageId: page.id,
              pageTitle: page.title,
              categoryLabel: category.label,
              sectionId: section.id,
              title: row[0],
              snippet: row[1] ?? "",
              haystack: row.join(" ").toLowerCase(),
            });
          }
        }

        if (block.type === "table" && block.variant === "permissions") {
          for (const row of block.rows) {
            results.push({
              kind: "permission",
              pageId: page.id,
              pageTitle: page.title,
              categoryLabel: category.label,
              sectionId: section.id,
              title: row[0],
              snippet: row[1] ?? "",
              haystack: row.join(" ").toLowerCase(),
            });
          }
        }
      }
    }
  }

  return results;
})();

export function searchDocs(query: string, limit = 24): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const terms = q.split(/\s+/).filter(Boolean);

  const scored = SEARCH_INDEX.map((result) => {
    let score = 0;
    for (const term of terms) {
      if (!result.haystack.includes(term)) {
        score = -1;
        break;
      }
      // Title matches rank higher than body matches.
      if (result.title.toLowerCase().includes(term)) score += 5;
      score += 1;
    }
    // Prefer pages/commands/permissions for direct lookups.
    if (result.kind === "command" || result.kind === "permission") score += 2;
    if (result.kind === "page") score += 1;
    return { result, score };
  }).filter((entry) => entry.score >= 0);

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((entry) => entry.result);
}
