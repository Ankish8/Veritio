import "server-only";

/**
 * RFC 9728 protected-resource metadata.
 *
 * The spec makes this a MUST for an OAuth-protected MCP server: it is how a
 * client that got a 401 discovers which authorization server to talk to. Our
 * 401s already point here via `WWW-Authenticate: Bearer resource_metadata=...`.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function metadataHandler() {
  const { oAuthProtectedResourceMetadata } =
    await import("better-auth/plugins");
  const { auth } = await import("@veritio/auth/auth-instance");
  return oAuthProtectedResourceMetadata(auth as never);
}

export async function GET(request: Request): Promise<Response> {
  const handler = await metadataHandler();
  const response = await handler(request);
  const headers = new Headers(response.headers);
  headers.set("access-control-allow-methods", "GET, OPTIONS");
  headers.set("cache-control", "public, max-age=300, must-revalidate");
  return new Response(response.body, { status: response.status, headers });
}

/** Clients probe with OPTIONS before the GET in some stacks. */
export async function OPTIONS(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, OPTIONS",
      "access-control-allow-headers":
        "authorization, content-type, mcp-protocol-version",
    },
  });
}
