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

/** Origins allowed to reach the MCP endpoint from a browser context. */
function allowedOrigins(): string[] {
  const app = process.env.NEXT_PUBLIC_APP_URL;
  return [app, "https://veritio.io", "https://www.veritio.io"].filter(
    (o): o is string => Boolean(o),
  );
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
    const rejected = originValidationResponse(request, allowedOrigins());
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
