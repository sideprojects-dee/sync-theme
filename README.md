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
- **Self-hosted Grafana (optional)** — Grafana Cloud works out of the box. If you
  run a self-hosted instance on your own domain, add it on the **options page**.
  Each domain is gated behind a one-time Chrome permission prompt and served by a
  dynamically-registered content script that persists across restarts. Pages are
  still verified as real Grafana by their app markers before anything happens.
- **On system theme change** — when enabled *and* on a verified instance:
  - **Slack** (`src/content/apply-slack.js`): applied live, no reload. Reconciles
    Slack's two theming layers — toggles the master palette class
    (`body.sk-client-theme--dark`) and strips the sidebar-inversion classes so a
    colored sidebar follows the color mode instead of rendering "inverse". Also
    writes Slack's own storage (`slack-client-theme`, plus each workspace's
    `iaTheming.mode`) so the choice persists across reloads and new tabs.

    > Note: in light mode the sidebar follows the mode (light), rather than
    > keeping a theme's dark/inverted sidebar. That's intentional for a
    > follow-the-system extension.
  - **Grafana** (`src/content/apply-grafana.js`): detects the rendered theme via
    the CSS `color-scheme` on `<html>`, and if it differs from the target, fires
    Grafana's built-in toggle shortcut (the keys `c` then `t`). If a form field
    is focused (Grafana suppresses shortcuts while typing), it briefly blurs it
    for the keypress and restores focus.
- **At load** — an already-open tab gets no `change` event, so on start the
  content script polls until the app is ready and corrects the theme *only if it
  differs* from the system (it won't disturb a tab that's already right).

## Project layout

```
manifest.json              # MV3 manifest
icons/                     # Extension icons (icon.svg is the source of truth)
src/
  lib/
    storage.js             # Shared `enabled` state (popup + worker + content)
    custom-domains.js      # Self-hosted Grafana domains: validate, store, register
  background/
    service-worker.js      # MV3 worker; seeds defaults, reconciles registrations
  popup/
    popup.{html,css,js}    # Toolbar popup with the Enabled toggle + options link
  options/
    options.{html,css,js}  # Manage the custom Grafana domain list
  content/
    bootstrap.js           # Classic entry; dynamically imports the ES modules
    main.js                # Orchestrates: enabled? verified site? apply theme
    sites.js               # Verifies Slack/Grafana instances vs. marketing
    apply-slack.js         # Applies the light/dark theme to Slack, live
    apply-grafana.js       # Detects Grafana's theme + fires its toggle shortcut
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
