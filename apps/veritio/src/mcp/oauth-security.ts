/** Security helpers shared by the OAuth routes and consent UI. */

const DANGEROUS_REDIRECT_PROTOCOLS = new Set([
  "javascript:",
  "data:",
  "vbscript:",
  "file:",
  "blob:",
]);

export interface ConsentVerification {
  clientId: string;
  scopes: string[];
  redirectURI: string;
}

/** Better Auth generates a 32-character alphanumeric consent code. */
export function isValidConsentCode(value: string | null): value is string {
  return Boolean(value && /^[A-Za-z0-9]{32}$/.test(value));
}

function isLoopbackHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host === "::1") return true;

  const octets = host.split(".").map(Number);
  return (
    octets.length === 4 &&
    octets.every(
      (part) => Number.isInteger(part) && part >= 0 && part <= 255,
    ) &&
    octets[0] === 127
  );
}

/**
 * OAuth redirect URIs may be HTTPS, loopback HTTP, or a native-app custom
 * scheme. Active-content and local-file schemes can execute in the consent
 * page's browser context and are never valid callbacks.
 */
export function isSafeOAuthRedirectUri(value: string): boolean {
  if (!value || value.length > 2048) return false;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }

  if (url.hash || url.username || url.password) return false;
  const protocol = url.protocol.toLowerCase();
  if (DANGEROUS_REDIRECT_PROTOCOLS.has(protocol)) return false;
  if (protocol === "https:") return true;
  if (protocol === "http:") return isLoopbackHost(url.hostname);

  // RFC 8252 native-app private-use schemes. URL already checked the scheme
  // grammar; require a non-empty callback target so values like `app:` fail.
  return (
    /^[a-z][a-z0-9+.-]*:$/.test(protocol) &&
    value.slice(protocol.length).length > 1
  );
}

/** Parse the authoritative verification row, never the consent-page query. */
export function parseConsentVerification(
  raw: unknown,
  expectedUserId: string,
): ConsentVerification | null {
  if (typeof raw !== "string") return null;

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (record.requireConsent !== true || record.userId !== expectedUserId)
    return null;
  if (typeof record.clientId !== "string" || !record.clientId) return null;
  if (
    typeof record.redirectURI !== "string" ||
    !isSafeOAuthRedirectUri(record.redirectURI)
  )
    return null;
  if (typeof record.codeChallenge !== "string" || !record.codeChallenge)
    return null;
  if (
    typeof record.codeChallengeMethod !== "string" ||
    record.codeChallengeMethod.toLowerCase() !== "s256"
  )
    return null;

  const scopes = Array.isArray(record.scope)
    ? record.scope.filter(
        (scope): scope is string =>
          typeof scope === "string" && scope.length > 0,
      )
    : [];
  if (scopes.length === 0) return null;

  return {
    clientId: record.clientId,
    scopes: [...new Set(scopes)],
    redirectURI: record.redirectURI,
  };
}

/** Browser-origin guard for cookie-authenticated settings endpoints. */
export function isAllowedRequestOrigin(
  request: Request,
  configuredAppUrl?: string,
): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  let requestOrigin: string;
  try {
    requestOrigin = new URL(request.url).origin;
  } catch {
    return false;
  }

  const allowed = new Set([
    requestOrigin,
    "https://veritio.io",
    "https://www.veritio.io",
  ]);
  if (configuredAppUrl) {
    try {
      allowed.add(new URL(configuredAppUrl).origin);
    } catch {
      return false;
    }
  }
  return allowed.has(origin);
}

/** Better Auth 1.4 only shows consent for the exact prompt value `consent`. */
export function forceConsentPrompt(value: string): string {
  const url = new URL(value);
  url.searchParams.set("prompt", "consent");
  return url.toString();
}

export type DynamicClientValidation =
  { ok: true } | { ok: false; error: string; description: string };

function validOptionalString(value: unknown, max: number): boolean {
  return (
    value === undefined || (typeof value === "string" && value.length <= max)
  );
}

/** Narrow Better Auth's deliberately broad DCR input to the flows we serve. */
export function validateDynamicClientRegistration(
  body: unknown,
): DynamicClientValidation {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {
      ok: false,
      error: "invalid_client_metadata",
      description: "Invalid JSON body.",
    };
  }

  const value = body as Record<string, unknown>;
  const redirects = value.redirect_uris;
  if (
    !Array.isArray(redirects) ||
    redirects.length < 1 ||
    redirects.length > 10 ||
    redirects.some(
      (uri) => typeof uri !== "string" || !isSafeOAuthRedirectUri(uri),
    )
  ) {
    return {
      ok: false,
      error: "invalid_redirect_uri",
      description:
        "Redirect URIs must use HTTPS, loopback HTTP, or a safe native-app scheme.",
    };
  }

  if (
    !validOptionalString(value.client_name, 120) ||
    !validOptionalString(value.client_uri, 2048) ||
    !validOptionalString(value.logo_uri, 2048)
  ) {
    return {
      ok: false,
      error: "invalid_client_metadata",
      description: "Client metadata contains an invalid or oversized field.",
    };
  }

  const grants = value.grant_types;
  if (
    grants !== undefined &&
    (!Array.isArray(grants) ||
      grants.some(
        (grant) => grant !== "authorization_code" && grant !== "refresh_token",
      ))
  ) {
    return {
      ok: false,
      error: "invalid_client_metadata",
      description:
        "Only authorization_code and refresh_token grants are supported.",
    };
  }

  const responseTypes = value.response_types;
  if (
    responseTypes !== undefined &&
    (!Array.isArray(responseTypes) ||
      responseTypes.some((type) => type !== "code"))
  ) {
    return {
      ok: false,
      error: "invalid_client_metadata",
      description: "Only the code response type is supported.",
    };
  }

  return { ok: true };
}
