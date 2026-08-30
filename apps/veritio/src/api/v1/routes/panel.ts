/**
 * The participant panel — Veritio's CRM of people you can recruit from.
 *
 * Panel records hold names, emails and free-text notes about real people, so
 * two rules apply throughout this module and nowhere else in the API:
 *
 * 1. Writes require `organization_id` explicitly, even though reads can infer
 *    it from membership. Inferring it on a write would prove only that the
 *    caller belongs to *some* workspace; the declarative gate needs the id in
 *    hand to check their *role* on that specific one, and an org viewer must
 *    not be able to edit panel data.
 * 2. Participant-authored fields come back wrapped as untrusted text, for the
 *    same reason survey answers do.
 */

import { z } from "zod4";
import {
  createPanelParticipantService,
  createPanelSegmentService,
  createPanelTagService,
  createPanelTagAssignmentService,
} from "@/services/panel/index";
import { markUntrusted } from "@/mcp/schemas/common";
import { badRequest } from "../../http/errors";
import type { RouteDefinition } from "../define-route";
import { listOf, page, paginationQuery, uuidParam } from "../schemas";
import { noAccess, requirePatch, resolveOrganizationId, window } from "./_shared";

/** Fields a participant wrote about themselves. */
const PARTICIPANT_TEXT = ["name", "notes", "company", "job_title"] as const;

const panelParticipantSchema = z
  .object({
    object: z.literal("panel_participant"),
    id: z.string(),
    organization_id: z.string(),
    email: z.string().nullable(),
    name: z.string().nullable().describe("Wrapped as untrusted participant text."),
    company: z.string().nullable(),
    job_title: z.string().nullable(),
    status: z.string(),
    tags: z.array(z.unknown()).nullable(),
    participation_count: z.number().int().nullable(),
    created_at: z.string().nullable(),
  })
  .describe("Someone in the recruitment panel.");

function serializeParticipant(
  row: Record<string, unknown>,
  organizationId: string,
): Record<string, unknown> {
  const [safe] = markUntrusted([row], PARTICIPANT_TEXT as never);
  return {
    object: "panel_participant",
    id: safe.id,
    organization_id: organizationId,
    email: safe.email ?? null,
    name: safe.name ?? null,
    company: safe.company ?? null,
    job_title: safe.job_title ?? null,
    status: safe.status ?? "active",
    tags: (safe.tags as unknown[] | undefined) ?? null,
    participation_count:
      (safe.participation_count as number | undefined) ??
      (safe.participationCount as number | undefined) ??
      null,
    created_at: (safe.created_at as string | null) ?? null,
  };
}

export const listPanelParticipants: RouteDefinition = {
  method: "GET",
  path: "/panel/participants",
  operationId: "listPanelParticipants",
  summary: "List panel participants",
  description:
    "People in the workspace panel, with their tags and how many studies they have taken part in. Filter by " +
    "status or free-text search. Names, notes, company and job title are participant-authored and come back " +
    "wrapped as untrusted text.",
  tag: "Panel",
  scopes: ["panel:read"],
  resource: { kind: "none" },
  cost: "read",
  inputs: {
    query: z.object({
      organization_id: uuidParam("organization")
        .optional()
        .describe("Only needed when you belong to several workspaces."),
      search: z.string().max(120).optional().describe("Matches name, email or company."),
      status: z
        .enum(["active", "inactive", "unsubscribed", "all"])
        .default("all"),
      ...paginationQuery,
    }),
  },
  response: listOf(panelParticipantSchema, "panel participants"),
  handler: async ({ query }, ctx) => {
    const orgId = await resolveOrganizationId(
      ctx.supabase,
      ctx.userId,
      query.organization_id as string | undefined,
    );
    const { offset, limit } = window(query);

    const result = await createPanelParticipantService(ctx.supabase).list(
      ctx.userId,
      orgId,
      {
        ...(query.search ? { search: query.search } : {}),
        ...(query.status !== "all" ? { status: query.status } : {}),
      } as never,
      // The service pages by page number; our cursor is an offset, so convert.
      { page: Math.floor(offset / limit) + 1, limit },
    );

    const rows = (result.data ?? []) as unknown as Array<Record<string, unknown>>;
    return page(
      rows.map((row) => serializeParticipant(row, orgId)),
      { offset, limit, total: result.total ?? rows.length },
    );
  },
};

