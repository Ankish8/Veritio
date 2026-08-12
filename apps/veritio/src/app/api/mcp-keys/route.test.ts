import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Regression cover for the API key name bound.
 *
 * A name of 33-80 characters used to pass this route's own check and then throw
 * `INVALID_NAME_LENGTH` inside Better Auth, whose `maximumNameLength` defaults
 * to 32. The route caught that as a blanket 500, so the UI could only say
 * "Could not create the key." Bisected against production at the time: 32
 * succeeded, 33 returned 500.
 *
 * Mocking `createApiKey` here would only assert the mock's bound, so these
 * tests are written against the *shared constants* both sides now read from.
 * The final test guards the part a mock genuinely cannot: that the plugin
 * config still defers to those constants instead of inlining a number again.
 */

const createApiKey = vi.fn();
const getSession = vi.fn();

vi.mock("@veritio/auth/auth-instance", () => ({
  auth: { api: { createApiKey, getSession } },
}));

import {
  API_KEY_NAME_MAX_LENGTH,
  API_KEY_NAME_MIN_LENGTH,
} from "@veritio/auth/api-key-limits";
import { POST } from "./route";

/** No Origin header, which `isAllowedRequestOrigin` accepts for non-browser callers. */
function post(body: unknown): Request {
  return new Request("https://veritio.io/api/mcp-keys", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const SCOPES = ["studies:read"];

async function createWithName(name: string) {
  const res = await POST(post({ name, scopes: SCOPES }));
  return { status: res.status, body: (await res.json()) as { error?: string } };
}

beforeEach(() => {
  vi.clearAllMocks();
  getSession.mockResolvedValue({ user: { id: "u1" } });
  createApiKey.mockImplementation(({ body }: { body: { name: string } }) =>
    Promise.resolve({ key: "vrt_x", id: "k1", name: body.name, start: "vrt_x" }),
  );
});

describe("API key name length", () => {
  it("accepts a name at the maximum", async () => {
    const { status } = await createWithName("k".repeat(API_KEY_NAME_MAX_LENGTH));

    expect(status).toBe(200);
    // Proves it reached Better Auth rather than being rejected on the way.
    expect(createApiKey).toHaveBeenCalledOnce();
  });

  it("rejects one character over the maximum, before calling Better Auth", async () => {
    const { status, body } = await createWithName(
      "k".repeat(API_KEY_NAME_MAX_LENGTH + 1),
    );

    expect(status).toBe(400);
    expect(body.error).toBe(
      `Give the key a name of ${API_KEY_NAME_MIN_LENGTH}-${API_KEY_NAME_MAX_LENGTH} characters.`,
    );
    expect(createApiKey).not.toHaveBeenCalled();
  });

  it("accepts the length that used to 500", async () => {
    // 33 is the exact boundary Better Auth's default of 32 used to cut off.
    expect(API_KEY_NAME_MAX_LENGTH).toBeGreaterThanOrEqual(33);

    const { status } = await createWithName("k".repeat(33));

    expect(status).toBe(200);
  });

  it("rejects an empty or whitespace-only name", async () => {
    expect((await createWithName("")).status).toBe(400);
    expect((await createWithName("   ")).status).toBe(400);
    expect(createApiKey).not.toHaveBeenCalled();
  });
});

describe("Better Auth validation failures", () => {
  it("reports the plugin's own 400 instead of a blanket 500", async () => {
    // The shape Better Auth throws: an APIError carrying statusCode and body.
    createApiKey.mockRejectedValue(
      Object.assign(new Error("APIError"), {
        statusCode: 400,
        body: { message: "The name length is either too large or too small." },
      }),
    );

    const { status, body } = await createWithName("a name");

    expect(status).toBe(400);
    expect(body.error).toBe(
      "The name length is either too large or too small.",
    );
  });

  it("still returns 500 for a genuine failure", async () => {
    createApiKey.mockRejectedValue(new Error("connection refused"));

    const { status, body } = await createWithName("a name");

    expect(status).toBe(500);
    expect(body.error).toBe("Could not create the key.");
  });
});

describe("the plugin config and this route cannot drift apart", () => {
  /**
   * The original bug was two numbers disagreeing across package boundaries, so
   * the meaningful assertion is about the source, not about behaviour a mock
   * can fake: `apiKey()` must take its bounds from the shared module.
   */
  /** Walk up from the vitest cwd to the workspace root, which holds `packages/`. */
  function authSourcePath(): string {
    const relative = join("packages", "@veritio", "auth", "src", "auth.ts");
    let dir = resolve(process.cwd());
    for (let i = 0; i < 6; i++) {
      const candidate = join(dir, relative);
      if (existsSync(candidate)) return candidate;
      const parent = dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    throw new Error(`Could not locate ${relative} from ${process.cwd()}`);
  }

  it("configures apiKey() from the shared constants, not inline numbers", () => {
    const authSource = readFileSync(authSourcePath(), "utf8");

    expect(authSource).toContain("minimumNameLength: API_KEY_NAME_MIN_LENGTH");
    expect(authSource).toContain("maximumNameLength: API_KEY_NAME_MAX_LENGTH");
    expect(authSource).toMatch(/from ["']\.\/api-key-limits["']/);
    // Catches a literal creeping back in, which is how this broke the first time.
    expect(authSource).not.toMatch(/(minimum|maximum)NameLength:\s*\d/);
  });
});
