# Store screenshots

Source images for the Chrome Web Store and AMO listings. These are **listing
assets, not extension files** — they're uploaded in each store's developer
dashboard and are deliberately excluded from the packaged extension (the
`scripts/package.mjs` allowlist only zips `manifest.json`, `icons`, and `src`).

## Requirements

- **Chrome Web Store**: at least one screenshot, **1280×800** (or 640×400) PNG.
- **AMO (Firefox)**: at least one screenshot; 1280×800 works there too.
- Use the same set for both stores.

## Shot list

Current set (all 1280×800):

- Grafana light + dark, on Chrome and Firefox.
- The custom-domain flow (add a self-hosted instance), as a 3-step sequence —
  this doubles as visual evidence of the optional, per-domain permission prompt.

**Gmail and Slack are intentionally omitted.** Screenshotting them means
capturing a real inbox or workspace, which would leak personal/private content,
and there's no test account that avoids that. Grafana (Grafana Play / a throwaway
instance) shows the same light/dark behavior without exposing anything private,
so it stands in for all three sites in the listing. Don't add Gmail/Slack shots.