export const getPanelParticipant: RouteDefinition = {
  method: "GET",
  path: "/panel/participants/{participant_id}",
  operationId: "getPanelParticipant",
  summary: "Retrieve a panel participant",
  description:
    "One panel record in full, including tags and study participation history.",
  tag: "Panel",
  scopes: ["panel:read"],
  resource: { kind: "none" },
  cost: "read",
  inputs: {
    path: z.object({ participant_id: uuidParam("panel participant") }),
    query: z.object({
      organization_id: uuidParam("organization").optional(),
    }),
  },
  response: panelParticipantSchema,
  handler: async ({ path, query }, ctx) => {
    const orgId = await resolveOrganizationId(
      ctx.supabase,
      ctx.userId,
      query.organization_id as string | undefined,
    );
    const participant = await createPanelParticipantService(ctx.supabase).get(
      ctx.userId,
      orgId,
      path.participant_id as string,
    );
    if (!participant) throw noAccess("panel participant");
    return serializeParticipant(
      participant as unknown as Record<string, unknown>,
      orgId,
    );
  },
};

export const createPanelParticipant: RouteDefinition = {
  method: "POST",
  path: "/panel/participants",
  operationId: "createPanelParticipant",
  summary: "Add someone to the panel",
  description:
    "Create a panel record. Email is the natural key: creating with an email that already exists conflicts, " +
    "so PATCH the existing record instead. Requires the editor role on the workspace.",
  tag: "Panel",
  scopes: ["panel:write"],
  resource: { kind: "organization", argKey: "organization_id", role: "editor" },
  cost: "write",
  idempotent: true,
  inputs: {
    body: z.object({
      organization_id: uuidParam("organization").describe(
        "Required on writes so the caller's role on this workspace can be checked.",
      ),
      email: z.string().email(),
      name: z.string().max(200).optional(),
      company: z.string().max(200).optional(),
      job_title: z.string().max(200).optional(),
      status: z.enum(["active", "inactive", "unsubscribed"]).optional(),
    }),
  },
  response: panelParticipantSchema,
  handler: async ({ body }, ctx) => {
    const { organization_id: orgId, ...fields } = body as {
      organization_id: string;
    } & Record<string, unknown>;
    const created = await createPanelParticipantService(ctx.supabase).create(
      ctx.userId,
      orgId,
      fields as never,
    );
    return serializeParticipant(
      created as unknown as Record<string, unknown>,
      orgId,
    );
  },
};

export const updatePanelParticipant: RouteDefinition = {
  method: "PATCH",
  path: "/panel/participants/{participant_id}",
  operationId: "updatePanelParticipant",
  summary: "Update a panel participant",
  description:
    "Change a panel record's details or status. Setting `status` to `unsubscribed` is how you honour an " +
    "opt-out: the person stays in the panel for audit purposes but is excluded from recruitment.",
  tag: "Panel",
  scopes: ["panel:write"],
  resource: { kind: "organization", argKey: "organization_id", role: "editor" },
  cost: "write",
  inputs: {
    path: z.object({ participant_id: uuidParam("panel participant") }),
    body: z.object({
      organization_id: uuidParam("organization"),
      email: z.string().email().optional(),
      name: z.string().max(200).nullish(),
      company: z.string().max(200).nullish(),
      job_title: z.string().max(200).nullish(),
      status: z.enum(["active", "inactive", "unsubscribed"]).optional(),
    }),
  },
  response: panelParticipantSchema,
  handler: async ({ path, body }, ctx) => {
    const { organization_id: orgId, ...fields } = body as {
      organization_id: string;
    } & Record<string, unknown>;
    if (Object.keys(fields).length === 0) {
      throw badRequest("Nothing to update.", [
        {
          path: "body",
          message: "Send at least one field besides organization_id.",
        },
      ]);
    }
    const updated = await createPanelParticipantService(ctx.supabase).update(
      ctx.userId,
      orgId,
      path.participant_id as string,
      fields as never,
    );
    return serializeParticipant(
      updated as unknown as Record<string, unknown>,
      orgId,
    );
  },
};

