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

Capture the popup over a real tab, in **both light and dark**, for each site:

- `popup-gmail-light.png` / `popup-gmail-dark.png`
- `popup-grafana-light.png` / `popup-grafana-dark.png`
- `popup-slack-light.png` / `popup-slack-dark.png`

Optionally one wide "before/after" showing a tab following an OS theme flip.

Drop the finished 1280×800 PNGs in this folder.
