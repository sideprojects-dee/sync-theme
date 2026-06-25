# AGENTS.md

Contributor & agent guide for **sync-theme**. Read this before changing code —
it captures the architecture and the reverse-engineered details of how Slack and
Grafana theming actually work, so you don't have to rediscover them.

For user-facing behavior and install steps, see [README.md](README.md).

## What this is

A Manifest V3 Chrome extension that makes **Slack web** and **Grafana** follow
the operating system's light/dark theme. When the OS theme changes (and when a
matching tab loads), the extension applies the same light/dark mode to those
sites.

Status: working for Slack and Grafana, loadable unpacked, not yet published.

## Core design constraints

- **No build step.** Source loads directly via "Load unpacked". Don't introduce
  a bundler/transpiler without a strong reason — it's a deliberate choice so the
  repo stays inspectable and zero-tooling.
- **ES modules everywhere**, including content scripts (see the bootstrap trick
  below). Extension pages (popup, options, service worker) import modules
  natively.
- **Vanilla JS + JSDoc.** No TypeScript, no framework, no dependencies.
- **Minimal permissions.** `storage` + `scripting`, plus *optional* per-domain
  host permissions requested at runtime. Avoid broad host permissions.
- Validate with `node --check <file>` (no test suite yet). `npm run package`
  builds the Web Store zip; `npm run icons` regenerates PNGs from `icons/icon.svg`.

## How it works

### Entry points
- **Popup** (`src/popup/`) — the on/off `enabled` toggle + a link to options.
- **Options page** (`src/options/`) — manage self-hosted Grafana domains.
- **Service worker** (`src/background/service-worker.js`) — seeds defaults and
  reconciles dynamic content-script registrations.
- **Content scripts** — injected on Slack/Grafana, do the actual theming.

### Content-script module loading (the bootstrap trick)
Content scripts can't be ES modules directly. So the manifest injects a tiny
**classic** script, `src/content/bootstrap.js`, which dynamically
`import()`s `src/content/main.js`. For that import to be allowed on a page, the
module files must be in `web_accessible_resources` — which is why WAR is set to
`src/content/*.js` + `src/lib/*.js` for `https://*/*`. (WAR only allows the files
to be *fetched*; execution is still gated by content-script matches / dynamic
registration + host permission.)

### Orchestration (`src/content/main.js`)
- Listens for `matchMedia('(prefers-color-scheme: dark)')` `change` events.
- **Load-time sync**: on start, polls until the SPA is a verified instance, then
  applies the system theme *only if the site is showing the wrong one* (bounded;
  stops on non-target/slow pages). This handles tabs already open when the OS
  theme changed.
- `APPLIERS[site]` maps each site to its applier; `CURRENT_THEME[site]` reads the
  currently-rendered theme (for the mismatch check).
- **Context-invalidation guard**: after the extension reloads/updates, an
  orphaned content script's `chrome.*` calls throw "Extension context
  invalidated". `main.js` checks `chrome.runtime?.id` before chrome calls, tears
  down its listener when gone, and catches the mid-`await` race.

### Site verification (`src/content/sites.js`)
`detectSite()` returns `"slack" | "grafana" | null` by inspecting the **DOM**, not
just the hostname — this excludes marketing/docs pages and supports self-hosted
Grafana on any domain. The manifest matches broadly; this is the real gate.

## Reverse-engineered knowledge (don't relearn this the hard way)

### Slack (`src/content/apply-slack.js`)
Slack's theme is **localStorage-backed and rendered by React** across *many*
build-hashed CSS-module classes — you cannot reliably hand-toggle them all, and
a content script can't make React re-render from a storage write. So we:

1. **Toggle the master palette class** `body.sk-client-theme--dark` (present =
   dark, absent = light). This re-drives Slack's whole CSS-variable palette
   instantly, no reload.
2. **Strip the sidebar-inversion layer.** Colored-sidebar themes (Aubergine, and
   custom workspace themes) keep a dark/"inverted" sidebar in light mode via
   `sk-client-theme--light-inverted-sidebar` (+ `p-body--chrome-inverted` on
   body). If left while the body goes dark, the sidebar renders as a broken
   "inverse" theme. We remove those so the sidebar follows the color mode.
   *Consequence:* in light mode the sidebar becomes plain light (we drop the
   colored/inverted sidebar) — intentional for a follow-the-system extension.
