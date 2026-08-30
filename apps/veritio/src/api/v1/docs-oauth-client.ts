/**
 * The OAuth client the API reference authorizes as.
 *
 * Scalar's "Authorize" button performs a plain authorization-code flow: it
 * sends whatever `client_id` the spec gives it. It cannot perform Dynamic
 * Client Registration, which is the only way to obtain a `client_id` from this
 * server — so without one it sends none, and the authorization server answers
 * `invalid_client` with nothing to suggest what was missing.
 *
 * The fix is to register one and publish its id in the document as
 * `x-scalar-client-id` (a *flow*-level field; on the scheme it is ignored).
 * Registration goes through the same public, validated
 * `/api/auth/mcp/register` endpoint any other client uses — there is no
 * privileged path here.
 *
 * ### Why this reads the database before registering
 *
 * A cache alone is not enough. It is per-process and, without Redis, does not
 * survive a restart — so every cold start would register *another* client and
 * `oauthApplication` would grow one row per deploy, per instance. Looking the
 * client up by name and redirect URI first makes the whole thing idempotent:
 * one row per origin, forever, regardless of how often this runs.
 *
 * ### What this client can and cannot do
 *
 * It is a public client: no secret, PKCE required, and its redirect URI is
 * pinned to this deployment's own `/docs/api` page, so an authorization code
 * can only ever come back to us. The reader still signs in and passes the
 * consent screen, which names the client and the exact scopes — this makes the
 * button work without widening what anyone can grant.
 */

import { cache } from "@/lib/cache/memory-cache";
import { getMotiaSupabaseClient } from "@/lib/supabase/motia-client";

/** Long-lived: the client is stable, and the database is the real backstop. */
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Matched on when looking for an already-registered client. */
const CLIENT_NAME = "Veritio API reference";

/** In-flight lookups, so a burst of first requests resolves once. */
const pending = new Map<string, Promise<string | null>>();

const cacheKey = (origin: string) => `api:docs-oauth-client:${origin}`;

const redirectUriFor = (origin: string) => `${origin}/docs/api`;

interface OAuthApplicationRow {
  clientId: string;
  redirectUrls: string;
}

/**
 * `oauthApplication` is a Better Auth table, absent from the generated
 * `Database` type, so the client rejects it. The loose shape is contained to
 * this one read.
 */
interface RegistrationQuery {
  select: (columns: string) => RegistrationQuery;
  eq: (column: string, value: unknown) => RegistrationQuery;
  order: (
    column: string,
    options: { ascending: boolean },
  ) => Promise<{ data: unknown[] | null; error: { message: string } | null }>;
}

function registrations(): { from: (table: string) => RegistrationQuery } {
  return getMotiaSupabaseClient() as never as {
    from: (table: string) => RegistrationQuery;
  };
}

/**
 * Get the docs client id for this origin, registering one only if none exists.
 *
 * Returns null rather than throwing on any failure. A reference page that
 * renders without a working Authorize button is a far better outcome than one
 * that fails to render at all, and the API key path — which is what the docs
 * actually recommend — is unaffected either way.
 */
export async function getDocsOAuthClientId(
  origin: string,
): Promise<string | null> {
  const key = cacheKey(origin);

  const cached = await cache.getTiered<string>(key).catch(() => null);
  if (cached) return cached;

  const inFlight = pending.get(origin);
  if (inFlight) return inFlight;

  const resolving = resolve(origin)
    .then((clientId) => {
      if (clientId) cache.set(key, clientId, TTL_MS);
      return clientId;
    })
    .catch(() => null)
    .finally(() => pending.delete(origin));

  pending.set(origin, resolving);
  return resolving;
}

async function resolve(origin: string): Promise<string | null> {
  return (await findExisting(origin)) ?? (await register(origin));
}

/**
 * Find a client already registered for this origin.
 *
 * `redirectUrls` is a delimited string written by the plugin rather than an
 * array, so the exact URI is compared after splitting rather than with a LIKE —
 * a substring match would treat `https://veritio.io/docs/api` as a match for a
 * hypothetical `https://evil.veritio.io.example/docs/api`.
 */
async function findExisting(origin: string): Promise<string | null> {
  const wanted = redirectUriFor(origin);

  try {
    const { data, error } = await registrations()
      .from("oauthApplication")
      .select("clientId, redirectUrls")
      .eq("name", CLIENT_NAME)
      .eq("disabled", false)
      // Oldest wins, so concurrent cold starts that both registered converge on
      // the same client rather than flip-flopping between them.
      .order("createdAt", { ascending: true });

    if (error || !data) return null;

    for (const row of data as OAuthApplicationRow[]) {
      const uris = String(row.redirectUrls ?? "")
        .split(/[\s,]+/)
        .filter(Boolean);
      if (uris.includes(wanted)) return row.clientId;
    }
  } catch {
    // Fall through to registration; a read failure must not break the page.
  }

  return null;
}

async function register(origin: string): Promise<string | null> {
  const response = await fetch(`${origin}/api/auth/mcp/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      client_name: CLIENT_NAME,
      client_uri: redirectUriFor(origin),
      redirect_uris: [redirectUriFor(origin)],
      // Public client. PKCE is what protects the code, not a secret we would
      // have to ship to a browser.
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
    }),
    // Never let a slow authorization server hold up the spec response.
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) return null;

  const body = (await response.json()) as { client_id?: unknown };
  return typeof body.client_id === "string" && body.client_id.length > 0
    ? body.client_id
    : null;
}
