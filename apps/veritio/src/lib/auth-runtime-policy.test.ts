import { describe, expect, it } from "vitest";
import { resolveAuthRuntimePolicy } from "@veritio/auth/auth-runtime-policy";

describe("resolveAuthRuntimePolicy", () => {
  it("allows localhost HTTP cookies without a foreign domain", () => {
    expect(
      resolveAuthRuntimePolicy({
        NODE_ENV: "production",
        BETTER_AUTH_URL: "http://localhost:4001",
      }),
    ).toEqual({
      baseURL: "http://localhost:4001",
      useSecureCookies: false,
      cookieDomain: undefined,
    });
  });

  it("uses secure host-only cookies for a custom HTTPS deployment", () => {
    expect(
      resolveAuthRuntimePolicy({
        BETTER_AUTH_URL: "https://research.example.org",
      }),
    ).toEqual({
      baseURL: "https://research.example.org",
      useSecureCookies: true,
      cookieDomain: undefined,
    });
  });

  it("preserves cross-subdomain cookies on Veritio production origins", () => {
    expect(
      resolveAuthRuntimePolicy({ BETTER_AUTH_URL: "https://app.veritio.io" }),
    ).toEqual({
      baseURL: "https://app.veritio.io",
      useSecureCookies: true,
      cookieDomain: ".veritio.io",
    });
  });

  it("accepts an explicit cookie domain for custom multi-zone deployments", () => {
    expect(
      resolveAuthRuntimePolicy({
        NEXT_PUBLIC_APP_URL: "https://research.example.org",
        BETTER_AUTH_COOKIE_DOMAIN: ".example.org",
      }),
    ).toEqual({
      baseURL: "https://research.example.org",
      useSecureCookies: true,
      cookieDomain: ".example.org",
    });
  });

  it("does not guess secure cookies for an invalid origin", () => {
    expect(resolveAuthRuntimePolicy({ BETTER_AUTH_URL: "not-a-url" })).toEqual({
      baseURL: "not-a-url",
      useSecureCookies: false,
      cookieDomain: undefined,
    });
  });
});
