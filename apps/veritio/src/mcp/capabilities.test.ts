import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Resources and prompts, over the wire.
 *
 * Tools have long had registry-level coverage; resources and prompts had none,
 * because they did not exist. They are worth testing at the transport rather
 * than by inspecting the registration calls: what matters is that a client
 * listing them gets them, and that reading one returns content rather than a
 * stack trace.
 *
 * The OpenAPI resource is the interesting case — it reaches across into the
 * REST API's document generator, which is exactly the sort of link that breaks
 * silently when one side moves.
 */

vi.mock("./auth", () => ({
  resolveCaller: vi.fn(),
  restrictToReadOnly: (c: unknown) => c,
}));

vi.mock("../lib/supabase/motia-client", () => ({
  getMotiaSupabaseClient: () => ({}),
}));

vi.mock("../services/permission-service", () => ({
  checkStudyPermission: vi.fn(),
  checkProjectPermission: vi.fn(),
  checkOrganizationPermission: vi.fn(),
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

function post(body: unknown): Request {
  return new Request("https://veritio.io/mcp", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      authorization: "Bearer vrt_test",
    },
    body: JSON.stringify(body),
  });
}

/** Responses may arrive as JSON or as a single SSE frame. */
async function result<T>(res: Response): Promise<T> {
  const body = await res.text();
  const json = body.startsWith("event:")
    ? body.slice(body.indexOf("data: ") + 6)
    : body;
  const parsed = JSON.parse(json.trim()) as { result?: T; error?: unknown };
  if (!parsed.result) {
    throw new Error(`No result: ${JSON.stringify(parsed.error ?? parsed)}`);
  }
  return parsed.result;
}

const call = (method: string, params: Record<string, unknown> = {}) =>
  createRouteHandler({ readOnly: false })(
    post({ jsonrpc: "2.0", id: 1, method, params }),
  );

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_APP_URL = "https://veritio.io";
  mockResolve.mockResolvedValue({
    kind: "api_key",
    userId: "user_1",
    scopes: [...MCP_SCOPES],
    credentialId: "key_1",
  });
});

describe("resources", () => {
  it("advertises the OpenAPI document and the methodology guide", async () => {
    const listing = await result<{
      resources: Array<{ uri: string; name: string }>;
    }>(await call("resources/list"));

    expect(listing.resources.map((r) => r.uri).sort()).toEqual([
      "veritio://guide/methodologies",
      "veritio://openapi.json",
    ]);
  });

  it("serves the REST API's live OpenAPI document", async () => {
    const read = await result<{
      contents: Array<{ uri: string; mimeType: string; text: string }>;
    }>(await call("resources/read", { uri: "veritio://openapi.json" }));

    const [content] = read.contents;
    expect(content.mimeType).toBe("application/json");

    const doc = JSON.parse(content.text) as {
      openapi: string;
      servers: Array<{ url: string }>;
      paths: Record<string, unknown>;
    };
    expect(doc.openapi).toBe("3.1.0");
    // The server URL is built from the deployment's own origin, so a wrong one
    // would send every agent-written script at the wrong host.
    expect(doc.servers[0].url).toBe("https://veritio.io/api/v1");
    expect(Object.keys(doc.paths).length).toBeGreaterThan(20);
  });

  it("serves methodology guidance covering every study type", async () => {
    const read = await result<{ contents: Array<{ text: string }> }>(
      await call("resources/read", { uri: "veritio://guide/methodologies" }),
    );

    const text = read.contents[0].text;
    for (const studyType of [
      "card_sort",
      "tree_test",
      "survey",
      "prototype_test",
      "first_click",
      "first_impression",
      "live_website_test",
    ]) {
      expect(text, `guidance should cover ${studyType}`).toContain(studyType);
    }
  });

  it("exposes no study data as a resource", async () => {
    // Resources carry no per-item authorization the way tools do, so anything
    // workspace-specific here would need the guard re-implemented in a read
    // callback — a second implementation that would drift.
    const listing = await result<{ resources: Array<{ uri: string }> }>(
      await call("resources/list"),
    );
    for (const resource of listing.resources) {
      expect(resource.uri.startsWith("veritio://")).toBe(true);
      expect(resource.uri).not.toMatch(/stud(y|ies)|participant|result/);
    }
  });
});

describe("prompts", () => {
  it("advertises the three workflows", async () => {
    const listing = await result<{ prompts: Array<{ name: string }> }>(
      await call("prompts/list"),
    );
    expect(listing.prompts.map((p) => p.name).sort()).toEqual([
      "analyse_results",
      "plan_study",
      "sitemap_to_tree_test",
    ]);
  });

  it("builds a study plan that stops short of launching", async () => {
    const prompt = await result<{
      messages: Array<{ role: string; content: { text: string } }>;
    }>(
      await call("prompts/get", {
        name: "plan_study",
        arguments: { question: "Can people find our returns policy?" },
      }),
    );

    const text = prompt.messages[0].content.text;
    expect(text).toContain("Can people find our returns policy?");
    // Launching is the one irreversible act in the surface; the prompt must
    // hand that decision back rather than completing it.
    expect(text).toMatch(/let me decide whether to launch/i);
  });

  it("makes the results prompt read sample size before findings", async () => {
    const prompt = await result<{
      messages: Array<{ content: { text: string } }>;
    }>(
      await call("prompts/get", {
        name: "analyse_results",
        arguments: { study: "Homepage IA" },
      }),
    );

    const text = prompt.messages[0].content.text;
    expect(text).toContain("participants_list");
    expect(text).toMatch(/FIRST/);
    expect(text).toContain("participant_text");
  });
});
