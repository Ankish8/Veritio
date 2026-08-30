/**
 * The OpenAPI 3.1 document, generated from the route registry.
 *
 * Generated, never hand-written. A spec maintained alongside the code it
 * describes drifts — quietly, and in the direction that embarrasses you most:
 * the endpoint you changed last week is the one the docs still describe the old
 * way. Deriving it from the same `RouteDefinition` objects the router
 * dispatches on makes that impossible. If the spec is wrong, the API is wrong.
 *
 * OpenAPI 3.1 (rather than 3.0) because its schema dialect *is* JSON Schema
 * 2020-12 — exactly what `z.toJSONSchema` emits. 3.0 has its own near-miss
 * dialect, and bridging the two is where `nullable`, `examples` and `const`
 * quietly lose their meaning.
 */

import { toJSONSchema, type z } from "zod4";
import { MCP_SCOPES } from "@/mcp/authz/scopes";
import type { RouteDefinition } from "./define-route";
import { API_ROUTES, TAG_DESCRIPTIONS, TAG_ORDER } from "./registry";

const API_VERSION = "1.0.0";

type JsonObject = Record<string, unknown>;

interface BuildOptions {
  /** Absolute base URL, e.g. `https://veritio.io/api/v1`. */
  serverUrl: string;
  /**
   * Client id for the reference page's own OAuth client, published as
   * `x-scalar-client-id`. Omitted when registration failed or when the
   * consumer is not a browser — an agent reading the spec over MCP has its own
   * credential and does not need ours.
   */
  oauthClientId?: string | null;
}

export function buildOpenApiDocument(opts: BuildOptions): JsonObject {
  const paths: JsonObject = {};

  for (const route of API_ROUTES) {
    const path = (paths[route.path] ??= {}) as JsonObject;
    path[route.method.toLowerCase()] = operationFor(route);
  }

  return {
    openapi: "3.1.0",
    jsonSchemaDialect: "https://json-schema.org/draft/2020-12/schema",
    info: {
      title: "Veritio API",
      version: API_VERSION,
      summary: "Design, run and analyse UX research studies programmatically.",
      description: intro(authorizationOrigin(opts.serverUrl)),
      contact: { name: "Veritio support", url: "https://veritio.io", email: "support@veritio.io" },
      license: { name: "MIT", identifier: "MIT" },
    },
    servers: [{ url: opts.serverUrl, description: "Production" }],
    tags: tagList(),
    paths,
    security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
    components: {
      securitySchemes: securitySchemes(
        authorizationOrigin(opts.serverUrl),
        opts.oauthClientId ?? null,
      ),
      schemas: { Problem: problemSchema() },
      responses: sharedResponses(),
      parameters: {
        IdempotencyKey: {
          name: "Idempotency-Key",
          in: "header",
          required: false,
          description:
            "A unique key of your choosing. Retrying with the same key returns the original response " +
            "instead of performing the write twice. Keys are remembered for 24 hours and are scoped to " +
            "your account.",
          schema: { type: "string", maxLength: 255 },
        },
      },
    },
  };
}

// --- Operations ------------------------------------------------------------

function operationFor(route: RouteDefinition): JsonObject {
  const successStatus = String(
    route.status ?? (route.method === "POST" ? 201 : 200),
  );

  const operation: JsonObject = {
    operationId: route.operationId,
    summary: route.summary,
    description: describe(route),
    tags: [route.tag],
    parameters: parametersFor(route),
    responses: {
      [successStatus]: {
        description: route.summary,
        content: {
          "application/json": { schema: schemaOf(route.response, "output") },
        },
      },
      ...errorResponsesFor(route),
    },
    security: securityFor(route),
    "x-veritio-scopes": route.scopes,
    "x-veritio-rate-limit": route.cost ?? (route.method === "GET" ? "read" : "write"),
  };

  if (route.resource.kind !== "none") {
    operation["x-veritio-required-role"] = {
      resource: route.resource.kind,
      role: route.resource.role,
    };
  }

  if (route.entitlement) operation["x-veritio-entitlement"] = route.entitlement;
  if (route.deprecated) operation.deprecated = true;

  const body = bodyFor(route);
  if (body) operation.requestBody = body;

  return operation;
}

