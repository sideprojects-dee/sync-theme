// Manages the user's optional list of self-hosted instance domains.
//
// Hosted services (Grafana Cloud, Slack, etc.) are handled by the static content
// script in the manifest and need no setup. This module is only for self-hosted
// instances on the user's own domains: each is gated behind an optional host
// permission and served by a dynamically-registered content script that persists
// across browser restarts. The injected script is the same `bootstrap.js`; the
// content-script site detection picks whichever adapter matches the page (so
// only domains running a supported app actually get themed).
//
// The list is stored in local extension storage (not sync) because the matching
// host permission is granted per-device — syncing the list wouldn't sync it.

import { ext } from "./ext.js";

const STORAGE_KEY = "customDomains";
const SCRIPT_PREFIX = "custom-domain-";

// A fully-qualified domain name: 2+ labels, no scheme/port/path, no wildcards.
const FQDN_RE =
  /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;

/** Best-effort cleanup so a pasted URL still yields a bare host. */
export function normalizeFqdn(input) {
  let value = String(input ?? "").trim().toLowerCase();
  if (value.includes("://")) {
    try {
      value = new URL(value).hostname;
    } catch {
      // fall through and validate what's left
    }
  }
  return value.replace(/\/.*$/, "").replace(/:\d+$/, "");
}

export function isValidFqdn(fqdn) {
  return FQDN_RE.test(fqdn);
}

export function originPattern(fqdn) {
  return `https://${fqdn}/*`;
}

function scriptId(fqdn) {
  return SCRIPT_PREFIX + fqdn;
}

export async function getDomains() {
  const data = await ext.storage.local.get({ [STORAGE_KEY]: [] });
  return data[STORAGE_KEY];
}

async function saveDomains(domains) {
  await ext.storage.local.set({ [STORAGE_KEY]: [...new Set(domains)].sort() });
}

export function hasPermission(fqdn) {
  return ext.permissions.contains({ origins: [originPattern(fqdn)] });
}

/**
 * Request the host permission for a domain. Must be called directly from a user
 * gesture (e.g. a click handler) with no preceding `await`, or the browser
 * rejects it.
 * @returns {Promise<boolean>} whether the user granted it.
 */
export function requestPermission(fqdn) {
  return ext.permissions.request({ origins: [originPattern(fqdn)] });
}

async function register(fqdn) {
  try {
    await ext.scripting.registerContentScripts([
      {
        id: scriptId(fqdn),
        matches: [originPattern(fqdn)],
        js: ["src/content/bootstrap.js"],
        runAt: "document_idle",
        persistAcrossSessions: true,
      },
    ]);
  } catch {
    // Already registered (duplicate id) or a transient error — reconcile fixes it.
  }
}

async function unregister(fqdn) {
  try {
    await ext.scripting.unregisterContentScripts({ ids: [scriptId(fqdn)] });
  } catch {
    // Not registered — nothing to do.
  }
}

/**
 * Persist a domain and register its content script. The host permission must
 * already be granted (see `requestPermission`). Idempotent.
 */
export async function enableDomain(fqdn) {
  await register(fqdn);
  const domains = await getDomains();
  if (!domains.includes(fqdn)) {
    await saveDomains([...domains, fqdn]);
  }
}

/** Forget a domain: unregister, drop the permission, remove from the list. */
export async function removeDomain(fqdn) {
  await unregister(fqdn);
  try {
    await ext.permissions.remove({ origins: [originPattern(fqdn)] });
  } catch {
    // Permission already gone — ignore.
  }
  const domains = await getDomains();
  await saveDomains(domains.filter((d) => d !== fqdn));
}

/**
 * Make the registered content scripts match the stored list and current grants.
 * Run on startup/install and whenever permissions change, so the extension
 * self-heals after restarts or externally-revoked permissions.
 */
export async function reconcile() {
  const domains = await getDomains();
  let registered = [];
  try {
    registered = await ext.scripting.getRegisteredContentScripts();
  } catch {
    registered = [];
  }
  const ourIds = new Set(
    registered.filter((s) => s.id.startsWith(SCRIPT_PREFIX)).map((s) => s.id),
  );
  const wantedIds = new Set();

  for (const fqdn of domains) {
    if (await hasPermission(fqdn)) {
      wantedIds.add(scriptId(fqdn));
      if (!ourIds.has(scriptId(fqdn))) await register(fqdn);
    }
  }

  // Drop registrations for domains removed from the list or no longer granted.
  for (const id of ourIds) {
    if (!wantedIds.has(id)) {
      try {
        await ext.scripting.unregisterContentScripts({ ids: [id] });
      } catch {
        // ignore
      }
    }
  }
}
