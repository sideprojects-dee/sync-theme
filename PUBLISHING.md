# Publishing to the Chrome Web Store

Checklist and paste-ready listing content for releasing **Sync Theme**. This
release keeps the optional self-hosted-domain feature, so expect a more thorough
first review of the broad host permission — see the note at the bottom.

## One-time setup

- **Developer account** ($5 one-time, covers up to 20 extensions):
  <https://developer.chrome.com/docs/webstore/register>. Set a public developer
  name, verify your email, enable 2-step verification, and answer the
  trader/contact prompts.
- **Privacy policy URL** (required, because we use `storage` + host permissions):
  host [`PRIVACY.md`](PRIVACY.md) and use its public URL —
  <https://github.com/sideprojects-dee/sync-theme/blob/main/PRIVACY.md>

## Each release

1. Bump `version` in `manifest.json`.
2. `npm run check` — syntax + manifest-in-sync with the adapters.
3. `npm run package` — produces per-browser packages (manifest + icons + src).
   Upload `sync-theme-chrome.zip` here (its manifest has the Firefox-only keys
   stripped, so the Chrome listing has no "Unrecognized manifest key" warning).
4. [Developer Dashboard](https://chrome.google.com/webstore/devconsole) → **New
   Item** (first time) or your existing item → upload `sync-theme-chrome.zip`.
5. Fill / update the **Store listing** and **Privacy** tabs (below) → **Submit
   for review**. First review takes a few days to a couple of weeks; updates are
   usually 1–2 days.

## Store listing

- **Category**: Productivity
- **Icon**: 128px — already embedded in the manifest.
- **Screenshots**: at least one, **1280×800** (or 640×400). We ship Grafana
  light/dark (Chrome + Firefox) plus the 3-step custom-domain flow. Gmail and
  Slack are intentionally excluded — screenshotting them would leak a real
  inbox/workspace; Grafana demonstrates the same behavior safely. Source PNGs
  live in [`store/screenshots/`](store/screenshots/) (see its README) — they're
  listing assets, uploaded in the dashboard, not part of the packaged extension.
- **Short description** (≤132 chars) — keep it the same as the manifest:
  > Switches Gmail, Grafana, and Slack between light and dark to match your system theme. Works only on those sites.
- **Detailed description** (suggested):
  > Sync Theme keeps Gmail, Grafana, and Slack in step with your operating
  > system's light/dark setting. Flip your OS to dark mode and your Gmail,
  > Grafana, and Slack tabs follow automatically — and back to light when you
  > switch back.
  >
  > • Works on Gmail, Grafana (Grafana Cloud and self-hosted), and Slack web.
  > • A master on/off switch plus a per-site toggle.
  > • Add self-hosted Grafana instances on your own domains — you approve each one.
  > • No accounts, no tracking, no data collection.

## Privacy tab — paste-ready

**Single purpose**
> Sync Theme switches Gmail, Grafana, and Slack between light and dark mode to
> match the operating system's appearance setting.

**Permission justifications**
- **storage** — Stores the user's preferences (master on/off, per-site toggles,
  and any self-hosted domains they add). No browsing data.
- **scripting** — Registers a content script at runtime for the self-hosted
  Grafana domains the user explicitly adds on the options page.
- **Host access to Gmail/Grafana/Slack** — Reads and sets the site's own
  light/dark theme on Gmail, Grafana, and Slack pages; the content script must
  run there.
- **Optional host permissions (`https://*/*`)** — Requested only on demand, one
  domain at a time, when the user adds a self-hosted Grafana instance on the
  options page. Never requested automatically; the user approves each domain via
  Chrome's prompt, and the extension then runs only on approved domains.

**Data usage**
- Select **"Does not collect user data."** No analytics, no remote servers;
  settings live in `chrome.storage`, synced only through the user's own Chrome
  account.

**Privacy policy URL**
- <https://github.com/sideprojects-dee/sync-theme/blob/main/PRIVACY.md>

## Notes to reviewer — paste-ready

Paste this into the **"Notes to reviewer"** field on the submission so the broad
optional permission and the self-hosted flow can be verified quickly.

