import "server-only";

/**
 * RFC 8414 authorization server metadata.
 *
 * Advertises the authorize/token endpoints, the supported grant types, PKCE
 * S256, and the dynamic client registration endpoint. Clients read this after
 * following the pointer in our protected-resource metadata.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const { oAuthDiscoveryMetadata } = await import("better-auth/plugins");
  const { auth } = await import("@veritio/auth/auth-instance");
  const handler = oAuthDiscoveryMetadata(auth as never);
  const response = await handler(request);
  const headers = new Headers(response.headers);
  headers.set("access-control-allow-methods", "GET, OPTIONS");
  headers.set("cache-control", "public, max-age=300, must-revalidate");
  return new Response(response.body, { status: response.status, headers });
}

export async function OPTIONS(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, OPTIONS",
      "access-control-allow-headers": "authorization, content-type",
    },
  });
}
