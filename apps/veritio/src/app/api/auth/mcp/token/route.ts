import "server-only";

import { createHash } from "node:crypto";
import { toNextJsHandler } from "better-auth/next-js";
import { createPool } from "@veritio/auth/db-pool";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = { "Cache-Control": "no-store", Pragma: "no-cache" };

function oauthError(error: string, description: string, status = 400) {
  return Response.json(
    { error, error_description: description },
    { status, headers: NO_STORE_HEADERS },
  );
}

async function requestBody(
  request: Request,
): Promise<Record<string, unknown> | null> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (contentType.startsWith("application/json")) {
    const body = await request
      .clone()
      .json()
      .catch(() => null);
    return body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : null;
  }
  if (contentType.startsWith("application/x-www-form-urlencoded")) {
    const params = new URLSearchParams(await request.clone().text());
    return Object.fromEntries(params.entries());
  }
  return null;
}

function noStore(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "no-store");
  headers.set("Pragma", "no-cache");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Better Auth 1.4 creates a new refresh token but leaves the used row active,
 * so the old token can be replayed until its seven-day expiry. Serialize each
 * refresh token and delete its source row only after a successful exchange.
 */
export async function POST(request: Request) {
  const body = await requestBody(request);
  if (!body)
    return oauthError(
      "invalid_request",
      "Unsupported or invalid token request.",
    );

  const { auth } = await import("@veritio/auth/auth-instance");
  if (body.grant_type !== "refresh_token") {
    return noStore(await toNextJsHandler(auth).POST(request));
  }

  const refreshToken =
    typeof body.refresh_token === "string" ? body.refresh_token : null;
  if (!refreshToken || refreshToken.length > 512) {
    return oauthError("invalid_request", "refresh_token is required.");
  }

  const connection = await createPool().connect();
  try {
    await connection.query("BEGIN");
    // Do not put the token itself into the advisory-lock namespace or logs.
    const lockKey = createHash("sha256").update(refreshToken).digest("hex");
    await connection.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      `mcp-refresh:${lockKey}`,
    ]);

    const existing = await connection.query(
      `SELECT id
         FROM public."oauthAccessToken"
        WHERE "refreshToken" = $1
        LIMIT 1`,
      [refreshToken],
    );
    if (!existing.rowCount) {
      await connection.query("ROLLBACK");
      return oauthError(
        "invalid_grant",
        "Refresh token is invalid or has already been used.",
        401,
      );
    }

    const response = await toNextJsHandler(auth).POST(request);
    if (!response.ok) {
      await connection.query("ROLLBACK");
      return noStore(response);
    }

    await connection.query(
      `DELETE FROM public."oauthAccessToken" WHERE id = $1 AND "refreshToken" = $2`,
      [existing.rows[0].id, refreshToken],
    );
    await connection.query("COMMIT");
    return noStore(response);
  } catch (error) {
    await connection.query("ROLLBACK").catch(() => undefined);
    console.error(
      "[mcp-oauth] refresh rotation failed",
      error instanceof Error ? error.message : "unknown error",
    );
    return oauthError(
      "server_error",
      "Could not rotate the refresh token.",
      500,
    );
  } finally {
    connection.release();
  }
}
