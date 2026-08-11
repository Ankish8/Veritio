import { beforeEach, describe, expect, it, vi } from "vitest";
import { ORIGINAL_REDIRECT_URIS_METADATA_KEY } from "@/mcp/oauth-security";

const mocks = vi.hoisted(() => ({
  authPost: vi.fn(),
  toNextJsHandler: vi.fn(),
}));

vi.mock("@veritio/auth/auth-instance", () => ({ auth: { id: "test-auth" } }));

vi.mock("better-auth/next-js", () => ({
  toNextJsHandler: mocks.toNextJsHandler,
}));

import { POST } from "./route";

describe("POST /api/auth/mcp/register", () => {
  beforeEach(() => {
    mocks.authPost.mockReset();
    mocks.toNextJsHandler.mockReset();
    mocks.authPost.mockImplementation(async (request: Request) => {
      return Response.json(await request.json(), { status: 201 });
    });
    mocks.toNextJsHandler.mockReturnValue({ POST: mocks.authPost });
  });

  it("stores authoritative original redirects in reserved metadata", async () => {
    const redirect = "http://127.0.0.1:41000/callback";
    const response = await POST(
      new Request("https://veritio.io/api/auth/mcp/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          redirect_uris: [redirect],
          token_endpoint_auth_method: "none",
          metadata: {
            client: "Codex",
            [ORIGINAL_REDIRECT_URIS_METADATA_KEY]: [
              "https://attacker.example/callback",
            ],
          },
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      metadata: {
        client: "Codex",
        [ORIGINAL_REDIRECT_URIS_METADATA_KEY]: [redirect],
      },
    });
  });

  it("rejects unsafe redirects before invoking Better Auth", async () => {
    const response = await POST(
      new Request("https://veritio.io/api/auth/mcp/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ redirect_uris: ["javascript:alert(1)"] }),
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.authPost).not.toHaveBeenCalled();
  });
});
