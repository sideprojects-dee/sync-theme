// Background service worker (Manifest V3).
//
// MV3 service workers are event-driven and may be terminated when idle, so all
// state must live in chrome.storage rather than module-level variables. It seeds
// the default `enabled` flag and keeps the dynamically-registered content scripts
// for custom Grafana domains in sync with the stored list and granted permissions.

import { DEFAULTS } from "../lib/storage.js";
import { reconcile } from "../lib/custom-domains.js";

chrome.runtime.onInstalled.addListener(async () => {
  const { enabled } = await chrome.storage.sync.get("enabled");
  if (typeof enabled === "undefined") {
    await chrome.storage.sync.set({ enabled: DEFAULTS.enabled });
  }
  await reconcile();
});

// Re-assert dynamic registrations on browser start and whenever the set of
// granted host permissions changes (including external revocation).
chrome.runtime.onStartup.addListener(reconcile);
chrome.permissions.onAdded.addListener(reconcile);
chrome.permissions.onRemoved.addListener(reconcile);
