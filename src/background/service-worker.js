// Background entry point.
//
// Runs as a service worker in Chrome and a (non-persistent) event page in
// Firefox — both load this module via the dual `background` keys in the manifest.
// Either way it is event-driven, so all state lives in extension storage, not in
// module-level variables. It seeds the default `enabled` flag and keeps the
// dynamically-registered content scripts for custom domains in sync with the
// stored list and granted permissions.

import { ext } from "../lib/ext.js";
import { DEFAULTS } from "../lib/storage.js";
import { reconcile } from "../lib/custom-domains.js";

ext.runtime.onInstalled.addListener(async () => {
  const { enabled } = await ext.storage.sync.get("enabled");
  if (typeof enabled === "undefined") {
    await ext.storage.sync.set({ enabled: DEFAULTS.enabled });
  }
  await reconcile();
});

// Re-assert dynamic registrations on browser start and whenever the set of
// granted host permissions changes (including external revocation).
ext.runtime.onStartup.addListener(reconcile);
ext.permissions.onAdded.addListener(reconcile);
ext.permissions.onRemoved.addListener(reconcile);
