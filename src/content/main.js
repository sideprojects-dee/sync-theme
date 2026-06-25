// Content-script orchestrator. Runs on candidate Slack/Grafana pages and, when
// the extension is enabled and this is a verified instance, prompts on every
// system light/dark change.

import { getEnabled } from "../lib/storage.js";
import { detectSite, SITE_LABELS } from "./sites.js";
import { showThemeChangePrompt } from "./prompt.js";

const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
let initialised = false;

async function onSystemThemeChange() {
  // 1. Disabled → do nothing at all.
  if (!(await getEnabled())) return;

  // 2. Not a verified Slack/Grafana instance → do nothing.
  const site = detectSite();
  if (!site) return;

  // 3. Enabled, on a verified site, theme changed → confirm intent.
  const theme = darkQuery.matches ? "dark" : "light";
  const confirmed = await showThemeChangePrompt({
    siteLabel: SITE_LABELS[site],
    theme,
  });

  // TODO: when confirmed, actually apply `theme` to the host site.
  console.log(
    `[sync-theme] ${site}: ${theme} theme ${confirmed ? "confirmed" : "dismissed"}`,
  );
}

export function init() {
  if (initialised) return;
  initialised = true;
  darkQuery.addEventListener("change", onSystemThemeChange);
}