> **What it does:** switches a site's own built-in light/dark theme to match the
> OS appearance, on Gmail, Grafana, and Slack only.
>
> **No remote code, no minification.** The source is shipped exactly as written
> (no bundler/transpiler); every file in the zip is the file that runs. No
> network requests, no analytics, no remote servers.
>
> **Permissions:** `storage` holds the on/off toggles + the user's self-hosted
> domain list. `scripting` registers a content script at runtime for self-hosted
> domains the user adds. The static host access (Gmail/Grafana/Slack) is where
> the theming runs.
>
> **About `optional_host_permissions: ["https://*/*"]`:** it is **never**
> requested automatically. It is requested one domain at a time, from a user
> click on the options page, so people can run the extension on a **self-hosted
> Grafana** on their own domain. The extension then runs only on domains the
> user approved.
>
> **How to test the built-in sites:** open Gmail / a Grafana instance / Slack
> web, open the popup, ensure the master switch and that site are on, then flip
> your OS between light and dark — the tab follows.
>
> **How to test the optional permission + self-hosted flow** (no own server
> needed): `play.grafana.org` is a public Grafana instance that is *not* covered
> by the built-in matches. Open the extension's options page, add
> `play.grafana.org`, and approve Chrome's prompt — this demonstrates that the
> broad permission is requested only per-domain and on demand. Open
> `play.grafana.org` and flip the OS theme; it follows. Remove the domain on the
> options page to revoke access.

## Note on fingerprinting (`web_accessible_resources`)

The extension's module files are web-accessible on `https://*/*` because the
self-hosted-domain feature can inject them on any user-approved origin. That
exposes a fixed, probe-able path (a minor fingerprinting vector). The usual
mitigation, `"use_dynamic_url": true`, **cannot be used here**: it splits
`runtime.getURL()` and the module graph's relative imports across two origins
and breaks the dynamic-import bootstrap, so the content script fails to load
(verified on Chrome, June 2026). If a reviewer raises fingerprinting, the honest
answer is that the broad WAR is required by the self-hosted feature and the
dynamic-URL mitigation is incompatible with the no-bundler module loading.

## Firefox (addons.mozilla.org)

The same source runs on Firefox (see "Cross-browser support" in AGENTS.md):

- **Package**: `npm run package` emits `sync-theme-firefox.zip` (and an
  identical `.xpi`). Upload the Firefox zip to AMO. Its manifest keeps
  `background.scripts` (the event page) and drops Chrome's `service_worker`.
- **List** on <https://addons.mozilla.org> — free account, separate review. AMO
  may review the source; we ship unbundled, so that's straightforward.
- The Firefox manifest carries `browser_specific_settings.gecko`
  (`id: sync-theme@sideprojects-dee`, `strict_min_version`). The canonical
  source `manifest.json` keeps both background keys for dev load-unpacked; the
  packaging step splits them per browser so neither store sees a foreign key.
- **Privacy policy**: the same `PRIVACY.md` URL.
- **Verify on a real Firefox build before releasing**: the custom-domain
  `permissions.request` + `scripting.registerContentScripts` flow, and that the
  static Gmail/Grafana/Slack content scripts run as expected under Firefox's
  per-site host-permission model.
  - _Done for the current build (27 June 2026): the packaged `sync-theme-firefox.xpi`
    (`background.scripts`-only manifest) was installed and smoke-tested. Re-run
    this check whenever the manifest or background entry changes._

## Note: the broad optional host permission

`optional_host_permissions: ["https://*/*"]` exists to support self-hosted
Grafana on arbitrary domains — a **core, permanent feature** of this extension.
Reviewers scrutinize broad host access, so the first review may be slower or come
with a follow-up question. Be ready to explain, in the review notes, that the
permission is **optional** and **user-approved per domain** — never requested
automatically (see the justification above and `PRIVACY.md`).

Do **not** remove the self-hosted-domains feature to speed up review. It is a
hard requirement; if a reviewer pushes back, answer with the justification rather
than dropping the capability.
