// Identifies whether the current page is a *real* Slack or Grafana instance,
// as opposed to the companies' marketing, docs, or API sites. The content
// script matches broadly on the manifest patterns; this is where we verify.

/** @typedef {"slack" | "grafana"} SiteId */

/** @type {Record<SiteId, string>} */
export const SITE_LABELS = {
  slack: "Slack",
  grafana: "Grafana",
};

/**
 * @returns {SiteId | null} the verified site, or null if this isn't one.
 */
export function detectSite() {
  if (isSlackInstance()) return "slack";
  if (isGrafanaInstance()) return "grafana";
  return null;
}

function isSlackInstance() {
  const { hostname } = location;
  if (!hostname.endsWith("slack.com")) return false;

  // Marketing, API docs, status, etc. — never the workspace client.
  const NON_APP_HOSTS = new Set([
    "slack.com",
    "www.slack.com",
    "api.slack.com",
    "status.slack.com",
    "app.slack.com.invalid", // guard against accidental matches
  ]);
  if (NON_APP_HOSTS.has(hostname)) return false;

  // The web client always runs on app.slack.com; treat that as authoritative.
  if (hostname === "app.slack.com") return true;

  // Workspace subdomains (e.g. acme.slack.com) usually redirect to the client,
  // but confirm the Slack client actually mounted before acting.
  return Boolean(
    document.querySelector(
      ".p-client_container, .p-workspace, #client-ui, [data-qa='slack_kit_list']",
    ),
  );
}

function isGrafanaInstance() {
  // The content script only runs on Grafana Cloud (manifest matches) and on
  // user-added domains (dynamically registered), so we verify by Grafana's own
  // app markers rather than by hostname. This both excludes the grafana.com
  // marketing site and supports self-hosted instances on arbitrary domains.
  //
  // Every Grafana frontend (Cloud, login screen, self-hosted) serves its assets
  // from /public/build/, ships Grafana's favicon, and mounts into #reactRoot.
  return Boolean(
    document.querySelector(
      "#reactRoot, script[src*='/public/build/'], link[href*='/public/img/fav']",
    ),
  );
}
