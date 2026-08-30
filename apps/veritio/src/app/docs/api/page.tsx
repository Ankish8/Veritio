import type { Metadata } from "next";
import { ApiReference } from "./api-reference";

/**
 * The public API reference at /docs/api.
 *
 * Deliberately unauthenticated. A reference you need an account to read is a
 * reference nobody evaluates before signing up, and everything on this page is
 * already public: endpoint shapes, not data.
 *
 * The spec itself is served from `/api/v1/openapi.json`, generated at request
 * time from the route registry — so this page cannot document an endpoint that
 * no longer exists.
 */
export const metadata: Metadata = {
  title: "API reference · Veritio",
  description:
    "The Veritio REST API: create studies of any methodology, launch them to participants, and read the " +
    "analysed results back. OpenAPI 3.1, API key or OAuth 2.1.",
  alternates: { canonical: "https://veritio.io/docs/api" },
  openGraph: {
    title: "Veritio API reference",
    description:
      "Create, launch and analyse UX research studies over HTTPS. OpenAPI 3.1.",
    url: "https://veritio.io/docs/api",
    type: "website",
  },
};

// The spec embeds the deployment's own origin, so this page is per-deployment
// rather than statically shared.
export const dynamic = "force-dynamic";

/**
 * A token that changes whenever the document could have changed.
 *
 * The spec is served with `no-cache` + `ETag` so it always revalidates, but
 * that only governs entries stored *after* that header shipped. Anything a
 * browser cached under an earlier, more permissive policy can still be replayed
 * for as long as its original `stale-while-revalidate` window allows — which is
 * how a reader ends up authorizing against a stale client id and sees a bare
 * `invalid_client`.
 *
 * Varying the URL per deployment sidesteps that entirely: a URL the browser has
 * never seen cannot be served from its cache. In development it varies per
 * request, so local iteration never fights the cache at all.
 */
function specVersion(): string {
  if (process.env.NODE_ENV !== "production") return String(Date.now());
  return (
    process.env.VERCEL_GIT_COMMIT_SHA ??
    process.env.VERCEL_DEPLOYMENT_ID ??
    "1"
  );
}

export default function ApiDocsPage() {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/+$/, "");
  return (
    <main id="main-content">
      <ApiReference specUrl={`${base}/api/v1/openapi.json?v=${specVersion()}`} />
    </main>
  );
}
