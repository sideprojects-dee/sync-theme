// Content-script entry point (classic script, declared in the manifest).
//
// Content scripts can't be ES modules directly, so this thin shim dynamically
// imports the real module graph. The imported files must be listed under
// `web_accessible_resources` in the manifest.
(async () => {
  try {
    const url = chrome.runtime.getURL("src/content/main.js");
    const main = await import(url);
    main.init();
  } catch (err) {
    console.error("[sync-theme] failed to initialise content script", err);
  }
})();
