import { ext } from "../lib/ext.js";
import {
  normalizeFqdn,
  isValidFqdn,
  getDomains,
  hasPermission,
  requestPermission,
  enableDomain,
  removeDomain,
} from "../lib/custom-domains.js";
import { SITE_META } from "../content/sites/index.js";

// Name the apps that support self-hosting, straight from the adapter registry.
const supported = SITE_META.filter((s) => s.supportsCustomDomains).map((s) => s.label);
document.getElementById("supported-apps").textContent =
  supported.length ? supported.join(", ") : "none yet";

const form = document.getElementById("add-form");
const input = document.getElementById("domain-input");
const errorEl = document.getElementById("add-error");
const listEl = document.getElementById("domain-list");
const emptyEl = document.getElementById("empty");

// Cached so we can dedupe synchronously inside the submit handler — calling
// permissions.request after an `await` would lose the user gesture.
let domains = [];

function showError(message) {
  errorEl.textContent = message;
  errorEl.hidden = false;
}

function clearError() {
  errorEl.hidden = true;
}

function renderRow(fqdn, granted) {
  const li = document.createElement("li");
  li.className = "domain";

  const name = document.createElement("span");
  name.className = "domain__name";
  name.textContent = fqdn;

  const badge = document.createElement("span");
  badge.className = `badge ${granted ? "badge--ok" : "badge--warn"}`;
  badge.textContent = granted ? "Active" : "Access needed";

  li.append(name, badge);

  if (!granted) {
    const grant = document.createElement("button");
    grant.type = "button";
    grant.className = "domain__action domain__action--grant";
    grant.textContent = "Grant access";
    grant.addEventListener("click", async () => {
      const ok = await requestPermission(fqdn);
      if (ok) {
        await enableDomain(fqdn);
        render();
      }
    });
    li.append(grant);
  }

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "domain__action";
  remove.textContent = "Remove";
  remove.addEventListener("click", async () => {
    await removeDomain(fqdn);
    render();
  });
  li.append(remove);

  return li;
}

async function render() {
  domains = await getDomains();
  emptyEl.hidden = domains.length > 0;

  const rows = await Promise.all(
    domains.map(async (fqdn) => renderRow(fqdn, await hasPermission(fqdn))),
  );
  listEl.replaceChildren(...rows);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearError();

  const fqdn = normalizeFqdn(input.value);
  if (!isValidFqdn(fqdn)) {
    showError("Enter a valid domain, e.g. grafana.example.com");
    return;
  }
  if (domains.includes(fqdn)) {
    showError(`${fqdn} is already added.`);
    return;
  }

  // Request permission first — directly off the user gesture, before any await.
  const granted = await requestPermission(fqdn);
  if (!granted) {
    showError("Permission was not granted, so the domain wasn't added.");
    return;
  }

  await enableDomain(fqdn);
  input.value = "";
  render();
});

// Reflect changes made elsewhere (other options tabs, the browser's extensions page).
ext.permissions.onAdded.addListener(render);
ext.permissions.onRemoved.addListener(render);
ext.storage.onChanged.addListener((_changes, area) => {
  if (area === "local") render();
});

render();
