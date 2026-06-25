// Applies a light/dark theme to Grafana.
//
// Grafana exposes the theme it is currently rendering via the CSS `color-scheme`
// on <html>, and ships a built-in keyboard shortcut — press "c" then "t" — that
// toggles between light and dark. There's no page-reachable way to set an
// absolute theme, so we read the current one and, if it differs from the target,
// fire the toggle shortcut once.

/** @returns {"light" | "dark" | null} the theme Grafana is currently rendering. */
export function detectGrafanaTheme() {
  const scheme = getComputedStyle(document.documentElement).colorScheme.trim();
  return scheme === "dark" ? "dark" : scheme === "light" ? "light" : null;
}

/** @param {"light" | "dark"} theme */
export function applyGrafanaTheme(theme) {
  const current = detectGrafanaTheme();

  // Unreadable, or already correct → nothing to do.
  if (current === null || current === theme) return;

  toggleTheme();
}

// Grafana's toggle-theme shortcut: the keys "c" then "t" in sequence.
const SHORTCUT = ["c", "t"];

function toggleTheme() {
  // Grafana suppresses shortcuts while a form field is focused. If one is, blur
  // it for the keypress and restore focus afterwards so we don't disrupt typing.
  const active = document.activeElement;
  const restore = isEditable(active);
  if (restore) active.blur();

  for (const key of SHORTCUT) pressKey(key);

  if (restore && typeof active.focus === "function") active.focus();
}

function isEditable(el) {
  if (!el) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    el.isContentEditable === true
  );
}

/**
 * Dispatch a full key press for a single character on <body>. The events bubble
 * to the document-level handler Grafana's shortcut library listens on.
 * @param {string} char
 */
function pressKey(char) {
  const keyCode = char.toUpperCase().charCodeAt(0);
  const init = {
    key: char,
    code: `Key${char.toUpperCase()}`,
    keyCode,
    which: keyCode,
    bubbles: true,
    cancelable: true,
  };
  for (const type of ["keydown", "keypress", "keyup"]) {
    document.body.dispatchEvent(new KeyboardEvent(type, init));
  }
}
