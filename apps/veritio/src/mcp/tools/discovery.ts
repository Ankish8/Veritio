/**
 * Discovery and navigation.
 *
 * `search` and `fetch` are named exactly that on purpose: OpenAI's deep
 * research spec requires those two names, so using them buys ChatGPT
 * compatibility at no cost. Every other tool is `resource_verb` so an
 * alphabetical listing groups by entity.
 */

import { z } from "zod4";
import {
  quickSearch,
  searchStudies,
} from "../../services/cross-study-search-service";
import { createProject, listProjects, updateProject } from "../../services/project-service";
import { listAllStudies } from "../../services/dashboard-service";
import { getStudy } from "../../services/study-service";
import {
  getEntitlements,
  getOrgPlan,
} from "../../services/entitlements-service";
import type { ToolDefinition } from "../authz/define-tool";
import { STUDY_TYPES, STUDY_STATUSES, uuid } from "../schemas/common";
import { TOOLS } from "../registry";
import {
  rethrow,
  resolveOrganizationId,
  participationUrl,
  resolveStudyType,
} from "./_shared";
import { noAccess, invalidInput } from "../authz/errors";

export const search: ToolDefinition = {
  name: "search",
  title: "Search Veritio",
  description:
    "Search studies across the workspace by keyword. Returns ids and titles — follow up with fetch or " +
    "study_get for detail. Use this first when you do not already know a study id.",
  feature: "discovery",
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .max(200)
      .describe("Free-text search over study titles and descriptions."),
    organization_id: uuid("organization")
      .optional()
      .describe("Only needed if you belong to several organizations."),
    study_type: z.enum(STUDY_TYPES).optional(),
    status: z.enum(STUDY_STATUSES).optional(),
    limit: z.number().int().min(1).max(50).default(20),
  }),
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
  scopes: ["studies:read"],
  // Authorized inside the service against the resolved org, since the org id is
  // optional here and may not be present in args for the generic gate to read.
  resource: { kind: "none" },
  handler: async (args, ctx) => {
    const a = args as {
      query: string;
      organization_id?: string;
      study_type?: string;
      status?: string;
      limit: number;
    };
    const orgId = await resolveOrganizationId(
      ctx.supabase,
      ctx.userId,
      a.organization_id,
    );

    const { data, error } = await searchStudies(
      ctx.supabase as never,
      orgId,
      ctx.userId,
      {
        query: a.query,
        ...(a.study_type ? { studyTypes: [a.study_type] } : {}),
        ...(a.status ? { statuses: [a.status] } : {}),
      } as never,
      { limit: a.limit },
    );
    rethrow(error, "organization");

    const results =
      (data as { studies?: Array<Record<string, unknown>> } | null)?.studies ??
      [];
    return {
      organization_id: orgId,
      count: results.length,
      studies: results.map((s) => ({
        study_id: s.id,
        title: s.title,
        study_type: s.study_type,
        status: s.status,
        project_id: s.project_id,
      })),
    };
  },
};

/**
 * `fetch` doubles as the capability-discovery call.
 *
 * `fetch({ id: "self" })` returns the workspace, its plan, and a per-tool
 * availability map. That last part matters for a product with a free
 * self-hosted tier and paid hosted tiers: without it an agent burns a call
 * discovering a tool is gated, and the failure reads like a bug rather than a
 * plan boundary.
 */