export const deletePanelParticipant: RouteDefinition = {
  method: "DELETE",
  path: "/panel/participants/{participant_id}",
  operationId: "deletePanelParticipant",
  summary: "Delete a panel participant",
  description:
    "Permanently remove someone from the panel. Use this for an erasure request; for an ordinary opt-out, " +
    "set their status to `unsubscribed` instead so the record of the opt-out survives.",
  tag: "Panel",
  scopes: ["panel:write"],
  resource: { kind: "organization", argKey: "organization_id", role: "editor" },
  cost: "write",
  inputs: {
    path: z.object({ participant_id: uuidParam("panel participant") }),
    query: z.object({ organization_id: uuidParam("organization") }),
  },
  response: z.object({
    object: z.literal("panel_participant"),
    id: z.string(),
    deleted: z.literal(true),
  }),
  handler: async ({ path, query }, ctx) => {
    await createPanelParticipantService(ctx.supabase).delete(
      ctx.userId,
      query.organization_id as string,
      path.participant_id as string,
    );
    return {
      object: "panel_participant",
      id: path.participant_id,
      deleted: true,
    };
  },
};

// --- Tags ------------------------------------------------------------------

const panelTagSchema = z
  .object({
    object: z.literal("panel_tag"),
    id: z.string(),
    name: z.string(),
    color: z.string().nullable(),
    participant_count: z.number().int().nullable(),
  })
  .describe("A tag used to segment the panel.");

export const listPanelTags: RouteDefinition = {
  method: "GET",
  path: "/panel/tags",
  operationId: "listPanelTags",
  summary: "List panel tags",
  description: "Tags available for segmenting the panel, with how many people carry each.",
  tag: "Panel",
  scopes: ["panel:read"],
  resource: { kind: "none" },
  cost: "read",
  inputs: {
    query: z.object({ organization_id: uuidParam("organization").optional() }),
  },
  response: listOf(panelTagSchema, "tags"),
  handler: async ({ query }, ctx) => {
    const orgId = await resolveOrganizationId(
      ctx.supabase,
      ctx.userId,
      query.organization_id as string | undefined,
    );
    const tags = await createPanelTagService(ctx.supabase).list(ctx.userId, orgId);
    const rows = (tags ?? []).map((tag) => {
      const row = tag as unknown as Record<string, unknown>;
      return {
        object: "panel_tag",
        id: row.id,
        name: row.name,
        color: (row.color as string | null) ?? null,
        participant_count:
          (row.participant_count as number | undefined) ??
          (row.count as number | undefined) ??
          null,
      };
    });
    return page(rows, { offset: 0, limit: rows.length, total: rows.length });
  },
};

