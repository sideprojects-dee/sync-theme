import { ext } from "../lib/ext.js";
import {
  getSettings,
  setEnabled,
  setSiteEnabled,
  onSettingsChanged,
} from "../lib/storage.js";
import { SITE_META } from "../content/sites/index.js";

const masterInput = document.getElementById("enabled-toggle");
const hint = document.getElementById("status-hint");
const sitesEl = document.getElementById("site-toggles");

// Build one toggle row per supported site (markup mirrors the master toggle).
const siteInputs = new Map();
for (const site of SITE_META) {
  const row = document.createElement("label");
  row.className = "toggle toggle--site";

  const text = document.createElement("span");
  text.className = "toggle__text";
  text.textContent = site.label;

  const input = document.createElement("input");
  input.type = "checkbox";
  input.className = "toggle__input";
  input.setAttribute("role", "switch");

  const track = document.createElement("span");
  track.className = "toggle__track";
  track.setAttribute("aria-hidden", "true");
  const thumb = document.createElement("span");
  thumb.className = "toggle__thumb";
  track.append(thumb);

  input.addEventListener("change", () => setSiteEnabled(site.id, input.checked));

  row.append(text, input, track);
  sitesEl.append(row);
  siteInputs.set(site.id, input);
}

function render(settings) {
  masterInput.checked = settings.enabled;
  hint.textContent = settings.enabled
    ? "On — only the sites enabled below are themed."
    : "Off — Sync Theme does nothing.";

  for (const [id, input] of siteInputs) {
    input.checked = settings.siteEnabled?.[id] !== false;
    input.disabled = !settings.enabled;
  }
  sitesEl.classList.toggle("sites--disabled", !settings.enabled);
}

masterInput.addEventListener("change", () => setEnabled(masterInput.checked));

document
  .getElementById("open-options")
  .addEventListener("click", () => ext.runtime.openOptionsPage());

// Reflect changes made elsewhere (other windows, the options page).
onSettingsChanged(async () => render(await getSettings()));

render(await getSettings());
