/**
 * `defineRoute` — the only way a public API endpoint is allowed to exist.
 *
 * The sibling of `mcp/authz/define-tool.ts`, and deliberately so. Both surfaces
 * sit on one authorization core (`mcp/authz/guard.ts`), so a scope, a role
 * requirement and a plan gate mean exactly the same thing whether the caller is
 * an agent over MCP or a script over HTTPS. There is no second implementation
 * of "may this credential do this" to keep in sync — and therefore no way for
 * the two to drift apart into a privilege gap.
 *
 * A route declaration is also the *only* source for the OpenAPI document.
 * Nothing about an endpoint is written twice, so the published reference cannot
 * describe an API that does not exist. See `openapi.ts`.
 */

import type { z } from "zod4";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { OrganizationRole } from "@/lib/supabase/collaboration-types";
import type { FeatureKey } from "@/lib/plans";
import type { McpScope } from "@/mcp/authz/scopes";
import {
  assertScopes,
  assertResourceAccess,
  assertFeatureAccess,
  type ResourceRequirement,
} from "@/mcp/authz/guard";
import { badRequest, type FieldIssue } from "../http/errors";

export type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

/**
 * Rate-limit class. Reads are cheap, writes cost more, and anything that
 * kicks off analysis, an export or a model call is heavy.
 */
export type RouteCost = "read" | "write" | "heavy";

/** What a handler is given. Mirrors `ToolContext`, plus request metadata. */
export interface RouteContext {
  supabase: SupabaseClient;
  userId: string;
  scopes: readonly McpScope[];
  /** Resolved id of the authorized resource, when the route declared one. */
  resourceId?: string;
  /** The caller's role on that resource. */
  role?: OrganizationRole;
  /** API key id or OAuth client id, for the audit trail. */
  credentialId?: string;
  /** How the request authenticated. Reported by `GET /me`. */
  credentialKind: "api_key" | "oauth" | "session";
  requestId: string;
  /** Absolute origin of this deployment, for building URLs in responses. */
  origin: string;
}

/** The three input surfaces, each validated independently. */
export interface RouteInputs<
  P extends z.ZodType = z.ZodType,
  Q extends z.ZodType = z.ZodType,
  B extends z.ZodType = z.ZodType,
> {
  path?: P;
  query?: Q;
  body?: B;
}

export interface RouteDefinition<
  TPath = Record<string, unknown>,
  TQuery = Record<string, unknown>,
  TBody = Record<string, unknown>,
> {
  method: HttpMethod;
  /**
   * OpenAPI-style path template, relative to `/api/v1`, e.g.
   * `/studies/{study_id}/cards/{card_id}`. Parameter names must match keys in
   * the `path` schema.
   */
  path: string;
  /** Stable, unique. Becomes the OpenAPI `operationId` and SDK method name. */
  operationId: string;
  summary: string;
  description: string;
  /** OpenAPI tag. Groups the endpoint in the reference sidebar. */
  tag: string;
  scopes: readonly McpScope[];
  resource: ResourceRequirement;
  entitlement?: FeatureKey;
  cost?: RouteCost;
  /** HTTP status on success. Defaults to 200, or 201 for POST that creates. */
  status?: number;
  /**
   * What a mutating route actually mutates. Checked by the invariant test in
   * `registry.test.ts`, which would otherwise be too crude to tell three
   * genuinely different cases apart:
   *
   * - `'config'` (the default) — study content, settings, or lifecycle.
   *   Requires `editor` or above on a named resource.
   * - `'derived'` — produces an artifact (an export, a report) from data the
   *   caller can already read. Requires only `viewer`, because it grants no
   *   access they did not already have; the write is a job record, not a
   *   change to the study.
   * - `'owned'` — acts on a record belonging to the calling user rather than
   *   to a shared resource, so there is no role to check. Every such handler
   *   MUST scope its query by `ctx.userId`; that is the entire authorization.
   * - `'resolved'` — the target organization is not an argument; it is resolved
   *   from the caller's memberships inside the handler, so the declarative gate
   *   has nothing to read. Such a handler MUST call `resolveOrganizationId`
   *   (which refuses an organization the caller does not belong to) and the
   *   service it delegates to MUST perform the role check.
   *
   * The last two are asserted mechanically in `registry.test.ts` rather than
   * taken on trust.
   */
  mutates?: "config" | "derived" | "owned" | "resolved";
  /**
   * Accepts an `Idempotency-Key` header. Set on any non-idempotent write where
   * a retried request must not create a second resource.
   */
  idempotent?: boolean;
  /** Marks the endpoint deprecated in the OpenAPI document. */
  deprecated?: boolean;
  inputs?: RouteInputs;
  /** Response body schema. Drives the OpenAPI `responses` block. */
  response: z.ZodType;
  /** 1-3 example requests, rendered in the reference. */
  examples?: Array<{
    summary: string;
    path?: Record<string, unknown>;
    query?: Record<string, unknown>;
    body?: Record<string, unknown>;
  }>;
  handler: (
    args: { path: TPath; query: TQuery; body: TBody },
    ctx: RouteContext,
  ) => Promise<unknown>;
}

