# AGENTS.md

Contributor & agent guide for **sync-theme**. Read this before changing code —
it captures the architecture and the reverse-engineered details of how Slack and
Grafana theming actually work, so you don't have to rediscover them.

For user-facing behavior and install steps, see [README.md](README.md).

## What this is

A Manifest V3 browser extension (Chrome **and** Firefox) that makes **Gmail**,
**Grafana**, and **Slack web** follow the operating system's light/dark theme —
on live OS changes, when a site is toggled on, and once when a matching tab loads.

Status: loadable unpacked, not yet published. Gmail, Grafana, and Slack all work
on **Chrome**; Grafana and Slack are also verified on **Firefox** (Gmail on
Firefox is untested, but uses the same content-script path).

## Hard requirement: self-hosted Grafana support

**Supporting self-hosted Grafana instances on arbitrary user-supplied domains is
a permanent, non-negotiable requirement of this extension.** The optional
`https://*/*` host permission, the `scripting` permission, the dynamic
content-script registration, and the options-page domain manager all exist to
serve it. Do **not** remove or weaken any of these to simplify Chrome Web Store
review or for any other convenience. If review pushes back on the broad
permission, answer with the justification (it is optional and user-approved
per-domain) — never by dropping the capability.

## Core design constraints

- **No build step.** Source loads directly via "Load unpacked". Don't introduce
  a bundler/transpiler — it's deliberate so the repo stays inspectable. (The one
  codegen, `scripts/sync-manifest.mjs`, only writes a static JSON field; it does
  not transform runtime code.)
- **ES modules everywhere**, including content scripts (see the bootstrap trick).
- **Vanilla JS + JSDoc.** No TypeScript, no framework, no dependencies.
- **Minimal permissions.** `storage` + `scripting`, plus *optional* per-domain
  host permissions requested at runtime. Avoid broad host permissions.
- **Validate with `npm run check`** (syntax-checks `src/` + `scripts/` and
  verifies the manifest is in sync with the adapters). CI runs it on push/PR.

## Cross-browser support (Chrome + Firefox)

One codebase ships to both; the differences are small and isolated:

- **API namespace** — `src/lib/ext.js` exports `ext = globalThis.browser ??
  globalThis.chrome`. Use `ext.*` for all promise-based APIs (`storage`,
  `permissions`, `scripting`, `runtime` events): `browser.*` is promise-based in
  Firefox, `chrome.*` in Chrome MV3. `bootstrap.js` is a classic script so it
  can't import the shim; it resolves the namespace inline (`runtime.getURL` is
  synchronous on both).
- **Background** — the manifest declares both `background.service_worker`
  (Chrome) and `background.scripts` (Firefox event page) pointing at the same
  module. The worker is event-driven, which suits both. Keep both keys.
- **`browser_specific_settings.gecko`** — Firefox/AMO requires an extension id +
  `strict_min_version`, plus `data_collection_permissions` (Mozilla's built-in
  data-consent requirement for new submissions). We collect nothing, so it's
  `{ required: ["none"] }`. Chrome ignores the whole `browser_specific_settings`
  block (and the per-browser build strips it from the Chrome package anyway).
- **Dynamic content-script import** works in both; Firefox MV3 also requires the
  imported modules to be in `web_accessible_resources` (which we already have).

Verified working on a real Firefox build (June 2026): Grafana + Slack theming,
the custom-domain `permissions.request` + `scripting.registerContentScripts`
flow, and the static content scripts all behave as expected.

Also smoke-tested as the **packaged Firefox `.xpi`** (27 June 2026) — i.e. the
per-browser build whose manifest carries `background.scripts` only (no
`service_worker`). Installs and runs, confirming the package split in
`scripts/package.mjs` is correct, not just the dual dev manifest. Note: after a
fresh install, already-open tabs must be reloaded before they theme (install
never injects into existing tabs), and load-time correction has the usual poll
latency (a beat or two, longer for Grafana while its shortcut handler readies) —
both expected, not a Firefox bug.

## Architecture: the site-adapter registry

Everything about one supported site lives in a single adapter object in
`src/content/sites/<site>.js`. The registry in `src/content/sites/index.js`
(`SITES`) is the **single source of truth**.

Adapter shape:
```js
export const grafana = {
  id: "grafana",                 // stable id, also the per-site settings key
  label: "Grafana",              // UI name
  matches: ["https://*.grafana.net/*", ...],  // drives the manifest (see sync)
  supportsCustomDomains: true,   // can users add self-hosted instances?
  detect() { /* DOM-verified: is this page that site? */ },
  current() { /* "light" | "dark" | null — rendered theme */ },
  apply(theme) { /* switch the site to `theme` */ },
};
```

