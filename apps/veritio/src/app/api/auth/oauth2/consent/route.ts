import "server-only";

import { toNextJsHandler } from "better-auth/next-js";
import { loadConsentRequest } from "@/mcp/oauth-consent-server";
import {
  isAllowedRequestOrigin,
  isSafeOAuthRedirectUri,
  isValidConsentCode,
} from "@/mcp/oauth-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = { "Cache-Control": "no-store", Pragma: "no-cache" };

function error(message: string, status: number) {
  return Response.json(
    { error: message },
    { status, headers: NO_STORE_HEADERS },
  );
}

/**
 * Bind consent to the signed-in user before Better Auth rotates the code and
 * writes a grant. The upstream 1.4 handler checks only that some session exists
 * and otherwise accepts a consent code belonging to a different user.
 */
export async function POST(request: Request) {
  if (!isAllowedRequestOrigin(request, process.env.NEXT_PUBLIC_APP_URL)) {
    return error("Origin not allowed.", 403);
  }
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  ) {
    return error("Content-Type must be application/json.", 415);
  }

  const body = (await request
    .clone()
    .json()
    .catch(() => null)) as Record<string, unknown> | null;
  const code =
    typeof body?.consent_code === "string" ? body.consent_code : null;
  if (!body || typeof body.accept !== "boolean" || !isValidConsentCode(code)) {
    return error("Invalid consent decision.", 400);
  }

  const { auth } = await import("@veritio/auth/auth-instance");
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) return error("Not signed in.", 401);

  const consent = await loadConsentRequest(code, session.user.id);
  if (!consent || !isSafeOAuthRedirectUri(consent.verification.redirectURI)) {
    return error("This consent request is invalid or has expired.", 400);
  }

  const response = await toNextJsHandler(auth).POST(request);
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "no-store");
  headers.set("Pragma", "no-cache");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
