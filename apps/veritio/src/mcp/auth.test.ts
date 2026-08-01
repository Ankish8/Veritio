import { describe, expect, it } from "vitest";
import { mcpScopesFromOAuthGrant } from "./auth";

describe("OAuth scope mapping", () => {
  it("preserves only explicitly granted Veritio scopes", () => {
    expect(
      mcpScopesFromOAuthGrant(
        "openid offline_access studies:read results:read",
      ),
    ).toEqual(["studies:read", "results:read"]);
  });

  it("does not turn an identity-only token into a read-only Veritio token", () => {
    expect(mcpScopesFromOAuthGrant(["openid", "profile", "email"])).toEqual([]);
  });

  it("ignores invented scopes", () => {
    expect(mcpScopesFromOAuthGrant("studies:read admin:all")).toEqual([
      "studies:read",
    ]);
  });
});
