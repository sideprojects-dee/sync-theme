// Content-script orchestrator. On supported pages it applies the system
// light/dark theme via the matching site adapter — on live OS changes, when the
// relevant setting is toggled on, and once at load.

import { getSettings, siteIsEnabled, onSettingsChanged } from "../lib/storage.js";
import { detectSite } from "./sites/index.js";

const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
let initialised = false;
let unsubscribeSettings = null;

function desiredTheme() {
  return darkQuery.matches ? "dark" : "light";
}

// When the extension reloads/updates, content scripts already on the page are
// orphaned: chrome.runtime.id goes undefined and any chrome.* call throws
// "Extension context invalidated". Detect that and stop touching chrome APIs.
function isConnected() {
  return Boolean(chrome.runtime?.id);
}

function teardown() {
  darkQuery.removeEventListener("change", onSystemThemeChange);
  unsubscribeSettings?.();
}

/**
 * Bring the current site into line with the system theme.
 * @returns {Promise<boolean>} whether load-time polling should keep going
 *   (site not ready yet, or just applied and awaiting verification).
 */
async function syncOnce() {
  if (!isConnected()) {
    teardown();
    return false;
  }

  let settings;
  try {
    settings = await getSettings();
  } catch {
    teardown(); // context invalidated mid-call
    return false;
  }

  const site = detectSite();
  if (!site) return true; // not a verified instance yet → keep polling at load
  if (!siteIsEnabled(settings, site.id)) return false; // off → nothing to do

  const target = desiredTheme();
  if (site.current() === target) return false; // already correct
  site.apply(target);
  return true; // applied — re-verify next tick (e.g. Grafana shortcut readiness)
}

function onSystemThemeChange() {
  syncOnce();
}

// Load-time sync: an already-open tab never receives a `change` event, so on
// start we poll until the (single-page) app is ready, then apply if needed.
// Bounded so we stop on non-target pages and slow loads.
const LOAD_SYNC_INTERVAL_MS = 1000;
const LOAD_SYNC_TIMEOUT_MS = 15000;

function syncOnLoad() {
  const deadline = Date.now() + LOAD_SYNC_TIMEOUT_MS;
  const tick = async () => {
    const keepGoing = await syncOnce();
    if (keepGoing && Date.now() < deadline) {
      setTimeout(tick, LOAD_SYNC_INTERVAL_MS);
    }
  };
  tick();
}

export function init() {
  if (initialised) return;
  initialised = true;
  darkQuery.addEventListener("change", onSystemThemeChange);
  // Re-sync when the master or a per-site toggle changes (so enabling a site
  // themes an already-open tab without waiting for the next OS change).
  unsubscribeSettings = onSettingsChanged(() => syncOnce());
  syncOnLoad();
}
