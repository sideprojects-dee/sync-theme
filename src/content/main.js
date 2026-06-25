// Content-script orchestrator. Runs on candidate Slack/Grafana pages and, when
// the extension is enabled and this is a verified instance, reacts to system
// light/dark changes.
//
// Sites with an applier (Slack) are themed automatically. Sites without one yet
// (Grafana) fall back to a confirmation prompt.

import { getEnabled } from "../lib/storage.js";
import { detectSite, SITE_LABELS } from "./sites.js";
import { showThemeChangePrompt } from "./prompt.js";
import { applySlackTheme } from "./apply-slack.js";

const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
let initialised = false;

/** @type {Partial<Record<import("./sites.js").SiteId, (theme: "light" | "dark") => void>>} */
const APPLIERS = {
  slack: applySlackTheme,
};

async function onSystemThemeChange() {
  // 1. Disabled → do nothing at all.
  if (!(await getEnabled())) return;

  // 2. Not a verified Slack/Grafana instance → do nothing.
  const site = detectSite();
  if (!site) return;

  const theme = darkQuery.matches ? "dark" : "light";

  // 3a. Sites we can drive directly → apply automatically, no prompt.
  const apply = APPLIERS[site];
  if (apply) {
    apply(theme);
    return;
  }

  // 3b. No applier yet → confirm intent so the behavior is visible.
  const confirmed = await showThemeChangePrompt({
    siteLabel: SITE_LABELS[site],
    theme,
  });
  console.log(
    `[sync-theme] ${site}: ${theme} theme ${confirmed ? "confirmed" : "dismissed"}`,
  );
}

export function init() {
  if (initialised) return;
  initialised = true;
  darkQuery.addEventListener("change", onSystemThemeChange);
}
