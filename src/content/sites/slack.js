// Slack site adapter. See ./index.js for the adapter shape.
//
// Slack's color mode is React-rendered, and for custom workspace themes it can't
// be reproduced by toggling CSS classes — a storage write won't make React
// re-render either. So we drive Slack's *own* Appearance picker: open
// Preferences → Appearance, click the Light/Dark radio (which runs Slack's real
// theme logic and repaints custom themes correctly), then close. No page reload.
//
// The picker only opens on a genuine mismatch, so the Preferences dialog flashes
// up only when the theme actually needs to change. Selectors are Slack's stable
// data-qa hooks captured from the live app; update them here if Slack restructures
// Preferences.

const THEME_KEY = "slack-client-theme"; // "light" | "dark"; Slack keeps this current.

const SELECTORS = {
  userButton: "[data-qa='user-button']",
  menuItem: "[data-qa='menu_item_button']",
  menuItems: "[data-qa='menu_items']",
  prefsTab: "[data-qa='tabs_item']",
  themingSection: "[data-qa='ia4-theming-section']",
  closeButton: ".c-sk-modal_portal [data-qa='close']",
  modalPortal: ".c-sk-modal_portal",
};

// While we drive the picker, render Slack's popover menu + Preferences dialog
// invisibly so the user never sees them. opacity:0 keeps them laid out and
// clickable (we dispatch the clicks directly), and hides the backdrop dimming too.
const HIDE_STYLE_ID = "sync-theme-suppress-prefs";

let busy = false;

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

  current: currentTheme,

  apply(theme) {
    if (busy) return; // a flow is already running — don't stack dialogs
    if (currentTheme() === theme) return; // already correct → no dialog
    busy = true;
    driveAppearancePicker(theme)
      .catch((err) => console.error("[sync-theme] Slack theme change failed", err))
      .finally(() => {
        busy = false;
      });
  },
};

/** @returns {"light" | "dark" | null} */
function currentTheme() {
  try {
    const value = window.localStorage.getItem(THEME_KEY);
    return value === "dark" || value === "light" ? value : null;
  } catch {
    return null;
  }
}

/** Open Preferences → Appearance, pick the theme, close — invisibly. */
async function driveAppearancePicker(theme) {
  hideModals();
  try {
    const userButton = await waitFor(SELECTORS.userButton);
    if (!userButton) return;
    fireClick(userButton);

    const prefs = await waitForText(SELECTORS.menuItem, "Preferences");
    if (!prefs) return;
    fireClick(prefs);

    const appearance = await waitForText(SELECTORS.prefsTab, "Appearance");
    if (!appearance) return;
    fireClick(appearance);

    const section = await waitFor(SELECTORS.themingSection);
    if (!section) return;
    const radio = themeRadio(section, theme);
    if (radio && !radio.checked) fireClick(radio);

    const close = document.querySelector(SELECTORS.closeButton);
    if (close) fireClick(close);
  } finally {
    // Dismiss anything still open, wait for it to actually leave the DOM while
    // still hidden, then reveal modals again so nothing flickers.
    if (document.querySelector(SELECTORS.themingSection) || document.querySelector(SELECTORS.menuItems)) {
      pressEscape();
    }
    await waitGone(`${SELECTORS.modalPortal}, ${SELECTORS.menuItems}`, 1500);
    showModals();
  }
}

function hideModals() {
  if (document.getElementById(HIDE_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = HIDE_STYLE_ID;
  style.textContent = ".c-sk-modal_portal, .ReactModalPortal { opacity: 0 !important; }";
  document.head.appendChild(style);
}

function showModals() {
  document.getElementById(HIDE_STYLE_ID)?.remove();
}

/** Poll until nothing matches `selector`, up to `timeout` ms. */
async function waitGone(selector, timeout = 1500) {
  const deadline = Date.now() + timeout;
  while (document.querySelector(selector)) {
    if (Date.now() > deadline) return;
    await sleep(50);
  }
}

/** Within the theming section, the Light/Dark radio for `theme`. */
function themeRadio(section, theme) {
  const radios = [...section.querySelectorAll("input[type='radio']")];
  const byLabel = (name) =>
    radios.find(
      (r) =>
        (r.getAttribute("aria-label") || r.closest("label")?.textContent || "")
          .trim()
          .toLowerCase() === name,
    );
  return theme === "dark" ? byLabel("dark") ?? radios[1] : byLabel("light") ?? radios[0];
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

/** Poll for an element matching `selector` whose text equals (or contains) `text`. */
async function waitForText(selector, text, timeout = 5000) {
  const wanted = text.trim().toLowerCase();
  const deadline = Date.now() + timeout;
  for (;;) {
    const els = [...document.querySelectorAll(selector)];
    const el =
      els.find((e) => e.textContent.trim().toLowerCase() === wanted) ??
      els.find((e) => e.textContent.trim().toLowerCase().includes(wanted));
    if (el) return el;
    if (Date.now() > deadline) return null;
    await sleep(50);
  }
}

/** Dispatch a realistic click so React handlers (click or mousedown) fire. */
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
