# sync-theme

A Chrome extension that follows your system's light/dark theme and applies it to
the sites you choose. The goal: when I switch my OS between light and dark mode,
**Slack Web** and **Grafana Cloud** should switch with it.

> Status: early. A single **Enabled** toggle controls the whole extension. When
> enabled, on a verified Slack or Grafana instance, a system theme change shows a
> confirmation prompt. Actually re-theming the site is not implemented yet.

## Behavior

- **Enabled toggle** (popup) — when off, the extension does nothing at all. The
  flag is stored in `chrome.storage.sync`, so it follows your Chrome profile.
- **Where it runs** — only on pages verified to be a real Slack or Grafana
  instance (see `src/content/sites.js`), never their marketing/docs sites:
  - Slack: `app.slack.com` and workspace `*.slack.com` subdomains.
  - Grafana: `*.grafana.net` and other `grafana.com`/`grafana.net` URLs whose
    page is confirmed to be the Grafana app.
- **On system theme change** — when enabled *and* on a verified instance, a
  Shadow-DOM confirmation prompt asks whether to change the site's theme.

## Project layout

```
manifest.json              # MV3 manifest
icons/                     # Extension icons (icon.svg is the source of truth)
src/
  lib/
    storage.js             # Shared `enabled` state (popup + worker + content)
  background/
    service-worker.js      # MV3 worker; seeds the default `enabled` flag
  popup/
    popup.{html,css,js}    # Toolbar popup with the Enabled toggle
  content/
    bootstrap.js           # Classic entry; dynamically imports the ES modules
    main.js                # Orchestrates: enabled? verified site? on change → prompt
    sites.js               # Verifies Slack/Grafana instances vs. marketing
    prompt.js              # Shadow-DOM confirmation prompt
```

## Install locally (unpacked)

1. Open `chrome://extensions`.
2. Toggle **Developer mode** on (top-right).
3. Click **Load unpacked** and select this project's root folder.
4. Pin **Sync Theme** from the extensions menu and open the popup — it shows the
   current system theme and updates live when you switch.

After editing files, click the **reload** icon on the extension card in
`chrome://extensions` to pick up changes.

## Scripts

This project has no build step — Chrome loads the source directly. The optional
scripts require [ImageMagick](https://imagemagick.org) (`icons`) and `zip`
(`package`):

```sh
npm run icons      # Regenerate PNG icons from icons/icon.svg
npm run package    # Produce sync-theme.zip for the Chrome Web Store
```

## License

Apache-2.0 — see [LICENSE](LICENSE).
