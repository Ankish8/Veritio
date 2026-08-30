"use client";

import { useMemo, useSyncExternalStore } from "react";
import { ApiReferenceReact } from "@scalar/api-reference-react";
import "@scalar/api-reference-react/style.css";

/**
 * Follow the reader's OS colour preference.
 *
 * `matchMedia` is an external store, so `useSyncExternalStore` is the right
 * primitive. Subscribing in an effect and calling `setState` from its body
 * renders once in the wrong theme and then again in the right one, which the
 * reader sees as a flash.
 */
const darkModeStore = {
  subscribe(onChange: () => void) {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  },
  getSnapshot() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  },
  // The server has no preference to read. Light is the safe guess: it matches
  // Scalar's own default, so the common case hydrates without a swap.
  getServerSnapshot() {
    return false;
  },
};

/**
 * The Scalar-rendered API reference.
 *
 * Two configuration choices are load-bearing rather than cosmetic, and both
 * exist to keep the page inside this app's Content Security Policy:
 *
 * - `withDefaultFonts: false` — Scalar otherwise pulls Inter from
 *   `fonts.scalar.com`, which `font-src` does not allow. The page uses the
 *   app's own Public Sans instead, which also makes it look like Veritio.
 * - `proxyUrl: ''` — the "Test request" button otherwise routes calls through
 *   `proxy.scalar.com`, sending the reader's API key to a third party. Our API
 *   answers with `Access-Control-Allow-Origin: *` precisely so the browser can
 *   call it directly, so the proxy buys nothing and costs a secret.
 *
 * Scalar also fetches `api.scalar.com/vector/registry/curated` to populate a
 * "curated APIs" list in its search modal. There is no configuration flag for
 * it, so `connect-src` blocks it and the console logs a CSP violation. That is
 * the intended outcome, not a bug to fix by widening the policy: the list is
 * Scalar's own marketing surface, and this page has no business calling out to
 * a third party while someone has a live API key pasted into it.
 */
export function ApiReference({ specUrl }: { specUrl: string }) {
  const isDark = useSyncExternalStore(
    darkModeStore.subscribe,
    darkModeStore.getSnapshot,
    darkModeStore.getServerSnapshot,
  );

  const configuration = useMemo(
    () => ({
      url: specUrl,
      theme: "default" as const,
      layout: "modern" as const,
      darkMode: isDark,
      withDefaultFonts: false,
      proxyUrl: "",
      hideDownloadButton: false,
      documentDownloadType: "json" as const,
      defaultOpenAllTags: false,
      metaData: {
        title: "Veritio API reference",
        description:
          "Create, launch and analyse UX research studies over HTTPS.",
      },
      authentication: {
        preferredSecurityScheme: "bearerAuth",
      },
      customCss: SCALAR_OVERRIDES,
    }),
    [specUrl, isDark],
  );

  return <ApiReferenceReact configuration={configuration} />;
}

/**
 * Hand Scalar the app's font stack rather than letting it fall back to a
 * generic sans, now that its own webfonts are switched off.
 */
const SCALAR_OVERRIDES = `
.scalar-app {
  --scalar-font: var(--font-sans), ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --scalar-font-code: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
}
`;
