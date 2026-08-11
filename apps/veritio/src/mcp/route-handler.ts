/**
 * Shared plumbing for the /mcp and /mcp/readonly route handlers.
 *
 * Two things the SDK deliberately does not do for you, both of which are
 * required here:
 *
 * 1. **It never derives auth from headers.** `createMcpHandler` takes an
 *    already-verified `authInfo` as pass-through. Verification is ours.
 * 2. **It does no Host/Origin validation on bare fetch runtimes.** The spec
 *    makes Origin validation a MUST (403 on mismatch) because a browser page
 *    can otherwise POST to a local MCP server.
 */

import {
  createMcpHandler,
  originValidationResponse,
} from "@modelcontextprotocol/server";
import { getMotiaSupabaseClient } from "../lib/supabase/motia-client";
import { buildServer } from "./server";
import { resolveCaller, restrictToReadOnly } from "./auth";
import { READONLY_SCOPES } from "./authz/scopes";
import { toolFeatures } from "./registry";

/**
 * Accept either a full URL or a bare host, since Vercel's system variables
 * provide the latter (`veritio-abc123.vercel.app`, no scheme).
 */
function toHostname(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value.includes("://") ? value : `https://${value}`).hostname;
  } catch {
    // A malformed value should narrow the allowlist, not break the endpoint.
    return null;
  }
}

/**
 * Hostnames allowed to reach the MCP endpoint from a browser context.
 *
 * The SDK compares against `new URL(origin).hostname`, so entries must be bare
 * hostnames: no scheme, no port. Full URLs here match nothing, which rejects
 * every browser request with a 403, including the dashboard's own setup page.
 *
 * The Vercel variables are what let that page work on a preview deployment.
 * Listing them beats allowing `*.vercel.app`, which would trust every other
 * tenant on the platform.
 */
function allowedOriginHostnames(): string[] {
  const hostnames = new Set(["veritio.io", "www.veritio.io"]);
  for (const value of [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_BRANCH_URL,
    process.env.VERCEL_URL,
  ]) {
    const hostname = toHostname(value);
    if (hostname) hostnames.add(hostname);
  }
  return [...hostnames];
}

/**
 * RFC 9728 challenge.
 *
 * The `resource_metadata` pointer is how a spec-compliant client discovers the
 * OAuth authorization server and supported scopes.
 */
function unauthorized(req: Request): Response {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;
  const resourceMetadata = `${base}/.well-known/oauth-protected-resource`;
  return new Response(
    JSON.stringify({
      error: "unauthorized",
      message:
        'Provide a Veritio API key as "Authorization: Bearer vrt_..." or "x-api-key". ' +
        "Create one in Settings, or connect through the advertised OAuth server.",
    }),
    {
      status: 401,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
        "access-control-expose-headers": "WWW-Authenticate",
        "www-authenticate": `Bearer resource_metadata="${resourceMetadata}"`,
      },
    },
  );
}

export interface EndpointOptions {
  readOnly: boolean;
}

export function createRouteHandler({ readOnly }: EndpointOptions) {
  return async function handle(request: Request): Promise<Response> {
    const rejected = originValidationResponse(
      request,
      allowedOriginHostnames(),
    );
    if (rejected) return rejected;

    const resolved = await resolveCaller(request);
    if (!resolved) return unauthorized(request);

    const caller = readOnly ? restrictToReadOnly(resolved) : resolved;

    // `?features=studies,results` trims the advertised surface. Every tool
    // still costs context on clients that do not defer tool definitions, so
    // this is a real lever for callers who only need one area.
    const requested = new URL(request.url).searchParams.get("features");
    const known = new Set(toolFeatures());
    const features = requested
      ? requested
          .split(",")
          .map((f) => f.trim())
          .filter((f) => known.has(f))
      : undefined;

    const supabase = getMotiaSupabaseClient();

    // A fresh server per request: the protocol is stateless, and this is what
    // guarantees one caller's scopes can never bleed into another's listing.
    const handler = createMcpHandler(() =>
      buildServer({
        caller,
        supabase,
        scopes: readOnly
          ? caller.scopes.filter((s) => READONLY_SCOPES.includes(s))
          : caller.scopes,
        readOnly,
        features,
      }),
    );

    return handler.fetch(request, {
      authInfo: {
        token: caller.credentialId ?? "session",
        clientId: caller.credentialId ?? "veritio",
        scopes: [...caller.scopes],
        extra: { userId: caller.userId },
      },
    });
  };
}
