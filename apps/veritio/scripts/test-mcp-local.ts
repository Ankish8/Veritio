#!/usr/bin/env bun

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { Client } from "pg";
import { defaultKeyHasher } from "better-auth/plugins";

const base = (process.env.MCP_TEST_URL || "http://localhost:4001").replace(
  /\/+$/,
  "",
);
const testHostname = new URL(base).hostname;
if (
  !["localhost", "127.0.0.1", "::1"].includes(testHostname) &&
  process.env.MCP_TEST_ALLOW_REMOTE !== "1"
) {
  throw new Error(
    "Refusing to run MCP fixtures against a remote host. Set MCP_TEST_ALLOW_REMOTE=1 to opt in.",
  );
}
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl)
  throw new Error("DATABASE_URL is not set. Run with --env-file=.env.local");

const db = new Client({ connectionString: databaseUrl });
await db.connect();

let keyId: string | null = null;
let clientId: string | null = null;
let report: Record<string, unknown> | null = null;

async function decodeMcp(response: Response): Promise<any> {
  const text = await response.text();
  if (!text) return null;
  if (!text.includes("data:")) return JSON.parse(text);

  const dataLine = text.split(/\r?\n/).find((line) => line.startsWith("data:"));
  return dataLine ? JSON.parse(dataLine.slice(5).trim()) : null;
}

async function rpc(
  url: string,
  apiKey: string,
  payload: Record<string, unknown>,
  useApiKeyHeader = false,
) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      ...(useApiKeyHeader
        ? { "x-api-key": apiKey }
        : { authorization: `Bearer ${apiKey}` }),
    },
    body: JSON.stringify(payload),
  });
  return { status: response.status, body: await decodeMcp(response) };
}

