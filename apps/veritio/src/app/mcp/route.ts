import "server-only";

import { createRouteHandler } from "../../mcp/route-handler";

/**
 * The Veritio MCP endpoint: https://veritio.io/mcp
 *
 * Mounted at the top level rather than under /api on purpose — next.config.ts
 * rewrites /api/:path* to the iii backend for most routes, so an /api/mcp route
 * would be proxied away before it ever ran here.
 *
 * Node runtime, not Edge: the handler reaches the services layer and the
 * Postgres-backed Better Auth instance.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handler = createRouteHandler({ readOnly: false });

export async function POST(request: Request): Promise<Response> {
  return handler(request);
}

/**
 * GET and DELETE were the 2025-era session operations. The current protocol
 * has no protocol-level session, and the SDK's stateless legacy fallback
 * answers them with 405 — mirrored here so an unauthenticated probe gets a
 * clear answer rather than a Next.js 405 page.
 */
export async function GET(): Promise<Response> {
  return new Response(
    JSON.stringify({
      error: "method_not_allowed",
      message:
        "The Veritio MCP endpoint accepts POST. Configure your client with a Streamable HTTP transport.",
    }),
    {
      status: 405,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
        allow: "POST",
      },
    },
  );
}
