/**
 * Introspection.
 *
 * `GET /me` is the first call any integration should make. It answers the three
 * questions that otherwise cost a failed request each: who this credential
 * belongs to, what it is allowed to do, and which features the workspace's plan
 * actually includes. Without it, a `402 plan_required` on the fifth call reads
 * like a bug rather than a billing boundary.
 */

import { z } from "zod4";
import { getEntitlements, getOrgPlan } from "@/services/entitlements-service";
import { listUserOrganizations } from "@/services/organization-service";
import { MCP_SCOPES } from "@/mcp/authz/scopes";
import type { RouteDefinition } from "../define-route";
import { uuidParam } from "../schemas";
import { rethrow, resolveOrganizationId } from "./_shared";

const identitySchema = z
  .object({
    object: z.literal("identity"),
    user_id: z.string(),
    organization_id: z
      .string()
      .describe("The workspace these entitlements describe."),
    organizations: z
      .array(
        z.object({
          id: z.string(),
          name: z.string(),
          slug: z.string().nullable(),
          your_role: z.string().nullable(),
        }),
      )
      .describe("Every workspace this credential can reach."),
    credential: z
      .object({
        type: z
          .enum(["api_key", "oauth", "session"])
          .describe("How this request authenticated."),
        scopes: z
          .array(z.enum(MCP_SCOPES))
          .describe("Scopes this credential actually holds."),
      })
      .describe("The credential that made this call."),
    plan: z.string().describe("Billing plan of the resolved workspace."),
    plan_status: z.string().nullable(),
    entitlements: z
      .record(z.string(), z.unknown())
      .describe(
        "Feature flags derived from the plan. A route with an entitlement returns 402 when its flag is false.",
      ),
  })
  .describe("Who this credential is and what it may do.");

export const getMe: RouteDefinition = {
  method: "GET",
  path: "/me",
  operationId: "getCurrentIdentity",
  summary: "Describe the current credential",
  description:
    "Return the user, the workspaces this credential can reach, the scopes it holds, and the plan " +
    "entitlements of the resolved workspace. Call this first: it is the cheapest way to find out why a " +
    "later call would fail, and it never counts against a resource's permissions.",
  tag: "Meta",
  scopes: [],
  resource: { kind: "none" },
  cost: "read",
  inputs: {
    query: z.object({
      organization_id: uuidParam("organization")
        .optional()
        .describe(
          "Which workspace to report entitlements for. Only needed when you belong to several.",
        ),
    }),
  },
  response: identitySchema,
  examples: [{ summary: "Check what this key can do" }],
  handler: async ({ query }, ctx) => {
    const orgId = await resolveOrganizationId(
      ctx.supabase,
      ctx.userId,
      query.organization_id as string | undefined,
    );

    const [plan, entitlements, orgs] = await Promise.all([
      getOrgPlan(ctx.supabase as never, orgId),
      getEntitlements(ctx.supabase as never, orgId),
      listUserOrganizations(ctx.supabase as never, ctx.userId),
    ]);
    rethrow(orgs.error, "organization");

    return {
      object: "identity",
      user_id: ctx.userId,
      organization_id: orgId,
      organizations: (orgs.data ?? []).map((org) => ({
        id: org.id,
        name: org.name,
        slug: (org as { slug?: string | null }).slug ?? null,
        your_role: (org as { user_role?: string | null }).user_role ?? null,
      })),
      credential: {
        type: ctx.credentialKind,
        scopes: ctx.scopes,
      },
      plan: plan?.plan ?? "unknown",
      plan_status: plan?.plan_status ?? null,
      entitlements,
    };
  },
};

export const META_ROUTES: RouteDefinition[] = [getMe];
