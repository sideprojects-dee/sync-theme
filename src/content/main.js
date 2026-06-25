// Content-script orchestrator. Runs on candidate Slack/Grafana pages and, when
// the extension is enabled and this is a verified instance, applies the system
// light/dark theme to the site — both on live OS changes and once at load.

import { getEnabled } from "../lib/storage.js";
import { detectSite } from "./sites.js";
import { applySlackTheme, currentSlackTheme } from "./apply-slack.js";
import { applyGrafanaTheme, detectGrafanaTheme } from "./apply-grafana.js";

const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
let initialised = false;

/** @type {Record<import("./sites.js").SiteId, (theme: "light" | "dark") => void>} */
const APPLIERS = {
  slack: applySlackTheme,
  grafana: applyGrafanaTheme,
};

/** @type {Record<import("./sites.js").SiteId, () => "light" | "dark" | null>} */
const CURRENT_THEME = {
  slack: currentSlackTheme,
  grafana: detectGrafanaTheme,
};

function desiredTheme() {
  return darkQuery.matches ? "dark" : "light";
}

async function onSystemThemeChange() {
  // Disabled → do nothing at all.
  if (!(await getEnabled())) return;

  // Not a verified Slack/Grafana instance → do nothing.
  const site = detectSite();
  if (!site) return;

  APPLIERS[site](desiredTheme());
}

// Load-time sync: an already-open tab never receives a `change` event, so when
// the content script starts we poll until the (single-page) app is ready, then
// correct the theme only if it differs from the system. Bounded so we stop
// polling on non-target pages (e.g. marketing) and slow loads.
const LOAD_SYNC_INTERVAL_MS = 1000;
const LOAD_SYNC_TIMEOUT_MS = 15000;

async function syncOnLoad() {
  if (!(await getEnabled())) return;
  const deadline = Date.now() + LOAD_SYNC_TIMEOUT_MS;

  const tick = () => {
    const site = detectSite();
    if (site) {
      const target = desiredTheme();
      // Already showing the target → stop. (If unreadable, the applier no-ops.)
      if (CURRENT_THEME[site]() === target) return;
      APPLIERS[site](target);
    }
    if (Date.now() < deadline) setTimeout(tick, LOAD_SYNC_INTERVAL_MS);
  };
  tick();
}

export function init() {
  if (initialised) return;
  initialised = true;
  darkQuery.addEventListener("change", onSystemThemeChange);
  syncOnLoad();
}
