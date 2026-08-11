#!/usr/bin/env bun

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { Client } from "pg";

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
    "Refusing to run OAuth fixtures against a remote host. Set MCP_TEST_ALLOW_REMOTE=1 to opt in.",
  );
}
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl)
  throw new Error("DATABASE_URL is not set. Run with --env-file=.env.local");

const db = new Client({ connectionString: databaseUrl });
await db.connect();

const fixtureId = randomUUID();
const email = `mcp-release-${fixtureId}@example.invalid`;
const password = `Mcp!${randomBytes(24).toString("base64url")}`;
// Next.js dev canonicalizes IPv4 loopback text inside request URLs to
// `localhost`. IPv6 loopback remains an IP literal, so the same fixture can
// exercise RFC 8252 port variation locally and against a production host.
const registeredRedirectUri = "http://[::1]:49153/callback";
const activeRedirectUri = "http://[::1]:49154/callback";
let userId: string | null = null;
let clientId: string | null = null;
let report: Record<string, unknown> | null = null;

function cookiesFrom(response: Response): string {
  const headers = response.headers as Headers & {
    getSetCookie?: () => string[];
  };
  const values = headers.getSetCookie?.() ?? [headers.get("set-cookie") ?? ""];
  return values
    .flatMap((value) => value.split(/,(?=\s*[^;,]+=)/))
    .map((value) => value.trim().split(";", 1)[0])
    .filter(Boolean)
    .join("; ");
}

async function decodeMcp(response: Response): Promise<any> {
  const text = await response.text();
  if (!text.includes("data:")) return text ? JSON.parse(text) : null;
  const line = text
    .split(/\r?\n/)
    .find((candidate) => candidate.startsWith("data:"));
  return line ? JSON.parse(line.slice(5).trim()) : null;
}

async function oauthGrant(
  cookie: string,
  scopes: string[],
  expectedScopes: string[],
) {
  if (!clientId) throw new Error("OAuth client has not been registered");

  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const authorizeUrl = new URL(`${base}/api/auth/mcp/authorize`);
  authorizeUrl.searchParams.set("client_id", clientId);
  // Native clients are allowed to select an ephemeral loopback port at
  // authorization time rather than being pinned to the DCR port.
  authorizeUrl.searchParams.set("redirect_uri", activeRedirectUri);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("scope", scopes.join(" "));
  authorizeUrl.searchParams.set("code_challenge", challenge);
  authorizeUrl.searchParams.set("code_challenge_method", "S256");
  authorizeUrl.searchParams.set("prompt", "none");
  authorizeUrl.searchParams.set("state", fixtureId);

  const authorize = await fetch(authorizeUrl, {
    headers: { cookie },
    redirect: "manual",
  });
  const consentLocation = authorize.headers.get("location");
  if (!consentLocation) {
    const body = await authorize.text();
    throw new Error(
      `Authorization did not redirect to consent (${authorize.status}): ${body}`,
    );
  }
  const consentUrl = new URL(consentLocation, base);
  const consentCode = consentUrl.searchParams.get("consent_code");
  if (!consentCode || consentUrl.pathname !== "/oauth/consent") {
    throw new Error("Authorization bypassed the consent page");
  }

  const infoUrl = new URL(`${base}/api/mcp-oauth/consent`);
  infoUrl.searchParams.set("consent_code", consentCode);
  // Deliberately tamper with the old display parameters. The response must
  // still come from the verification row.
  infoUrl.searchParams.set("client_name", "Spoofed client");
  infoUrl.searchParams.set("scope", "studies:write panel:write");
  const infoResponse = await fetch(infoUrl, { headers: { cookie } });
  const info = (await infoResponse.json()) as Record<string, any>;

  const withoutSession = await fetch(`${base}/api/auth/oauth2/consent`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: base,
    },
    body: JSON.stringify({ accept: true, consent_code: consentCode }),
  });

  const consentResponse = await fetch(`${base}/api/auth/oauth2/consent`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie,
      origin: base,
    },
    body: JSON.stringify({ accept: true, consent_code: consentCode }),
  });
  const consent = (await consentResponse.json()) as Record<string, any>;
  if (!consent.redirectURI)
    throw new Error("Consent did not return a callback");
  const callback = new URL(consent.redirectURI);
  const code = callback.searchParams.get("code");
  if (!code)
    throw new Error("Consent callback did not contain an authorization code");

  const tokenResponse = await fetch(`${base}/api/auth/mcp/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      code,
      redirect_uri: activeRedirectUri,
      code_verifier: verifier,
    }),
  });
  const token = (await tokenResponse.json()) as Record<string, any>;
  if (typeof token.access_token !== "string") {
    throw new Error(`Token exchange failed with ${tokenResponse.status}`);
  }
  let activeAccessToken = token.access_token;

  let refreshRotation: { firstStatus: number; replayStatus: number } | null =
    null;
  if (typeof token.refresh_token === "string") {
    const refreshBody = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      refresh_token: token.refresh_token,
    });
    const firstRefresh = await fetch(`${base}/api/auth/mcp/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: refreshBody,
    });
    const firstRefreshBody = (await firstRefresh.json()) as Record<string, any>;
    if (typeof firstRefreshBody.access_token === "string") {
      activeAccessToken = firstRefreshBody.access_token;
    }
    const replay = await fetch(`${base}/api/auth/mcp/token`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: refreshBody,
    });
    refreshRotation = {
      firstStatus: firstRefresh.status,
      replayStatus: replay.status,
    };
  }

  const mcpResponse = await fetch(`${base}/mcp`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      authorization: `Bearer ${activeAccessToken}`,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list",
      params: {},
    }),
  });
  const mcp = await decodeMcp(mcpResponse);
  const toolNames = (mcp?.result?.tools ?? []).map(
    (tool: { name: string }) => tool.name,
  );

  return {
    authorizeStatus: authorize.status,
    consentPath: consentUrl.pathname,
    infoStatus: infoResponse.status,
    authoritativeClient: info.clientName === "Veritio OAuth release fixture",
    authoritativeScopes:
      JSON.stringify(info.scopes) === JSON.stringify(expectedScopes),
    noSessionConsentStatus: withoutSession.status,
    consentStatus: consentResponse.status,
    stateRoundTrip: callback.searchParams.get("state") === fixtureId,
    tokenStatus: tokenResponse.status,
    grantedScope: token.scope,
    hasRefreshToken: typeof token.refresh_token === "string",
    refreshRotation,
    mcpStatus: mcpResponse.status,
    toolCount: toolNames.length,
    hasStudyGet: toolNames.includes("study_get"),
    hasResultsGet: toolNames.includes("results_get"),
    hasStudyCreate: toolNames.includes("study_create"),
  };
}