/**
 * Append the machine-checkable facts to the prose description.
 *
 * These are also emitted as `x-veritio-*` extensions for tooling, but a human
 * reading the reference should not have to open a raw spec to learn that an
 * endpoint needs a scope they do not hold.
 */
function describe(route: RouteDefinition): string {
  const notes: string[] = [route.description];

  if (route.scopes.length > 0) {
    notes.push(
      `\n**Scope**: requires \`${route.scopes.join("`, `")}\` on the credential.`,
    );
  } else {
    notes.push("\n**Scope**: none — any authenticated credential may call this.");
  }

  if (route.resource.kind !== "none") {
    notes.push(
      `**Role**: requires \`${route.resource.role}\` or above on the ${route.resource.kind}.`,
    );
  }

  if (route.entitlement) {
    notes.push(
      `**Plan**: requires the \`${route.entitlement}\` feature. Returns \`402\` without it.`,
    );
  }

  if (route.idempotent) {
    notes.push(
      "**Idempotency**: send an `Idempotency-Key` header to make a retry safe.",
    );
  }

  return notes.join("\n\n");
}

function parametersFor(route: RouteDefinition): JsonObject[] {
  const parameters: JsonObject[] = [];

  if (route.inputs?.path) {
    parameters.push(...paramsFrom(route.inputs.path, "path"));
  }
  if (route.inputs?.query) {
    parameters.push(...paramsFrom(route.inputs.query, "query"));
  }
  if (route.idempotent) {
    parameters.push({ $ref: "#/components/parameters/IdempotencyKey" });
  }

  return parameters;
}

function paramsFrom(schema: z.ZodType, location: "path" | "query"): JsonObject[] {
  const json = schemaOf(schema, "input");
  const properties = (json.properties ?? {}) as Record<string, JsonObject>;
  const required = new Set((json.required as string[] | undefined) ?? []);

  return Object.entries(properties).map(([name, property]) => {
    const { description, ...rest } = property;
    return {
      name,
      in: location,
      // Path parameters are always required. For query, `required` from the
      // JSON Schema is not enough on its own: a `z.preprocess` wrapper reports
      // its field as required even when the inner schema carries a default, so
      // the presence of `default` is the reliable signal that it is optional.
      required:
        location === "path" ||
        (required.has(name) && rest.default === undefined),
      ...(description ? { description } : {}),
      schema: rest,
    };
  });
}

function bodyFor(route: RouteDefinition): JsonObject | null {
  if (!route.inputs?.body) return null;

  const schema = schemaOf(route.inputs.body, "input");
  const examples = (route.examples ?? [])
    .filter((example) => example.body !== undefined)
    .reduce<JsonObject>((acc, example, index) => {
      acc[`example_${index + 1}`] = {
        summary: example.summary,
        value: example.body,
      };
      return acc;
    }, {});

  const required = ((schema.required as string[] | undefined) ?? []).length > 0;

  return {
    required,
    content: {
      "application/json": {
        schema,
        ...(Object.keys(examples).length > 0 ? { examples } : {}),
      },
    },
  };
}

/**
 * The error responses each operation can actually produce.
 *
 * Listed per operation rather than blanket-applied, so the reference does not
 * claim a read-only endpoint can return `402` when nothing about it is gated,
 * or that an unscoped endpoint can return `403 insufficient_scope`.
 */
function errorResponsesFor(route: RouteDefinition): JsonObject {
  const responses: JsonObject = {
    "401": { $ref: "#/components/responses/Unauthorized" },
    "429": { $ref: "#/components/responses/RateLimited" },
    "500": { $ref: "#/components/responses/InternalError" },
  };

  if (route.inputs?.body || route.inputs?.query || route.inputs?.path) {
    responses["400"] = { $ref: "#/components/responses/BadRequest" };
  }
  if (route.scopes.length > 0 || route.resource.kind !== "none") {
    responses["403"] = { $ref: "#/components/responses/Forbidden" };
    responses["404"] = { $ref: "#/components/responses/NotFound" };
  }
  if (route.entitlement) {
    responses["402"] = { $ref: "#/components/responses/PlanRequired" };
  }
  if (route.idempotent || route.method !== "GET") {
    responses["409"] = { $ref: "#/components/responses/Conflict" };
  }

  return responses;
}

