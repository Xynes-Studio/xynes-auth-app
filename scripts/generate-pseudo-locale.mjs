/**
 * Generate the en-XA pseudo-locale catalog by walking the en-US catalogs
 * and applying `pseudoLocalizeMessage` to every leaf string while preserving
 * ICU placeholders.
 *
 * Run with: node scripts/generate-pseudo-locale.mjs
 */
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { pseudoLocalizeMessage } from "@xynes/i18n";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const SOURCE_DIR = resolve(REPO_ROOT, "messages/en-US");
const TARGET_DIR = resolve(REPO_ROOT, "messages/en-XA");

function transform(value) {
  if (typeof value === "string") {
    return pseudoLocalizeMessage(value);
  }
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    out[k] = transform(v);
  }
  return out;
}

async function main() {
  await mkdir(TARGET_DIR, { recursive: true });
  const files = await readdir(SOURCE_DIR);
  const jsonFiles = files.filter(
    (f) => f.endsWith(".json") && !f.endsWith(".meta.json"),
  );

  for (const file of jsonFiles) {
    const source = await readFile(join(SOURCE_DIR, file), "utf8");
    const parsed = JSON.parse(source);
    const transformed = transform(parsed);
    const out = `${JSON.stringify(transformed, null, 2)}\n`;
    await writeFile(join(TARGET_DIR, file), out, "utf8");
    console.log(`Wrote ${file}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
