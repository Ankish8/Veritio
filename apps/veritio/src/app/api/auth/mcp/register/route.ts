import "server-only";

import { toNextJsHandler } from "better-auth/next-js";
import {
  validateDynamicClientRegistration,
  withOriginalRedirectMetadata,
} from "@/mcp/oauth-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
  "Cache-Control": "no-store",
};

function oauthError(error: string, description: string, status = 400) {
  return Response.json(
    { error, error_description: description },
    { status, headers: CORS_HEADERS },
  );
}

/**
 * Validate dynamic client metadata before handing it to Better Auth 1.4.13.
 * The upstream schema accepts arbitrary strings for redirect URIs (including
 * javascript: URLs) and unbounded metadata, so this narrow route is the public
 * registration boundary.
 */
export async function POST(request: Request) {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/json")) {
    return oauthError(
      "invalid_client_metadata",
      "Content-Type must be application/json.",
    );
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > 32_768) {
    return oauthError(
      "invalid_client_metadata",
      "Client metadata is too large.",
      413,
    );
  }

  const body = (await request
    .clone()
    .json()
    .catch(() => null)) as Record<string, unknown> | null;
  const validation = validateDynamicClientRegistration(body);
  if (!validation.ok) {
    return oauthError(validation.error, validation.description);
  }

  const headers = new Headers(request.headers);
  headers.delete("content-length");
  const registrationRequest = new Request(request.url, {
    method: "POST",
    headers,
    body: JSON.stringify(withOriginalRedirectMetadata(body!)),
  });

  const { auth } = await import("@veritio/auth/auth-instance");
  return toNextJsHandler(auth).POST(registrationRequest);
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