try {
  const protectedResponse = await fetch(
    `${base}/.well-known/oauth-protected-resource`,
  );
  const protectedMetadata = (await protectedResponse.json()) as Record<
    string,
    any
  >;
  const discoveryResponse = await fetch(
    `${base}/.well-known/oauth-authorization-server`,
  );
  const discovery = (await discoveryResponse.json()) as Record<string, any>;

  const unauthenticated = await fetch(`${base}/mcp`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "release-e2e", version: "1" },
      },
    }),
  });

  const unsafeRegistration = await fetch(`${base}/api/auth/mcp/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      redirect_uris: ["javascript:alert(1)"],
      token_endpoint_auth_method: "none",
    }),
  });

  const registration = await fetch(`${base}/api/auth/mcp/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      redirect_uris: ["http://127.0.0.1:49152/callback"],
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      client_name: "Veritio MCP release fixture",
    }),
  });
  const registrationBody = (await registration.json()) as Record<string, any>;
  clientId =
    typeof registrationBody.client_id === "string"
      ? registrationBody.client_id
      : null;
  if (!clientId)
    throw new Error("Dynamic client registration did not return a client id");

  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const authorizeUrl = new URL(`${base}/api/auth/mcp/authorize`);
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set(
    "redirect_uri",
    "http://127.0.0.1:49152/callback",
  );
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set(
    "scope",
    "openid studies:read results:read org:read",
  );
  authorizeUrl.searchParams.set("code_challenge", challenge);
  authorizeUrl.searchParams.set("code_challenge_method", "S256");
  authorizeUrl.searchParams.set("prompt", "none");
  const authorizeResponse = await fetch(authorizeUrl, { redirect: "manual" });
  const authorizeLocation = authorizeResponse.headers.get("location");
  const forcedConsent = authorizeLocation
    ? new URL(authorizeLocation, base).searchParams.get("prompt") === "consent"
    : false;

  const user = await db.query(
    `SELECT om.user_id AS id, om.organization_id
       FROM public.organization_members om
       JOIN public."user" u ON u.id = om.user_id
      ORDER BY om.created_at ASC
      LIMIT 1`,
  );
  const userId = user.rows[0]?.id as string | undefined;
  const organizationId = user.rows[0]?.organization_id as string | undefined;
  if (!userId || !organizationId)
    throw new Error(
      "No organization member is available for the API-key fixture",
    );

  const rawKey = `vrt_${randomBytes(32).toString("base64url")}`;
  keyId = randomUUID();
  const keyHash = await defaultKeyHasher(rawKey);
  await db.query(
    `INSERT INTO public.apikey
      (id, name, start, prefix, key, "userId", enabled,
       "rateLimitEnabled", "rateLimitTimeWindow", "rateLimitMax", "requestCount",
       "expiresAt", "createdAt", "updatedAt", permissions)
     VALUES ($1, $2, $3, 'vrt_', $4, $5, true, true, 60000, 300, 0,
             NOW() + INTERVAL '1 day', NOW(), NOW(), $6)`,
    [
      keyId,
      "MCP release fixture",
      rawKey.slice(0, 12),
      keyHash,
      userId,
      JSON.stringify({
        studies: ["read", "write"],
        results: ["read"],
        panel: ["read", "write"],
        org: ["read"],
        export: ["write"],
      }),
    ],
  );

  const initialize = await rpc(`${base}/mcp`, rawKey, {
    jsonrpc: "2.0",
    id: 2,
    method: "initialize",
    params: {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "release-e2e", version: "1" },
    },
  });
  const tools = await rpc(
    `${base}/mcp`,
    rawKey,
    { jsonrpc: "2.0", id: 3, method: "tools/list", params: {} },
    true,
  );
  const readonly = await rpc(`${base}/mcp/readonly`, rawKey, {
    jsonrpc: "2.0",
    id: 4,
    method: "tools/list",
    params: {},
  });
  const self = await rpc(`${base}/mcp`, rawKey, {
    jsonrpc: "2.0",
    id: 5,
    method: "tools/call",
    params: {
      name: "fetch",
      arguments: { id: "self", organization_id: organizationId },
    },
  });

  const toolNames = (tools.body?.result?.tools ?? []).map(
    (tool: { name: string }) => tool.name,
  );
  const readonlyNames = (readonly.body?.result?.tools ?? []).map(
    (tool: { name: string }) => tool.name,
  );

  report = {
    metadata: {
      protectedStatus: protectedResponse.status,
      resource: protectedMetadata.resource,
      authorizationServers: protectedMetadata.authorization_servers,
      discoveryStatus: discoveryResponse.status,
      pkce: discovery.code_challenge_methods_supported,
      registrationPath: new URL(discovery.registration_endpoint).pathname,
      scopeCount: discovery.scopes_supported?.length,
    },
    unauthenticated: {
      status: unauthenticated.status,
      challenge: unauthenticated.headers.has("www-authenticate"),
    },
    dynamicRegistration: {
      unsafeStatus: unsafeRegistration.status,
      validStatus: registration.status,
      publicClient: !registrationBody.client_secret,
      authorizeStatus: authorizeResponse.status,
      forcedConsent,
    },
    apiKey: {
      initializeStatus: initialize.status,
      serverName: initialize.body?.result?.serverInfo?.name,
      toolCount: toolNames.length,
      hasStudyCreate: toolNames.includes("study_create"),
      readonlyStatus: readonly.status,
      readonlyToolCount: readonlyNames.length,
      readonlyHasStudyCreate: readonlyNames.includes("study_create"),
      selfStatus: self.status,
      selfSucceeded: Boolean(self.body?.result && !self.body?.result?.isError),
      selfError: self.body?.result?.isError
        ? (self.body.result.content ?? [])
            .map((item: { text?: string }) => item.text)
            .filter(Boolean)
        : undefined,
    },
  };
} finally {
  if (keyId) await db.query("DELETE FROM public.apikey WHERE id = $1", [keyId]);
  if (clientId) {
    await db.query(
      `DELETE FROM public."oauthApplication" WHERE "clientId" = $1`,
      [clientId],
    );
  }

  const leftovers = await db.query(
    `SELECT
       (SELECT COUNT(*)::int FROM public.apikey WHERE id = $1) AS api_key,
       (SELECT COUNT(*)::int FROM public."oauthApplication" WHERE "clientId" = $2) AS oauth_client`,
    [keyId, clientId],
  );
  await db.end();

  if (report) {
    report.cleanup = {
      apiKeyRows: leftovers.rows[0].api_key,
      oauthClientRows: leftovers.rows[0].oauth_client,
    };
    console.log(JSON.stringify(report, null, 2));
  }
}