**To add a site:** create `src/content/sites/<site>.js`, add it to `SITES` in
`index.js`, then run `npm run manifest`. That's it — detection, current-theme,
apply, label, and match patterns all live in the one adapter file.

**Hard rule:** adapters must not touch the DOM (`document`, `window`,
`getComputedStyle`, `location`) at **module top level** — only inside their
methods. The registry is imported without a DOM by the Node manifest-sync script
and by the popup/options pages; top-level DOM access would crash those.

### Manifest is generated from adapters
`scripts/sync-manifest.mjs` reads every adapter's `matches` and writes them into
`manifest.json`'s `content_scripts[0].matches`. Run `npm run manifest` after
changing adapters; `npm run check` (and CI) fail if the manifest has drifted.
(Chrome needs static match patterns at install time, so they can't be set at
runtime — hence the codegen.)

## How it works

### Entry points
- **Popup** (`src/popup/`) — master **Enabled** toggle + a per-site toggle for
  each adapter, plus a link to options.
- **Options page** (`src/options/`) — manage self-hosted instance domains.
- **Service worker** (`src/background/service-worker.js`) — seeds defaults and
  reconciles dynamic content-script registrations.
- **Content scripts** — injected on supported pages; do the theming.

### Content-script module loading (the bootstrap trick)
Content scripts can't be ES modules directly. The manifest injects a tiny
**classic** script, `src/content/bootstrap.js`, which dynamically `import()`s
`src/content/main.js`. For that import to be allowed on a page, the module files
must be in `web_accessible_resources` — hence WAR covers `src/content/*.js`,
`src/content/sites/*.js`, and `src/lib/*.js` for `https://*/*`. (WAR only allows
the files to be *fetched*; execution is still gated by content-script matches /
dynamic registration + host permission.)

The WAR `matches` must stay `https://*/*` because self-hosted domains are
arbitrary and approved at runtime, so the modules can't be pre-scoped to known
origins. This does expose a fixed, probe-able path (a minor fingerprinting
vector), but **do not add `use_dynamic_url: true` to mitigate it** — it breaks
the dynamic-import bootstrap. With it on, `runtime.getURL()` and the module
graph's relative imports resolve across two different origins (the static
extension id and the per-session GUID), so `main.js`'s `import "../lib/ext.js"`
is denied and the content script fails to load. Tried on Chrome (June 2026),
reverted.

### Orchestration (`src/content/main.js`)
- `syncOnce()` is the core: check context is alive → read settings → `detectSite()`
  → if the site is enabled and `current() !== desiredTheme()`, call `apply()`.
