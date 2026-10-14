import { Fragment, type ReactNode } from "react";
import { Link } from "react-router-dom";

/** Strip corrupted punctuation that appears when source files were saved with wrong encoding. */
function sanitizeDocInline(input: string): string {
  return input
    .replace(/\uFFFD/g, " - ")
    .replace(/\u2014/g, " - ")
    .replace(/\u2013/g, "-")
    .replace(/\u2192/g, "->")
    .replace(/(\*\*[^*]+\*\*)\s+\?\s+/g, "$1 > ")
    .replace(/([a-zA-Z0-9\*\]`\)])(?:\s+)\?(?:\s+)(?=[a-zA-Z\*\[`\(])/g, "$1 - ");
}

/**
 * Renders a small subset of inline markdown used in doc content:
 *   `code`        -> inline code span
 *   **bold**      -> bold text
 *   [label](href) -> link (internal "/..." links use the router)
 *
 * The parser is deliberately simple and handles non-overlapping tokens.
 */

type Segment =
  | { type: "text"; value: string }
  | { type: "code"; value: string }
  | { type: "bold"; value: string }
  | { type: "link"; label: string; href: string };

const TOKEN = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\[[^\]]+\]\([^)]+\))/g;

function parseInline(input: string): Segment[] {
  const segments: Segment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  TOKEN.lastIndex = 0;
  while ((match = TOKEN.exec(input)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", value: input.slice(lastIndex, match.index) });
    }
    const [token] = match;
    if (token.startsWith("`")) {
      segments.push({ type: "code", value: token.slice(1, -1) });
    } else if (token.startsWith("**")) {
      segments.push({ type: "bold", value: token.slice(2, -2) });
    } else {
      const linkMatch = /\[([^\]]+)\]\(([^)]+)\)/.exec(token);
      if (linkMatch) {
        segments.push({ type: "link", label: linkMatch[1], href: linkMatch[2] });
      }
    }
    lastIndex = match.index + token.length;
  }
  if (lastIndex < input.length) {
    segments.push({ type: "text", value: input.slice(lastIndex) });
  }
  return segments;
}

export function DocText({ children }: { children: string }): ReactNode {
  const segments = parseInline(sanitizeDocInline(children));
  return (
    <>
      {segments.map((segment, i) => {
        switch (segment.type) {
          case "code":
            return (
              <code
                key={i}
                className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-primary"
              >
                {segment.value}
              </code>
            );
          case "bold":
            return (
              <strong key={i} className="font-semibold text-foreground">
                {segment.value}
              </strong>
            );
          case "link": {
            const internal = segment.href.startsWith("/");
            if (internal) {
              return (
                <Link
                  key={i}
                  to={segment.href}
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  {segment.label}
                </Link>
              );
            }
            return (
              <a
                key={i}
                href={segment.href}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                {segment.label}
              </a>
            );
          }
          default:
            return <Fragment key={i}>{segment.value}</Fragment>;
        }
      })}
    </>
  );
}
