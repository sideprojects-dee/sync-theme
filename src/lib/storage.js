// Single source of truth for the extension's settings.
//
// Lives in chrome.storage.sync so choices ride along with the user's Chrome
// profile. Two keys:
//   enabled      boolean   master on/off
//   siteEnabled  { [id]: boolean }   per-site overrides; a missing id means on
//
// Imported by the popup, the service worker, and (via the content-script
// bootstrap) the orchestrator.

/** @type {{ enabled: boolean }} */
export const DEFAULTS = { enabled: true };

/** @returns {Promise<{ enabled: boolean, siteEnabled: Record<string, boolean> }>} */
export async function getSettings() {
  return chrome.storage.sync.get({ enabled: DEFAULTS.enabled, siteEnabled: {} });
}

/** @param {boolean} value */
export async function setEnabled(value) {
  await chrome.storage.sync.set({ enabled: Boolean(value) });
}

/** @param {string} id @param {boolean} value */
export async function setSiteEnabled(id, value) {
  const { siteEnabled } = await chrome.storage.sync.get({ siteEnabled: {} });
  await chrome.storage.sync.set({
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
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
