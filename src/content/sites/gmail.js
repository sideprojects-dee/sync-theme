// Gmail site adapter. See ./index.js for the adapter shape.
//
// Gmail web has a native Light/Dark theme but, on desktop, it never follows the
// OS — which is the gap this extension fills. Unlike Grafana/Slack, Gmail exposes
// no clean theme signal: `color-scheme` stays "normal", <body>'s background is the
// same light colour in both themes, and there's no theme-related localStorage key.
// Many elements merely switch to translucent overlays that look dark only because
// of what sits behind them.
//
// So we detect the theme the only reliable way: by sampling the colour actually
// RENDERED in the middle of the viewport and measuring its luminance. A live probe
// measured light ≈ 246 and dark ≈ 0 (0 = black, 255 = white), a wide, unambiguous
// gap, so a midpoint threshold is safe.
//
// Switching the theme: Gmail's only native control is the Themes dialog, so we
// drive it the way the Slack adapter drives its picker — click Settings, then
// "View all", then the theme option. It's simpler here: selecting an option applies
// and persists immediately (server-side, per account) with NO Save step and no
// revert-on-close. Gmail names the light theme "Default" and the dark one "Dark".
// We run the flow invisibly (opacity:0 on the dialog + settings panel) so the user
// never sees it flash up, and only open it on a genuine mismatch.

const LUMINANCE_THRESHOLD = 128; // < this → dark; measured gap is 246 vs 0.

// Gmail's theme names: our "light" is Gmail's "Default", our "dark" is "Dark".
const THEME_OPTION = { light: "default", dark: "dark" };

const SELECTORS = {
  settingsButton: "[role='button'][aria-label='Settings']",
  dialog: "[role='dialog'][aria-label='Pick your theme']",
};

// While we drive the picker, render Gmail's settings panel + Themes dialog
// invisibly so the user never sees them (same trick as the Slack adapter):
// opacity:0 keeps them laid out and clickable while hiding the flash + backdrop.
const HIDE_STYLE_ID = "sync-theme-suppress-gmail-prefs";
const HIDE_CSS =
  "[role='dialog'][aria-label='Pick your theme'], [aria-label='Quick settings'] { opacity: 0 !important; }";

let busy = false;

export const gmail = {
  id: "gmail",
  label: "Gmail",
  matches: ["https://mail.google.com/*"],
  supportsCustomDomains: false, // Gmail is SaaS-only.

  // mail.google.com is the Gmail app; confirm the app chrome has rendered so the
  // luminance sample below has real content to read.
  detect() {
    if (location.hostname !== "mail.google.com") return false;
    return Boolean(document.querySelector("[role='main'], [gh='tl'], [gh='mtb']"));
  },

  current: readTheme,

  apply(theme) {
    if (busy) return; // a flow is already running — don't stack dialogs
    if (readTheme() === theme) return; // already correct → no dialog
    busy = true;
    driveThemePicker(theme)
      .catch((err) => console.error("[sync-theme] Gmail theme change failed", err))
      .finally(() => {
        busy = false;
      });
  },
};

/** Open Settings → View all → pick the theme, then close — invisibly. */
async function driveThemePicker(theme) {
  hideChrome();
  try {
    const settings = await waitFor(SELECTORS.settingsButton);
    if (!settings) return;
    fireClick(settings);

    const viewAll = await waitForText("button", "View all");
    if (!viewAll) return;
    fireClick(viewAll);

    const dialog = await waitFor(SELECTORS.dialog);
    if (!dialog) return;

    const option = await waitForOption(dialog, THEME_OPTION[theme]);
    if (option) fireClick(option); // applies + persists immediately, no Save
  } finally {
    // Selection has already persisted; just dismiss the UI. Escape closes the
    // dialog, then (if still open) the settings panel. Wait for the dialog to
    // leave the DOM while still hidden, then reveal so nothing flickers.
    pressEscape();
    await waitGone(SELECTORS.dialog, 1500);
    pressEscape();
    showChrome();
  }
}

