# Publishing Sync Theme

Release checklist and paste-ready listing content for both stores. Sync Theme
ships from **one source tree** to the **Chrome Web Store** and **Firefox AMO**;
`npm run package` emits a clean, per-browser package for each (see below).

> **Status (27 June 2026):** 1.0.0 submitted to both stores, in review.

The extension keeps the optional self-hosted-domain feature, so expect closer
review of the broad host permission — see [the note at the bottom](#the-broad-optional-host-permission-hard-requirement).

## One-time setup

- **Chrome Web Store developer account** ($5 one-time, up to 20 extensions):
  <https://developer.chrome.com/docs/webstore/register>. Public developer name,
  verified email, 2-step verification, trader/contact answers.
- **AMO account** (free): <https://addons.mozilla.org/developers/>. Accept the
  Firefox Add-on Distribution Agreement on first submission.
- **Privacy policy URL** (required by both):
  <https://github.com/sideprojects-dee/sync-theme/blob/main/PRIVACY.md>

## Build: one source, two packages

`npm run package` (see `scripts/package.mjs`) keeps a single canonical
`manifest.json` but writes a per-browser manifest into each zip, so neither
store sees a key meant for the other:

| Artifact | Upload to | Manifest differences |
| --- | --- | --- |
| `sync-theme-chrome.zip` | Chrome Web Store | `background.service_worker`; **no** `browser_specific_settings`; keeps `minimum_chrome_version`. No "Unrecognized manifest key" warning. |
| `sync-theme-firefox.zip` (`.xpi` is identical) | AMO | `background.scripts` (event page); `browser_specific_settings.gecko` (id, `strict_min_version` 140, `data_collection_permissions: {required:["none"]}`) + `gecko_android` 142; **no** `service_worker` or `minimum_chrome_version`. |

The canonical `manifest.json` keeps both background keys so dev load-unpacked
works on either browser (Chrome shows a harmless `background.scripts` warning
*only* for the raw repo; the packaged Chrome build does not).

## Each release

1. Bump `version` in `manifest.json`.
2. `npm run check` — syntax + manifest-in-sync with the adapters.
3. `npm run package` — builds both per-browser packages.
4. **Chrome**: [Developer Dashboard](https://chrome.google.com/webstore/devconsole)
   → your item (or **Add new item**) → upload `sync-theme-chrome.zip`.
5. **AMO**: [Developer Hub](https://addons.mozilla.org/developers/) → upload
   `sync-theme-firefox.zip`, distribution **On this site**.
6. Update the listing fields (below) on each → submit. Chrome review takes days
   to a couple of weeks; AMO is usually faster (hours–days). Signs immediately on
   AMO; the broad optional permission may draw a manual question on either.

---

# Chrome Web Store

## Store listing — paste-ready

**Product name**
```
Sync Theme
```

**Summary** (≤132 chars; matches the manifest description)
```
Switches Gmail, Grafana, and Slack between light and dark to match your system theme. Works only on those sites.
```

**Detailed description**
```
Sync Theme keeps Gmail, Grafana, and Slack in step with your operating system's light/dark setting. Flip your OS to dark mode and your open Gmail, Grafana, and Slack tabs follow automatically — and back to light when you switch back.

Features
• Works on Gmail, Grafana (Grafana Cloud and self-hosted), and Slack web.
• A master on/off switch plus a per-site toggle, so you can run just the sites you want.
• Add self-hosted Grafana instances on your own domains — you approve each one through Chrome's permission prompt.
• No accounts, no tracking, no data collection, no remote servers.

How it works
When your OS theme changes, Sync Theme switches each site using that site's own built-in light/dark control, so it looks exactly as the site intends — including custom Slack workspace themes. It runs only on Gmail, Grafana, and Slack, never on other sites, unless you explicitly add a self-hosted Grafana domain on the options page.

Privacy
Sync Theme does not collect, transmit, or sell any data. Your on/off preferences sync through your own Chrome account; any self-hosted domains you add stay on your device.
```

- **Category**: Workflow & Planning (Chrome retired "Productivity"; "Functionality & UI" is a fine alternative).
- **Icon**: 128px — embedded in the manifest.
- **Screenshots**: at least one **1280×800** (or 640×400). Upload from
  [`store/screenshots/`](store/screenshots/) — the Chrome Grafana light/dark pair
  plus the custom-domain flow. Gmail/Slack are intentionally excluded (would leak
  a real inbox/workspace; Grafana shows the same behavior safely).

## Privacy practices tab — paste-ready

**Single purpose**
```
Sync Theme switches Gmail, Grafana, and Slack between light and dark mode to match the operating system's appearance setting.
```

**`storage`**
```
Stores the user's preferences only: the master on/off switch, the per-site toggles, and any self-hosted domains the user adds. No browsing data is stored.
```

**`scripting`**
```
Registers a content script at runtime for the self-hosted Grafana domains the user explicitly adds on the options page. Not used to inject code into arbitrary pages.
```

**Host access (Gmail/Grafana/Slack)**
```
The extension reads and sets the site's own light/dark theme on Gmail, Grafana, and Slack pages, so its content script must run there. It does not read email, dashboards, messages, or other page content.
```

**Broad host permission (`https://*/*`, optional)** — Chrome will single this out:
```
This is an OPTIONAL host permission and is never requested automatically. It is requested one domain at a time, only when the user explicitly adds a self-hosted Grafana instance on the options page, and the user approves each domain through Chrome's permission prompt. The extension then runs only on the specific domains the user approved. It supports running on self-hosted Grafana, which can live on any user-owned domain.
```

**Remote code**: select **No, I am not using remote code.** All code is in the
package, shipped exactly as written — no bundler, minifier, or remote scripts.

**Data usage**: check **Does not collect**, then certify: not sold; not used
beyond the single purpose; not used for creditworthiness/lending.

**Privacy policy URL**
```
https://github.com/sideprojects-dee/sync-theme/blob/main/PRIVACY.md
```

## Testing instructions field (≤500 chars) — paste-ready
```
Built-in sites: open Gmail, Grafana, or Slack web; open the toolbar popup; ensure the master switch and that site are ON; reload the tab; then flip your OS light/dark — the tab follows.

Optional "all sites" permission (no server needed): play.grafana.org is a public Grafana NOT in the default matches. On the options page, add play.grafana.org and approve the prompt — showing the broad permission is requested only per-domain, on demand. Flip the OS theme; it follows.
```

---

# Firefox (AMO)

## Listing — paste-ready

**Name**
```
Sync Theme
```

**Summary** (≤250 chars)
```
Automatically switches Gmail, Grafana, and Slack between light and dark to match your operating system's theme. Works only on those sites — no accounts, no tracking, no data collection.
```

**Description** (same body as the Chrome detailed description; AMO allows it
verbatim, and you can append the policy link)
```
Sync Theme keeps Gmail, Grafana, and Slack in step with your operating system's light/dark setting. Flip your OS to dark mode and your open Gmail, Grafana, and Slack tabs follow automatically — and back to light when you switch back.

Features
• Works on Gmail, Grafana (Grafana Cloud and self-hosted), and Slack web.
• A master on/off switch plus a per-site toggle, so you can run just the sites you want.
• Add self-hosted Grafana instances on your own domains — you approve each one through Firefox's permission prompt.
• No accounts, no tracking, no data collection, no remote servers.

How it works
When your OS theme changes, Sync Theme switches each site using that site's own built-in light/dark control, so it looks exactly as the site intends — including custom Slack workspace themes. It runs only on Gmail, Grafana, and Slack, never on other sites, unless you explicitly add a self-hosted Grafana domain on the options page.

Privacy
Sync Theme does not collect, transmit, or sell any data. Your on/off preferences sync through your own Firefox account; any self-hosted domains you add stay on your device. Full policy: https://github.com/sideprojects-dee/sync-theme/blob/main/PRIVACY.md
```

- **Category**: Appearance.
- **Tags**: `dark mode, dark theme, light mode, system theme, gmail, grafana, slack`
- **Homepage / Support**: <https://github.com/sideprojects-dee/sync-theme>
- **License**: Apache License 2.0 (matches `LICENSE`).
- **Privacy policy URL**: the same `PRIVACY.md` URL.
- **Screenshots**: the Firefox Grafana light/dark pair + the 3-step custom-domain
  flow, from [`store/screenshots/`](store/screenshots/).
- **Compatibility**: auto-derived from the manifest (Firefox 140+, Android 142+).
- **Source code**: when asked whether you minify/bundle/transpile, answer **No** —
  we ship plain vanilla JS, so no separate source upload is required.

## Data collection disclosure
Select **"Does not collect any data."** This mirrors the manifest's
`data_collection_permissions: { required: ["none"] }`. Keep them consistent.

## Notes for reviewer — paste-ready
```
What it does: switches a site's own built-in light/dark theme to match the OS appearance, on Gmail, Grafana, and Slack only.

No remote code, no minification, no bundler. Every file in the package is the file that runs, exactly as written. No network requests, no analytics, no remote servers.

Permissions:
- storage — the on/off toggles and the user's self-hosted domain list.
- scripting — registers a content script at runtime for self-hosted Grafana domains the user adds.
- Host access to Gmail/Grafana/Slack — where the theming runs.
- optional_host_permissions "https://*/*" — NEVER requested automatically. It is requested one domain at a time, from a user click on the options page, so people can run the extension on a self-hosted Grafana on their own domain. The extension then runs only on domains the user approved.

How to test the built-in sites: open Gmail / a Grafana instance / Slack web, open the toolbar popup, ensure the master switch and that site are on, reload the tab, then flip your OS between light and dark — the tab follows (a beat or two later for an already-open tab, by design).

How to test the optional permission + self-hosted flow (no own server needed): play.grafana.org is a public Grafana instance that is NOT covered by the built-in matches. Open the options page, add play.grafana.org, approve Firefox's permission prompt — this demonstrates the broad permission is requested only per-domain, on demand. Reload play.grafana.org and flip the OS theme; it follows. Remove the domain on the options page to revoke access.

About the linter's "Unsafe call to import" warning (src/content/bootstrap.js): the import argument is runtime.getURL("src/content/main.js") — a fixed, hardcoded path resolved to the extension's own origin, with no page or user input. It's the standard ES-module content-script bootstrap (the reason the module files are listed in web_accessible_resources) and cannot be written as a static literal.
```

---

# Cross-cutting notes

## The broad optional host permission (hard requirement)

`optional_host_permissions: ["https://*/*"]` exists to support self-hosted
Grafana on arbitrary domains — a **core, permanent feature**. Reviewers
scrutinize broad host access, so a first review may be slower or come with a
follow-up question. The answer: the permission is **optional** and
**user-approved per domain**, never requested automatically (see the per-store
justifications above and `PRIVACY.md`).

**Do not** remove the self-hosted-domains feature to speed up review. It is a
hard requirement (see `AGENTS.md`); if a reviewer pushes back, answer with the
justification rather than dropping the capability.

## Fingerprinting (`web_accessible_resources`)

The module files are web-accessible on `https://*/*` because the
self-hosted-domain feature can inject them on any user-approved origin — a fixed,
probe-able path (a minor fingerprinting vector). The usual mitigation,
`"use_dynamic_url": true`, **cannot be used here**: it splits `runtime.getURL()`
and the module graph's relative imports across two origins and breaks the
dynamic-import bootstrap, so the content script fails to load (verified on
Chrome, June 2026). If asked, the honest answer is that the broad WAR is required
by the self-hosted feature and the dynamic-URL mitigation is incompatible with
the no-bundler module loading.

## Verification

- **Chrome**: Gmail, Grafana, and Slack all verified.
- **Firefox**: verified on a real build, including the custom-domain
  `permissions.request` + `scripting.registerContentScripts` flow. Also installed
  and smoke-tested as the packaged `sync-theme-firefox.xpi` (`background.scripts`
  manifest) on 27 June 2026. Re-run the Firefox check whenever the manifest or
  background entry changes.
