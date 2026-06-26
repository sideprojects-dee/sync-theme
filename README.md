# sync-theme

A browser extension for **Chrome and Firefox** that switches **Gmail**,
**Grafana**, and **Slack** between light and dark to match your operating
system's theme. It works **only** on those sites — nothing else. The goal: when I
switch my OS between light and dark mode, Gmail, Grafana (Cloud or self-hosted),
and Slack web follow along.

> Status: early but functional. Gmail, Grafana, and Slack follow the OS theme on
> change and at load. Supported sites live in a small adapter registry, so adding
> more is a one-file change.

## Behavior

- **Toggles** (popup) — a master **Enabled** switch plus a per-site switch for
  each supported site, so you can run, say, Gmail but not Slack. When the
  master is off the extension does nothing. Stored in `chrome.storage.sync`, so
  choices follow your Chrome profile. Toggling a site on re-themes any open tab.
- **Where it runs** — only on pages verified to be a real Gmail, Grafana, or
  Slack instance (each site adapter's `detect()` in `src/content/sites/`), never
  their marketing/docs sites:
  - Gmail: `mail.google.com` once the Gmail app UI has rendered.
  - Grafana: `*.grafana.net` and other `grafana.com`/`grafana.net` URLs whose
    page is confirmed to be the Grafana app.
  - Slack: `app.slack.com` and workspace `*.slack.com` subdomains.
- **Self-hosted instances (optional)** — hosted services work out of the box.
  If you run a self-hosted instance of a supported app (currently Grafana) on
  your own domain, add it on the **options page**. Each domain is gated behind a
  one-time Chrome permission prompt and served by a dynamically-registered
  content script that persists across restarts. Pages are still verified as the
  real app by their markers before anything happens.
- **On system theme change** — when enabled *and* on a verified instance:
  - **Gmail** (`src/content/sites/gmail.js`): Gmail exposes no clean theme
    signal, so it detects the current theme by sampling the rendered background
    luminance near the centre of the viewport. To switch, it drives Gmail's own
    Themes dialog **invisibly** — clicks Settings → View all, then the theme
    option (Gmail's "Default" is light, "Dark" is dark), which applies and
    persists immediately with no Save step. The panel and dialog are rendered
    transparent (`opacity: 0`) so there's no visible flash.
  - **Grafana** (`src/content/sites/grafana.js`): detects the rendered theme via
    the CSS `color-scheme` on `<html>`, and if it differs from the target, fires
    Grafana's built-in toggle shortcut (the keys `c` then `t`). If a form field
    is focused (Grafana suppresses shortcuts while typing), it briefly blurs it
    for the keypress and restores focus.
  - **Slack** (`src/content/sites/slack.js`): drives Slack's own Appearance
    picker **invisibly** — it opens Preferences → Appearance, clicks the
    Light/Dark radio, and closes, with the menu and dialog rendered transparent
    (`opacity: 0`) so there's no visible flash. Clicking the real picker runs
    Slack's theme logic, so it repaints correctly (including custom workspace
    themes), live, with no page reload — and only when the theme needs to change.
- **At load** — an already-open tab gets no `change` event, so on start the
  content script polls until the app is ready and corrects the theme *only if it
  differs* from the system (it won't disturb a tab that's already right).

## Project layout

```
manifest.json              # MV3 manifest (content_scripts matches are generated)
icons/                     # Extension icons (icon.svg is the source of truth)
scripts/
  sync-manifest.mjs        # Regenerates manifest matches from the site adapters
src/
  lib/
    ext.js                 # Cross-browser API handle (browser ?? chrome)
    storage.js             # Settings: master + per-site enable (popup/worker/content)
    custom-domains.js      # Self-hosted domains: validate, store, register
  background/
    service-worker.js      # MV3 worker; seeds defaults, reconciles registrations
  popup/
    popup.{html,css,js}    # Master + per-site toggles, link to options
  options/
    options.{html,css,js}  # Manage the custom (self-hosted) domain list
  content/
    bootstrap.js           # Classic entry; dynamically imports the ES modules
    main.js                # Orchestrates: enabled? verified site? apply theme
    sites/
      index.js             # Adapter registry + detectSite() (single source of truth)
      gmail.js             # Gmail adapter: detect / current / apply
      grafana.js           # Grafana adapter: detect / current / apply
      slack.js             # Slack adapter: detect / current / apply
```

## Install locally (unpacked)

**Chrome**
1. Open `chrome://extensions`.
2. Toggle **Developer mode** on (top-right).
3. Click **Load unpacked** and select this project's root folder.
4. Pin **Sync Theme**, open the popup, and make sure the master switch and the
   site you want are on.

After editing files, click the **reload** icon on the extension card, and reload
any open Gmail/Grafana/Slack tabs so the new content script injects.

> Chrome shows a harmless warning, *"Unrecognized manifest key
> 'background.scripts'"*. That key is for Firefox's event page; Chrome uses
> `background.service_worker` and ignores `scripts`. Safe to ignore.

**Firefox — temporary (any edition; removed on restart)**
1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on…** and select this project's `manifest.json`.

**Firefox — permanent from file (ESR, Developer Edition, or Nightly only)**

Release Firefox requires Mozilla-signed add-ons, so installing an unsigned
package from file only works on **ESR**, **Developer Edition**, or **Nightly**:

1. Build the package: `npm run package`, then rename `sync-theme.zip` to
   `sync-theme.xpi` (a `.xpi` is just the zip).
2. Open `about:config` and set `xpinstall.signatures.required` to `false`.
3. Open `about:addons` → the gear icon → **Install Add-on From File…** → choose
   `sync-theme.xpi`.

On release (standard) Firefox this is blocked; you'd need a Mozilla-signed `.xpi`
from [AMO](https://addons.mozilla.org).

## Scripts

This project has no build step — Chrome loads the source directly. There are a
few helper scripts (`icons` needs [ImageMagick](https://imagemagick.org),
`package` needs `zip`):

```sh
npm run check      # Syntax-check sources + verify the manifest is in sync
npm run manifest   # Regenerate manifest content_scripts matches from the adapters
npm run icons      # Regenerate PNG icons from icons/icon.svg
npm run package    # Run manifest sync, then produce sync-theme.zip
```

CI (`.github/workflows/ci.yml`) runs `check` on every push and PR.

## Publishing

See [PUBLISHING.md](PUBLISHING.md) for the Chrome Web Store release checklist and
paste-ready listing content, and [PRIVACY.md](PRIVACY.md) for the privacy policy.

## License

Apache-2.0 — see [LICENSE](LICENSE).
