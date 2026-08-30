import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * End-to-end coverage of the request pipeline.
 *
 * `registry.test.ts` proves the route *declarations* are sound. This proves the
 * transport actually enforces them: that an unauthenticated request never
 * reaches a handler, that a credential missing a scope is refused before any
 * database read, that a caller with the wrong role on a real resource gets 403
 * rather than data, and that a validation failure names the field.
 *
 * Everything below the authorization core is mocked, so this runs offline and
 * touches no database.
 */

vi.mock("@/mcp/auth", () => ({
  resolveCaller: vi.fn(),
  restrictToReadOnly: (c: unknown) => c,
}));

/**
 * A Supabase stub with just enough surface for the direct table reads a few
 * handlers do (`resolveOrganizationId`, `studyRow`). Everything else goes
 * through a service, which is mocked separately.
 */
vi.mock("@/lib/supabase/motia-client", () => ({
  getMotiaSupabaseClient: () => {
    const builder: Record<string, unknown> = {};
    const chain = () => builder;
    Object.assign(builder, {
      select: chain,
      eq: chain,
      not: chain,
      order: chain,
      range: chain,
      limit: chain,
      single: async () => ({ data: null, error: null }),
      maybeSingle: async () => ({ data: null, error: null }),
      then: (resolve: (value: unknown) => unknown) =>
        resolve({
          data: [{ organization_id: ORG_ID }],
          error: null,
          count: 1,
        }),
    });
    return { from: () => builder };
  },
}));

vi.mock("@/services/permission-service", () => ({
  checkStudyPermission: vi.fn(async () => ({
    allowed: true,
    userRole: "editor",
    error: null,
  })),
  checkProjectPermission: vi.fn(async () => ({
    allowed: true,
    userRole: "editor",
    error: null,
  })),
  checkOrganizationPermission: vi.fn(async () => ({
    allowed: true,
    userRole: "admin",
    error: null,
  })),
}));

vi.mock("@/services/entitlements-service", () => ({
  assertStudyFeature: vi.fn(),
  assertFeature: vi.fn(),
  getOrgIdForStudy: vi.fn(),
  getOrgPlan: vi.fn(async () => ({ plan: "pro", plan_status: "active" })),
  getEntitlements: vi.fn(async () => ({ ai: true, recordings: true })),
}));

vi.mock("@/services/organization-service", () => ({
  listUserOrganizations: vi.fn(async () => ({
    data: [{ id: ORG_ID, name: "Acme", slug: "acme", user_role: "admin" }],
    error: null,
  })),
  getOrganization: vi.fn(),
  listOrganizationMembers: vi.fn(),
  addOrganizationMember: vi.fn(),
  updateMemberRole: vi.fn(),
  removeMember: vi.fn(),
  updateOrganization: vi.fn(),
}));

vi.mock("@/services/study-service", () => ({
  getStudy: vi.fn(async () => ({
    data: {
      id: STUDY_ID,
      title: "Homepage IA",
      study_type: "card_sort",
      status: "draft",
      project_id: PROJECT_ID,
      share_code: "abc123",
      settings: { mode: "open" },
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: null,
      user_role: "editor",
      participant_count: 0,
    },
    error: null,
  })),
  createStudy: vi.fn(),
  updateStudy: vi.fn(),
  deleteStudy: vi.fn(),
  archiveStudy: vi.fn(),
  restoreStudy: vi.fn(),
  listStudiesByProject: vi.fn(),
}));

/**
 * Never register a real OAuth client from a test.
 *
 * `getDocsOAuthClientId` POSTs to `{origin}/api/auth/mcp/register`, and the
 * origin under test is veritio.io. Left unmocked this passes only because the
 * sandbox has no network — on a machine that does, running the suite would
 * create a client row in production.
 */
vi.mock("@/api/v1/docs-oauth-client", () => ({
  getDocsOAuthClientId: vi.fn(async () => "test_client_id"),
}));

vi.mock("@/services/comments-service", () => ({
  listStudyComments: vi.fn(async () => ({ data: [], error: null })),
  createStudyComment: vi.fn(async () => ({
    data: {
      id: "comment_1",
      study_id: STUDY_ID,
      content: "Looks good",
      user_id: "user_1",
      parent_comment_id: null,
      resolved: false,
      created_at: "2026-01-01T00:00:00.000Z",
    },
    error: null,
  })),
}));

import { resolveCaller } from "@/mcp/auth";
import { checkStudyPermission } from "@/services/permission-service";
import { getStudy } from "@/services/study-service";
import { MCP_SCOPES, type McpScope } from "@/mcp/authz/scopes";
import { handleApiRequest } from "./handler";

const ORG_ID = "11111111-1111-4111-8111-111111111111";
const PROJECT_ID = "22222222-2222-4222-8222-222222222222";
const STUDY_ID = "33333333-3333-4333-8333-333333333333";

const mockResolve = vi.mocked(resolveCaller);
const mockStudyPermission = vi.mocked(checkStudyPermission);
const mockGetStudy = vi.mocked(getStudy);

