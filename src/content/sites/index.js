// The site-adapter registry — the single source of truth for supported sites.
//
// A site adapter bundles everything about one site:
//   id                    stable identifier (used as the settings key)
//   label                 human name for UI
//   matches               URL match patterns (drives the manifest via
//                         scripts/sync-manifest.mjs)
//   supportsCustomDomains whether users can add self-hosted instances
//   detect()              -> boolean   is this page that site? (DOM-verified)
//   current()             -> "light" | "dark" | null   the rendered theme
//   apply(theme)          -> void      switch the site to `theme`
//
// IMPORTANT: adapters must not touch the DOM at module top level — only inside
// their methods. That lets this module be imported without a DOM by the Node
// manifest-sync script and by the popup/options pages.
//
// To add a site: create ./<site>.js exporting an adapter, add it to SITES, then
// run `npm run manifest` to update the manifest's match patterns.

import { slack } from "./slack.js";
import { grafana } from "./grafana.js";

export const SITES = [slack, grafana];

/** @returns the adapter for the current page, or null. */
export function detectSite() {
  return SITES.find((site) => site.detect()) ?? null;
}

/** Behavior-free metadata for UI surfaces (popup, options). */
export const SITE_META = SITES.map(({ id, label, supportsCustomDomains }) => ({
  id,
  label,
  supportsCustomDomains,
}));