export const createPanelTag: RouteDefinition = {
  method: "POST",
  path: "/panel/tags",
  operationId: "createPanelTag",
  summary: "Create a panel tag",
  description: "Add a tag you can then assign to panel participants.",
  tag: "Panel",
  scopes: ["panel:write"],
  resource: { kind: "organization", argKey: "organization_id", role: "editor" },
  cost: "write",
  idempotent: true,
  inputs: {
    body: z.object({
      organization_id: uuidParam("organization"),
      name: z.string().min(1).max(80),
      color: z
        .string()
        .regex(/^#[0-9a-fA-F]{6}$/, "must be a hex colour like #4F46E5")
        .optional(),
    }),
  },
  response: panelTagSchema,
  handler: async ({ body }, ctx) => {
    const tag = await createPanelTagService(ctx.supabase).create(
      ctx.userId,
      body.organization_id as string,
      {
        name: body.name as string,
        ...(body.color ? { color: body.color as string } : {}),
      } as never,
    );
    const row = tag as unknown as Record<string, unknown>;
    return {
      object: "panel_tag",
      id: row.id,
      name: row.name,
      color: (row.color as string | null) ?? null,
      participant_count: 0,
    };
  },
};

export const setParticipantTags: RouteDefinition = {
  method: "PUT",
  path: "/panel/participants/{participant_id}/tags",
  operationId: "setPanelParticipantTags",
  summary: "Set a participant's tags",
  description:
    "Replace the full tag list for one panel participant. Send an empty array to clear every tag.",
  tag: "Panel",
  scopes: ["panel:write"],
  resource: { kind: "organization", argKey: "organization_id", role: "editor" },
  cost: "write",
  status: 200,
  inputs: {
    path: z.object({ participant_id: uuidParam("panel participant") }),
    body: z.object({
      organization_id: uuidParam("organization"),
      tag_ids: z.array(z.string()).max(100).describe("The complete list of tag ids."),
    }),
  },
  response: z.object({
    object: z.literal("panel_participant_tags"),
    participant_id: z.string(),
    tag_ids: z.array(z.string()),
  }),
  handler: async ({ path, body }, ctx) => {
    // Third argument is the assignment *source*, not the actor: assignments
    // record how a tag arrived (manually, or from an automation).
    await createPanelTagAssignmentService(ctx.supabase).replaceParticipantTags(
      path.participant_id as string,
      body.tag_ids as string[],
      "manual",
    );
    return {
      object: "panel_participant_tags",
      participant_id: path.participant_id,
      tag_ids: body.tag_ids,
    };
  },
};

// --- Segments --------------------------------------------------------------

const panelSegmentSchema = z
  .object({
    object: z.literal("panel_segment"),
    id: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    participant_count: z.number().int().nullable(),
    conditions: z.unknown().nullable(),
  })
  .describe("A saved, condition-based group of panel participants.");

function serializeSegment(row: Record<string, unknown>): Record<string, unknown> {
  return {
    object: "panel_segment",
    id: row.id,
    name: row.name,
    description: (row.description as string | null) ?? null,
    participant_count: (row.participant_count as number | null) ?? null,
    conditions: row.conditions ?? null,
  };
}

export const listPanelSegments: RouteDefinition = {
  method: "GET",
  path: "/panel/segments",
  operationId: "listPanelSegments",
  summary: "List panel segments",
  description:
    "Saved participant segments and their sizes. A segment is a set of conditions, so its size moves as the " +
    "panel changes.",
  tag: "Panel",
  scopes: ["panel:read"],
  resource: { kind: "none" },
  cost: "read",
  inputs: {
    query: z.object({ organization_id: uuidParam("organization").optional() }),
  },
  response: listOf(panelSegmentSchema, "segments"),
  handler: async ({ query }, ctx) => {
    const orgId = await resolveOrganizationId(
      ctx.supabase,
      ctx.userId,
      query.organization_id as string | undefined,
    );
    const segments = await createPanelSegmentService(ctx.supabase).list(
      ctx.userId,
      orgId,
    );
    const rows = (segments ?? []).map((segment) =>
      serializeSegment(segment as unknown as Record<string, unknown>),
    );
    return page(rows, { offset: 0, limit: rows.length, total: rows.length });
  },
};

export const getSegmentParticipants: RouteDefinition = {
  method: "GET",
  path: "/panel/segments/{segment_id}/participants",
  operationId: "listSegmentParticipants",
  summary: "List a segment's participants",
  description:
    "The people currently matching a segment's conditions. This is the recruitment list — evaluated now, " +
    "not a stored snapshot.",
  tag: "Panel",
  scopes: ["panel:read"],
  resource: { kind: "none" },
  cost: "read",
  inputs: {
    path: z.object({ segment_id: uuidParam("segment") }),
    query: z.object({
      organization_id: uuidParam("organization").optional(),
      ...paginationQuery,
    }),
  },
  response: listOf(panelParticipantSchema, "panel participants"),
  handler: async ({ path, query }, ctx) => {
    const orgId = await resolveOrganizationId(
      ctx.supabase,
      ctx.userId,
      query.organization_id as string | undefined,
    );
    const { offset, limit } = window(query);

    const result = await createPanelSegmentService(ctx.supabase).getParticipants(
      ctx.userId,
      orgId,
      path.segment_id as string,
    );

    const rows = (result ?? []) as unknown as Array<Record<string, unknown>>;
    return page(
      rows.slice(offset, offset + limit).map((row) => serializeParticipant(row, orgId)),
      { offset, limit, total: rows.length },
    );
  },
};

export const createPanelSegment: RouteDefinition = {
  method: "POST",
  path: "/panel/segments",
  operationId: "createPanelSegment",
  summary: "Create a panel segment",
  description:
    "Save a set of conditions as a reusable segment. The condition shape mirrors the segment builder in the " +
    "dashboard; copy one from `GET /panel/segments` if you are unsure of the format.",
  tag: "Panel",
  scopes: ["panel:write"],
  resource: { kind: "organization", argKey: "organization_id", role: "editor" },
  cost: "write",
  idempotent: true,
  inputs: {
    body: z.object({
      organization_id: uuidParam("organization"),
      name: z.string().min(1).max(120),
      description: z.string().max(500).nullish(),
      conditions: z
        .record(z.string(), z.unknown())
        .describe("The segment's matching conditions."),
    }),
  },
  response: panelSegmentSchema,
  handler: async ({ body }, ctx) => {
    const segment = await createPanelSegmentService(ctx.supabase).create(
      ctx.userId,
      body.organization_id as string,
      {
        name: body.name,
        description: body.description ?? null,
        conditions: body.conditions,
      } as never,
    );
    return serializeSegment(segment as unknown as Record<string, unknown>);
  },
};

export const updatePanelSegment: RouteDefinition = {
  method: "PATCH",
  path: "/panel/segments/{segment_id}",
  operationId: "updatePanelSegment",
  summary: "Update a panel segment",
  description: "Rename a segment or change its matching conditions.",
  tag: "Panel",
  scopes: ["panel:write"],
  resource: { kind: "organization", argKey: "organization_id", role: "editor" },
  cost: "write",
  inputs: {
    path: z.object({ segment_id: uuidParam("segment") }),
    body: z.object({
      organization_id: uuidParam("organization"),
      name: z.string().min(1).max(120).optional(),
      description: z.string().max(500).nullish(),
      conditions: z.record(z.string(), z.unknown()).optional(),
    }),
  },
  response: panelSegmentSchema,
  handler: async ({ path, body }, ctx) => {
    const { organization_id: orgId, ...fields } = body as {
      organization_id: string;
    } & Record<string, unknown>;
    requirePatch(fields);
    const segment = await createPanelSegmentService(ctx.supabase).update(
      ctx.userId,
      orgId,
      path.segment_id as string,
      fields as never,
    );
    return serializeSegment(segment as unknown as Record<string, unknown>);
  },
};

export const deletePanelSegment: RouteDefinition = {
  method: "DELETE",
  path: "/panel/segments/{segment_id}",
  operationId: "deletePanelSegment",
  summary: "Delete a panel segment",
  description:
    "Remove a saved segment. The participants it matched are untouched — only the saved query goes.",
  tag: "Panel",
  scopes: ["panel:write"],
  resource: { kind: "organization", argKey: "organization_id", role: "editor" },
  cost: "write",
  inputs: {
    path: z.object({ segment_id: uuidParam("segment") }),
    query: z.object({ organization_id: uuidParam("organization") }),
  },
  response: z.object({
    object: z.literal("panel_segment"),
    id: z.string(),
    deleted: z.literal(true),
  }),
  handler: async ({ path, query }, ctx) => {
    await createPanelSegmentService(ctx.supabase).delete(
      ctx.userId,
      query.organization_id as string,
      path.segment_id as string,
    );
    return { object: "panel_segment", id: path.segment_id, deleted: true };
  },
};

export const PANEL_ROUTES: RouteDefinition[] = [
  listPanelParticipants,
  createPanelParticipant,
  getPanelParticipant,
  updatePanelParticipant,
  deletePanelParticipant,
  setParticipantTags,
  listPanelTags,
  createPanelTag,
  listPanelSegments,
  createPanelSegment,
  getSegmentParticipants,
  updatePanelSegment,
  deletePanelSegment,
];