- Triggers: the `matchMedia` `change` event, `onSettingsChanged` (so toggling a
  site on re-themes an open tab — "sync on enable"), and a bounded **load-time**
  poll (an already-open tab gets no `change` event; the poll also gives Grafana's
  shortcut handler time to be ready and Slack's SPA time to mount).
- **Context-invalidation guard**: after the extension reloads/updates, an orphaned
  content script's `chrome.*` calls throw "Extension context invalidated".
  `main.js` checks `chrome.runtime?.id` before chrome calls, tears down its
  listeners when gone, and catches the mid-`await` race.

### Settings (`src/lib/storage.js`)
`chrome.storage.sync` with two keys: `enabled` (master) and `siteEnabled`
(`{ [id]: boolean }`, missing id = on). `siteIsEnabled(settings, id)` is the
combined check used by the content script.

## Reverse-engineered knowledge (don't relearn this the hard way)

### Slack (`src/content/sites/slack.js`)
Slack's color mode is React-rendered and, for custom workspace themes, can't be
reproduced by toggling CSS classes — and a storage write won't make React
re-render. So `apply()` drives Slack's **own** Appearance picker: open Preferences
(`[data-qa='user-button']` → menu item "Preferences") → the "Appearance" tab
(`[data-qa='tabs_item']`) → click the Light/Dark radio inside
`[data-qa='ia4-theming-section']` → close (`[data-qa='close']`). That runs Slack's
real theme logic, so it repaints custom themes correctly, live, with no reload.

The whole flow is **invisible**: `hideModals()` injects a stylesheet setting
`.c-sk-modal_portal, .ReactModalPortal { opacity: 0 !important }` before opening,
so the popover menu, the Preferences dialog, and its backdrop render fully
transparent — yet stay laid out and clickable, because we dispatch the clicks
directly. After clicking close we wait for the dialog to leave the DOM (still
hidden), then `showModals()` removes the stylesheet, so nothing ever flickers.

`current()` reads `slack-client-theme` from localStorage (Slack keeps it current),
so the flow only runs on a genuine mismatch. A module-level `busy` flag stops the
load-time poll from stacking concurrent runs; each navigation step polls up to 5s;
`fireClick` dispatches mousedown/mouseup/click so React handlers fire.

Caveats:
- **Focus still moves.** The modal grabs focus while hidden and returns it on
  close, so a keystroke could be dropped if the user is typing in Slack at the
  instant the OS theme flips. Far less disruptive than a visible modal, not zero.
- **Extra coupling.** This leans on the portal class names (`c-sk-modal_portal`,
  `ReactModalPortal`) on top of the `data-qa` hooks. If Slack renames them, worst
  case is the flash returning — not breakage. All hooks live in `SELECTORS`;
  update them there if Slack restructures Preferences.

History (don't redo these dead ends):
- A content script can't make React re-render from a storage write; a synthetic
  `storage` event doesn't trigger Slack's cross-tab sync either.
- Toggling `body.sk-client-theme--dark` + stripping the sidebar-inversion classes
  (`sk-client-theme--light-inverted-sidebar` / `p-body--chrome-inverted`) gives an
  instant switch for **built-in** themes but **cannot reproduce a custom theme's
  computed sidebar colors** → ugly inversion.
- Writing `slack-client-theme` + reloading the tab also works and is version-proof,
  but the reload UX was unwanted — hence the Preferences-picker approach.
- `localConfig_v2` (once held `iaTheming.mode`) seems to have moved out of
  localStorage in recent builds; we don't touch it.

### Grafana (`src/content/sites/grafana.js`)
- **Detect** via `getComputedStyle(document.documentElement).colorScheme` →
  `"light"|"dark"`. The older `body.theme-dark/theme-light` class does **not**
  exist in current Grafana. `window.grafanaBootData.user.theme` is authoritative
  but is a page global (needs MAIN-world injection) and can be the literal
  `"system"`, so `color-scheme` is the better signal.
- **Apply** by firing Grafana's built-in toggle shortcut — the keys `c` then `t`
  — via synthetic `KeyboardEvent`s on `<body>`. It's a *relative* toggle, so we
  only fire when the detected theme differs from the target.
- **Input-focus guard**: Grafana suppresses shortcuts while a form field is
  focused, so we blur it for the keypress and restore focus.

Why synthetic keys work here but we avoided them for Slack: Grafana's shortcut
library doesn't check `event.isTrusted`. (If a future Grafana version does, this
breaks — the load-sync retry would then silently no-op.)

### Self-hosted instance domains (`src/lib/custom-domains.js`)
Hosted services are **static** content scripts (their adapter `matches`). For
self-hosted instances on arbitrary domains we use **dynamic registration**:
- The options page validates an FQDN, then `chrome.permissions.request()`s the
  per-domain host permission. **This must be called directly from a user gesture
  with no preceding `await`**, or Chrome rejects it (see `options.js`: it dedupes
  against a cached list synchronously, then requests).
- On grant, `chrome.scripting.registerContentScripts()` registers the same
  `bootstrap.js` for that origin (`persistAcrossSessions: true`). The injected
  script runs `detectSite()`, so whichever adapter matches the page themes it —
  the registration itself is site-agnostic.
- The domain list lives in `chrome.storage.local` (not `sync`) because the host
  permission is granted **per device**.
- `reconcile()` (service worker, on install/startup and permission add/remove)
  makes registrations match the stored list + current grants, so it self-heals.
- The options page lists which apps support this, derived from
  `SITE_META.filter(s => s.supportsCustomDomains)`.

## Gotchas
- **Reload tabs after reloading the extension.** Old content scripts are orphaned;
  the guard stops them erroring, but they won't theme until the tab reloads.
- **Adapters: no DOM at module top level** (see the hard rule above).
- **Run `npm run manifest` after changing adapter `matches`** or CI fails.
- **Don't `await` before `chrome.permissions.request()`** — it loses the gesture.
- **`storage.js` stays context-agnostic.** Handle extension-context invalidation
  in the content layer (`main.js`), not by making shared helpers swallow errors.

## Discovering site internals
We reverse-engineered Gmail/Grafana/Slack by pasting probe snippets into the site's
DevTools console and watching `localStorage` diffs + class/attribute mutations
while toggling the theme manually. When a mechanism is unclear, prefer confirming
it live this way over guessing — both apps change their internals between builds.

## Open follow-ups
- **Slack no-reload**: revisit the Preferences-radio approach if the reload UX
  becomes a problem (see the Slack section).
- **Publishing**: see [PUBLISHING.md](PUBLISHING.md) (checklist, permission
  justifications) and [PRIVACY.md](PRIVACY.md).