function securityFor(route: RouteDefinition): JsonObject[] {
  return [
    { bearerAuth: [] },
    { apiKeyAuth: [] },
    { oauth2: [...route.scopes] },
  ];
}

// --- Components ------------------------------------------------------------

/**
 * The origin the OAuth endpoints live on.
 *
 * Derived from the server URL rather than hardcoded, for the same reason
 * `servers[0].url` is: a spec served from localhost or a preview deployment
 * that points its authorization URLs at production sends the reader to a host
 * that has never heard of their client, and the failure surfaces as a bare
 * `invalid_client` with nothing to suggest the URL was the problem.
 */
function authorizationOrigin(serverUrl: string): string {
  try {
    return new URL(serverUrl).origin;
  } catch {
    return "https://veritio.io";
  }
}

function securitySchemes(origin: string, clientId: string | null): JsonObject {
  return {
    bearerAuth: {
      type: "http",
      scheme: "bearer",
      bearerFormat: "vrt_…",
      description:
        "A Veritio API key sent as `Authorization: Bearer vrt_…`. Create one in " +
        "Settings → API keys, choosing only the scopes the integration needs.",
    },
    apiKeyAuth: {
      type: "apiKey",
      in: "header",
      name: "X-Api-Key",
      description:
        "The same API key, for clients that cannot set an Authorization header.",
    },
    oauth2: {
      type: "oauth2",
      // Preselected in Scalar's Authorize dialog. Read-only by default: the
      // reference page is for trying endpoints out, and a docs "try it" button
      // should not default to a grant that can launch a study to the public.
      "x-default-scopes": ["studies:read", "results:read", "org:read"],
      description:
        "OAuth 2.1 with PKCE and Dynamic Client Registration, shared with the MCP server. " +
        "Use this for an application acting on behalf of many Veritio users.",
      flows: {
        authorizationCode: {
          authorizationUrl: `${origin}/api/auth/mcp/authorize`,
          tokenUrl: `${origin}/api/auth/mcp/token`,
          refreshUrl: `${origin}/api/auth/mcp/token`,
          // The three fields below are Scalar extensions, and all three are
          // load-bearing. They live on the *flow*, not on the scheme.
          //
          // Without the client id, Scalar sends no `client_id` at all and the
          // authorization server answers `invalid_client`.
          ...(clientId ? { "x-scalar-client-id": clientId } : {}),
          // PKCE defaults to "no" in Scalar. This is a public client with no
          // secret, so PKCE is the only thing protecting the authorization
          // code — the token exchange is refused without it.
          "x-usePkce": "SHA-256",
          // Scalar would otherwise default this to the current page URL, which
          // varies with a trailing slash. The value registered for this client
          // is exact, and a mismatch is rejected at the authorize step.
          "x-scalar-redirect-uri": `${origin}/docs/api`,
          // Credentials go in the request body, not an Authorization header.
          // Scalar defaults to the header, which sends Basic base64("id:") for
          // a client with no secret; the token endpoint rejects that with
          // `invalid_client`. RFC 6749 §2.3.1 puts a public client's id in the
          // body, and that is what the endpoint accepts.
          "x-scalar-credentials-location": "body",
          scopes: Object.fromEntries(
            MCP_SCOPES.map((scope) => [scope, SCOPE_DESCRIPTIONS[scope]]),
          ),
        },
      },
    },
  };
}

const SCOPE_DESCRIPTIONS: Record<string, string> = {
  "studies:read": "Read studies and their setup.",
  "studies:write": "Create, edit and launch studies.",
  "results:read": "Read results and participant responses.",
  "panel:read": "Read the participant panel.",
  "panel:write": "Create and edit panel participants, tags and segments.",
  "org:read": "Read workspace and membership information.",
  "org:write": "Rename a workspace and manage its members.",
  "export:write": "Create exports and generate insight reports.",
};

