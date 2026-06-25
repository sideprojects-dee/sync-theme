// Grafana site adapter. See ./index.js for the adapter shape.
//
// Grafana exposes the rendered theme via the CSS `color-scheme` on <html>, and a
// built-in shortcut — the keys "c" then "t" — toggles light/dark. We read the
// current theme and, if it differs from the target, fire the shortcut.

const SHORTCUT = ["c", "t"];

export const grafana = {
  id: "grafana",
  label: "Grafana",
  matches: [
    "https://*.grafana.net/*",
    "https://*.grafana.com/*",
    "https://grafana.com/*",
  ],
  supportsCustomDomains: true, // Grafana is open source / self-hostable.

  // Verify by Grafana's own app markers (not hostname), so self-hosted instances
  // on arbitrary domains work and the grafana.com marketing site is excluded.
  detect() {
    return Boolean(
      document.querySelector(
        "#reactRoot, script[src*='/public/build/'], link[href*='/public/img/fav']",
      ),
    );
  },

  current: readTheme,

  apply(theme) {
    const current = readTheme();
    if (current === null || current === theme) return; // unreadable or already correct
    toggleTheme();
  },
};

/** @returns {"light" | "dark" | null} */
function readTheme() {
  const scheme = getComputedStyle(document.documentElement).colorScheme.trim();
  return scheme === "dark" ? "dark" : scheme === "light" ? "light" : null;
}

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