try {
  const signUp = await fetch(`${base}/api/auth/sign-up/email`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: base,
    },
    body: JSON.stringify({ name: "MCP release fixture", email, password }),
  });
  const signUpBody = (await signUp.json()) as Record<string, any>;
  userId = typeof signUpBody.user?.id === "string" ? signUpBody.user.id : null;
  const signUpCookie = cookiesFrom(signUp);
  if (!userId) throw new Error(`Fixture sign-up failed with ${signUp.status}`);

  // Production requires email verification, so sign-up intentionally does not
  // create a session. Verify only this disposable fixture row, then exercise
  // the real password sign-in route to obtain the session used by OAuth.
  await db.query(
    `UPDATE public."user"
        SET "emailVerified" = true, "updatedAt" = NOW()
      WHERE id = $1 AND email = $2`,
    [userId, email],
  );
  const signIn = await fetch(`${base}/api/auth/sign-in/email`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: base,
    },
    body: JSON.stringify({ email, password, rememberMe: false }),
  });
  const signInBody = (await signIn.json()) as Record<string, any>;
  const cookie = cookiesFrom(signIn);
  if (!signIn.ok || !signInBody.user?.id || !cookie) {
    throw new Error(`Fixture sign-in failed with ${signIn.status}`);
  }

  const registration = await fetch(`${base}/api/auth/mcp/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      redirect_uris: [registeredRedirectUri],
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      client_name: "Veritio OAuth release fixture",
    }),
  });
  const registrationBody = (await registration.json()) as Record<string, any>;
  clientId =
    typeof registrationBody.client_id === "string"
      ? registrationBody.client_id
      : null;
  if (!clientId)
    throw new Error(`OAuth registration failed with ${registration.status}`);

  const consentPage = await fetch(
    `${base}/oauth/consent?consent_code=${"a".repeat(32)}`,
    {
      headers: { cookie },
    },
  );
  const csp = consentPage.headers.get("content-security-policy") ?? "";

  const readGrant = await oauthGrant(
    cookie,
    ["openid", "offline_access", "studies:read", "results:read", "org:read"],
    ["openid", "offline_access", "studies:read", "results:read", "org:read"],
  );
  const identityGrant = await oauthGrant(cookie, ["openid"], ["openid"]);

  const consentRows = await db.query(
    `SELECT COUNT(*)::int AS count
       FROM public."oauthConsent"
      WHERE "clientId" = $1 AND "userId" = $2`,
    [clientId, userId],
  );
  const registeredClient = await db.query(
    `SELECT "redirectUrls"
       FROM public."oauthApplication"
      WHERE "clientId" = $1`,
    [clientId],
  );
  const storedRedirects = String(
    registeredClient.rows[0]?.redirectUrls ?? "",
  ).split(",");

  report = {
    signUp: {
      status: signUp.status,
      verificationRequired: !signUpCookie,
    },
    signIn: { status: signIn.status, sessionCookie: Boolean(cookie) },
    registration: {
      status: registration.status,
      publicClient: !registrationBody.client_secret,
      registeredRedirectUri,
      activeRedirectUri,
      activeLoopbackAliasStored: storedRedirects.includes(activeRedirectUri),
    },
    consentHeaders: {
      frameOptions: consentPage.headers.get("x-frame-options"),
      frameAncestorsNone: csp.includes("frame-ancestors 'none'"),
      noStore: consentPage.headers.get("cache-control")?.includes("no-store"),
    },
    readGrant,
    identityOnlyGrant: identityGrant,
    repeatedConsentRows: consentRows.rows[0].count,
  };
} finally {
  if (clientId) {
    await db.query(
      `DELETE FROM public."oauthApplication" WHERE "clientId" = $1`,
      [clientId],
    );
  }
  if (userId)
    await db.query(`DELETE FROM public."user" WHERE id = $1`, [userId]);
  else await db.query(`DELETE FROM public."user" WHERE email = $1`, [email]);

  const leftovers = await db.query(
    `SELECT
       (SELECT COUNT(*)::int FROM public."user" WHERE email = $1) AS users,
       (SELECT COUNT(*)::int FROM public."oauthApplication" WHERE "clientId" = $2) AS clients,
       (SELECT COUNT(*)::int FROM public."oauthAccessToken" WHERE "clientId" = $2) AS tokens,
       (SELECT COUNT(*)::int FROM public."oauthConsent" WHERE "clientId" = $2) AS consents`,
    [email, clientId],
  );
  await db.end();

  if (report) {
    report.cleanup = leftovers.rows[0];
    console.log(JSON.stringify(report, null, 2));
  }
}