3. **Persist** to Slack's own storage so the choice survives reloads/new tabs:
   `slack-client-theme` (`"light"|"dark"`) and each workspace's
   `localConfig_v2.teams[*].iaTheming.mode`.

Notes: synthetic approaches (dispatching a `storage` event) do **not** make Slack
re-render. A full reload also works and is version-proof but was rejected for UX.

### Grafana (`src/content/apply-grafana.js`)
- **Detect the current theme** via `getComputedStyle(document.documentElement)
  .colorScheme` → `"light"|"dark"`. The older `body.theme-dark/theme-light`
  class does **not** exist in current Grafana. `window.grafanaBootData.user.theme`
  is authoritative but is a page global (needs MAIN-world injection) and can be
  the literal `"system"`, so `color-scheme` is the better signal.
- **Apply** by firing Grafana's built-in toggle shortcut — the keys `c` then `t`
  — via synthetic `KeyboardEvent`s dispatched on `<body>`. It's a *relative*
  toggle, so we only fire when the detected theme differs from the target.
- **Input-focus guard**: Grafana suppresses shortcuts while a form field is
  focused, so we blur it for the keypress and restore focus.

Why synthetic keys work here but we avoided them for Slack: Grafana's shortcut
library doesn't check `event.isTrusted`. (If a future Grafana version does, this
breaks — the load-sync retry would then silently no-op.)

### Self-hosted Grafana domains (`src/lib/custom-domains.js`)
Grafana Cloud (`*.grafana.net`, etc.) is a **static** content script — zero
setup. Self-hosted instances on arbitrary domains use **dynamic registration**:
- The options page validates an FQDN, then `chrome.permissions.request()`s the
  per-domain host permission. **This must be called directly from a user gesture
  with no preceding `await`**, or Chrome rejects it (see `options.js`: it dedupes
  against a cached list synchronously, then requests).
- On grant, `chrome.scripting.registerContentScripts()` registers the same
  `bootstrap.js` for that origin, with `persistAcrossSessions: true`.
- The domain list lives in `chrome.storage.local` (not `sync`) because the host
  permission is granted **per device** — syncing the list wouldn't sync the grant.
- `reconcile()` (run from the service worker on install/startup and on
  permission add/remove) makes registrations match the stored list + current
  grants, so it self-heals after restarts or external revocation.

## Project layout
See README "Project layout". Key dirs: `src/lib/` (shared), `src/background/`,
`src/popup/`, `src/options/`, `src/content/`.

## Gotchas

- **Reload tabs after reloading the extension.** Old content scripts are
  orphaned; the guard stops them erroring, but they won't theme until the tab
  reloads and re-injects.
- **Slack React may re-assert inverted classes** in theory (its Redux still holds
  the old theme). Observed stable in practice; if it regresses, add a
  `MutationObserver` on `<body>` that re-strips them. Not implemented yet.
- **Don't add `await` before `chrome.permissions.request()`** — it loses the user
  gesture.
- **`storage.js` stays context-agnostic.** Handle extension-context invalidation
  in the content layer (`main.js`), not by making shared helpers swallow errors.
- Slack `localConfig_v2` is a large Slack-owned blob; `syncWorkspaceModes()` only
  touches `iaTheming.mode` and swallows parse errors. Don't expand what it edits.

## How to extend

- **Add a new site**: add detection to `sites.js` (`detectSite` + the `SiteId`
  type), write `src/content/apply-<site>.js` exporting an applier `(theme) => void`
  and a current-theme reader, and register both in `APPLIERS` / `CURRENT_THEME` in
  `main.js`.
- **Add static host coverage**: extend `content_scripts.matches` and the WAR.

## Discovering site internals
We reverse-engineered Slack/Grafana by pasting probe snippets into the site's
DevTools console and watching `localStorage` diffs + class/attribute mutations
while toggling the theme manually. When a mechanism is unclear, prefer confirming
it live this way over guessing — both Slack and Grafana change their internals.

## Open follow-ups
- **Sync on enable**: toggling the popup on doesn't re-theme an already-open tab
  until the next OS change or reload. Could listen for the storage change.
- **Slack load consistency**: load-sync only corrects a color-mode *mismatch*, so
  opening Slack in matching light mode keeps its native colored sidebar, whereas
  *toggling* to light strips it. Decide whether to always normalize.
- **Slack class re-assertion**: optional `MutationObserver` hardening (above).
- **Publishing**: Chrome Web Store listing/review (justify `optional_host_permissions`).