function problemSchema(): JsonObject {
  return {
    type: "object",
    title: "Problem",
    description:
      "Every non-2xx response uses this shape (RFC 9457). Branch on `code`, which is stable; `title` and " +
      "`detail` are written for humans and may be reworded.",
    required: ["type", "title", "status", "detail", "code", "request_id"],
    properties: {
      type: { type: "string", format: "uri", description: "Link to this error's documentation." },
      title: { type: "string", description: "Short, human-readable summary." },
      status: { type: "integer", description: "The HTTP status code." },
      detail: { type: "string", description: "What went wrong, and what to do about it." },
      code: {
        type: "string",
        description: "Stable machine-readable error code. Branch on this.",
        enum: [
          "invalid_input",
          "unauthorized",
          "insufficient_scope",
          "permission_denied",
          "not_found",
          "plan_required",
          "rate_limited",
          "conflict",
          "idempotency_conflict",
          "unsupported_media_type",
          "payload_too_large",
          "method_not_allowed",
          "not_acceptable",
          "upstream_error",
          "internal_error",
        ],
      },
      request_id: {
        type: "string",
        description:
          "Echoed in the `X-Request-Id` header. Quote it when reporting a problem.",
      },
      errors: {
        type: "array",
        description: "Field-level detail, present on validation failures.",
        items: {
          type: "object",
          required: ["path", "message"],
          properties: {
            path: {
              type: "string",
              description:
                "Dotted path to the offending field, prefixed by its surface, e.g. `body.title`.",
            },
            message: { type: "string" },
          },
        },
      },
      retry_after: {
        type: "integer",
        description: "Seconds to wait before retrying. Present on 429.",
      },
      feature: {
        type: "string",
        description: "The plan feature that would unlock this call. Present on 402.",
      },
    },
  };
}

function problemResponse(description: string): JsonObject {
  return {
    description,
    content: {
      "application/problem+json": { schema: { $ref: "#/components/schemas/Problem" } },
    },
  };
}

function sharedResponses(): JsonObject {
  return {
    BadRequest: problemResponse(
      "The request did not validate. `errors` names each offending field.",
    ),
    Unauthorized: problemResponse(
      "No credential was supplied, or it is invalid or revoked.",
    ),
    PlanRequired: problemResponse(
      "The workspace's plan does not include this feature.",
    ),
    Forbidden: problemResponse(
      "The credential lacks a required scope, or the caller's role on the resource is too low.",
    ),
    NotFound: problemResponse(
      "No such resource, or the caller cannot see it. These are deliberately indistinguishable.",
    ),
    Conflict: problemResponse(
      "The request cannot be applied in the resource's current state.",
    ),
    RateLimited: problemResponse(
      "Rate limit exceeded. See `Retry-After` and the `RateLimit-*` headers.",
    ),
    InternalError: problemResponse(
      "Something failed on Veritio's side. Retry; if it persists, quote the `request_id`.",
    ),
  };
}

function tagList(): JsonObject[] {
  const present = [...new Set(API_ROUTES.map((route) => route.tag))];
  const ordered = [
    ...TAG_ORDER.filter((tag) => present.includes(tag)),
    ...present.filter((tag) => !TAG_ORDER.includes(tag as never)).sort(),
  ];
  return ordered.map((tag) => ({
    name: tag,
    ...(TAG_DESCRIPTIONS[tag] ? { description: TAG_DESCRIPTIONS[tag] } : {}),
  }));
}

// --- Schema conversion -----------------------------------------------------

/**
 * Convert a zod schema to JSON Schema, stripping the `$schema` header.
 *
 * OpenAPI 3.1 declares the dialect once at document level, so repeating it on
 * every inline schema is noise that some tooling treats as an error.
 */