function authenticate(scopes: readonly McpScope[] = MCP_SCOPES) {
  mockResolve.mockResolvedValue({
    kind: "api_key",
    userId: "user_1",
    scopes: [...scopes],
    credentialId: "key_1",
  });
}

function request(
  path: string,
  init: RequestInit & { headers?: Record<string, string> } = {},
): Request {
  return new Request(`https://veritio.io/api/v1${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
  });
}

async function json(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockStudyPermission.mockResolvedValue({
    allowed: true,
    userRole: "editor",
    error: null,
  } as never);
});

describe("authentication", () => {
  it("refuses an unauthenticated request with an RFC 9728 challenge", async () => {
    mockResolve.mockResolvedValue(null);

    const response = await handleApiRequest(request("/me"));
    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toMatch(
      /^Bearer resource_metadata="/,
    );
    expect(response.headers.get("content-type")).toContain(
      "application/problem+json",
    );
    expect((await json(response)).code).toBe("unauthorized");
  });

  it("never reaches a handler without a credential", async () => {
    mockResolve.mockResolvedValue(null);
    await handleApiRequest(request(`/studies/${STUDY_ID}`));
    expect(mockGetStudy).not.toHaveBeenCalled();
  });

  it("does not read cookies, so a browser session grants nothing", async () => {
    mockResolve.mockResolvedValue(null);
    const response = await handleApiRequest(
      request("/me", { headers: { cookie: "better-auth.session_token=xyz" } }),
    );
    expect(response.status).toBe(401);
  });
});

describe("scope enforcement", () => {
  it("refuses a credential missing the route's scope", async () => {
    authenticate(["results:read"]);

    const response = await handleApiRequest(request(`/studies/${STUDY_ID}`));
    expect(response.status).toBe(403);
    const body = await json(response);
    expect(body.code).toBe("insufficient_scope");
    expect(body.detail).toContain("studies:read");
  });

  it("checks scopes before touching the database", async () => {
    authenticate(["results:read"]);
    await handleApiRequest(request(`/studies/${STUDY_ID}`));
    // No resource lookup: a credential that could never perform the call must
    // not be able to learn whether the study exists, even by timing.
    expect(mockStudyPermission).not.toHaveBeenCalled();
    expect(mockGetStudy).not.toHaveBeenCalled();
  });
});

describe("resource authorization", () => {
  it("returns 404, not 403, for a resource the caller cannot see", async () => {
    authenticate();
    mockStudyPermission.mockResolvedValue({
      allowed: false,
      userRole: null,
      error: null,
    } as never);

    const response = await handleApiRequest(request(`/studies/${STUDY_ID}`));
    // Distinguishing "does not exist" from "not yours" would be an enumeration
    // oracle over every study id in the system.
    expect(response.status).toBe(404);
    expect((await json(response)).code).toBe("permission_denied");
    expect(mockGetStudy).not.toHaveBeenCalled();
  });

  it("returns 403 when the caller is a member but lacks the role", async () => {
    authenticate();
    mockStudyPermission.mockResolvedValue({
      allowed: false,
      userRole: "viewer",
      error: null,
    } as never);

    const response = await handleApiRequest(
      request(`/studies/${STUDY_ID}`, {
        method: "PATCH",
        body: JSON.stringify({ title: "New title" }),
      }),
    );
    // Existence is already known to a member, so naming the missing role is
    // safe here and is the only actionable thing to tell them.
    expect(response.status).toBe(403);
    const body = await json(response);
    expect(body.detail).toContain("editor");
    expect(body.detail).toContain("viewer");
  });
});

describe("input validation", () => {
  it("names the offending field, prefixed by its surface", async () => {
    authenticate();

    const response = await handleApiRequest(request("/studies/not-a-uuid"));
    expect(response.status).toBe(400);
    const body = await json(response);
    expect(body.code).toBe("invalid_input");
    expect(body.errors).toEqual([
      expect.objectContaining({ path: "path.study_id" }),
    ]);
  });

  it("rejects a malformed cursor rather than silently restarting", async () => {
    authenticate();
    const response = await handleApiRequest(
      request("/organizations?cursor=not-a-cursor"),
    );
    expect(response.status).toBe(400);
    expect((await json(response)).errors).toEqual([
      expect.objectContaining({ path: "query.cursor" }),
    ]);
  });

  it("reads `false` from a query string as false, not as a truthy string", async () => {
    authenticate();
    const response = await handleApiRequest(
      request("/studies/not-a-uuid?include_archived=false"),
    );
    // The include_archived value parsed cleanly; only study_id is reported.
    const body = await json(response);
    expect(body.errors).toEqual([
      expect.objectContaining({ path: "path.study_id" }),
    ]);
  });

  it("refuses a non-JSON body", async () => {
    authenticate();
    const response = await handleApiRequest(
      request(`/studies/${STUDY_ID}`, {
        method: "PATCH",
        headers: { "content-type": "text/plain" },
        body: "title=x",
      }),
    );
    expect(response.status).toBe(415);
  });
});

describe("successful requests", () => {
  it("returns the study and the documented envelope fields", async () => {
    authenticate();

    const response = await handleApiRequest(request(`/studies/${STUDY_ID}`));
    expect(response.status).toBe(200);

    const body = await json(response);
    expect(body).toMatchObject({
      object: "study",
      id: STUDY_ID,
      study_type: "card_sort",
      status: "draft",
      your_role: "editor",
    });
    // The participation URL is derived, not stored, so it is worth asserting.
    expect(body.participation_url).toContain("/s/abc123");
  });

  it("reports rate-limit headers in both spellings", async () => {
    authenticate();
    const response = await handleApiRequest(request(`/studies/${STUDY_ID}`));
    expect(response.headers.get("ratelimit-limit")).toBeTruthy();
    expect(response.headers.get("x-ratelimit-limit")).toBe(
      response.headers.get("ratelimit-limit"),
    );
  });

  it("describes the credential, so an integration can check itself first", async () => {
    authenticate(["studies:read"]);

    const response = await handleApiRequest(request("/me"));
    expect(response.status).toBe(200);
    expect(await json(response)).toMatchObject({
      object: "identity",
      user_id: "user_1",
      organization_id: ORG_ID,
      plan: "pro",
      credential: { type: "api_key", scopes: ["studies:read"] },
    });
  });

  it("echoes a caller-supplied request id", async () => {
    authenticate();
    const response = await handleApiRequest(
      request("/me", { headers: { "x-request-id": "my-trace-123" } }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("x-request-id")).toBe("my-trace-123");
  });

  it("ignores a request id that is not safe to log or echo", async () => {
    authenticate();
    const response = await handleApiRequest(
      request("/me", { headers: { "x-request-id": "bad id <script>" } }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("x-request-id")).toMatch(/^req_[0-9a-f]{32}$/);
  });
});

describe("idempotency", () => {
  it("replays the original response for a repeated key", async () => {
    authenticate();

    const send = () =>
      handleApiRequest(
        request(`/studies/${STUDY_ID}/comments`, {
          method: "POST",
          headers: { "idempotency-key": "key-abc" },
          body: JSON.stringify({ content: "Looks good" }),
        }),
      );

    const first = await send();
    const second = await send();

    expect(second.headers.get("idempotent-replayed")).toBe("true");
    expect(second.status).toBe(first.status);
    expect(await json(second)).toEqual(await json(first));
  });

  it("refuses a key reused with a different body", async () => {
    authenticate();

    await handleApiRequest(
      request(`/studies/${STUDY_ID}/comments`, {
        method: "POST",
        headers: { "idempotency-key": "key-conflict" },
        body: JSON.stringify({ content: "First" }),
      }),
    );

    const response = await handleApiRequest(
      request(`/studies/${STUDY_ID}/comments`, {
        method: "POST",
        headers: { "idempotency-key": "key-conflict" },
        body: JSON.stringify({ content: "Different" }),
      }),
    );

    expect(response.status).toBe(409);
    expect((await json(response)).code).toBe("idempotency_conflict");
  });
});

describe("the spec endpoint", () => {
  it("serves the OpenAPI document without a credential", async () => {
    mockResolve.mockResolvedValue(null);

    const response = await handleApiRequest(request("/openapi.json"));
    expect(response.status).toBe(200);

    const doc = await json(response);
    expect(doc.openapi).toBe("3.1.0");
    expect(Object.keys(doc.paths as object).length).toBeGreaterThan(20);
  });

  it("gives Scalar everything its Authorize button needs, in the right place", async () => {
    const doc = await json(await handleApiRequest(request("/openapi.json")));
    const flow = (doc as any).components.securitySchemes.oauth2.flows
      .authorizationCode;

    // All three are Scalar extensions that live on the FLOW, not the scheme.
    // Placing them on the scheme is silently ignored, which is exactly how the
    // Authorize button ends up sending no client_id and failing with
    // `invalid_client`.
    expect(flow["x-scalar-client-id"]).toBe("test_client_id");
    // Scalar defaults PKCE to "no". This is a public client with no secret, so
    // the token exchange is refused without it.
    expect(flow["x-usePkce"]).toBe("SHA-256");
    // Must match the redirect URI registered for the client, exactly.
    expect(flow["x-scalar-redirect-uri"]).toBe("https://veritio.io/docs/api");
    // Scalar defaults to sending credentials as a Basic header, which for a
    // secretless client is `Basic base64("id:")` — the token endpoint rejects
    // that with `invalid_client`. RFC 6749 puts a public client's id in the body.
    expect(flow["x-scalar-credentials-location"]).toBe("body");

    // Endpoints follow the deployment rather than pointing at production.
    expect(flow.authorizationUrl).toBe(
      "https://veritio.io/api/auth/mcp/authorize",
    );
    expect(flow.tokenUrl).toBe("https://veritio.io/api/auth/mcp/token");
  });
});
