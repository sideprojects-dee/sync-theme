// Content-script entry point (classic script, declared in the manifest).
//
// Content scripts can't be ES modules directly, so this thin shim dynamically
// imports the real module graph. The imported files must be listed under
// `web_accessible_resources` (both Chrome and Firefox MV3 require that for the
// dynamic import to load). Being classic, it can't `import` the ext shim, so it
// resolves the namespace inline — runtime.getURL is synchronous on both.
(async () => {
  const ext = globalThis.browser ?? globalThis.chrome;
  try {
    const url = ext.runtime.getURL("src/content/main.js");
    const main = await import(url);
    main.init();
  } catch (err) {
    console.error("[sync-theme] failed to initialise content script", err);
  }
})();
