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
3. `npm run package` — produces `sync-theme.zip` (manifest + icons + src).
4. [Developer Dashboard](https://chrome.google.com/webstore/devconsole) → **New
   Item** (first time) or your existing item → upload the zip.
5. Fill / update the **Store listing** and **Privacy** tabs (below) → **Submit
   for review**. First review takes a few days to a couple of weeks; updates are
   usually 1–2 days.

## Store listing

- **Category**: Productivity
- **Icon**: 128px — already embedded in the manifest.
- **Screenshots**: at least one, **1280×800** (or 640×400). Suggestion: the popup
  over a Slack tab and over a Grafana tab, in both light and dark.
- **Short description** (≤132 chars) — keep it the same as the manifest:
  > Switches Slack and Grafana between light and dark to match your system theme. Works only on Slack and Grafana.
- **Detailed description** (suggested):
  > Sync Theme keeps Slack and Grafana in step with your operating system's
  > light/dark setting. Flip your OS to dark mode and your Slack and Grafana tabs
  > follow automatically — and back to light when you switch back.
  >
  > • Works on Slack web and Grafana (Grafana Cloud and self-hosted).
  > • A master on/off switch plus a per-site toggle.
  > • Add self-hosted Grafana instances on your own domains — you approve each one.
  > • No accounts, no tracking, no data collection.

## Privacy tab — paste-ready

**Single purpose**
> Sync Theme switches Slack and Grafana between light and dark mode to match the
> operating system's appearance setting.

**Permission justifications**
- **storage** — Stores the user's preferences (master on/off, per-site toggles,
  and any self-hosted domains they add). No browsing data.
- **scripting** — Registers a content script at runtime for the self-hosted
  Grafana domains the user explicitly adds on the options page.
- **Host access to Slack/Grafana** — Reads and sets the site's own light/dark
  theme on Slack and Grafana pages; the content script must run there.
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
