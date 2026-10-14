/**
 * IndexNow: notify Bing/Yandex/etc. after deploy or when important URLs change.
 *
 * 1) Generate a random key (32+ chars, hex is fine).
 * 2) Put the key in a file at the ROOT of your public site:
 *    website/public/<KEY>.txt  whose entire body is exactly <KEY> (one line).
 *    Vite copies public/ -> dist/, so production URL is https://YOURDOMAIN/<KEY>.txt
 * 3) Set env and run (from website/):
 *    INDEXNOW_KEY=<key> SITE_BASE=https://aircore.xyz node scripts/ping-indexnow.mjs
 *
 * Docs: https://www.indexnow.org/documentation
 */

const key = (process.env.INDEXNOW_KEY || "").trim();
const siteBase = (process.env.SITE_BASE || "https://aircore.xyz").replace(/\/$/, "");
const host = siteBase.replace(/^https?:\/\//i, "");

const defaultPaths = [
  "/",
  "/pricing",
  "/documentation",
  "/help-center",
  "/faqs",
  "/terms",
  "/privacy",
  "/refund",
];

const extra = (process.env.INDEXNOW_URLS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const paths = [...new Set([...defaultPaths, ...extra])];
const urlList = paths.map((p) => `${siteBase}${p.startsWith("/") ? p : `/${p}`}`);

if (!key) {
  console.error("Missing INDEXNOW_KEY. See header comment in scripts/ping-indexnow.mjs");
  process.exit(1);
}

const keyLocation = `${siteBase}/${key}.txt`;

const body = {
  host,
  key,
  keyLocation,
  urlList,
};

const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify(body),
});

const text = await res.text();
if (!res.ok) {
  console.error("IndexNow failed:", res.status, text);
  process.exit(1);
}
console.log("IndexNow OK:", res.status, text || "(empty body)");
