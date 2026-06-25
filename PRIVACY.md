# Privacy Policy — Sync Theme

_Last updated: 25 June 2026_

Sync Theme is a Chrome extension that switches Slack and Grafana between light
and dark mode to match your operating system's appearance setting.

## Summary

Sync Theme does **not** collect, transmit, sell, or share any personal or
browsing data. It has no servers, no analytics, and no third-party services.

## What the extension accesses

- **On the Slack and Grafana pages it runs on**, it reads and sets that site's
  own light/dark theme setting (through the page's own storage and built-in
  controls). It does not read your messages, dashboards, or other page content.
- **Extension settings** — your on/off toggles and any self-hosted domains you
  add — are stored using Chrome's `storage` API. The on/off preferences live in
  `chrome.storage.sync`, which Chrome may synchronize across your own signed-in
  devices; the self-hosted domain list is stored locally on your device. This
  data is never sent to us or to any third party.

## Host permissions

- The extension runs automatically only on Slack (`*.slack.com`) and Grafana
  (`*.grafana.net`, `grafana.com`) pages.
- The optional "all sites" host permission is **never used automatically**. It is
  requested only when you explicitly add a self-hosted instance domain on the
  options page — one domain at a time — and you approve each one through Chrome's
  permission prompt. The extension then runs only on the domains you approved.

## Data collection

None.

## Changes

Any updates to this policy will be published in this file in the project
repository.

## Contact

Questions or concerns? Open an issue at
<https://github.com/sideprojects-dee/sync-theme/issues>.
