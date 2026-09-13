/**
 * Resolving an inbound MCP request to a caller.
 *
 * Two credential types are accepted, deliberately:
 *
 * - **API key** (`Authorization: Bearer vrt_…` or `x-api-key`). Covers Claude
 *   Code, Cursor, VS Code and any headless/CI use. Scoped and individually
 *   revocable.
 * - **OAuth access token**, for remote clients such as claude.ai and Claude
 *   Desktop custom connectors.
 * - **Session token**, the existing Better Auth bearer credential, so the
 *   dashboard can drive the same tools without minting a key.
 */

import {
  MCP_SCOPES,
  READONLY_SCOPES,
  scopesFromPermissions,
  type McpScope,
} from "./authz/scopes";
import type { CallerIdentity } from "./authz/define-tool";
import { apiKeyApi } from "@/lib/auth/api-key-api";

// Lazy load auth to avoid Turbopack bundling issues with pg — same pattern as
// app/api/auth/[...all]/route.ts and @veritio/auth/server.
async function getAuth() {
  const { auth } = await import("@veritio/auth/auth-instance");
  return auth;
}

export interface ResolvedCaller extends CallerIdentity {
  kind: "api_key" | "session" | "oauth";
}

/**
 * The MCP plugin's endpoints, typed locally.
 *
 * `packages/@veritio/auth` widens `mcp()` to `BetterAuthPlugin` to keep an
 * unexportable upstream type out of its declaration emit (see the comment
 * there), which erases these two from `auth.api`. Declaring the shape we
 * actually call keeps this call site honest rather than reaching for `any`.
 */
interface McpAuthApi {
  getMcpSession?: (input: { headers: Headers }) => Promise<{
    userId?: string;
    scopes?: string | string[];
    clientId?: string;
  } | null>;
}

function readHeader(req: Request, name: string): string | null {
  const v = req.headers.get(name);
  return v && v.length > 0 ? v : null;
}

function bearerToken(req: Request): string | null {
  const header = readHeader(req, "authorization");
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : null;
}

/**
 * Resolve the caller, or null if the credential is absent or invalid.
 *
 * Returns null rather than throwing so the route can answer with the RFC 9728
 * `WWW-Authenticate` challenge that clients use to discover how to authenticate.
 */
export async function resolveCaller(
  req: Request,
): Promise<ResolvedCaller | null> {
  const apiKeyHeader = readHeader(req, "x-api-key");
  const bearer = bearerToken(req);

  // Veritio-issued API keys carry the `vrt_` prefix configured on the plugin,
  // which is what lets one Authorization header serve every credential type.
  const key = apiKeyHeader ?? (bearer?.startsWith("vrt_") ? bearer : null);
  if (key) return resolveApiKey(key);

  if (!bearer) return null;

  // An OAuth access token and a Better Auth session token are both opaque
  // bearer strings, so try the OAuth path first (it is what remote connectors
  // send) and fall back to the session path (what the dashboard sends).
  return (await resolveOAuth(req)) ?? (await resolveSession(bearer));
}

async function resolveOAuth(req: Request): Promise<ResolvedCaller | null> {
  try {
    const auth = await getAuth();
    const api = auth.api as unknown as McpAuthApi;
    if (typeof api.getMcpSession !== "function") return null;

    const session = await api.getMcpSession({ headers: req.headers });
    if (!session?.userId) return null;

    // Scopes are stored space-delimited on the token row.
    const scopes = mcpScopesFromOAuthGrant(session.scopes);

    return {
      kind: "oauth",
      userId: session.userId,
      // OAuth means exactly what the grant says. In particular, a token with
      // only `openid` must not silently gain every Veritio read scope.
      scopes,
      credentialId: session.clientId ?? "oauth",
    };
  } catch {
    return null;
  }
}

/** Map an OAuth grant to only the Veritio scopes it explicitly contains. */
export function mcpScopesFromOAuthGrant(
  raw: string | string[] | undefined,
): McpScope[] {
  const granted =
    typeof raw === "string" ? raw.split(/[\s,]+/).filter(Boolean) : (raw ?? []);
  return MCP_SCOPES.filter((scope) => granted.includes(scope));
}

async function resolveApiKey(key: string): Promise<ResolvedCaller | null> {
  try {
    const auth = await getAuth();
    const result = await apiKeyApi(auth.api).verifyApiKey({ body: { key } });
    if (!result?.valid || !result.key) return null;

    const permissions = parsePermissions(result.key.permissions);
    return {
      kind: "api_key",
      userId: result.key.userId,
      // A key with no explicit grants is read-only, not all-powerful.
      scopes: permissions
        ? scopesFromPermissions(permissions)
        : READONLY_SCOPES,
      credentialId: result.key.id,
    };
  } catch {
    return null;
  }
}

async function resolveSession(token: string): Promise<ResolvedCaller | null> {
  try {
    const auth = await getAuth();
    const session = await auth.api.getSession({
      headers: new Headers({ authorization: `Bearer ${token}` }),
    });
    if (!session?.user?.id) return null;

    // A dashboard session is the user acting directly, so it carries the full
    // scope set — the per-resource role checks still apply on every call.
    return {
      kind: "session",
      userId: session.user.id,
      scopes: MCP_SCOPES,
      credentialId: "session",
    };
  } catch {
    return null;
  }
}

/** better-auth stores `permissions` as a JSON string. */
function parsePermissions(raw: unknown): Record<string, string[]> | null {
  if (!raw) return null;
  if (typeof raw === "object") return raw as Record<string, string[]>;
  if (typeof raw !== "string") return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, string[]>)
      : null;
  } catch {
    return null;
  }
}

/** Narrow a caller's scopes to the read-only set, for the /mcp/readonly endpoint. */
export function restrictToReadOnly(caller: ResolvedCaller): ResolvedCaller {
  return {
    ...caller,
    scopes: caller.scopes.filter((s): s is McpScope =>
      READONLY_SCOPES.includes(s),
    ),
  };
}
