// Single source of truth for the extension's settings.
//
// Lives in the WebExtension sync storage so choices ride along with the user's
// browser profile. Two keys:
//   enabled      boolean   master on/off
//   siteEnabled  { [id]: boolean }   per-site overrides; a missing id means on
//
// Imported by the popup, the background worker, and (via the content-script
// bootstrap) the orchestrator.

import { ext } from "./ext.js";

/** @type {{ enabled: boolean }} */
export const DEFAULTS = { enabled: true };

/** @returns {Promise<{ enabled: boolean, siteEnabled: Record<string, boolean> }>} */
export async function getSettings() {
  return ext.storage.sync.get({ enabled: DEFAULTS.enabled, siteEnabled: {} });
}

/** @param {boolean} value */
export async function setEnabled(value) {
  await ext.storage.sync.set({ enabled: Boolean(value) });
}

/** @param {string} id @param {boolean} value */
export async function setSiteEnabled(id, value) {
  const { siteEnabled } = await ext.storage.sync.get({ siteEnabled: {} });
  await ext.storage.sync.set({
    siteEnabled: { ...siteEnabled, [id]: Boolean(value) },
  });
}

/**
 * A site is active when the master switch is on and the site isn't explicitly
 * turned off.
 * @param {{ enabled: boolean, siteEnabled: Record<string, boolean> }} settings
 * @param {string} id
 */
export function siteIsEnabled(settings, id) {
  return settings.enabled && settings.siteEnabled?.[id] !== false;
}

/**
 * Subscribe to settings changes (master or per-site).
 * @param {() => void} callback
 * @returns {() => void} unsubscribe
 */
export function onSettingsChanged(callback) {
  const listener = (changes, area) => {
    if (area === "sync" && (changes.enabled || changes.siteEnabled)) {
      callback();
    }
  };
  ext.storage.onChanged.addListener(listener);
  return () => ext.storage.onChanged.removeListener(listener);
}
