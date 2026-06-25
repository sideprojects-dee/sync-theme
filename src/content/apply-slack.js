// Applies a light/dark theme to the Slack web client, live, without a reload.
//
// Slack has two theming layers we reconcile:
//
//   1. Color mode — keyed on a single body class:
//        body.sk-client-theme--dark   → dark (absent → light)
//      Toggling it re-drives Slack's whole CSS-variable palette instantly.
//
//   2. Sidebar inversion — colored-sidebar themes (Aubergine, custom workspace
//      themes) keep a dark/inverted sidebar in light mode, marked by
//      `sk-client-theme--light-inverted-sidebar` (+ `p-body--chrome-inverted`).
//      If left in place while the body goes dark, the sidebar renders as a
//      broken "inverse" theme. We strip it so the sidebar follows the color mode.
//
// We also write Slack's own storage so the choice survives reloads and new tabs:
//   slack-client-theme            "light" | "dark"   ← master color-mode switch
//   localConfig_v2.teams[*].iaTheming.mode            ← mirrors the mode per workspace

const THEME_KEY = "slack-client-theme";
const CONFIG_KEY = "localConfig_v2";

const DARK_CLASS = "sk-client-theme--dark";
const BODY_INVERTED_CLASS = "p-body--chrome-inverted";
const INVERTED_SIDEBAR_CLASS = "sk-client-theme--light-inverted-sidebar";

/**
 * @param {"light" | "dark"} theme
 */
export function applySlackTheme(theme) {
  // Persist so the choice survives reloads and applies in other Slack tabs.
  try {
    const ls = window.localStorage;
    ls.setItem(THEME_KEY, theme);
    syncWorkspaceModes(ls, theme);
  } catch {
    // Storage blocked — the live toggle below still themes this tab.
  }

  // Layer 1: color mode.
  document.body?.classList.toggle(DARK_CLASS, theme === "dark");

  // Layer 2: de-invert the sidebar so it follows the color mode. No-op in dark
  // mode (these classes are already absent there).
  document.body?.classList.remove(BODY_INVERTED_CLASS);
  for (const el of document.querySelectorAll(`.${INVERTED_SIDEBAR_CLASS}`)) {
    el.classList.remove(INVERTED_SIDEBAR_CLASS);
  }
}

/**
 * Keep each workspace's `iaTheming.mode` in sync with the color mode so custom
 * themes resolve their correct light/dark palette on reload. Best-effort: the
 * blob is owned by Slack, so any parsing trouble is swallowed.
 * @param {Storage} ls
 * @param {"light" | "dark"} theme
 */
function syncWorkspaceModes(ls, theme) {
  const raw = ls.getItem(CONFIG_KEY);
  if (!raw) return;

  try {
    const config = JSON.parse(raw);
    let changed = false;
    for (const team of Object.values(config?.teams ?? {})) {
      if (team?.iaTheming && team.iaTheming.mode !== theme) {
        team.iaTheming.mode = theme;
        changed = true;
      }
    }
    if (changed) ls.setItem(CONFIG_KEY, JSON.stringify(config));
  } catch {
    // Leave it untouched; slack-client-theme alone still drives the mode.
  }
}
