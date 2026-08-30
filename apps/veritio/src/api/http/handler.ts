/**
 * The single entry point for `/api/v1/*`.
 *
 * Everything cross-cutting happens here, once, in a fixed order: CORS, method
 * and path resolution, credential resolution, rate limiting, idempotency, then
 * dispatch. A route handler never repeats any of it, which is what makes the
 * per-route declarations in `v1/routes/` short enough to read as a spec.
 *
 * ### Why this API never reads cookies
 *
 * `resolveCaller` looks only at `Authorization` and `x-api-key`. That is not an
 * oversight — it is what makes `Access-Control-Allow-Origin: *` safe here. With
 * no ambient credential, a hostile page can send a cross-origin request but has
 * nothing to authenticate it with, so the permissive CORS policy grants it
 * exactly the access an anonymous `curl` already had. Accepting the session
 * cookie would turn the same policy into blanket CSRF.
 */

import { createHash, randomUUID } from "crypto";
import { getMotiaSupabaseClient } from "@/lib/supabase/motia-client";
import { resolveCaller, type ResolvedCaller } from "@/mcp/auth";
import { consumeRateLimit } from "@/middlewares/rate-limit";
import type { RateLimitTier } from "@/middlewares/rate-limit/types";
import { RATE_LIMIT_CONFIG } from "@/middlewares/rate-limit/config";
import { cache } from "@/lib/cache/memory-cache";
import { invokeRoute, type RouteCost, type RouteDefinition } from "../v1/define-route";
import { API_ROUTES } from "../v1/registry";
import { buildOpenApiDocument } from "../v1/openapi";
import { getDocsOAuthClientId } from "../v1/docs-oauth-client";
import {
  ApiError,
  PROBLEM_CONTENT_TYPE,
  badRequest,
  payloadTooLarge,
  toApiError,
  unsupportedMediaType,
} from "./errors";
import { Router } from "./router";

/** Bodies above this are refused before parsing. Bulk content writes fit well inside. */
const MAX_BODY_BYTES = 2 * 1024 * 1024;

/** How long a completed idempotent response is replayable. */
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

const RATE_LIMIT_TIERS: Record<RouteCost, RateLimitTier> = {
  read: "api-read",
  write: "api-write",
  heavy: "api-heavy",
};

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "Authorization, Content-Type, X-Api-Key, Idempotency-Key, X-Request-Id, If-None-Match",
  "Access-Control-Expose-Headers":
    "X-Request-Id, ETag, RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset, Retry-After, WWW-Authenticate, Deprecation",
  "Access-Control-Max-Age": "86400",
};

const router = new Router(API_ROUTES);

/** Paths served by the transport itself rather than by a registered route. */
const OPENAPI_PATHS = new Set(["openapi.json", "openapi"]);

export async function handleApiRequest(request: Request): Promise<Response> {
  const requestId = readRequestId(request);
  const url = new URL(request.url);
  const segments = url.pathname
    .replace(/^\/api\/v1\/?/, "")
    .split("/")
    .filter(Boolean);

  if (request.method === "OPTIONS") {
    return preflight(segments);
  }

  // The spec document is public and unauthenticated on purpose: a reference you
  // need a key to read is a reference nobody evaluates before signing up.
  if (segments.length === 1 && OPENAPI_PATHS.has(segments[0])) {
    return await openApiResponse(url.origin, requestId, request);
  }

  try {
    const match = router.match(request.method, segments);
    return await dispatch(request, url, match.def, match.pathParams, requestId);
  } catch (err) {
    return problemResponse(err, requestId);
  }
}

async function dispatch(
  request: Request,
  url: URL,
  def: RouteDefinition,
  pathParams: Record<string, string>,
  requestId: string,
): Promise<Response> {
  const caller = await resolveCaller(request);
  if (!caller) throw unauthenticated(url.origin);

  const cost = def.cost ?? (def.method === "GET" ? "read" : "write");
  const rateLimit = await enforceRateLimit(caller, cost);

  const body = await readBody(request, def);
  const idempotency = await claimIdempotency(request, def, caller, {
    method: request.method,
    path: url.pathname,
    body,
  });

  if (idempotency?.replay) {
    return jsonResponse(idempotency.replay.body, idempotency.replay.status, {
      requestId,
      rateLimit,
      def,
      extra: { "Idempotent-Replayed": "true" },
    });
  }

  try {
    const payload = await invokeRoute(
      def,
      {
        path: pathParams,
        query: Object.fromEntries(url.searchParams.entries()),
        body,
      },
      caller,
      getMotiaSupabaseClient(),
      { requestId, origin: url.origin },
    );

    const status = def.status ?? (def.method === "POST" ? 201 : 200);
    if (idempotency) {
      idempotency.store({ status, body: payload });
    }
    return jsonResponse(payload, status, { requestId, rateLimit, def });
  } catch (err) {
    // A failed attempt must not occupy the key: the caller's retry is the whole
    // point of sending one, and a 500 they cannot retry is worse than no
    // idempotency at all.
    idempotency?.release();
    throw err;
  }
}