function hideChrome() {
  if (document.getElementById(HIDE_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = HIDE_STYLE_ID;
  style.textContent = HIDE_CSS;
  document.head.appendChild(style);
}

function showChrome() {
  document.getElementById(HIDE_STYLE_ID)?.remove();
}

/** @returns {"light" | "dark" | null} */
function readTheme() {
  const lum = sampleBackgroundLuminance();
  if (lum === null) return null; // nothing rendered yet → unknown
  return lum < LUMINANCE_THRESHOLD ? "dark" : "light";
}

// Average the luminance of the first opaque background found beneath a few points
// near the centre of the viewport, where the mail list / reading pane render.
function sampleBackgroundLuminance() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const points = [
    [w * 0.5, h * 0.5],
    [w * 0.5, h * 0.4],
    [w * 0.7, h * 0.6],
    [w * 0.35, h * 0.55],
    [w * 0.5, h * 0.75],
  ];

  const lums = [];
  for (const [x, y] of points) {
    const rgb = opaqueBackgroundAt(x, y);
    if (rgb) lums.push(luminance(rgb));
  }
  if (lums.length === 0) return null;
  return lums.reduce((a, b) => a + b, 0) / lums.length;
}

// Walk up from the element at (x, y) to the first one with a non-transparent
// background colour. @returns {{r,g,b} | null}
function opaqueBackgroundAt(x, y) {
  let el = document.elementFromPoint(x, y);
  while (el) {
    const rgb = parseOpaque(getComputedStyle(el).backgroundColor);
    if (rgb) return rgb;
    el = el.parentElement;
  }
  return null;
}

// Parse an rgb()/rgba() string, ignoring near-transparent fills.
function parseOpaque(color) {
  const match = color.match(/rgba?\(([^)]+)\)/);
  if (!match) return null;
  const parts = match[1].split(",").map((s) => parseFloat(s));
  const [r, g, b] = parts;
  const a = parts.length > 3 ? parts[3] : 1;
  if (a < 0.5) return null; // translucent → not the painted background
  return { r, g, b };
}

function luminance({ r, g, b }) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Poll for a selector to appear, up to `timeout` ms. */
async function waitFor(selector, timeout = 5000) {
  const deadline = Date.now() + timeout;
  for (;;) {
    const el = document.querySelector(selector);
    if (el) return el;
    if (Date.now() > deadline) return null;
    await sleep(50);
  }
}

/** Poll for an element matching `selector` whose accessible name equals `text`. */
async function waitForText(selector, text, timeout = 5000) {
  const wanted = text.trim().toLowerCase();
  const deadline = Date.now() + timeout;
  for (;;) {
    const el = [...document.querySelectorAll(selector)].find(
      (e) => accessibleName(e) === wanted,
    );
    if (el) return el;
    if (Date.now() > deadline) return null;
    await sleep(50);
  }
}

/**
 * Within the open Themes dialog, poll for the theme option named `name`
 * ("default" or "dark"). Scoped to the dialog so we never hit a stray "Default"
 * control elsewhere (the quick-settings panel has a few).
 */
async function waitForOption(dialog, name, timeout = 5000) {
  const deadline = Date.now() + timeout;
  for (;;) {
    const el = [...dialog.querySelectorAll("[role='option']")].find(
      (e) => accessibleName(e) === name,
    );
    if (el) return el;
    if (Date.now() > deadline) return null;
    await sleep(50);
  }
}

/** An element's accessible name: aria-label if set, else trimmed text. */
function accessibleName(el) {
  return (el.getAttribute("aria-label") || el.textContent || "").trim().toLowerCase();
}

/** Poll until nothing matches `selector`, up to `timeout` ms. */
async function waitGone(selector, timeout = 1500) {
  const deadline = Date.now() + timeout;
  while (document.querySelector(selector)) {
    if (Date.now() > deadline) return;
    await sleep(50);
  }
}

/** Dispatch a realistic click so Gmail's handlers (click or mousedown) fire. */
function fireClick(el) {
  for (const type of ["mousedown", "mouseup", "click"]) {
    el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
  }
}

function pressEscape() {
  for (const type of ["keydown", "keyup"]) {
    document.body.dispatchEvent(
      new KeyboardEvent(type, { key: "Escape", code: "Escape", keyCode: 27, which: 27, bubbles: true }),
    );
  }
}