function schemaOf(schema: z.ZodType, io: "input" | "output"): JsonObject {
  const json = toJSONSchema(schema, {
    target: "draft-2020-12",
    io,
    // A handful of response shapes are deliberately open (`z.unknown()` for
    // methodology-specific analysis). Emitting them as an unconstrained schema
    // is honest; refusing to emit the document at all is not.
    unrepresentable: "any",
  }) as JsonObject;
  delete json.$schema;
  return json;
}

/**
 * The Introduction, rendered by Scalar as the first sidebar group with an entry
 * per heading.
 *
 * The MCP setup lives here rather than on its own page. It is the same product
 * reached through a different transport, on the same credentials and the same
 * scopes — splitting it across two destinations makes a reader choose before
 * they know the difference. Origin-aware so the install commands are
 * copy-pasteable from whatever deployment is being read.
 */
function intro(origin: string): string {
  return `
The Veritio API lets you do everything the dashboard does: create studies of any of the seven research
methodologies, fill them with content, launch them to real participants, and read the analysed results back.

Two ways in, one credential:

| | For | Endpoint |
| --- | --- | --- |
| **REST API** | Scripts, integrations, scheduled jobs | \`${origin}/api/v1\` |
| **MCP server** | AI assistants — Claude, Codex, Cursor, VS Code | \`${origin}/mcp\` |

Both sit on one authorization core, so a scope means the same thing on either, and the same key works on both.

## Authentication

Send a Veritio API key as \`Authorization: Bearer vrt_…\`, or as \`X-Api-Key\`. Create keys in
**Settings → API & MCP**, granting only the scopes an integration needs — a key that only reads results
cannot launch a study to the public.

You can also press **Authorize** above to sign in with your own account and try any endpoint on this page
directly.

This API never reads cookies, so the browser's ambient session grants it nothing.

## Connect an AI assistant

The MCP server exposes the same research workflow to an agent: it can design a study, configure it, launch
it to real participants, and read the results back. Most UX research platforms that ship MCP ship it
read-only; this one is write-capable.

Pick your client and run the command. Each opens a browser to authenticate — no key to copy or rotate.

\`\`\`bash
# Codex
codex mcp add veritio --url ${origin}/mcp

# Claude Code — available to every project for the current user
claude mcp add --scope user --transport http veritio ${origin}/mcp
\`\`\`

Cursor and VS Code have one-click install links on the [guided setup page](${origin}/mcp/setup).

**Read-only endpoint.** \`${origin}/mcp/readonly\` serves the same server with every mutating tool
withheld, regardless of what the credential is scoped for. Use it when an assistant should analyse but
never change anything.

**What an agent gets:** 25 advertised tools inside a measured context budget, with a further 18 reachable
on demand, plus reference resources and ready-made workflows for planning a study, analysing results, and
turning a sitemap into a tree test.

## Conventions

- **Base URL** — \`${origin}/api/v1\`. The version is in the path; breaking changes get a new one.
- **Objects** carry an \`object\` field naming their type. Collections come back as
  \`{ object: "list", data, has_more, next_cursor, total }\`.
- **Pagination** is cursor-based. Follow \`next_cursor\` until \`has_more\` is false; treat the cursor as
  opaque.
- **Errors** are RFC 9457 problem documents. Branch on \`code\`, never on the prose.
- **Rate limits** are per credential, reported on every response via \`RateLimit-Limit\`,
  \`RateLimit-Remaining\` and \`RateLimit-Reset\`.
- **Idempotency** — send \`Idempotency-Key\` on any creating POST; a retry with the same key replays the
  original response rather than creating a second resource.
- **Request ids** — every response carries \`X-Request-Id\`. Quote it in support requests.

## Participant text is untrusted

Anything a participant typed — survey answers, card labels, transcripts — is returned wrapped in
\`<participant_text trust="none">…</participant_text>\`. These are strings written by members of the public.
If you feed API output to a language model, leave the wrapper on: it is what keeps an instruction hidden in
a free-text answer reading as data.

## Launching is irreversible

\`POST /studies/{study_id}/launch\` exposes a study to real people at a public URL and starts collecting
their data. It is the one outward-facing act in this API. Readiness is checked first and the launch is
refused if the study is incomplete — treat that 409 as a finding, not an obstacle.
`.trim();
}
