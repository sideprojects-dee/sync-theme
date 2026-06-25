// Cross-browser WebExtension API handle.
//
// Chrome exposes promise-based APIs on `chrome`; Firefox on `browser`. Preferring
// `browser` gives promises in Firefox, and falling back to `chrome` gives
// promises in Chrome (MV3). Use `ext.*` for all promise-based APIs so one
// codebase runs on both. (Synchronous calls like runtime.getURL work on either
// namespace, including from classic content scripts that can't import this.)
export const ext = globalThis.browser ?? globalThis.chrome;
