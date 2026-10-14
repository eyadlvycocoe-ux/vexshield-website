import { existsSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const requiredPackages = ["react-globe.gl", "three", "motion"];

const missing = requiredPackages.filter(
  (name) => !existsSync(path.join(root, "node_modules", name, "package.json")),
);

if (missing.length === 0) {
  process.exit(0);
}

console.log(`[ensure-deps] Missing packages: ${missing.join(", ")} — running npm install…`);
execSync("npm install --no-audit --no-fund", { stdio: "inherit", cwd: root });
