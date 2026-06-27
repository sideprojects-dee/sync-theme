// Builds per-browser distribution packages from the single canonical manifest.
//
//   node scripts/package.mjs
//
// Chrome and Firefox disagree on the `background` key: Chrome MV3 wants
// `background.service_worker` and warns on anything else; Firefox 128 has no
// background service worker and wants `background.scripts` (an event page).
// Shipping both keys in one manifest is what triggers Chrome's
//   "Unrecognized manifest key 'background.scripts'"
// warning. So we keep one canonical manifest.json (dual, for dev load-unpacked on
// either browser) and strip it down per browser here, producing clean, warning-
// free zips:
//   sync-theme-chrome.zip    — service_worker only; no Firefox-only keys
//   sync-theme-firefox.zip   — scripts only
//   sync-theme-firefox.xpi   — same bytes as the Firefox zip
//
// Each package is staged under dist/<browser>/ (gitignored) and zipped from
// there so the manifest lands at the archive root as `manifest.json`.

import { execFileSync } from "node:child_process";
import {
  readFileSync,
  writeFileSync,
  copyFileSync,
  rmSync,
  mkdirSync,
  cpSync,
} from "node:fs";

const root = new URL("..", import.meta.url);
const path = (rel) => new URL(rel, root).pathname;

// Keep the manifest's content_scripts matches in sync with the adapters first.
execFileSync("node", [path("scripts/sync-manifest.mjs")], { stdio: "inherit" });

const base = JSON.parse(readFileSync(path("manifest.json"), "utf8"));

/**
 * Stage dist/<name> with a transformed manifest + the shared assets, then zip it.
 * @param {string} name  e.g. "chrome" | "firefox"
 * @param {(m: object) => void} transform  mutates a deep copy of the manifest
 * @returns {string} the zip filename (at the repo root)
 */
function build(name, transform) {
  const manifest = structuredClone(base);
  transform(manifest);

  const dir = path(`dist/${name}`);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  cpSync(path("icons"), `${dir}/icons`, { recursive: true });
  cpSync(path("src"), `${dir}/src`, { recursive: true });
  writeFileSync(`${dir}/manifest.json`, JSON.stringify(manifest, null, 2) + "\n");

  const zip = `sync-theme-${name}.zip`;
  rmSync(path(zip), { force: true });
  execFileSync(
    "zip",
    ["-r", "-X", path(zip), "manifest.json", "icons", "src", "-x", "*.DS_Store"],
    { cwd: dir, stdio: "inherit" },
  );
  return zip;
}

const chromeZip = build("chrome", (m) => {
  // Chrome uses service_worker; drop the Firefox event-page + gecko keys it
  // would otherwise warn about.
  delete m.background.scripts;
  delete m.browser_specific_settings;
});

const firefoxZip = build("firefox", (m) => {
  // Firefox 128 has no background service worker; drop it and keep `scripts`.
  delete m.background.service_worker;
  // Chrome-only key; AMO's linter flags it as unknown. Firefox uses
  // browser_specific_settings.gecko.strict_min_version instead.
  delete m.minimum_chrome_version;
});

// A .xpi is just the Firefox zip under another extension.
copyFileSync(path(firefoxZip), path("sync-theme-firefox.xpi"));

console.log(`\nBuilt:\n  ${chromeZip}\n  ${firefoxZip}\n  sync-theme-firefox.xpi`);