// --- Credentials -----------------------------------------------------------

/**
 * RFC 9728 challenge, identical to the one the MCP endpoint issues.
 *
 * The `resource_metadata` pointer is how a spec-compliant client discovers the
 * OAuth authorization server without being told out of band.
 */
function unauthenticated(origin: string): ApiError {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? origin;
  return new ApiError(
    "unauthorized",
    'Authenticate with a Veritio API key: "Authorization: Bearer vrt_…" or the "X-Api-Key" header. ' +
      "Create one in Settings → API keys, or connect through the advertised OAuth server.",
    {
      headers: {
        "WWW-Authenticate": `Bearer resource_metadata="${base}/.well-known/oauth-protected-resource"`,
      },
    },
  );
}

// --- Rate limiting ---------------------------------------------------------

interface RateLimitState {
  limit: number;
  remaining: number;
  resetSeconds: number;
}

/**
 * Consume one point against the credential, not the IP.
 *
 * Per-credential is the right key for an API: an office behind one NAT address
 * would otherwise share a budget, and one team's runaway script would rate-limit
 * everybody else's integrations.
 */
async function enforceRateLimit(
  caller: ResolvedCaller,
  cost: RouteCost,
): Promise<RateLimitState> {
  const tier = RATE_LIMIT_TIERS[cost];
  const config = RATE_LIMIT_CONFIG[tier];
  const key = caller.credentialId
    ? `${caller.userId}:${caller.credentialId}`
    : caller.userId;

  try {
    const result = await consumeRateLimit(tier, key, 1);
    return {
      limit: config.points,
      remaining: Math.max(0, result.remainingPoints),
      resetSeconds: Math.ceil(result.msBeforeNext / 1000),
    };
  } catch (err) {
    const retryAfter = Math.max(
      1,
      Math.ceil(((err as { msBeforeNext?: number })?.msBeforeNext ?? 60_000) / 1000),
    );
    throw new ApiError(
      "rate_limited",
      `Rate limit of ${config.points} ${cost} requests per ${config.duration}s exceeded. Retry in ${retryAfter}s.`,
      {
        retryAfter,
        headers: {
          "Retry-After": String(retryAfter),
          "RateLimit-Limit": String(config.points),
          "RateLimit-Remaining": "0",
          "RateLimit-Reset": String(retryAfter),
        },
      },
    );
  }
}

// --- Request body ----------------------------------------------------------

async function readBody(
  request: Request,
  def: RouteDefinition,
): Promise<unknown> {
  if (request.method === "GET" || request.method === "DELETE") return {};
  if (!def.inputs?.body) return {};

  const declared = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    throw payloadTooLarge(MAX_BODY_BYTES);
  }

  const raw = await request.text();
  // An empty body is a legitimate way to send "no optional fields"; treat it as
  // `{}` rather than as malformed JSON, which would be a confusing 400 on a
  // request where every field happens to be optional.
  if (raw.trim().length === 0) return {};
  if (raw.length > MAX_BODY_BYTES) throw payloadTooLarge(MAX_BODY_BYTES);

  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/json")) throw unsupportedMediaType();

  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw badRequest("Request body must be a JSON object.");
    }
    return parsed;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw badRequest("Request body is not valid JSON.");
  }
}

// --- Idempotency -----------------------------------------------------------

interface IdempotencyHandle {
  replay?: { status: number; body: unknown };
  store: (response: { status: number; body: unknown }) => void;
  release: () => void;
}

interface IdempotencyRecord {
  fingerprint: string;
  state: "in_flight" | "done";
  response?: { status: number; body: unknown };
}

/**
 * Honour `Idempotency-Key` on non-idempotent writes.
 *
 * Honest about its limits: the store is a TTL cache with no compare-and-set, so
 * this reliably collapses a *retry* — the case it exists for — but two genuinely
 * simultaneous requests can both pass the check. The in-flight marker narrows
 * that window to the gap between reading and writing rather than the whole
 * request, and a second call that observes it gets a 409 instead of silently
 * duplicating the write.
 */
async function claimIdempotency(
  request: Request,
  def: RouteDefinition,
  caller: ResolvedCaller,
  call: { method: string; path: string; body: unknown },
): Promise<IdempotencyHandle | null> {
  const key = request.headers.get("idempotency-key")?.trim();
  if (!key || !def.idempotent) return null;

  if (key.length > 255) {
    throw badRequest("Idempotency-Key must be 255 characters or fewer.");
  }

  const cacheKey = `api:idem:${caller.userId}:${key}`;
  const fingerprint = fingerprintOf(call);
  const existing = await cache.getTiered<IdempotencyRecord>(cacheKey);

  if (existing) {
    // Same key, different request: the caller has a bug, and replaying the old
    // response would hide it behind a plausible-looking success.
    if (existing.fingerprint !== fingerprint) {
      throw new ApiError(
        "idempotency_conflict",
        "This Idempotency-Key was already used for a request with a different method, path or body. Use a new key.",
      );
    }
    if (existing.state === "in_flight") {
      throw new ApiError(
        "conflict",
        "A request with this Idempotency-Key is still in flight. Retry once it completes.",
        { headers: { "Retry-After": "2" } },
      );
    }
    if (existing.response) return { replay: existing.response, store: noop, release: noop };
  }

  cache.set<IdempotencyRecord>(
    cacheKey,
    { fingerprint, state: "in_flight" },
    IDEMPOTENCY_TTL_MS,
  );

  return {
    store: (response) =>
      cache.set<IdempotencyRecord>(
        cacheKey,
        { fingerprint, state: "done", response },
        IDEMPOTENCY_TTL_MS,
      ),
    release: () => cache.delete(cacheKey),
  };
}

