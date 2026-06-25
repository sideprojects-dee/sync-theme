import { getEnabled, setEnabled, onEnabledChanged } from "../lib/storage.js";

const input = document.getElementById("enabled-toggle");
const hint = document.getElementById("status-hint");

/** @param {boolean} enabled */
function render(enabled) {
  input.checked = enabled;
  hint.textContent = enabled
    ? "On — watching for system theme changes on Slack and Grafana."
    : "Off — Sync Theme does nothing.";
}

input.addEventListener("change", async () => {
  await setEnabled(input.checked);
  render(input.checked);
});

document
  .getElementById("open-options")
  .addEventListener("click", () => chrome.runtime.openOptionsPage());

// Keep the popup in sync if the flag changes elsewhere (e.g. another window).
onEnabledChanged(render);

render(await getEnabled());
