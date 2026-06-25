// Content-script orchestrator. Runs on candidate Slack/Grafana pages and, when
// the extension is enabled and this is a verified instance, applies the system
// light/dark theme to the site.

import { getEnabled } from "../lib/storage.js";
import { detectSite } from "./sites.js";
import { applySlackTheme } from "./apply-slack.js";
import { applyGrafanaTheme } from "./apply-grafana.js";

const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
let initialised = false;

/** @type {Record<import("./sites.js").SiteId, (theme: "light" | "dark") => void>} */
const APPLIERS = {
  slack: applySlackTheme,
  grafana: applyGrafanaTheme,
};

async function onSystemThemeChange() {
  // Disabled → do nothing at all.
  if (!(await getEnabled())) return;

  // Not a verified Slack/Grafana instance → do nothing.
  const site = detectSite();
  if (!site) return;

  const theme = darkQuery.matches ? "dark" : "light";
  APPLIERS[site](theme);
}

export function init() {
  if (initialised) return;
  initialised = true;
  darkQuery.addEventListener("change", onSystemThemeChange);
}