/** Validated inputs, ready for the handler. */
export interface ParsedInputs {
  path: Record<string, unknown>;
  query: Record<string, unknown>;
  body: Record<string, unknown>;
}

/**
 * Run one request end to end: input validation, scopes, resource
 * authorization, plan gate, handler.
 *
 * Ordering matters and is not arbitrary. Validation runs first so a caller with
 * a malformed id gets `400 invalid_input` rather than a misleading `404` from
 * a permission check on garbage. Scopes run before resource resolution so a
 * credential that could never perform the call is refused without a database
 * round trip — and, more importantly, without revealing through timing whether
 * the resource exists.
 */
export async function invokeRoute(
  def: RouteDefinition,
  raw: { path: unknown; query: unknown; body: unknown },
  caller: {
    userId: string;
    scopes: readonly McpScope[];
    credentialId?: string;
    kind: "api_key" | "oauth" | "session";
  },
  supabase: SupabaseClient,
  meta: { requestId: string; origin: string },
): Promise<unknown> {
  const parsed: ParsedInputs = {
    path: await parse(def.inputs?.path, raw.path, "path"),
    query: await parse(def.inputs?.query, raw.query, "query"),
    body: await parse(def.inputs?.body, raw.body, "body"),
  };

  assertScopes(caller.scopes, def.scopes);

  // The resource id may arrive in the path (`/studies/{study_id}`) or the body
  // (`POST /studies` carries `project_id`), so the gate reads from all three
  // surfaces merged. Path wins on collision — it is the more specific address.
  const forGate = { ...parsed.body, ...parsed.query, ...parsed.path };

  const { resourceId, role } = await assertResourceAccess(
    supabase,
    caller.userId,
    def.resource,
    forGate,
    def.operationId,
  );

  if (def.entitlement) {
    await assertFeatureAccess(
      supabase,
      def.resource,
      resourceId,
      def.entitlement,
    );
  }

  return def.handler(parsed as never, {
    supabase,
    userId: caller.userId,
    scopes: caller.scopes,
    resourceId,
    role,
    credentialId: caller.credentialId,
    credentialKind: caller.kind,
    requestId: meta.requestId,
    origin: meta.origin,
  });
}

/**
 * Validate one input surface.
 *
 * Issue paths are prefixed with the surface they came from (`body.title`,
 * `query.limit`) because the same field name can legitimately appear in two
 * places, and "title is required" is not actionable when the caller cannot tell
 * which title.
 */
async function parse(
  schema: z.ZodType | undefined,
  value: unknown,
  surface: "path" | "query" | "body",
): Promise<Record<string, unknown>> {
  if (!schema) return {};

  const result = await schema["~standard"].validate(value ?? {});
  if (result.issues) {
    const issues: FieldIssue[] = result.issues.map((issue) => {
      const path = (issue.path ?? [])
        .map((segment) =>
          typeof segment === "object" ? String(segment.key) : String(segment),
        )
        .join(".");
      return {
        path: path ? `${surface}.${path}` : surface,
        message: issue.message,
      };
    });
    throw badRequest(
      `Request validation failed on ${issues.length} field${issues.length === 1 ? "" : "s"}.`,
      issues,
    );
  }

  return result.value as Record<string, unknown>;
}
