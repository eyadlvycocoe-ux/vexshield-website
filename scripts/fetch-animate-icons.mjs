import { writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const outDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "src",
  "components",
  "animate-icons",
);

// kebab-case names available in the animate-ui registry that we want to add
const wanted = [
  "activity",
  "arrow-left",
  "arrow-right",
  "bell",
  "bot",
  "check",
  "chevron-left",
  "chevron-right",
  "chevron-up",
  "circle-check",
  "circle-x",
  "clock",
  "clock-3",
  "cog",
  "copy",
  "ellipsis",
  "external-link",
  "gauge",
  "hammer",
  "loader-circle",
  "lock",
  "message-circle",
  "message-square",
  "panel-left",
  "pause",
  "play",
  "plus",
  "refresh-cw",
  "rotate-ccw",
  "send",
  "signal",
  "signal-high",
  "signal-low",
  "signal-medium",
  "sparkles",
  "star",
  "toggle-left",
  "trash-2",
  "upload",
  "user",
  "wifi",
  "x",
];

function transform(content) {
  return content
    .replace(/from\s+["']@\/registry\/icons\/icon["']/g, "from './icon'")
    .replace(
      /from\s+["']@\/components\/animate-ui\/icons\/icon["']/g,
      "from './icon'",
    )
    .replace(/from\s+["']@\/lib\/utils["']/g, "from '@/lib/utils'");
}

const results = { ok: [], skip: [], fail: [] };

for (const name of wanted) {
  const dest = path.join(outDir, `${name}.tsx`);
  if (existsSync(dest)) {
    results.skip.push(name);
    continue;
  }
  try {
    const res = await fetch(`https://animate-ui.com/r/icons-${name}.json`);
    if (!res.ok) {
      results.fail.push(`${name} (HTTP ${res.status})`);
      continue;
    }
    const json = await res.json();
    const file = json.files?.[0];
    if (!file?.content) {
      results.fail.push(`${name} (no content)`);
      continue;
    }
    writeFileSync(dest, transform(file.content), "utf8");
    results.ok.push(name);
  } catch (err) {
    results.fail.push(`${name} (${err.message})`);
  }
}

console.log("OK:", results.ok.length, results.ok.join(", "));
console.log("SKIP:", results.skip.length, results.skip.join(", "));
console.log("FAIL:", results.fail.length, results.fail.join(", "));
