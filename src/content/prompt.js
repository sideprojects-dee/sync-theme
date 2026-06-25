// A lightweight, self-contained confirmation prompt rendered into a Shadow DOM
// root so the host page's styles (Slack's, Grafana's) can't bleed in or out.

const HOST_ID = "sync-theme-prompt-host";

/**
 * Show a prompt asking whether to apply the new system theme to this site.
 * @param {{ siteLabel: string, theme: "dark" | "light" }} opts
 * @returns {Promise<boolean>} true if confirmed, false if dismissed.
 */
export function showThemeChangePrompt({ siteLabel, theme }) {
  // Replace any prompt already on screen.
  document.getElementById(HOST_ID)?.remove();

  return new Promise((resolve) => {
    const host = document.createElement("div");
    host.id = HOST_ID;
    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = `
      <style>
        :host { all: initial; }
        .card {
          position: fixed;
          z-index: 2147483647;
          right: 16px;
          bottom: 16px;
          width: 320px;
          padding: 16px;
          border-radius: 12px;
          background: #ffffff;
          color: #111827;
          border: 1px solid #e5e7eb;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.18);
          font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
          font-size: 14px;
          line-height: 1.45;
        }
        @media (prefers-color-scheme: dark) {
          .card {
            background: #1f2937;
            color: #f9fafb;
            border-color: #374151;
          }
        }
        .title { margin: 0 0 4px; font-size: 15px; font-weight: 600; }
        .body { margin: 0 0 14px; color: inherit; opacity: 0.85; }
        .actions { display: flex; justify-content: flex-end; gap: 8px; }
        button {
          font: inherit;
          padding: 7px 12px;
          border-radius: 8px;
          border: 1px solid transparent;
          cursor: pointer;
        }
        .dismiss { background: transparent; border-color: currentColor; color: inherit; opacity: 0.8; }
        .confirm { background: #4f46e5; color: #ffffff; }
        .confirm:hover { background: #4338ca; }
      </style>
      <div class="card" role="alertdialog" aria-labelledby="st-title" aria-describedby="st-body">
        <p class="title" id="st-title">System switched to ${theme} mode</p>
        <p class="body" id="st-body">Sync Theme would change ${siteLabel} to its ${theme} theme.</p>
        <div class="actions">
          <button class="dismiss" type="button">Not now</button>
          <button class="confirm" type="button">Change theme</button>
        </div>
      </div>
    `;

    const close = (result) => {
      host.remove();
      resolve(result);
    };

    shadow.querySelector(".confirm").addEventListener("click", () => close(true));
    shadow.querySelector(".dismiss").addEventListener("click", () => close(false));

    document.documentElement.appendChild(host);
    shadow.querySelector(".confirm").focus();
  });
}
