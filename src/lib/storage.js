// Single source of truth for the extension's persisted state.
//
// Lives in chrome.storage.sync so the on/off choice rides along with the user's
// Chrome profile. Imported by the popup, the service worker, and (via the
// content-script bootstrap) the in-page modules.

/** @type {{ enabled: boolean }} */
export const DEFAULTS = { enabled: true };

/** @returns {Promise<boolean>} */
export async function getEnabled() {
  const { enabled } = await chrome.storage.sync.get({ enabled: DEFAULTS.enabled });
  return enabled;
}

/** @param {boolean} value */
export async function setEnabled(value) {
  await chrome.storage.sync.set({ enabled: Boolean(value) });
}

/**
 * Subscribe to changes of the `enabled` flag.
 * @param {(enabled: boolean) => void} callback
 * @returns {() => void} unsubscribe
 */
export function onEnabledChanged(callback) {
  const listener = (changes, area) => {
    if (area === "sync" && changes.enabled) {
      callback(changes.enabled.newValue);
    }
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
