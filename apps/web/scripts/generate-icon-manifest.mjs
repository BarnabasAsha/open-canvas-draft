// One-time generation script, not part of the normal build — run manually
// (`pnpm generate-icons`) whenever the icon set is intentionally refreshed.
// Reads @phosphor-icons/core's "regular"-weight SVGs plus its own icon
// metadata, and writes a single committed JSON manifest that the app loads
// lazily at runtime (see src/lib/iconManifest.ts). @phosphor-icons/core
// itself stays a devDependency only — the app never imports it directly, so
// the shipped bundle only ever carries our own distilled JSON, not the
// whole package.
import { createRequire } from "node:module";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

const { icons: iconMeta } = require("@phosphor-icons/core");
const corePkgDir = dirname(dirname(require.resolve("@phosphor-icons/core")));
const regularDir = join(corePkgDir, "assets", "regular");

const metaByName = new Map(iconMeta.map((entry) => [entry.name, entry]));

const manifest = [];
for (const fileName of readdirSync(regularDir)) {
  if (!fileName.endsWith(".svg")) continue;
  const name = fileName.replace(/\.svg$/, "");
  const meta = metaByName.get(name);
  if (!meta) {
    console.warn(`No metadata entry for icon "${name}" — skipping`);
    continue;
  }

  const svg = readFileSync(join(regularDir, fileName), "utf8");
  const viewBox = svg.match(/viewBox="([^"]+)"/)?.[1] ?? "0 0 256 256";
  const d = svg.match(/\sd="([^"]+)"/)?.[1];
  if (!d) {
    console.warn(`No path data found for icon "${name}" — skipping`);
    continue;
  }

  manifest.push({ name: meta.name, pascalName: meta.pascal_name, tags: meta.tags, viewBox, d });
}

manifest.sort((a, b) => a.name.localeCompare(b.name));

const outDir = join(__dirname, "..", "src", "assets", "icons");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, "manifest.json");
writeFileSync(outPath, JSON.stringify(manifest));

console.log(`Wrote ${manifest.length} icons to ${outPath}`);
