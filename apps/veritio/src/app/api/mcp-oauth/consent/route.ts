import "server-only";

import { NextResponse } from "next/server";
import { loadConsentRequest } from "@/mcp/oauth-consent-server";
import {
  isAllowedRequestOrigin,
  isValidConsentCode,
} from "@/mcp/oauth-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = { "Cache-Control": "no-store", Pragma: "no-cache" };

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE_HEADERS });
}

async function getAuth() {
  const { auth } = await import("@veritio/auth/auth-instance");
  return auth;
}

/**
 * Return the client and scopes stored in Better Auth's verification row.
 * The consent page's query parameters are controlled by the requesting client,
 * so they must never be the authority for what the user is approving.
 */
export async function GET(request: Request) {
  if (!isAllowedRequestOrigin(request, process.env.NEXT_PUBLIC_APP_URL)) {
    return json({ error: "Origin not allowed." }, 403);
  }

  const code = new URL(request.url).searchParams.get("consent_code");
  if (!isValidConsentCode(code))
    return json({ error: "Invalid or missing consent request." }, 400);

  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) return json({ error: "Not signed in." }, 401);

  const consent = await loadConsentRequest(code, session.user.id);
  if (!consent)
    return json(
      { error: "This consent request is invalid or has expired." },
      400,
    );

  return json({
    clientId: consent.clientId,
    clientName: consent.clientName,
    scopes: consent.scopes,
  });
}
