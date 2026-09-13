import "server-only";

import { NextResponse } from "next/server";
import { isAllowedRequestOrigin } from "@/mcp/oauth-security";
import { apiKeyApi } from "@/lib/auth/api-key-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = { "Cache-Control": "no-store", Pragma: "no-cache" };
const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: NO_STORE_HEADERS });

async function getAuth() {
  const { auth } = await import("@veritio/auth/auth-instance");
  return auth;
}

/**
 * Revoke a key.
 *
 * Passing the caller's `headers` through is deliberate here, unlike on create:
 * Better Auth scopes deleteApiKey to the session's own keys, which is exactly
 * the ownership check we want. A user cannot revoke someone else's key.
 */
export async function DELETE(
  request: Request,
  ctx: { params: Promise<{ keyId: string }> },
) {
  if (!isAllowedRequestOrigin(request, process.env.NEXT_PUBLIC_APP_URL)) {
    return json({ error: "Origin not allowed." }, 403);
  }

  const { keyId } = await ctx.params;
  if (!keyId) return json({ error: "Missing key id." }, 400);

  try {
    const auth = await getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.id) return json({ error: "Not signed in." }, 401);

    await apiKeyApi(auth.api).deleteApiKey({
      body: { keyId },
      headers: request.headers,
    });
    return json({ revoked: keyId });
  } catch {
    // Better Auth throws for a key the session does not own, which is the same
    // outcome as one that does not exist. Do not distinguish them.
    return json({ error: "Could not revoke that key." }, 400);
  }
}
