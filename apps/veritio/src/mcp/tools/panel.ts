/**
 * Participant panel (CRM).
 *
 * Every tool here is `deferred: true` — kept out of `tools/list` and reached
 * through `tools_search` / `tool_execute`. Panel work is a minority of what
 * agents do with Veritio, and each advertised tool costs context on clients
 * that do not defer tool definitions. The authorization gate runs identically
 * either way.
 */

import { z } from "zod4";
import {
  createPanelParticipantService,
  createPanelTagService,
  createPanelSegmentService,
} from "../../services/panel/index";
import type { ToolDefinition } from "../authz/define-tool";
import { uuid, markUntrusted } from "../schemas/common";
import { invalidInput, noAccess } from "../authz/errors";
import { resolveOrganizationId } from "./_shared";

/**
 * Panel tools are organization-scoped rather than study-scoped, and the org id
 * is optional (resolved from membership when the user has exactly one). That
 * means the declarative `resource` gate cannot read it out of args, so these
 * resolve and authorize the org inside the handler via `resolveOrganizationId`,
 * which throws `noAccess` for an org the caller is not a member of.
 */
async function orgFor(
  ctx: { supabase: never; userId: string },
  requested?: string,
): Promise<string> {
  return resolveOrganizationId(ctx.supabase, ctx.userId, requested);
}

/** Participant-supplied identity fields are still participant-authored text. */
const PARTICIPANT_TEXT = ["name", "notes", "company", "job_title"] as const;

export const panelParticipantsList: ToolDefinition = {
  name: "panel_participants_list",
  title: "List panel participants",
  description:
    "List participants in the workspace panel, with their tags and participation counts. Filter by status, " +
    "tag or free-text search. Names and notes are participant-authored and come back marked untrusted.",
  feature: "panel",
  deferred: true,
  inputSchema: z.object({
    organization_id: uuid("organization").optional(),
    search: z.string().max(120).optional(),
    status: z
      .enum(["active", "inactive", "unsubscribed", "all"])
      .default("all"),
    limit: z.number().int().min(1).max(100).default(25),
    page: z.number().int().min(1).default(1),
  }),
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
  scopes: ["panel:read"],
  resource: { kind: "none" },
  handler: async (args, ctx) => {
    const a = args as {
      organization_id?: string;
      search?: string;
      status: string;
      limit: number;
      page: number;
    };
    const orgId = await orgFor(ctx as never, a.organization_id);
    const service = createPanelParticipantService(ctx.supabase);

    const result = await service.list(
      ctx.userId,
      orgId,
      {
        ...(a.search ? { search: a.search } : {}),
        ...(a.status !== "all" ? { status: a.status } : {}),
      } as never,
      { page: a.page, limit: a.limit },
    );

    const rows = (result.data ?? []) as unknown as Array<
      Record<string, unknown>
    >;
    return {
      organization_id: orgId,
      total: result.total ?? rows.length,
      page: a.page,
      participants: markUntrusted(rows, PARTICIPANT_TEXT),
    };
  },
};

export const panelParticipantGet: ToolDefinition = {
  name: "panel_participant_get",
  title: "Get a panel participant",
  description:
    "Full record for one panel participant, including tags and their study participation history.",
  feature: "panel",
  deferred: true,
  inputSchema: z.object({
    participant_id: uuid("panel participant"),
    organization_id: uuid("organization").optional(),
  }),
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
  scopes: ["panel:read"],
  resource: { kind: "none" },
  handler: async (args, ctx) => {
    const a = args as { participant_id: string; organization_id?: string };
    const orgId = await orgFor(ctx as never, a.organization_id);
    const service = createPanelParticipantService(ctx.supabase);
    const participant = await service.get(ctx.userId, orgId, a.participant_id);
    if (!participant) throw noAccess("panel participant");
    return markUntrusted(
      [participant as unknown as Record<string, unknown>],
      PARTICIPANT_TEXT,
    )[0];
  },
};

export const panelParticipantUpsert: ToolDefinition = {
  name: "panel_participant_upsert",
  title: "Create or update a panel participant",
  description:
    "Add a participant to the panel, or update one by id. Email is the natural key — creating with an email " +
    "that already exists will conflict, so pass participant_id to update instead.",
  feature: "panel",
  deferred: true,
  inputSchema: z.object({
    // Required, unlike the read tools, so the authorization gate can check the
    // caller's *role* on this specific organization declaratively. Inferring it
    // from membership would only prove they belong to the org, and an org
    // viewer must not be able to write panel data. Get the id from
    // fetch({id:"self"}) or panel_participants_list.
    organization_id: uuid("organization"),
    participant_id: uuid("panel participant")
      .optional()
      .describe("Supply to update; omit to create."),
    email: z.string().email().optional(),
    name: z.string().max(200).optional(),
    company: z.string().max(200).optional(),
    job_title: z.string().max(200).optional(),
    status: z.enum(["active", "inactive", "unsubscribed"]).optional(),
  }),
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  scopes: ["panel:write"],
  resource: { kind: "organization", argKey: "organization_id", role: "editor" },
  handler: async (args, ctx) => {
    const { organization_id, participant_id, ...fields } = args as {
      organization_id: string;
      participant_id?: string;
    } & Record<string, unknown>;

    // Already authorized at editor by the gate; no re-resolution needed.
    const orgId = organization_id;
    const service = createPanelParticipantService(ctx.supabase);

    if (participant_id) {
      if (Object.keys(fields).length === 0) {
        throw invalidInput(
          "Nothing to update.",
          "Pass at least one field besides participant_id.",
        );
      }
      return service.update(ctx.userId, orgId, participant_id, fields as never);
    }

    if (!fields.email) {
      throw invalidInput("email is required to create a panel participant.");
    }
    return service.create(ctx.userId, orgId, fields as never);
  },
};

export const panelTagsList: ToolDefinition = {
  name: "panel_tags_list",
  title: "List panel tags",
  description:
    "Tags available for segmenting the panel, with how many participants carry each.",
  feature: "panel",
  deferred: true,
  inputSchema: z.object({ organization_id: uuid("organization").optional() }),
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
  scopes: ["panel:read"],
  resource: { kind: "none" },
  handler: async (args, ctx) => {
    const a = args as { organization_id?: string };
    const orgId = await orgFor(ctx as never, a.organization_id);
    const tags = await createPanelTagService(ctx.supabase).list(
      ctx.userId,
      orgId,
    );
    return { organization_id: orgId, tags };
  },
};

export const panelSegmentsList: ToolDefinition = {
  name: "panel_segments_list",
  title: "List panel segments",
  description:
    "Saved participant segments and their sizes. Segments are condition-based groups you can recruit from.",
  feature: "panel",
  deferred: true,
  inputSchema: z.object({ organization_id: uuid("organization").optional() }),
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
  scopes: ["panel:read"],
  resource: { kind: "none" },
  handler: async (args, ctx) => {
    const a = args as { organization_id?: string };
    const orgId = await orgFor(ctx as never, a.organization_id);
    const segments = await createPanelSegmentService(ctx.supabase).list(
      ctx.userId,
      orgId,
    );
    return { organization_id: orgId, segments };
  },
};

export const PANEL_TOOLS: ToolDefinition[] = [
  panelParticipantsList,
  panelParticipantGet,
  panelParticipantUpsert,
  panelTagsList,
  panelSegmentsList,
];
