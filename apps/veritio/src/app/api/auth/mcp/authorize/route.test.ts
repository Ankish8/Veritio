import { beforeEach, describe, expect, it, vi } from "vitest";
import { ORIGINAL_REDIRECT_URIS_METADATA_KEY } from "@/mcp/oauth-security";

const mocks = vi.hoisted(() => ({
  authGet: vi.fn(),
  poolQuery: vi.fn(),
  toNextJsHandler: vi.fn(),
}));

vi.mock("@veritio/auth/db-pool", () => ({
  createPool: () => ({ query: mocks.poolQuery }),
}));

vi.mock("@veritio/auth/auth-instance", () => ({ auth: { id: "test-auth" } }));

vi.mock("better-auth/next-js", () => ({
  toNextJsHandler: mocks.toNextJsHandler,
}));

import { GET } from "./route";

describe("GET /api/auth/mcp/authorize", () => {
  beforeEach(() => {
    mocks.authGet.mockReset();
    mocks.poolQuery.mockReset();
    mocks.toNextJsHandler.mockReset();
    mocks.authGet.mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { location: "/oauth/consent" },
      }),
    );
    mocks.toNextJsHandler.mockReturnValue({ GET: mocks.authGet });
  });

  it("adds an exact loopback alias before delegating to Better Auth", async () => {
    const original = "http://127.0.0.1:41000/callback";
    const requested = "http://127.0.0.1:42000/callback";
    mocks.poolQuery
      .mockResolvedValueOnce({
        rows: [
          {
            redirectUrls: original,
            metadata: JSON.stringify({
              [ORIGINAL_REDIRECT_URIS_METADATA_KEY]: [original],
            }),
            type: "public",
            disabled: false,
          },
        ],
      })
      .mockResolvedValueOnce({ rowCount: 1 });

    const url = new URL("https://veritio.io/api/auth/mcp/authorize");
    url.searchParams.set("client_id", "client-1");
    url.searchParams.set("redirect_uri", requested);
    url.searchParams.set("response_type", "code");
    const response = await GET(new Request(url));

    expect(response.status).toBe(302);
    expect(mocks.poolQuery).toHaveBeenCalledTimes(2);
    expect(mocks.poolQuery.mock.calls[1]?.[1]).toEqual([
      `${original},${requested}`,
      expect.stringContaining(ORIGINAL_REDIRECT_URIS_METADATA_KEY),
      "client-1",
      original,
      expect.any(String),
    ]);
    expect(mocks.authGet).toHaveBeenCalledOnce();
    const delegated = mocks.authGet.mock.calls[0]?.[0] as Request;
    expect(new URL(delegated.url).searchParams.get("prompt")).toBe("consent");
    expect(new URL(delegated.url).searchParams.get("redirect_uri")).toBe(
      requested,
    );
  });

  it("rejects an altered callback without invoking Better Auth", async () => {
    const original = "http://127.0.0.1:41000/callback";
    mocks.poolQuery.mockResolvedValueOnce({
      rows: [
        {
          redirectUrls: original,
          metadata: null,
          type: "public",
          disabled: false,
        },
      ],
    });

    const url = new URL("https://veritio.io/api/auth/mcp/authorize");
    url.searchParams.set("client_id", "client-1");
    url.searchParams.set("redirect_uri", "http://127.0.0.1:42000/other");
    const response = await GET(new Request(url));

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: "invalid_redirect_uri",
    });
    expect(mocks.poolQuery).toHaveBeenCalledOnce();
    expect(mocks.authGet).not.toHaveBeenCalled();
  });

  it("leaves HTTPS redirects on Better Auth's exact-match path", async () => {
    const url = new URL("https://veritio.io/api/auth/mcp/authorize");
    url.searchParams.set("client_id", "client-1");
    url.searchParams.set("redirect_uri", "https://client.example/callback");
    const response = await GET(new Request(url));

    expect(response.status).toBe(302);
    expect(mocks.poolQuery).not.toHaveBeenCalled();
    expect(mocks.authGet).toHaveBeenCalledOnce();
  });
});
