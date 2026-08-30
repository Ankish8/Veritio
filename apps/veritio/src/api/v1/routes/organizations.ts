/**
 * Organizations (workspaces) and their members.
 *
 * Deliberately read-mostly. Creating and deleting a workspace, transferring
 * ownership and changing seats are billing-bearing acts that belong to a signed
 * -in human in the dashboard, not to a long-lived API key — so those services
 * exist but are not exposed here. Membership changes are exposed, because
 * provisioning users from an IdP or a script is a real integration need.
 */

import { z } from "zod4";
import {
  addOrganizationMember,
  getOrganization,
  listOrganizationMembers,
  listUserOrganizations,
  removeMember,
  updateMemberRole,
  updateOrganization,
} from "@/services/organization-service";
import type { RouteDefinition } from "../define-route";
import { listOf, paginationQuery, uuidParam } from "../schemas";
import { paginate, requirePatch, rethrow, roleSchema } from "./_shared";

const organizationSchema = z
  .object({
    object: z.literal("organization"),
    id: z.string(),
    name: z.string(),
    slug: z.string().nullable(),
    plan: z.string().nullable().describe("Billing plan, when the caller may see it."),
    your_role: roleSchema.nullable(),
    created_at: z.string().nullable(),
  })
  .describe("A workspace. Everything else in Veritio hangs off one.");

const memberSchema = z
  .object({
    object: z.literal("organization_member"),
    user_id: z.string(),
    organization_id: z.string(),
    role: roleSchema,
    name: z.string().nullable(),
    email: z.string().nullable(),
    joined_at: z.string().nullable(),
  })
  .describe("One person's membership of a workspace.");

function serialize(row: Record<string, unknown>): Record<string, unknown> {
  return {
    object: "organization",
    id: row.id,
    name: row.name,
    slug: row.slug ?? null,
    plan: row.plan ?? null,
    your_role: (row.user_role as string | undefined) ?? null,
    created_at: row.created_at ?? null,
  };
}

export const listOrganizations: RouteDefinition = {
  method: "GET",
  path: "/organizations",
  operationId: "listOrganizations",
  summary: "List workspaces",
  description:
    "Every workspace this credential can reach, with the caller's role in each. Most accounts have exactly " +
    "one; endpoints that take an optional `organization_id` resolve it automatically in that case.",
  tag: "Organizations",
  scopes: ["org:read"],
  resource: { kind: "none" },
  cost: "read",
  inputs: { query: z.object(paginationQuery) },
  response: listOf(organizationSchema, "workspaces"),
  handler: async ({ query }, ctx) => {
    const { data, error } = await listUserOrganizations(
      ctx.supabase as never,
      ctx.userId,
    );
    rethrow(error, "organization");
    return paginate((data ?? []).map((row) => serialize(row as never)), query);
  },
};

export const getOrganizationRoute: RouteDefinition = {
  method: "GET",
  path: "/organizations/{organization_id}",
  operationId: "getOrganization",
  summary: "Retrieve a workspace",
  description: "Fetch one workspace by id, including the caller's role in it.",
  tag: "Organizations",
  scopes: ["org:read"],
  resource: { kind: "organization", argKey: "organization_id", role: "viewer" },
  cost: "read",
  inputs: {
    path: z.object({ organization_id: uuidParam("organization") }),
  },
  response: organizationSchema,
  handler: async ({ path }, ctx) => {
    const { data, error } = await getOrganization(
      ctx.supabase as never,
      path.organization_id as string,
      ctx.userId,
    );
    rethrow(error, "organization");
    return serialize(data as never);
  },
};

export const updateOrganizationRoute: RouteDefinition = {
  method: "PATCH",
  path: "/organizations/{organization_id}",
  operationId: "updateOrganization",
  summary: "Update a workspace",
  description:
    "Rename a workspace or change its slug. Requires the admin role. Billing plan and seats are not " +
    "settable here — those are changed through billing.",
  tag: "Organizations",
  scopes: ["org:read", "org:write"],
  resource: { kind: "organization", argKey: "organization_id", role: "admin" },
  cost: "write",
  inputs: {
    path: z.object({ organization_id: uuidParam("organization") }),
    body: z.object({
      name: z.string().min(1).max(120).optional(),
      slug: z
        .string()
        .regex(/^[a-z0-9-]+$/, "lowercase letters, numbers and hyphens only")
        .max(60)
        .optional(),
    }),
  },
  response: organizationSchema,
  handler: async ({ path, body }, ctx) => {
    const { data, error } = await updateOrganization(
      ctx.supabase as never,
      path.organization_id as string,
      ctx.userId,
      requirePatch(body),
    );
    rethrow(error, "organization");
    return serialize({
      ...(data as never as Record<string, unknown>),
      user_role: ctx.role,
    });
  },
};

