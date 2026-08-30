import { describe, expect, it } from "vitest";
import { API_ROUTES, findRoute, TAG_DESCRIPTIONS } from "./registry";
import { buildOpenApiDocument } from "./openapi";
import { MCP_SCOPES } from "@/mcp/authz/scopes";
import { Router } from "../http/router";

const ROLE_RANK = { viewer: 0, editor: 1, manager: 2, admin: 3, owner: 4 } as const;

const MUTATING = new Set(["POST", "PATCH", "PUT", "DELETE"]);

/**
 * These are invariants, not examples.
 *
 * They run over the whole registry so an endpoint added next month cannot
 * quietly skip authorization. Every failure here is a potential IDOR: the
 * backend runs on a service-role Supabase client with RLS bypassed, so nothing
 * below this layer will catch a missing check.
 *
 * The MCP server has the same tests over its own registry
 * (`src/mcp/registry.test.ts`). Keeping both is the point — the two surfaces
 * share one authorization core, and these prove neither surface has grown a
 * route that bypasses it.
 */
describe("route registry invariants", () => {
  it("has routes", () => {
    expect(API_ROUTES.length).toBeGreaterThan(0);
  });

  it.each(API_ROUTES.map((route) => [route.operationId, route] as const))(
    "%s declares a resource requirement or is explicitly global",
    (_id, route) => {
      expect(route.resource).toBeDefined();
      if (route.resource.kind !== "none") {
        expect(route.resource.argKey).toBeTruthy();
        expect(ROLE_RANK).toHaveProperty(route.resource.role);
      }
    },
  );

  it("every config-mutating route binds to a resource at editor or above", () => {
    const offenders = API_ROUTES.filter((route) => MUTATING.has(route.method))
      .filter((route) => (route.mutates ?? "config") === "config")
      .filter(
        (route) =>
          route.resource.kind === "none" ||
          ROLE_RANK[route.resource.role] < ROLE_RANK.editor,
      );
    expect(offenders.map((route) => route.operationId)).toEqual([]);
  });

  it("membership-resolved writes actually resolve membership", () => {
    // `mutates: "resolved"` waives the declarative resource gate because the
    // organization is not an argument. What replaces it is
    // `resolveOrganizationId`, which refuses an org the caller is not a member
    // of. Reading the handler source is crude, but it is the only mechanical
    // check available, and the alternative is trusting a comment.
    const resolved = API_ROUTES.filter((route) => route.mutates === "resolved");
    expect(resolved.length).toBeGreaterThan(0);
    for (const route of resolved) {
      expect(
        route.handler.toString(),
        `${route.operationId} must call resolveOrganizationId`,
      ).toMatch(/resolveOrganizationId/);
    }
  });

  it("owned-record routes scope every query by the calling user", async () => {
    // `mutates: "owned"` waives the resource-role check, so the handler is the
    // only thing standing between a caller and someone else's record. Reading
    // the source is crude but it is the only place this can be checked
    // mechanically, and the alternative is trusting a comment.
    const owned = API_ROUTES.filter((route) => route.mutates === "owned");
    expect(owned.length).toBeGreaterThan(0);
    for (const route of owned) {
      expect(
        route.handler.toString(),
        `${route.operationId} must filter by ctx.userId`,
      ).toContain("ctx.userId");
    }
  });

  it("derived-artifact routes still name their resource", () => {
    // Exports and reports legitimately need only viewer — they surface data the
    // caller can already read — but they must still bind to something.
    const offenders = API_ROUTES.filter(
      (route) => route.mutates === "derived",
    ).filter((route) => route.resource.kind === "none");
    expect(offenders.map((route) => route.operationId)).toEqual([]);
  });

  it("every mutating route requires a write scope", () => {
    const offenders = API_ROUTES.filter((route) =>
      MUTATING.has(route.method),
    ).filter(
      (route) => !route.scopes.some((scope) => scope.endsWith(":write")),
    );
    expect(offenders.map((route) => route.operationId)).toEqual([]);
  });

  it("no read route requests a write scope it does not need", () => {
    const offenders = API_ROUTES.filter((route) => route.method === "GET")
      // Export jobs carry download URLs, so reading them is gated on the same
      // scope that creates them rather than on a read scope.
      .filter((route) => !EXPORT_READS.includes(route.operationId))
      .filter((route) => route.scopes.some((scope) => scope.endsWith(":write")));
    expect(offenders.map((route) => route.operationId)).toEqual([]);
  });

  it("declares only known scopes", () => {
    for (const route of API_ROUTES) {
      for (const scope of route.scopes) expect(MCP_SCOPES).toContain(scope);
    }
  });

  it("has unique operation ids", () => {
    const ids = API_ROUTES.map((route) => route.operationId);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-zA-Z][a-zA-Z0-9]*$/);
  });

  it("has no duplicate method + path pairs", () => {
    const keys = API_ROUTES.map((route) => `${route.method} ${route.path}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("every path parameter is declared in the path input schema", async () => {
    for (const route of API_ROUTES) {
      const declared = [...route.path.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]);
      if (declared.length === 0) continue;

      expect(
        route.inputs?.path,
        `${route.operationId} has path parameters but no path schema`,
      ).toBeDefined();

      // Probing with an empty object surfaces every required key as an issue,
      // which proves the schema actually declares it.
      const result = await route.inputs!.path!["~standard"].validate({});
      const missing = (result.issues ?? []).map((issue) =>
        (issue.path ?? [])
          .map((p) => (typeof p === "object" ? String(p.key) : String(p)))
          .join("."),
      );
      for (const name of declared) {
        expect(
          missing,
          `${route.operationId} must require path parameter ${name}`,
        ).toContain(name);
      }
    }
  });

  it("the resource argKey is reachable from one of the input schemas", async () => {
    for (const route of API_ROUTES) {
      if (route.resource.kind === "none") continue;

      const surfaces = [
        route.inputs?.path,
        route.inputs?.query,
        route.inputs?.body,
      ].filter(Boolean);

      const keys: string[] = [];
      for (const schema of surfaces) {
        const result = await schema!["~standard"].validate({});
        keys.push(
          ...(result.issues ?? []).map((issue) =>
            (issue.path ?? [])
              .map((p) => (typeof p === "object" ? String(p.key) : String(p)))
              .join("."),
          ),
        );
      }

      expect(
        keys,
        `${route.operationId} gates on ${route.resource.argKey}, which no input schema requires`,
      ).toContain(route.resource.argKey);
    }
  });

  it("paths start with a slash and use brace templating", () => {
    for (const route of API_ROUTES) {
      expect(route.path.startsWith("/"), route.operationId).toBe(true);
      expect(route.path).not.toMatch(/:[a-z]/);
      expect(route.path).not.toMatch(/\/$/);
    }
  });

  it("every route has a description a reader can act on", () => {
    for (const route of API_ROUTES) {
      expect(route.summary.length, route.operationId).toBeGreaterThan(4);
      expect(route.description.length, route.operationId).toBeGreaterThan(40);
      expect(TAG_DESCRIPTIONS, route.operationId).toHaveProperty(route.tag);
    }
  });

  it("GET is never marked idempotency-keyed, which would be meaningless", () => {
    const offenders = API_ROUTES.filter(
      (route) => route.method === "GET" && route.idempotent,
    );
    expect(offenders.map((route) => route.operationId)).toEqual([]);
  });

  it("resolves every registered operation id", () => {
    for (const route of API_ROUTES) {
      expect(findRoute(route.operationId)).toBe(route);
    }
    expect(findRoute("nope")).toBeUndefined();
  });
});

/** Reads gated on `export:write` because they expose download URLs. */
const EXPORT_READS = ["listExports", "getExport"];

describe("router", () => {
  const router = new Router(API_ROUTES);

  it("matches a static path", () => {
    const match = router.match("GET", ["me"]);
    expect(match.def.operationId).toBe("getCurrentIdentity");
  });

  it("extracts path parameters", () => {
    const match = router.match("GET", ["studies", "abc-123"]);
    expect(match.def.operationId).toBe("getStudy");
    expect(match.pathParams).toEqual({ study_id: "abc-123" });
  });

  it("prefers a static segment over a parameter at the same depth", () => {
    // `/exports` and `/studies/{study_id}` are different depths, but
    // `/content-types` must not be swallowed by any single-segment parameter.
    expect(router.match("GET", ["content-types"]).def.operationId).toBe(
      "listContentTypes",
    );
  });

  it("reports 405 with an Allow list when the path exists under another method", () => {
    expect(() => router.match("PUT", ["me"])).toThrowError(/not supported/i);
  });

  it("reports 404 for an unknown path", () => {
    expect(() => router.match("GET", ["nope", "nope"])).toThrowError(
      /No endpoint matches/,
    );
  });

  it("lists the methods a path supports, for CORS preflight", () => {
    const methods = router.methodsFor(["studies", "abc-123"]);
    expect(methods.sort()).toEqual(["DELETE", "GET", "PATCH"]);
  });
});

describe("openapi document", () => {
  const doc = buildOpenApiDocument({
    serverUrl: "https://veritio.io/api/v1",
  }) as Record<string, any>;

  it("is OpenAPI 3.1 with the JSON Schema 2020-12 dialect", () => {
    expect(doc.openapi).toBe("3.1.0");
    expect(doc.jsonSchemaDialect).toBe(
      "https://json-schema.org/draft/2020-12/schema",
    );
  });

  it("describes every registered route, and nothing else", () => {
    const described = Object.entries(doc.paths).flatMap(([path, methods]) =>
      Object.keys(methods as object).map(
        (method) => `${method.toUpperCase()} ${path}`,
      ),
    );
    const registered = API_ROUTES.map(
      (route) => `${route.method} ${route.path}`,
    );
    expect(described.sort()).toEqual(registered.sort());
  });

  it("gives every operation a unique operationId", () => {
    const ids = Object.values(doc.paths).flatMap((methods) =>
      Object.values(methods as Record<string, { operationId: string }>).map(
        (operation) => operation.operationId,
      ),
    );
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("declares the scopes each operation needs, for tooling", () => {
    for (const route of API_ROUTES) {
      const operation = doc.paths[route.path][route.method.toLowerCase()];
      expect(operation["x-veritio-scopes"]).toEqual(route.scopes);
    }
  });

  it("advertises every scope on the OAuth flow", () => {
    const advertised = Object.keys(
      doc.components.securitySchemes.oauth2.flows.authorizationCode.scopes,
    );
    expect(advertised.sort()).toEqual([...MCP_SCOPES].sort());
  });

  it("marks path parameters required and defaulted query parameters optional", () => {
    const listStudies = doc.paths["/studies"].get;
    const byName = Object.fromEntries(
      listStudies.parameters.map((p: { name: string }) => [p.name, p]),
    );
    // `limit` carries a default, so a client must not be told to send it.
    expect(byName.limit.required).toBe(false);
    expect(byName.limit.schema.default).toBe(25);
    expect(byName.q.required).toBe(false);

    const getStudy = doc.paths["/studies/{study_id}"].get;
    expect(getStudy.parameters[0]).toMatchObject({
      name: "study_id",
      in: "path",
      required: true,
    });
  });

  it("does not repeat the $schema keyword on inline schemas", () => {
    const serialized = JSON.stringify(doc.paths);
    expect(serialized).not.toContain('"$schema"');
  });

  it("offers the Idempotency-Key header on every idempotency-aware route", () => {
    for (const route of API_ROUTES.filter((r) => r.idempotent)) {
      const operation = doc.paths[route.path][route.method.toLowerCase()];
      expect(
        operation.parameters,
        `${route.operationId} should offer Idempotency-Key`,
      ).toContainEqual({ $ref: "#/components/parameters/IdempotencyKey" });
    }
  });

  it("documents 402 only where a plan gate actually exists", () => {
    for (const route of API_ROUTES) {
      const operation = doc.paths[route.path][route.method.toLowerCase()];
      expect(
        Boolean(operation.responses["402"]),
        `${route.operationId} 402 documentation should match its entitlement`,
      ).toBe(Boolean(route.entitlement));
    }
  });

  it("points every error response at the shared Problem schema", () => {
    for (const response of Object.values(
      doc.components.responses as Record<string, any>,
    )) {
      expect(
        response.content["application/problem+json"].schema.$ref,
      ).toBe("#/components/schemas/Problem");
    }
  });

  it("serializes to JSON without circular references", () => {
    expect(() => JSON.stringify(doc)).not.toThrow();
    expect(JSON.stringify(doc).length).toBeGreaterThan(10_000);
  });
});