function noop() {}

function fingerprintOf(call: {
  method: string;
  path: string;
  body: unknown;
}): string {
  return `${call.method} ${call.path} ${stableStringify(call.body)}`;
}

/** Key order must not change the fingerprint, or every retry looks different. */
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
    a.localeCompare(b),
  );
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
}

// --- Responses -------------------------------------------------------------

function readRequestId(request: Request): string {
  const supplied = request.headers.get("x-request-id")?.trim();
  // Echo a caller-supplied id so their logs and ours line up, but bound it —
  // this value is written to our logs and returned in the body.
  if (supplied && supplied.length <= 128 && /^[\w.:-]+$/.test(supplied)) {
    return supplied;
  }
  return `req_${randomUUID().replace(/-/g, "")}`;
}

function baseHeaders(requestId: string): Record<string, string> {
  return {
    ...CORS_HEADERS,
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Request-Id": requestId,
    "Veritio-Api-Version": "2026-08-30",
  };
}

function jsonResponse(
  body: unknown,
  status: number,
  opts: {
    requestId: string;
    rateLimit?: RateLimitState;
    def?: RouteDefinition;
    extra?: Record<string, string>;
  },
): Response {
  const headers = baseHeaders(opts.requestId);

  if (opts.rateLimit) {
    // Both spellings: `RateLimit-*` is the IETF draft standard, `X-RateLimit-*`
    // is what most existing client libraries still read.
    headers["RateLimit-Limit"] = String(opts.rateLimit.limit);
    headers["RateLimit-Remaining"] = String(opts.rateLimit.remaining);
    headers["RateLimit-Reset"] = String(opts.rateLimit.resetSeconds);
    headers["X-RateLimit-Limit"] = String(opts.rateLimit.limit);
    headers["X-RateLimit-Remaining"] = String(opts.rateLimit.remaining);
    headers["X-RateLimit-Reset"] = String(opts.rateLimit.resetSeconds);
  }

  if (opts.def?.deprecated) {
    headers["Deprecation"] = "true";
    headers["Link"] = '<https://veritio.io/docs/api>; rel="deprecation"';
  }

  Object.assign(headers, opts.extra ?? {});

  if (status === 204) return new Response(null, { status, headers });
  return new Response(JSON.stringify(body), { status, headers });
}

function problemResponse(err: unknown, requestId: string): Response {
  const apiError = toApiError(err);

  if (apiError.code === "internal_error") {
    // The original is logged, never returned: it may carry internals or PII,
    // and a caller can act on neither.
    console.error(`[api/v1] ${requestId} unhandled failure`, err);
  }

  const headers = {
    ...baseHeaders(requestId),
    "Content-Type": `${PROBLEM_CONTENT_TYPE}; charset=utf-8`,
    ...(apiError.headers ?? {}),
  };

  return new Response(JSON.stringify(apiError.toProblem(requestId)), {
    status: apiError.status,
    headers,
  });
}

function preflight(segments: readonly string[]): Response {
  const methods = router.methodsFor(segments);
  return new Response(null, {
    status: 204,
    headers: {
      ...CORS_HEADERS,
      "Access-Control-Allow-Methods": [...methods, "OPTIONS"].join(", "),
    },
  });
}

/**
 * Serve the spec, revalidated rather than cached blind.
 *
 * `Cache-Control: no-cache` does not mean "do not store" — it means "always
 * revalidate before reuse". Paired with a strong `ETag` a repeat load costs a
 * 304 and no body, so this is nearly as cheap as caching outright while being
 * impossible to serve stale.
 *
 * That distinction is load-bearing here rather than a nicety. This document
 * embeds the deployment's own endpoint URLs and the reference page's OAuth
 * client id. Served from a stale cache it points readers at another
 * deployment's authorization server with a client id that host has never issued
 * — which surfaces as a bare `invalid_client` and looks like a server bug.
 */
async function openApiResponse(
  origin: string,
  requestId: string,
  request: Request,
): Promise<Response> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? origin;
  const document = buildOpenApiDocument({
    serverUrl: `${base}/api/v1`,
    oauthClientId: await getDocsOAuthClientId(base),
  });

  const body = JSON.stringify(document);
  const etag = `"${createHash("sha256").update(body).digest("hex").slice(0, 32)}"`;

  const headers = {
    ...CORS_HEADERS,
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "public, no-cache",
    ETag: etag,
    "X-Request-Id": requestId,
  };

  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers });
  }

  return new Response(body, { status: 200, headers });
}
