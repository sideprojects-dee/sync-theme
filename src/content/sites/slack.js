// Slack site adapter. See ./index.js for the adapter shape.
//
// Slack's color mode is localStorage-backed and rendered by React. A content
// script can't make React re-render from a storage write, and Slack computes
// per-workspace (custom) theme colors that a CSS class toggle can't reproduce.
// So we write Slack's own key and reload — version-proof and correct for custom
// themes. (A no-reload class toggle was tried; it breaks custom themes.)

const THEME_KEY = "slack-client-theme"; // "light" | "dark"

export const slack = {
  id: "slack",
  label: "Slack",
  matches: ["https://*.slack.com/*", "https://slack.com/*"],
  supportsCustomDomains: false, // Slack is SaaS-only.

  // Verify this is the Slack client, not the marketing/API/status sites.
  detect() {
    const { hostname } = location;
    if (!hostname.endsWith("slack.com")) return false;
    const NON_APP = new Set([
      "slack.com",
      "www.slack.com",
      "api.slack.com",
      "status.slack.com",
    ]);
    if (NON_APP.has(hostname)) return false;
    if (hostname === "app.slack.com") return true;
    return Boolean(
      document.querySelector(
        ".p-client_container, .p-workspace, #client-ui, [data-qa='slack_kit_list']",
      ),
    );
  },

  current() {
    try {
      const value = window.localStorage.getItem(THEME_KEY);
      return value === "dark" || value === "light" ? value : null;
    } catch {
      return null;
    }
  },

  apply(theme) {
    let ls;
    try {
      ls = window.localStorage;
    } catch {
      return; // storage blocked
    }
    if (ls.getItem(THEME_KEY) === theme) return; // already set → no reload (avoids loops)
    ls.setItem(THEME_KEY, theme);
    location.reload();
  },
};