export const listMembers: RouteDefinition = {
  method: "GET",
  path: "/organizations/{organization_id}/members",
  operationId: "listOrganizationMembers",
  summary: "List workspace members",
  description:
    "Everyone in the workspace with their role. Use this to reconcile Veritio access against your own " +
    "directory before provisioning or removing people.",
  tag: "Organizations",
  scopes: ["org:read"],
  resource: { kind: "organization", argKey: "organization_id", role: "viewer" },
  cost: "read",
  inputs: {
    path: z.object({ organization_id: uuidParam("organization") }),
    query: z.object(paginationQuery),
  },
  response: listOf(memberSchema, "members"),
  handler: async ({ path, query }, ctx) => {
    const organizationId = path.organization_id as string;
    const { data, error } = await listOrganizationMembers(
      ctx.supabase as never,
      organizationId,
      ctx.userId,
    );
    rethrow(error, "organization");

    const rows = (data ?? []).map((member) => {
      const row = member as unknown as Record<string, unknown>;
      const user = (row.user ?? {}) as Record<string, unknown>;
      return {
        object: "organization_member",
        user_id: row.user_id,
        organization_id: organizationId,
        role: row.role,
        name: (user.name as string | null) ?? null,
        email: (user.email as string | null) ?? null,
        joined_at: (row.joined_at as string | null) ?? null,
      };
    });
    return paginate(rows, query);
  },
};

export const addMember: RouteDefinition = {
  method: "POST",
  path: "/organizations/{organization_id}/members",
  operationId: "addOrganizationMember",
  summary: "Add a member",
  description:
    "Add an existing Veritio user to the workspace at a given role. The person must already have an " +
    "account; to bring in someone who does not, send an invitation from the dashboard instead. Requires admin.",
  tag: "Organizations",
  scopes: ["org:read", "org:write"],
  resource: { kind: "organization", argKey: "organization_id", role: "admin" },
  cost: "write",
  idempotent: true,
  inputs: {
    path: z.object({ organization_id: uuidParam("organization") }),
    body: z.object({
      user_id: z.string().min(1).describe("The Veritio user id to add."),
      role: z
        .enum(["admin", "manager", "editor", "viewer"])
        .describe("Role to grant. Ownership cannot be granted this way."),
    }),
  },
  response: memberSchema,
  handler: async ({ path, body }, ctx) => {
    const organizationId = path.organization_id as string;
    const { data, error } = await addOrganizationMember(
      ctx.supabase as never,
      organizationId,
      ctx.userId,
      body.user_id as string,
      body.role as never,
    );
    rethrow(error, "organization");
    const row = data as unknown as Record<string, unknown>;
    return {
      object: "organization_member",
      user_id: row.user_id,
      organization_id: organizationId,
      role: row.role,
      name: null,
      email: null,
      joined_at: (row.joined_at as string | null) ?? null,
    };
  },
};

export const changeMemberRole: RouteDefinition = {
  method: "PATCH",
  path: "/organizations/{organization_id}/members/{user_id}",
  operationId: "updateOrganizationMemberRole",
  summary: "Change a member's role",
  description:
    "Move someone between roles. Requires admin. Ownership is transferred from the dashboard, not here.",
  tag: "Organizations",
  scopes: ["org:read", "org:write"],
  resource: { kind: "organization", argKey: "organization_id", role: "admin" },
  cost: "write",
  inputs: {
    path: z.object({
      organization_id: uuidParam("organization"),
      user_id: z.string().min(1).describe("The member to update."),
    }),
    body: z.object({
      role: z.enum(["admin", "manager", "editor", "viewer"]),
    }),
  },
  response: memberSchema,
  handler: async ({ path, body }, ctx) => {
    const organizationId = path.organization_id as string;
    const { data, error } = await updateMemberRole(
      ctx.supabase as never,
      organizationId,
      ctx.userId,
      path.user_id as string,
      body.role as never,
    );
    rethrow(error, "organization");
    const row = data as unknown as Record<string, unknown>;
    return {
      object: "organization_member",
      user_id: path.user_id,
      organization_id: organizationId,
      role: row?.role ?? body.role,
      name: null,
      email: null,
      joined_at: (row?.joined_at as string | null) ?? null,
    };
  },
};

export const removeMemberRoute: RouteDefinition = {
  method: "DELETE",
  path: "/organizations/{organization_id}/members/{user_id}",
  operationId: "removeOrganizationMember",
  summary: "Remove a member",
  description:
    "Revoke someone's access to the workspace. Their past contributions and any studies they created stay. " +
    "Requires admin.",
  tag: "Organizations",
  scopes: ["org:read", "org:write"],
  resource: { kind: "organization", argKey: "organization_id", role: "admin" },
  cost: "write",
  inputs: {
    path: z.object({
      organization_id: uuidParam("organization"),
      user_id: z.string().min(1),
    }),
  },
  response: z.object({
    object: z.literal("organization_member"),
    user_id: z.string(),
    deleted: z.literal(true),
  }),
  handler: async ({ path }, ctx) => {
    const { error } = await removeMember(
      ctx.supabase as never,
      path.organization_id as string,
      ctx.userId,
      path.user_id as string,
    );
    rethrow(error, "organization");
    return {
      object: "organization_member",
      user_id: path.user_id,
      deleted: true,
    };
  },
};

export const ORGANIZATION_ROUTES: RouteDefinition[] = [
  listOrganizations,
  getOrganizationRoute,
  updateOrganizationRoute,
  listMembers,
  addMember,
  changeMemberRole,
  removeMemberRoute,
];