export const fetchResource: ToolDefinition = {
  name: "fetch",
  title: "Fetch by id",
  description:
    'Fetch any Veritio resource by id. Pass "self" to get the current workspace, plan, and which tools are ' +
    "available on it — call that first if a tool has been failing and you are not sure why. Pass " +
    'organization_id with "self" when you belong to multiple workspaces.',
  feature: "discovery",
  inputSchema: z.object({
    id: z
      .string()
      .min(1)
      .describe('A study id, project id, or the literal string "self".'),
    organization_id: uuid("organization")
      .optional()
      .describe('Only used with id "self".'),
  }),
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
  scopes: ["studies:read"],
  resource: { kind: "none" },
  examples: [
    { description: "Check workspace capabilities", arguments: { id: "self" } },
    {
      description: "Fetch a study",
      arguments: { id: "3f1b2c4d-0000-4000-8000-000000000000" },
    },
  ],
  handler: async (args, ctx) => {
    const { id, organization_id } = args as {
      id: string;
      organization_id?: string;
    };

    if (id === "self") {
      const orgId = await resolveOrganizationId(
        ctx.supabase,
        ctx.userId,
        organization_id,
      );
      const plan = await getOrgPlan(ctx.supabase as never, orgId);
      const entitlements = await getEntitlements(ctx.supabase as never, orgId);

      return {
        organization_id: orgId,
        user_id: ctx.userId,
        plan: plan?.plan ?? "unknown",
        plan_status: plan?.plan_status ?? null,
        granted_scopes: ctx.scopes,
        entitlements,
        current_tool_access: Object.fromEntries(
          TOOLS.map((t) => {
            if (!t.scopes.every((s) => ctx.scopes.includes(s)))
              return [t.name, "scope_required"];
            if (t.entitlement && !entitlements[t.entitlement])
              return [t.name, "upgrade_required"];
            return [t.name, "available"];
          }),
        ),
      };
    }

    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      throw invalidInput(
        `"${id}" is not a valid id.`,
        'Pass a UUID, or "self" for workspace info.',
      );
    }

    // Try study, then project. getStudy authorizes internally.
    const { data: study } = await getStudy(
      ctx.supabase as never,
      id,
      ctx.userId,
    );
    if (study) {
      return {
        kind: "study",
        study_id: study.id,
        title: study.title,
        study_type: study.study_type,
        status: study.status,
        participant_count: study.participant_count,
        participation_url: participationUrl(study.share_code),
      };
    }

    const { data: projects } = await listProjects(
      ctx.supabase as never,
      ctx.userId,
      {},
    );
    const project = (projects ?? []).find((p) => p.id === id);
    if (project)
      return { kind: "project", project_id: project.id, name: project.name };

    throw noAccess("resource");
  },
};

export const studyList: ToolDefinition = {
  name: "study_list",
  title: "List studies",
  description:
    "List studies you can access, newest first. Filter by type, status, or project. Use search instead " +
    "when looking for something by name.",
  feature: "discovery",
  inputSchema: z.object({
    study_type: z.enum(STUDY_TYPES).optional(),
    status: z.enum(STUDY_STATUSES).optional(),
    project_id: uuid("project").optional(),
    include_archived: z.boolean().default(false),
    limit: z.number().int().min(1).max(100).default(25),
    offset: z.number().int().min(0).default(0),
  }),
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
  scopes: ["studies:read"],
  resource: { kind: "none" },
  handler: async (args, ctx) => {
    const a = args as {
      study_type?: never;
      status?: never;
      project_id?: string;
      include_archived: boolean;
      limit: number;
      offset: number;
    };
    const { data, total, error } = await listAllStudies(
      ctx.supabase as never,
      ctx.userId,
      {
        ...(a.study_type ? { type: a.study_type } : {}),
        ...(a.status ? { status: a.status } : {}),
        archived: a.include_archived,
        limit: a.limit,
        offset: a.offset,
      },
    );
    rethrow(error);

    let studies = (data ?? []) as unknown as Array<Record<string, unknown>>;
    if (a.project_id)
      studies = studies.filter((s) => s.project_id === a.project_id);

    return {
      total,
      returned: studies.length,
      next_offset:
        a.offset + studies.length < total ? a.offset + studies.length : null,
      studies: studies.map((s) => ({
        study_id: s.id,
        title: s.title,
        study_type: s.study_type,
        status: s.status,
        project_id: s.project_id,
        participant_count: s.participant_count ?? s.response_count ?? null,
        updated_at: s.updated_at,
      })),
    };
  },
};

export const projectList: ToolDefinition = {
  name: "project_list",
  title: "List projects",
  description:
    "List projects you can access. Studies live inside projects, so you need a project id to create one.",
  feature: "discovery",
  inputSchema: z.object({
    organization_id: uuid("organization").optional(),
    include_archived: z.boolean().default(false),
  }),
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
  scopes: ["studies:read"],
  resource: { kind: "none" },
  handler: async (args, ctx) => {
    const a = args as { organization_id?: string; include_archived: boolean };
    const { data, error } = await listProjects(
      ctx.supabase as never,
      ctx.userId,
      {
        includeArchived: a.include_archived,
        ...(a.organization_id ? { organizationId: a.organization_id } : {}),
      },
    );
    rethrow(error, "organization");

    return {
      count: (data ?? []).length,
      projects: (data ?? []).map((p) => ({
        project_id: p.id,
        name: p.name,
        description: p.description,
        organization_id: p.organization_id,
        your_role: (p as { user_role?: string }).user_role,
      })),
    };
  },
};

