import "server-only";

import { toNextJsHandler } from "better-auth/next-js";
import { createPool } from "@veritio/auth/db-pool";
import {
  forceConsentPrompt,
  isSafeOAuthRedirectUri,
  resolveLoopbackRedirect,
} from "@/mcp/oauth-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = { "Cache-Control": "no-store", Pragma: "no-cache" };

function oauthError(error: string, description: string, status = 400) {
  return Response.json(
    { error, error_description: description },
    { status, headers: NO_STORE_HEADERS },
  );
}

async function allowLoopbackPortVariation(
  clientId: string,
  requestedRedirect: string,
): Promise<"allowed" | "rejected" | "failed"> {
  const pool = createPool();

  // Retry a compare-and-swap update so concurrent native-client logins cannot
  // overwrite one another's callback aliases.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const result = await pool.query(
        `SELECT "redirectUrls", metadata, type, disabled
           FROM public."oauthApplication"
          WHERE "clientId" = $1
          LIMIT 1`,
        [clientId],
      );
      const row = result.rows[0] as
        | {
            redirectUrls: string;
            metadata: string | null;
            type: string;
            disabled: boolean;
          }
        | undefined;
      if (!row) return "rejected";

      const resolution = resolveLoopbackRedirect(row, requestedRedirect);
      if (resolution.kind === "exact") return "allowed";
      if (resolution.kind === "rejected") return "rejected";

      const updated = await pool.query(
        `UPDATE public."oauthApplication"
            SET "redirectUrls" = $1,
                metadata = $2,
                "updatedAt" = NOW()
          WHERE "clientId" = $3
            AND "redirectUrls" = $4
            AND metadata IS NOT DISTINCT FROM $5`,
        [
          resolution.redirectUrls,
          resolution.metadata,
          clientId,
          row.redirectUrls,
          row.metadata,
        ],
      );
      if (updated.rowCount === 1) return "allowed";
    } catch (error) {
      console.error(
        "[mcp-oauth] loopback redirect compatibility failed",
        error instanceof Error ? error.message : "unknown error",
      );
      return "failed";
    }
  }

  return "failed";
}

/**
 * Better Auth 1.4 grants immediately unless the client explicitly asks for
 * prompt=consent. MCP clients must never choose whether the user sees the
 * approval screen, so every authorization request is normalized here.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const clientIds = url.searchParams.getAll("client_id");
  const redirects = url.searchParams.getAll("redirect_uri");
  const clientId = clientIds.length === 1 ? clientIds[0] : null;
  const redirectUri = redirects.length === 1 ? redirects[0] : null;

  if (
    clientId &&
    redirectUri &&
    clientId.length <= 256 &&
    redirectUri.length <= 2048 &&
    isSafeOAuthRedirectUri(redirectUri)
  ) {
    let parsedRedirect: URL | null = null;
    try {
      parsedRedirect = new URL(redirectUri);
    } catch {
      parsedRedirect = null;
    }

    // HTTPS and custom-scheme redirects retain Better Auth's exact matching.
    // Only native-client HTTP loopback callbacks need RFC 8252 port handling.
    if (parsedRedirect?.protocol === "http:") {
      const compatibility = await allowLoopbackPortVariation(
        clientId,
        redirectUri,
      );
      if (compatibility === "rejected") {
        return oauthError("invalid_redirect_uri", "Invalid redirect URI.");
      }
      if (compatibility === "failed") {
        return oauthError(
          "server_error",
          "Could not validate the redirect URI.",
          500,
        );
      }
    }
  }

  const { auth } = await import("@veritio/auth/auth-instance");
  const consentRequest = new Request(forceConsentPrompt(request.url), {
    method: "GET",
    headers: request.headers,
  });
  return toNextJsHandler(auth).GET(consentRequest);
}
