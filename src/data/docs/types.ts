import type { ComponentType } from "react";

/**
 * Icon component type. Accepts both lucide's forwardRef icons and the project's
 * animated function-component icons (whose props differ from lucide's), so it is
 * intentionally permissive.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type IconComponent = ComponentType<any>;

/** Visual style for an inline callout block. */
export type DocCalloutKind = "note" | "tip" | "info" | "warning" | "danger";

/**
 * Inline text supports a tiny subset of markdown handled by the renderer:
 *   `code`  -> inline code span
 *   **bold** -> bold
 *   [label](href) -> link (internal links starting with "/" use the router)
 */
export type DocInline = string;

export interface DocStep {
  title: string;
  description: DocInline;
  code?: { language: string; content: string; filename?: string };
}

export type DocBlock =
  | { type: "paragraph"; text: DocInline; lead?: boolean }
  | { type: "heading"; level: 3 | 4; text: string }
  | { type: "list"; ordered?: boolean; items: DocInline[] }
  | { type: "code"; language: string; code: string; filename?: string }
  | { type: "callout"; kind: DocCalloutKind; title?: string; body: DocInline }
  | {
      type: "table";
      variant?: "default" | "commands" | "permissions";
      columns: string[];
      rows: string[][];
    }
  | { type: "image"; src: string; alt: string; caption?: string }
  | { type: "video"; src?: string; youtubeId?: string; title?: string }
  | { type: "steps"; steps: DocStep[] };

export interface DocSection {
  /** Anchor id, unique within the page. */
  id: string;
  /** Label shown in the table of contents. */
  title: string;
  icon?: IconComponent;
  blocks: DocBlock[];
}

export interface DocPage {
  /** URL slug, unique across all pages. */
  id: string;
  title: string;
  description: string;
  icon?: IconComponent;
  /** ISO date string, rendered as "last modified". */
  lastModified: string;
  /** Optional short label shown next to the title (e.g. "Anticheat"). */
  badge?: string;
  tags?: string[];
  sections: DocSection[];
}

export interface DocCategory {
  id: string;
  label: string;
  /** Emoji prefix shown in the sidebar header. */
  emoji?: string;
  icon?: IconComponent;
  pages: DocPage[];
}
