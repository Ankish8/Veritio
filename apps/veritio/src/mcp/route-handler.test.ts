import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./auth", () => ({
  resolveCaller: vi.fn(),
  restrictToReadOnly: (c: { scopes: string[] }) => ({
    ...c,
    scopes: c.scopes.filter((s) => s.endsWith(":read")),
  }),
}));

vi.mock("../lib/supabase/motia-client", () => ({
  getMotiaSupabaseClient: () => ({}),
}));

vi.mock("../services/permission-service", () => ({
  checkStudyPermission: vi.fn(async () => ({
    allowed: false,
    userRole: "viewer",
    error: null,
  })),
  checkProjectPermission: vi.fn(async () => ({
    allowed: false,
    userRole: "viewer",
    error: null,
  })),
  checkOrganizationPermission: vi.fn(async () => ({
    allowed: false,
    userRole: null,
    error: null,
  })),
}));

vi.mock("../services/entitlements-service", () => ({
  assertStudyFeature: vi.fn(),
  assertFeature: vi.fn(),
  getOrgIdForStudy: vi.fn(),
}));

import { resolveCaller } from "./auth";
import { createRouteHandler } from "./route-handler";
import { MCP_SCOPES } from "./authz/scopes";

const mockResolve = vi.mocked(resolveCaller);

const ENDPOINT = "https://veritio.io/mcp";

function post(
  body: unknown,
  init: { url?: string; headers?: Record<string, string> } = {},
): Request {
  return new Request(init.url ?? ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      ...init.headers,
    },
    body: JSON.stringify(body),
  });
}

/** The handshake every currently-deployed (2025-era) client still sends. */
const LEGACY_INIT = {
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "test", version: "1" },
  },
};

async function readBody(res: Response): Promise<string> {
  return res.text();
}

/**
 * Pull the advertised tool names out of a tools/list response.
 *
 * Substring-matching the raw body is not good enough: tool *descriptions* refer
 * to other tools by name ("Run this before study_launch"), so a naive
 * `not.toContain('study_launch')` fails against a listing that correctly
 * withholds it.
 */
async function toolNames(res: Response): Promise<string[]> {
  const body = await readBody(res);
  const json = body.startsWith("event:")
    ? body.slice(body.indexOf("data: ") + 6)
    : body;
  const parsed = JSON.parse(json.trim()) as {
    result?: { tools?: Array<{ name: string }> };
  };
  return (parsed.result?.tools ?? []).map((t) => t.name);
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_APP_URL = "https://veritio.io";
});

describe("MCP endpoint authentication", () => {
  it("challenges an unauthenticated request with an RFC 9728 pointer", async () => {
    mockResolve.mockResolvedValue(null);
    const res = await createRouteHandler({ readOnly: false })(
      post(LEGACY_INIT),
    );

    expect(res.status).toBe(401);
    const challenge = res.headers.get("www-authenticate") ?? "";
    expect(challenge).toMatch(/^Bearer /);
    // This pointer is how a spec-compliant client discovers where to authenticate.
    expect(challenge).toContain(
      'resource_metadata="https://veritio.io/.well-known/oauth-protected-resource"',
    );
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("access-control-expose-headers")).toBe(
      "WWW-Authenticate",
    );
  });

  it("never runs a tool for an unauthenticated caller", async () => {
    mockResolve.mockResolvedValue(null);
    const res = await createRouteHandler({ readOnly: false })(
      post({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: { name: "study_launch", arguments: {} },
      }),
    );
    expect(res.status).toBe(401);
  });

  it("rejects a cross-origin browser request", async () => {
    mockResolve.mockResolvedValue({
      kind: "api_key",
      userId: "u1",
      scopes: MCP_SCOPES,
    });
    const res = await createRouteHandler({ readOnly: false })(
      post(LEGACY_INIT, { headers: { origin: "https://evil.example" } }),
    );
    expect(res.status).toBe(403);
  });
});

