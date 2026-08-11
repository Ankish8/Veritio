import "server-only";

import { NextResponse } from "next/server";
import {
  MCP_SCOPES,
  permissionsFromScopes,
  type McpScope,
} from "@/mcp/authz/scopes";
import { isAllowedRequestOrigin } from "@/mcp/oauth-security";

/**
 * Self-service MCP API key management.
 *
 * These exist because Better Auth classifies a key's `permissions` as a
 * server-only property: `create-api-key.mjs` throws `SERVER_ONLY_PROPERTY` for
 * any request that carries `ctx.request` or `ctx.headers`, which is every
 * browser call. So the Settings UI cannot hit `/api/auth/api-key/create`
 * directly if it wants scoped keys — it has to come through here, where the
 * call originates server-side.
 *
 * Excluded from the backend rewrite in next.config.ts, alongside auth and billing.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getAuth() {
  const { auth } = await import("@veritio/auth/auth-instance");
  return auth;
}

/** Resolve the caller from their session cookie, or null. */
async function sessionUserId(request: Request): Promise<string | null> {
  try {
    const auth = await getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    return session?.user?.id ?? null;
  } catch {
    return null;
  }
}

const NO_STORE_HEADERS = { "Cache-Control": "no-store", Pragma: "no-cache" };
const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: NO_STORE_HEADERS });
const unauthorized = () => json({ error: "Not signed in." }, 401);

export async function GET(request: Request) {
  const userId = await sessionUserId(request);
  if (!userId) return unauthorized();

  try {
    const auth = await getAuth();
    const keys = await auth.api.listApiKeys({ headers: request.headers });
    // Never return `key`; only the safe display prefix. listApiKeys already
    // omits the hash, but be explicit rather than trusting the shape.
    const safe = (keys as Array<Record<string, unknown>>).map((k) => ({
      id: k.id,
      name: k.name,
      start: k.start,
      enabled: k.enabled,
      createdAt: k.createdAt,
      expiresAt: k.expiresAt,
      lastRequest: k.lastRequest,
      permissions: k.permissions,
    }));
    return json({ keys: safe });
  } catch {
    return json({ error: "Could not list keys." }, 500);
  }
}

export async function POST(request: Request) {
  if (!isAllowedRequestOrigin(request, process.env.NEXT_PUBLIC_APP_URL)) {
    return json({ error: "Origin not allowed." }, 403);
  }
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  ) {
    return json({ error: "Content-Type must be application/json." }, 415);
  }

  const userId = await sessionUserId(request);
  if (!userId) return unauthorized();

  let body: { name?: unknown; scopes?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 80) {
    return json({ error: "Give the key a name of 1-80 characters." }, 400);
  }

  const requested = Array.isArray(body.scopes) ? body.scopes : [];
  const scopes = MCP_SCOPES.filter((s) => requested.includes(s)) as McpScope[];
  if (scopes.length === 0) {
    return json({ error: "Select at least one valid permission." }, 400);
  }

  try {
    const auth = await getAuth();
    // No `headers` passed: that is what makes this a server-side call, which is
    // the only context in which Better Auth accepts `permissions`. The session
    // was already verified above, and userId is taken from it — never from the
    // request body, so a caller cannot mint a key for someone else.
    const created = await auth.api.createApiKey({
      body: {
        userId,
        name,
        prefix: "vrt_",
        permissions: permissionsFromScopes(scopes),
      },
    });

    return json({
      key: created.key,
      id: created.id,
      name: created.name,
      start: created.start,
      scopes,
    });
  } catch (err) {
    // Better Auth validates the key itself and throws an APIError with a 400
    // when it refuses. Reporting its message beats a blanket 500: the name
    // bounds above are duplicated in the plugin config, and when the two drift
    // the UI should say why rather than "Could not create the key."
    const message = badRequestMessage(err);
    if (message) return json({ error: message }, 400);

    console.error("[mcp-keys] create failed", err);
    return json({ error: "Could not create the key." }, 500);
  }
}

/** Better Auth's APIError shape, matched structurally to avoid importing it. */
function badRequestMessage(err: unknown): string | null {
  if (!err || typeof err !== "object") return null;
  if ((err as { statusCode?: unknown }).statusCode !== 400) return null;
  const body = (err as { body?: { message?: unknown } }).body;
  return typeof body?.message === "string" ? body.message : null;
}
