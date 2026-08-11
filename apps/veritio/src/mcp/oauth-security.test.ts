import { describe, expect, it } from "vitest";
import {
  forceConsentPrompt,
  isAllowedRequestOrigin,
  isLoopbackRedirectPortVariant,
  isSafeOAuthRedirectUri,
  isValidConsentCode,
  ORIGINAL_REDIRECT_URIS_METADATA_KEY,
  parseConsentVerification,
  resolveLoopbackRedirect,
  validateDynamicClientRegistration,
  withOriginalRedirectMetadata,
} from "./oauth-security";

describe("OAuth redirect URI validation", () => {
  it.each([
    "https://client.example/callback",
    "http://localhost:49152/callback",
    "http://127.0.0.42:49152/callback",
    "http://[::1]:49152/callback",
    "com.example.client:/oauth/callback",
    "veritio-client://oauth/callback",
  ])("accepts a safe callback: %s", (uri) => {
    expect(isSafeOAuthRedirectUri(uri)).toBe(true);
  });

  it.each([
    "javascript:alert(document.domain)",
    "data:text/html,<script>alert(1)</script>",
    "file:///etc/passwd",
    "blob:https://veritio.io/deadbeef",
    "http://client.example/callback",
    "https://user:password@client.example/callback",
    "https://client.example/callback#fragment",
    "not a URI",
  ])("rejects an unsafe callback: %s", (uri) => {
    expect(isSafeOAuthRedirectUri(uri)).toBe(false);
  });
});

describe("dynamic client registration", () => {
  it("accepts the authorization-code flow with a safe callback", () => {
    expect(
      validateDynamicClientRegistration({
        redirect_uris: ["https://client.example/callback"],
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        client_name: "Test client",
      }),
    ).toEqual({ ok: true });
  });

  it("rejects active-content redirects before Better Auth stores them", () => {
    expect(
      validateDynamicClientRegistration({
        redirect_uris: ["javascript:alert(1)"],
      }),
    ).toMatchObject({ ok: false, error: "invalid_redirect_uri" });
  });

  it("rejects unsupported implicit and client-credentials metadata", () => {
    expect(
      validateDynamicClientRegistration({
        redirect_uris: ["https://client.example/callback"],
        grant_types: ["client_credentials"],
        response_types: ["token"],
      }),
    ).toMatchObject({ ok: false, error: "invalid_client_metadata" });
  });

  it("rejects commas because Better Auth stores redirects comma-delimited", () => {
    expect(
      validateDynamicClientRegistration({
        redirect_uris: ["https://client.example/callback?value=one,two"],
      }),
    ).toMatchObject({ ok: false, error: "invalid_redirect_uri" });
  });

  it("records authoritative original redirects without trusting client metadata", () => {
    expect(
      withOriginalRedirectMetadata({
        redirect_uris: ["http://127.0.0.1:41000/callback"],
        metadata: {
          label: "Codex",
          [ORIGINAL_REDIRECT_URIS_METADATA_KEY]: [
            "https://attacker.example/callback",
          ],
        },
      }),
    ).toMatchObject({
      metadata: {
        label: "Codex",
        [ORIGINAL_REDIRECT_URIS_METADATA_KEY]: [
          "http://127.0.0.1:41000/callback",
        ],
      },
    });
  });
});

