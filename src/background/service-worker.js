// Background service worker (Manifest V3).
//
// MV3 service workers are event-driven and may be terminated when idle, so all
// state must live in chrome.storage rather than module-level variables. For now
// this only seeds the default `enabled` flag on first install; the per-site
// theme sync runs in the content scripts.

import { DEFAULTS } from "../lib/storage.js";

chrome.runtime.onInstalled.addListener(async () => {
  const { enabled } = await chrome.storage.sync.get("enabled");
  if (typeof enabled === "undefined") {
    await chrome.storage.sync.set({ enabled: DEFAULTS.enabled });
  }
});