export const studyQuickSearch: ToolDefinition = {
  name: "study_find_by_name",
  title: "Find a study by name",
  description:
    "Fuzzy-match a study by name and return candidate ids. Cheaper than search when you have a partial " +
    "title and just need the id.",
  feature: "discovery",
  inputSchema: z.object({
    name_hint: z.string().min(1).max(120),
    organization_id: uuid("organization").optional(),
    limit: z.number().int().min(1).max(20).default(10),
  }),
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
  scopes: ["studies:read"],
  resource: { kind: "none" },
  deferred: true,
  handler: async (args, ctx) => {
    const a = args as {
      name_hint: string;
      organization_id?: string;
      limit: number;
    };
    const orgId = await resolveOrganizationId(
      ctx.supabase,
      ctx.userId,
      a.organization_id,
    );
    const { data, error } = await quickSearch(
      ctx.supabase as never,
      orgId,
      ctx.userId,
      a.name_hint,
      {
        limit: a.limit,
      },
    );
    rethrow(error, "organization");
    return { matches: data?.studies ?? [] };
  },
};

/** Exposed for the results tools, which need the type before dispatching. */
export { resolveStudyType };

/**
 * Creating a project.
 *
 * Deferred rather than advertised: an agent needs a project id constantly but
 * needs to *create* one rarely, and every advertised tool costs context. The
 * organization is resolved from membership when the caller belongs to exactly
 * one, which is the common case; `createProject` performs its own editor check
 * against whichever organization it ends up using, so the declarative gate
 * correctly declares none.
 */
export const projectCreate: ToolDefinition = {
  name: "project_create",
  title: "Create a project",
  description:
    "Create a project to hold studies. You only need this when no suitable project exists - check " +
    "project_list first, since most workspaces already have one and studies are easier to find when " +
    "they are grouped rather than scattered.",
  feature: "discovery",
  deferred: true,
  inputSchema: z.object({
    name: z.string().min(1).max(120).describe("Human-readable project name."),
    description: z.string().max(2000).nullish(),
    organization_id: uuid("organization")
      .optional()
      .describe("Only needed if you belong to several organizations."),
  }),
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  scopes: ["studies:write"],
  resource: { kind: "none" },
  mutates: "resolved",
  handler: async (args, ctx) => {
    const a = args as {
      name: string;
      description?: string | null;
      organization_id?: string;
    };
    const orgId = await resolveOrganizationId(
      ctx.supabase,
      ctx.userId,
      a.organization_id,
    );
    const { data, error } = await createProject(ctx.supabase as never, ctx.userId, {
      name: a.name,
      description: a.description ?? null,
      organizationId: orgId,
    });
    rethrow(error, "organization");
    if (!data) throw noAccess("organization");
    return {
      project_id: data.id,
      name: data.name,
      organization_id: orgId,
      next_steps: "Create studies in it with study_create, passing this project_id.",
    };
  },
};

export const projectUpdate: ToolDefinition = {
  name: "project_update",
  title: "Rename a project",
  description:
    "Change a project`s name or description. Does not touch the studies inside it.",
  feature: "discovery",
  deferred: true,
  inputSchema: z.object({
    project_id: uuid("project"),
    name: z.string().min(1).max(120).optional(),
    description: z.string().max(2000).nullish(),
  }),
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  scopes: ["studies:write"],
  resource: { kind: "project", argKey: "project_id", role: "editor" },
  handler: async (args, ctx) => {
    const { project_id, ...patch } = args as { project_id: string } & Record<
      string,
      unknown
    >;
    if (Object.keys(patch).length === 0) {
      throw invalidInput(
        "Nothing to update.",
        "Pass name, description, or both.",
      );
    }
    const { data, error } = await updateProject(
      ctx.supabase as never,
      project_id,
      ctx.userId,
      patch as never,
    );
    rethrow(error, "project");
    if (!data) throw noAccess("project");
    return { project_id: data.id, name: data.name, updated: Object.keys(patch) };
  },
};

export const DISCOVERY_TOOLS: ToolDefinition[] = [
  search,
  fetchResource,
  studyList,
  projectList,
  studyQuickSearch,
  projectCreate,
  projectUpdate,
];