describe("native-client loopback redirect compatibility", () => {
  it("accepts only a changed port on the same loopback IP callback", () => {
    expect(
      isLoopbackRedirectPortVariant(
        "http://127.0.0.1:41000/callback?client=codex",
        "http://127.0.0.1:42000/callback?client=codex",
      ),
    ).toBe(true);
    expect(
      isLoopbackRedirectPortVariant(
        "http://[::1]:41000/callback",
        "http://[::1]:42000/callback",
      ),
    ).toBe(true);
  });

  it.each([
    ["http://127.0.0.1:41000/callback", "http://127.0.0.2:42000/callback"],
    ["http://127.0.0.1:41000/callback", "http://127.0.0.1:42000/other"],
    [
      "http://127.0.0.1:41000/callback?a=1",
      "http://127.0.0.1:42000/callback?a=2",
    ],
    ["http://localhost:41000/callback", "http://localhost:42000/callback"],
    [
      "https://client.example:41000/callback",
      "https://client.example:42000/callback",
    ],
  ])("rejects changes beyond an IP-loopback port: %s -> %s", (from, to) => {
    expect(isLoopbackRedirectPortVariant(from, to)).toBe(false);
  });

  it("adds a bounded exact alias while preserving original trust roots", () => {
    const original = "http://127.0.0.1:41000/callback";
    const result = resolveLoopbackRedirect(
      {
        redirectUrls: original,
        metadata: JSON.stringify({
          label: "Codex",
          [ORIGINAL_REDIRECT_URIS_METADATA_KEY]: [original],
        }),
        type: "public",
        disabled: false,
      },
      "http://127.0.0.1:42000/callback",
    );

    expect(result).toMatchObject({ kind: "alias" });
    if (result.kind !== "alias") throw new Error("expected alias");
    expect(result.redirectUrls.split(",")).toEqual([
      original,
      "http://127.0.0.1:42000/callback",
    ]);
    expect(JSON.parse(result.metadata)).toMatchObject({
      label: "Codex",
      [ORIGINAL_REDIRECT_URIS_METADATA_KEY]: [original],
    });
  });

  it("rejects flexible redirects for confidential, disabled, and altered callbacks", () => {
    const base = {
      redirectUrls: "http://127.0.0.1:41000/callback",
      metadata: null,
      type: "public",
      disabled: false,
    };
    expect(
      resolveLoopbackRedirect(
        { ...base, type: "web" },
        "http://127.0.0.1:42000/callback",
      ),
    ).toEqual({ kind: "rejected" });
    expect(
      resolveLoopbackRedirect(
        { ...base, disabled: true },
        "http://127.0.0.1:42000/callback",
      ),
    ).toEqual({ kind: "rejected" });
    expect(
      resolveLoopbackRedirect(base, "http://127.0.0.1:42000/other"),
    ).toEqual({ kind: "rejected" });
  });

  it("keeps exact redirects compatible for every client type", () => {
    expect(
      resolveLoopbackRedirect(
        {
          redirectUrls: "https://client.example/callback",
          metadata: null,
          type: "web",
          disabled: false,
        },
        "https://client.example/callback",
      ),
    ).toEqual({ kind: "exact" });
  });
});

describe("consent verification", () => {
  const valid = {
    clientId: "client-1",
    redirectURI: "https://client.example/callback",
    scope: ["openid", "studies:read", "studies:write", "studies:read"],
    userId: "user-1",
    requireConsent: true,
    codeChallenge: "challenge",
    codeChallengeMethod: "S256",
  };

  it("accepts the authoritative verification payload and deduplicates scopes", () => {
    expect(parseConsentVerification(JSON.stringify(valid), "user-1")).toEqual({
      clientId: "client-1",
      redirectURI: "https://client.example/callback",
      scopes: ["openid", "studies:read", "studies:write"],
    });
  });

  it("does not let one signed-in user approve another user`s grant", () => {
    expect(
      parseConsentVerification(JSON.stringify(valid), "user-2"),
    ).toBeNull();
  });

  it("rejects a plain-PKCE verification even if an old row exists", () => {
    expect(
      parseConsentVerification(
        JSON.stringify({ ...valid, codeChallengeMethod: "plain" }),
        "user-1",
      ),
    ).toBeNull();
  });

  it("rejects an active-content redirect stored in a verification row", () => {
    expect(
      parseConsentVerification(
        JSON.stringify({ ...valid, redirectURI: "javascript:alert(1)" }),
        "user-1",
      ),
    ).toBeNull();
  });

  it("requires the exact generated consent-code shape", () => {
    expect(isValidConsentCode("a".repeat(32))).toBe(true);
    expect(isValidConsentCode("a".repeat(31))).toBe(false);
    expect(isValidConsentCode(`${"a".repeat(31)}-`)).toBe(false);
  });

  it("forces an approval screen even when the client omits or suppresses the prompt", () => {
    expect(
      new URL(
        forceConsentPrompt(
          "https://veritio.io/api/auth/mcp/authorize?client_id=c1",
        ),
      ).searchParams.get("prompt"),
    ).toBe("consent");
    expect(
      new URL(
        forceConsentPrompt(
          "https://veritio.io/api/auth/mcp/authorize?client_id=c1&prompt=none",
        ),
      ).searchParams.get("prompt"),
    ).toBe("consent");
  });
});

describe("cookie-authenticated route origin validation", () => {
  it("allows the request origin and configured app origin", () => {
    expect(
      isAllowedRequestOrigin(
        new Request("https://veritio.io/api/mcp-keys", {
          headers: { origin: "https://veritio.io" },
        }),
        "https://veritio.io",
      ),
    ).toBe(true);
  });

  it("rejects an unrelated browser origin", () => {
    expect(
      isAllowedRequestOrigin(
        new Request("https://veritio.io/api/mcp-keys", {
          headers: { origin: "https://evil.example" },
        }),
        "https://veritio.io",
      ),
    ).toBe(false);
  });
});