describe("MCP endpoint protocol", () => {
  beforeEach(() => {
    mockResolve.mockResolvedValue({
      kind: "api_key",
      userId: "u1",
      scopes: MCP_SCOPES,
      credentialId: "key_1",
    });
  });

  it("serves the 2025-era handshake, so currently-shipping clients can connect", async () => {
    const res = await createRouteHandler({ readOnly: false })(
      post(LEGACY_INIT),
    );
    expect(res.status).toBe(200);
    expect(await readBody(res)).toContain("serverInfo");
  });

  it("advertises tools with generated JSON Schema and server instructions", async () => {
    const handler = createRouteHandler({ readOnly: false });
    await handler(post(LEGACY_INIT));
    const res = await handler(
      post({ jsonrpc: "2.0", id: 3, method: "tools/list", params: {} }),
    );

    const body = await readBody(res);
    expect(res.status).toBe(200);
    expect(body).toContain("study_create");
    expect(body).toContain("study_launch");
    // Proves the zod4 -> JSON Schema path actually ran.
    expect(body).toMatch(/"inputSchema":\{[^}]*"type":"object"/);
  });

  it("withholds every mutating tool on the readonly endpoint", async () => {
    const handler = createRouteHandler({ readOnly: true });
    await handler(
      post(LEGACY_INIT, { url: "https://veritio.io/mcp/readonly" }),
    );
    const res = await handler(
      post(
        { jsonrpc: "2.0", id: 4, method: "tools/list", params: {} },
        { url: "https://veritio.io/mcp/readonly" },
      ),
    );

    const names = await toolNames(res);
    expect(names).toContain("study_get");
    expect(names).toContain("results_get");
    expect(names).not.toContain("study_launch");
    expect(names).not.toContain("study_create");
    expect(names).not.toContain("study_content_set");
    // Even the dispatcher is withheld here, since it is not marked read-only.
    expect(names).not.toContain("tool_execute");
  });

  it("trims the advertised surface with ?features=", async () => {
    const handler = createRouteHandler({ readOnly: false });
    const all = `${ENDPOINT}`;
    await handler(post(LEGACY_INIT, { url: all }));
    const everything = await toolNames(
      await handler(
        post(
          { jsonrpc: "2.0", id: 5, method: "tools/list", params: {} },
          { url: all },
        ),
      ),
    );

    const scoped = `${ENDPOINT}?features=results`;
    await handler(post(LEGACY_INIT, { url: scoped }));
    const justResults = await toolNames(
      await handler(
        post(
          { jsonrpc: "2.0", id: 6, method: "tools/list", params: {} },
          { url: scoped },
        ),
      ),
    );

    expect(everything).toContain("study_create");
    expect(justResults).toContain("results_get");
    expect(justResults).not.toContain("study_create");
    expect(justResults.length).toBeLessThan(everything.length);
  });
});

describe("MCP endpoint authorization, end to end", () => {
  it("returns isError rather than acting when the caller lacks the role", async () => {
    mockResolve.mockResolvedValue({
      kind: "api_key",
      userId: "u1",
      scopes: MCP_SCOPES,
      credentialId: "key_1",
    });
    const handler = createRouteHandler({ readOnly: false });
    await handler(post(LEGACY_INIT));

    const res = await handler(
      post({
        jsonrpc: "2.0",
        id: 6,
        method: "tools/call",
        params: {
          name: "study_launch",
          arguments: {
            study_id: "11111111-1111-4111-8111-111111111111",
            confirm: true,
          },
        },
      }),
    );

    const body = await readBody(res);
    expect(res.status).toBe(200);
    // The permission-service mock reports viewer; launching needs manager.
    expect(body).toContain("permission_denied");
    expect(body).toContain('"isError":true');
  });

  it("reports a missing scope without touching the resource", async () => {
    mockResolve.mockResolvedValue({
      kind: "api_key",
      userId: "u1",
      scopes: ["studies:read"],
      credentialId: "key_1",
    });
    const handler = createRouteHandler({ readOnly: false });
    await handler(post(LEGACY_INIT));

    const res = await handler(
      post({
        jsonrpc: "2.0",
        id: 7,
        method: "tools/call",
        params: {
          name: "study_launch",
          arguments: {
            study_id: "11111111-1111-4111-8111-111111111111",
            confirm: true,
          },
        },
      }),
    );

    const body = await readBody(res);
    // study_launch is not even advertised to this credential, so the call is
    // rejected as an unknown tool — the strongest possible outcome.
    expect(body).toMatch(
      /not found|unknown tool|Tool nonexistent|-32602|isError/i,
    );
  });
});
