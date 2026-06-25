// Applies a light/dark theme to the Slack web client.
//
// Slack's color mode is localStorage-backed and rendered by React. A content
// script can't make React re-render from a storage write, and Slack computes
// per-workspace (custom) theme colors that a CSS class toggle can't reproduce.
// So we write Slack's own key and reload — Slack then boots into the chosen mode
// and repaints correctly, including custom workspace themes. Reload is the price
// for getting custom themes right, and it's version-proof.

const THEME_KEY = "slack-client-theme"; // "light" | "dark"

/** @param {"light" | "dark"} theme */
export function applySlackTheme(theme) {
  let ls;
  try {
    ls = window.localStorage;
  } catch {
    return; // storage blocked — nothing we can do.
  }

  // Already in the target mode → don't reload (also guards against loops).
  if (ls.getItem(THEME_KEY) === theme) return;

  ls.setItem(THEME_KEY, theme);
  location.reload();
}

/** @returns {"light" | "dark" | null} the theme Slack is set to render. */
export function currentSlackTheme() {
  try {
    const value = window.localStorage.getItem(THEME_KEY);
    return value === "dark" || value === "light" ? value : null;
  } catch {
    return null;
  }
}
