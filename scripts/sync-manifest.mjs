// Regenerates the manifest's static content-script match patterns from the site
// adapters, so the adapter registry stays the single source of truth.
//
//   node scripts/sync-manifest.mjs          write manifest.json
//   node scripts/sync-manifest.mjs --check  exit non-zero if out of sync (CI)
//
// Safe to import the adapters here: they only touch the DOM inside their
// methods, not at module top level.

import { readFileSync, writeFileSync } from "node:fs";
import { SITES } from "../src/content/sites/index.js";

const manifestUrl = new URL("../manifest.json", import.meta.url);
const manifest = JSON.parse(readFileSync(manifestUrl, "utf8"));

const expected = [...new Set(SITES.flatMap((site) => site.matches))].sort();
const current = manifest.content_scripts?.[0]?.matches ?? [];
const inSync = JSON.stringify(current) === JSON.stringify(expected);

if (process.argv.includes("--check")) {
  if (!inSync) {
    console.error("manifest content_scripts matches are out of sync with the site adapters.");
    console.error("  expected:", expected);
    console.error("  found:   ", current);
    console.error("Run: npm run manifest");
    process.exit(1);
  }
  console.log("manifest in sync with site adapters.");
} else {
  manifest.content_scripts[0].matches = expected;
  writeFileSync(manifestUrl, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`Wrote ${expected.length} content_scripts match pattern(s):`);
  for (const pattern of expected) console.log("  " + pattern);
}
