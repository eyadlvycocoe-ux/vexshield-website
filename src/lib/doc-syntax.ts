/**
 * Lightweight, dependency-free syntax highlighter for the documentation code
 * blocks. It tokenises a handful of languages used across the docs (lua, json,
 * bash/shell, cfg/ini) into spans with semantic class names. The classes map to
 * colors defined in the CodeBlock component.
 *
 * This is intentionally small: it favours predictable output for the snippets
 * we ship over being a full grammar. Unknown languages fall back to plain text.
 */

export type TokenType =
  | "plain"
  | "comment"
  | "string"
  | "number"
  | "keyword"
  | "boolean"
  | "function"
  | "property"
  | "operator"
  | "punctuation"
  | "variable";

export interface Token {
  type: TokenType;
  value: string;
}

type Rule = { type: TokenType; pattern: RegExp };

const LUA_KEYWORDS = new Set([
  "and", "break", "do", "else", "elseif", "end", "false", "for", "function",
  "goto", "if", "in", "local", "nil", "not", "or", "repeat", "return", "then",
  "true", "until", "while",
]);

const BASH_KEYWORDS = new Set([
  "if", "then", "else", "elif", "fi", "for", "while", "do", "done", "case",
  "esac", "function", "in", "return", "export", "source", "sudo", "cd", "echo",
  "set", "ensure", "start", "restart", "stop",
]);

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Generic regex-driven tokenizer. Rules are tried in order at each position. */
function tokenizeWithRules(source: string, rules: Rule[]): Token[] {
  const tokens: Token[] = [];
  let index = 0;

  outer: while (index < source.length) {
    for (const rule of rules) {
      rule.pattern.lastIndex = index;
      const match = rule.pattern.exec(source);
      if (match && match.index === index && match[0].length > 0) {
        tokens.push({ type: rule.type, value: match[0] });
        index += match[0].length;
        continue outer;
      }
    }
    // No rule matched: consume one character as plain text.
    const last = tokens[tokens.length - 1];
    if (last && last.type === "plain") {
      last.value += source[index];
    } else {
      tokens.push({ type: "plain", value: source[index] });
    }
    index += 1;
  }

  return tokens;
}

function highlightLua(source: string): Token[] {
  const rules: Rule[] = [
    { type: "comment", pattern: /--\[\[[\s\S]*?\]\]|--[^\n]*/y },
    { type: "string", pattern: /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\[\[[\s\S]*?\]\]/y },
    { type: "number", pattern: /\b0x[\da-fA-F]+\b|\b\d+(?:\.\d+)?\b/y },
    { type: "function", pattern: /[A-Za-z_]\w*(?=\s*\()/y },
    { type: "operator", pattern: /[=<>~+\-*/%#^]+|\.\.|\.\.\./y },
    { type: "punctuation", pattern: /[{}[\]();,.:]/y },
    { type: "plain", pattern: /[A-Za-z_]\w*/y },
  ];
  return tokenizeWithRules(source, rules).map((token) => {
    if (token.type === "plain" && LUA_KEYWORDS.has(token.value)) {
      if (token.value === "true" || token.value === "false") return { ...token, type: "boolean" };
      if (token.value === "nil") return { ...token, type: "boolean" };
      return { ...token, type: "keyword" };
    }
    return token;
  });
}

function highlightJson(source: string): Token[] {
  const rules: Rule[] = [
    { type: "property", pattern: /"(?:\\.|[^"\\])*"(?=\s*:)/y },
    { type: "string", pattern: /"(?:\\.|[^"\\])*"/y },
    { type: "number", pattern: /-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b/y },
    { type: "boolean", pattern: /\b(?:true|false|null)\b/y },
    { type: "punctuation", pattern: /[{}[\]:,]/y },
  ];
  return tokenizeWithRules(source, rules);
}

function highlightBash(source: string): Token[] {
  const rules: Rule[] = [
    { type: "comment", pattern: /#[^\n]*/y },
    { type: "string", pattern: /"(?:\\.|[^"\\])*"|'[^']*'/y },
    { type: "variable", pattern: /\$\{?\w+\}?/y },
    { type: "number", pattern: /\b\d+(?:\.\d+)?\b/y },
    { type: "operator", pattern: /[=|&><]+/y },
    { type: "punctuation", pattern: /[{}[\]();,]/y },
    { type: "plain", pattern: /[A-Za-z_][\w-]*/y },
  ];
  return tokenizeWithRules(source, rules).map((token) => {
    if (token.type === "plain" && BASH_KEYWORDS.has(token.value)) {
      return { ...token, type: "keyword" };
    }
    return token;
  });
}

function highlightIni(source: string): Token[] {
  const rules: Rule[] = [
    { type: "comment", pattern: /[#;][^\n]*/y },
    { type: "keyword", pattern: /\[[^\]\n]*\]/y },
    { type: "property", pattern: /^[^\s=:]+(?=\s*[:=])/my },
    { type: "string", pattern: /"(?:\\.|[^"\\])*"/y },
    { type: "number", pattern: /\b\d+(?:\.\d+)?\b/y },
    { type: "operator", pattern: /[=:]/y },
  ];
  return tokenizeWithRules(source, rules);
}

const NO_HIGHLIGHT = new Set(["text", "txt", "plain", "", "log", "output"]);

export function highlightCode(code: string, language: string): Token[] {
  const lang = (language || "").toLowerCase();
  if (NO_HIGHLIGHT.has(lang)) return [{ type: "plain", value: code }];
  switch (lang) {
    case "lua":
      return highlightLua(code);
    case "json":
    case "json5":
      return highlightJson(code);
    case "bash":
    case "sh":
    case "shell":
    case "console":
      return highlightBash(code);
    case "ini":
    case "cfg":
    case "conf":
    case "toml":
      return highlightIni(code);
    default:
      return [{ type: "plain", value: code }];
  }
}

const TOKEN_CLASS: Record<TokenType, string> = {
  plain: "text-slate-200",
  comment: "text-slate-500 italic",
  string: "text-emerald-300",
  number: "text-amber-300",
  keyword: "text-sky-400",
  boolean: "text-fuchsia-300",
  function: "text-blue-300",
  property: "text-cyan-300",
  operator: "text-pink-300",
  punctuation: "text-slate-400",
  variable: "text-orange-300",
};

/** Render tokens to an HTML string. Optionally wraps query matches in <mark>. */
export function tokensToHtml(tokens: Token[], query?: string): string {
  const q = query?.trim().toLowerCase();
  return tokens
    .map((token) => {
      const cls = TOKEN_CLASS[token.type] ?? TOKEN_CLASS.plain;
      let value = escapeHtml(token.value);
      if (q && token.value.toLowerCase().includes(q)) {
        // Highlight matches inside the (already escaped) token value.
        const escapedQuery = escapeHtml(query!);
        const re = new RegExp(escapeRegExp(escapedQuery), "gi");
        value = value.replace(
          re,
          (m) => `<mark class="rounded bg-yellow-400/30 text-yellow-100">${m}</mark>`,
        );
      }
      return `<span class="${cls}">${value}</span>`;
    })
    .join("");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
