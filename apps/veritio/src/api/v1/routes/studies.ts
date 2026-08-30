/**
 * The study lifecycle: create, configure, validate, launch, close, duplicate.
 *
 * `POST /studies/{id}/launch` is the one irreversible, outward-facing act in the
 * whole API — it makes a study reachable by real members of the public at a URL
 * that starts collecting their data. It is therefore its own endpoint rather
 * than a `status` field on `PATCH /studies/{id}`: an explicit path is something
 * a reviewer can grep for and a client can gate behind confirmation, which a
 * string in a patch body is not.
 */

import { z } from "zod4";
import {
  archiveStudy,
  createStudy,
  deleteStudy,
  getStudy,
  restoreStudy,
  updateStudy,
} from "@/services/study-service";
import { listAllStudies } from "@/services/dashboard-service";
import { getStudyDefaults } from "@/services/user-preferences-service";
import { executeBuilderTool } from "@/services/assistant/builder-tools";
import { executeBuilderWriteTool } from "@/services/assistant/builder-write-tools";
import { getMethodologyGuidance } from "@/services/assistant/methodology-guidance";
import {
  createStudyDuplicateShell,
  duplicateStudyContent,
} from "@/services/study-duplication/duplicate-content";
import { validateSettingsFor, settingsKeysFor } from "@/mcp/schemas/settings";
import { ToolError } from "@/mcp/authz/errors";
import { badRequest } from "../../http/errors";
import type { RouteDefinition } from "../define-route";
import {
  deletedSchema,
  listOf,
  paginationQuery,
  queryBool,
  studyStatusSchema,
  studyTypeSchema,
  uuidParam,
  encodeCursor,
} from "../schemas";
import {
  mapEntitlement,
  requirePatch,
  resolveStudyType,
  rethrow,
  serializeStudy,
  studySchema,
  window,
} from "./_shared";

const studyId = { study_id: uuidParam("study") };

export const listStudies: RouteDefinition = {
  method: "GET",
  path: "/studies",
  operationId: "listStudies",
  summary: "List and search studies",
  description:
    "Every study the caller can access, newest first, across all projects. Combine `q` with `study_type` " +
    "and `status` to narrow. Filtering and pagination happen in the database, so this stays cheap on large " +
    "workspaces.",
  tag: "Studies",
  scopes: ["studies:read"],
  resource: { kind: "none" },
  cost: "read",
  inputs: {
    query: z.object({
      q: z
        .string()
        .max(200)
        .optional()
        .describe("Free-text search over study titles and descriptions."),
      study_type: studyTypeSchema.optional(),
      status: studyStatusSchema.optional(),
      project_id: uuidParam("project")
        .optional()
        .describe("Restrict to one project."),
      include_archived: queryBool({
        default: false,
        description: "Include archived studies.",
      }),
      ...paginationQuery,
    }),
  },
  response: listOf(studySchema, "studies"),
  examples: [
    { summary: "Live tree tests", query: { study_type: "tree_test", status: "active" } },
  ],
  handler: async ({ query }, ctx) => {
    const { offset, limit } = window(query);

    const { data, total, error } = await listAllStudies(
      ctx.supabase as never,
      ctx.userId,
      {
        ...(query.study_type ? { type: query.study_type as never } : {}),
        ...(query.status ? { status: query.status as never } : {}),
        ...(query.q ? { search: query.q as string } : {}),
        archived: query.include_archived as boolean,
        limit,
        offset,
      },
    );
    rethrow(error);

    // `project_id` is not a filter the underlying query supports, so it is
    // applied here. That makes the page smaller than `limit` rather than
    // wrong — documented on the parameter so callers page until has_more.
    let rows = (data ?? []) as unknown as Array<Record<string, unknown>>;
    if (query.project_id) {
      rows = rows.filter((row) => row.project_id === query.project_id);
    }

    const consumed = offset + (data ?? []).length;
    const hasMore = consumed < total;
    return {
      object: "list",
      data: rows.map((row) => serializeStudy(row)),
      has_more: hasMore,
      next_cursor: hasMore ? encodeCursor(consumed) : null,
      total,
    };
  },
};

export const createStudyRoute: RouteDefinition = {
  method: "POST",
  path: "/studies",
  operationId: "createStudy",
  summary: "Create a study",
  description:
    "Create a study inside a project. It starts in `draft` and is not reachable by participants. The usual " +
    "sequence is: create, add content with the content endpoints, check `GET /studies/{id}/validation`, then " +
    "`POST /studies/{id}/launch`.",
  tag: "Studies",
  scopes: ["studies:write"],
  resource: { kind: "project", argKey: "project_id", role: "editor" },
  cost: "write",
  idempotent: true,
  inputs: {
    body: z.object({
      project_id: uuidParam("project").describe("Which project to create it in."),
      title: z.string().min(1).max(255),
      study_type: studyTypeSchema,
      description: z.string().max(2000).nullish(),
      settings: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          "Initial behavioural settings, merged over the defaults for this study type.",
        ),
    }),
  },
  response: studySchema,
  examples: [
    {
      summary: "Create an open card sort",
      body: {
        project_id: "3f1b2c4d-0000-4000-8000-000000000000",
        title: "Homepage IA card sort",
        study_type: "card_sort",
      },
    },
  ],
  handler: async ({ body }, ctx) => {
    const { data: defaults } = await getStudyDefaults(
      ctx.supabase as never,
      ctx.userId,
    );

    const { data, error } = await mapEntitlement(() =>
      createStudy(
        ctx.supabase as never,
        body.project_id as string,
        ctx.userId,
        {
          title: body.title as string,
          study_type: body.study_type as never,
          description: (body.description as string | null) ?? null,
        },
        defaults || undefined,
        body.settings as Record<string, unknown> | undefined,
      ),
    );
    rethrow(error, "project");
    return serializeStudy(data as never);
  },
};

export const getStudyRoute: RouteDefinition = {
  method: "GET",
  path: "/studies/{study_id}",
  operationId: "getStudy",
  summary: "Retrieve a study",
  description:
    "Fetch a study with its status, counts, participation URL and full settings object.",
  tag: "Studies",
  scopes: ["studies:read"],
  resource: { kind: "study", argKey: "study_id", role: "viewer" },
  cost: "read",
  inputs: { path: z.object(studyId) },
  response: studySchema,
  handler: async ({ path }, ctx) => {
    const { data, error } = await getStudy(
      ctx.supabase as never,
      path.study_id as string,
      ctx.userId,
    );
    rethrow(error);
    return serializeStudy(data as never, { includeSettings: true });
  },
};

export const updateStudyRoute: RouteDefinition = {
  method: "PATCH",
  path: "/studies/{study_id}",
  operationId: "updateStudy",
  summary: "Update study metadata",
  description:
    "Change a study's title, description, participant-facing copy, language or URL slug. This does not " +
    "change status — use the launch and status endpoints — and it does not change behavioural settings, " +
    "which have their own endpoint.",
  tag: "Studies",
  scopes: ["studies:write"],
  resource: { kind: "study", argKey: "study_id", role: "editor" },
  cost: "write",
  inputs: {
    path: z.object(studyId),
    body: z.object({
      title: z.string().min(1).max(255).optional(),
      description: z.string().max(2000).nullish(),
      purpose: z
        .string()
        .nullish()
        .describe("Shown to participants on the welcome screen. HTML is allowed."),
      participant_requirements: z
        .string()
        .nullish()
        .describe("Shown to participants before they start. HTML is allowed."),
      welcome_message: z.string().nullish(),
      thank_you_message: z.string().nullish(),
      language: z.string().max(10).optional(),
      url_slug: z
        .string()
        .regex(/^[a-z0-9-]*$/, "lowercase letters, numbers and hyphens only")
        .max(100)
        .nullish()
        .describe("Custom path segment for the participation URL."),
    }),
  },
  response: studySchema,
  handler: async ({ path, body }, ctx) => {
    const { data, error } = await updateStudy(
      ctx.supabase as never,
      path.study_id as string,
      ctx.userId,
      requirePatch(body) as never,
    );
    rethrow(error);
    return serializeStudy(data as never);
  },
};

export const deleteStudyRoute: RouteDefinition = {
  method: "DELETE",
  path: "/studies/{study_id}",
  operationId: "deleteStudy",
  summary: "Delete a study",
  description:
    "Permanently delete a study and every response collected in it. This cannot be undone. If you only " +
    "want it out of the way, archive it instead. Requires the manager role.",
  tag: "Studies",
  scopes: ["studies:write"],
  resource: { kind: "study", argKey: "study_id", role: "manager" },
  cost: "write",
  inputs: { path: z.object(studyId) },
  response: deletedSchema("study"),
  handler: async ({ path }, ctx) => {
    const { error } = await deleteStudy(
      ctx.supabase as never,
      path.study_id as string,
      ctx.userId,
    );
    rethrow(error);
    return { object: "study", id: path.study_id, deleted: true };
  },
};

export const launchStudy: RouteDefinition = {
  method: "POST",
  path: "/studies/{study_id}/launch",
  operationId: "launchStudy",
  summary: "Launch a study",
  description:
    "Take a study live. This exposes it at a public URL and begins collecting responses from real people. " +
    "Readiness is checked first and the launch is refused with `409 conflict` if the study is incomplete; " +
    "the response names each failing check. Set `override_validation` only when a human has seen those " +
    "problems and chosen to proceed anyway.",
  tag: "Studies",
  scopes: ["studies:write"],
  resource: { kind: "study", argKey: "study_id", role: "manager" },
  cost: "write",
  status: 200,
  inputs: {
    path: z.object(studyId),
    body: z.object({
      override_validation: z
        .boolean()
        .default(false)
        .describe("Launch despite failed readiness checks."),
    }),
  },
  response: z.object({
    object: z.literal("study"),
    id: z.string(),
    status: z.string(),
    participation_url: z.string().nullable(),
    launched_with_override: z.boolean(),
  }),
  examples: [{ summary: "Go live", path: { study_id: "3f1b…" }, body: {} }],
  handler: async ({ path, body }, ctx) => {
    const id = path.study_id as string;

    /**
     * Gate the launch on readiness.
     *
     * `updateStudy` will happily set status to active on a study with no tasks
     * and no flow steps. The builder UI warns a human; nothing enforces it. For
     * an unattended integration that is a genuine footgun — the call returns
     * success and the user ends up with a live study participants cannot
     * complete — so the check runs here and skipping it must be explicit.
     */
    if (!body.override_validation) {
      const readiness = await executeBuilderTool(
        "check_launch_readiness",
        {},
        { supabase: ctx.supabase, studyId: id, userId: ctx.userId },
      );
      const report = ((readiness as { result?: unknown }).result ??
        readiness) as {
        ready?: boolean;
        checklist?: Array<{ item: string; status: string; detail?: string }>;
      };

      if (report?.ready === false) {
        const failures = (report.checklist ?? [])
          .filter((check) => check.status === "fail")
          .map((check) => `${check.item}: ${check.detail ?? "failed"}`);
        throw new ToolError(
          "conflict",
          `This study is not ready to launch. ${failures.join("; ")}.`,
          "Fix these, or resend with override_validation: true if this was a deliberate choice.",
          409,
        );
      }
    }

    const { data, error } = await mapEntitlement(() =>
      updateStudy(ctx.supabase as never, id, ctx.userId, { status: "active" }),
    );
    rethrow(error);

    const study = serializeStudy(data as never);
    return {
      object: "study",
      id: study.id,
      status: study.status,
      participation_url: study.participation_url,
      launched_with_override: Boolean(body.override_validation),
    };
  },
};

export const setStudyStatus: RouteDefinition = {
  method: "POST",
  path: "/studies/{study_id}/status",
  operationId: "setStudyStatus",
  summary: "Pause, resume or close a study",
  description:
    "Move a study between `paused`, `completed` and `draft`. Pausing turns new participants away without " +
    "losing anything already collected. To take a study live for the first time use the launch endpoint, " +
    "which runs readiness checks first.",
  tag: "Studies",
  scopes: ["studies:write"],
  resource: { kind: "study", argKey: "study_id", role: "manager" },
  cost: "write",
  status: 200,
  inputs: {
    path: z.object(studyId),
    body: z.object({
      status: z.enum(["draft", "active", "paused", "completed"]),
    }),
  },
  response: studySchema,
  handler: async ({ path, body }, ctx) => {
    const { data, error } = await mapEntitlement(() =>
      updateStudy(ctx.supabase as never, path.study_id as string, ctx.userId, {
        status: body.status as never,
      }),
    );
    rethrow(error);
    return serializeStudy(data as never);
  },
};

export const archiveStudyRoute: RouteDefinition = {
  method: "POST",
  path: "/studies/{study_id}/archive",
  operationId: "archiveStudy",
  summary: "Archive a study",
  description:
    "Hide a study from the default listing without deleting anything. Reversible with the restore endpoint.",
  tag: "Studies",
  scopes: ["studies:write"],
  resource: { kind: "study", argKey: "study_id", role: "manager" },
  cost: "write",
  status: 200,
  inputs: { path: z.object(studyId) },
  response: studySchema,
  handler: async ({ path }, ctx) => {
    const { data, error } = await archiveStudy(
      ctx.supabase as never,
      path.study_id as string,
      ctx.userId,
    );
    rethrow(error);
    return serializeStudy(data as never);
  },
};

export const restoreStudyRoute: RouteDefinition = {
  method: "POST",
  path: "/studies/{study_id}/restore",
  operationId: "restoreStudy",
  summary: "Restore an archived study",
  description: "Bring an archived study back into the default listing.",
  tag: "Studies",
  scopes: ["studies:write"],
  resource: { kind: "study", argKey: "study_id", role: "manager" },
  cost: "write",
  status: 200,
  inputs: { path: z.object(studyId) },
  response: studySchema,
  handler: async ({ path }, ctx) => {
    const { data, error } = await restoreStudy(
      ctx.supabase as never,
      path.study_id as string,
      ctx.userId,
    );
    rethrow(error);
    return serializeStudy(data as never);
  },
};

export const duplicateStudy: RouteDefinition = {
  method: "POST",
  path: "/studies/{study_id}/duplicate",
  operationId: "duplicateStudy",
  summary: "Duplicate a study",
  description:
    "Copy a study's setup — cards, categories, tree, tasks, flow questions, settings and branding — into a " +
    "new draft. Responses are never copied, and the duplicate gets its own participation URL. The copy " +
    "happens synchronously, so the study is populated by the time this returns.",
  tag: "Studies",
  scopes: ["studies:write"],
  resource: { kind: "study", argKey: "study_id", role: "manager" },
  cost: "heavy",
  idempotent: true,
  inputs: {
    path: z.object(studyId),
    body: z.object({
      title: z
        .string()
        .min(1)
        .max(255)
        .optional()
        .describe('Defaults to the original title with " (Copy)" appended.'),
    }),
  },
  response: z.object({
    object: z.literal("study"),
    id: z.string(),
    title: z.string(),
    status: z.string(),
    study_type: z.string(),
    project_id: z.string().nullable(),
    copied: z
      .object({
        cards: z.number().int(),
        categories: z.number().int(),
        tree_nodes: z.number().int(),
        tasks: z.number().int(),
        flow_questions: z.number().int(),
        branding_assets: z.number().int(),
      })
      .describe("How many rows of each kind were copied."),
  }),
  handler: async ({ path, body }, ctx) => {
    const shell = await createStudyDuplicateShell(
      ctx.supabase,
      path.study_id as string,
      body.title as string | undefined,
    );

    const copied = await duplicateStudyContent(ctx.supabase, {
      originalStudyId: path.study_id as string,
      newStudyId: shell.id,
    });

    return {
      object: "study",
      id: shell.id,
      title: shell.title,
      status: "draft",
      study_type: shell.study_type,
      project_id: shell.project_id ?? null,
      copied,
    };
  },
};

export const getStudySettings: RouteDefinition = {
  method: "GET",
  path: "/studies/{study_id}/settings",
  operationId: "getStudySettings",
  summary: "Retrieve study settings",
  description:
    "The study's behavioural settings, plus the list of keys that are valid for its type. Read this before " +
    "patching, since settings are merged rather than replaced.",
  tag: "Studies",
  scopes: ["studies:read"],
  resource: { kind: "study", argKey: "study_id", role: "viewer" },
  cost: "read",
  inputs: { path: z.object(studyId) },
  response: z.object({
    object: z.literal("study_settings"),
    study_id: z.string(),
    study_type: z.string(),
    settings: z.record(z.string(), z.unknown()),
    valid_keys: z
      .array(z.string())
      .describe("Setting keys this study type accepts. Anything else is rejected."),
  }),
  handler: async ({ path }, ctx) => {
    const id = path.study_id as string;
    const { data, error } = await getStudy(ctx.supabase as never, id, ctx.userId);
    rethrow(error);
    const studyType = (data as { study_type: string }).study_type;
    return {
      object: "study_settings",
      study_id: id,
      study_type: studyType,
      settings: (data as { settings?: unknown }).settings ?? {},
      valid_keys: settingsKeysFor(studyType),
    };
  },
};

export const updateStudySettings: RouteDefinition = {
  method: "PATCH",
  path: "/studies/{study_id}/settings",
  operationId: "updateStudySettings",
  summary: "Update study settings",
  description:
    "Deep-merge behavioural settings. Keys are validated against the study's own type, so a card sort " +
    "rejects tree-test settings rather than silently storing something that will never be read. Omitted " +
    "keys keep their current values.",
  tag: "Studies",
  scopes: ["studies:write"],
  resource: { kind: "study", argKey: "study_id", role: "editor" },
  cost: "write",
  inputs: {
    path: z.object(studyId),
    body: z.object({
      settings: z
        .record(z.string(), z.unknown())
        .describe("Partial settings object. Valid keys depend on the study type."),
    }),
  },
  response: z.object({
    object: z.literal("study_settings"),
    study_id: z.string(),
    study_type: z.string(),
    settings: z.record(z.string(), z.unknown()),
    updated_keys: z.array(z.string()),
  }),
  examples: [
    {
      summary: "Turn a card sort into a closed sort",
      path: { study_id: "3f1b…" },
      body: { settings: { mode: "closed", randomizeCards: true } },
    },
  ],
  handler: async ({ path, body }, ctx) => {
    const id = path.study_id as string;
    const studyType = await resolveStudyType(ctx.supabase, id);
    const patch = body.settings as Record<string, unknown>;

    const validated = validateSettingsFor(studyType, patch);
    if (!validated.ok) {
      throw badRequest(
        `Invalid settings for a ${studyType} study.`,
        validated.errors.slice(0, 20).map((message) => ({
          path: "body.settings",
          message,
        })),
      );
    }

    const result = await executeBuilderWriteTool(
      "update_study_settings",
      { settings: validated.value },
      { supabase: ctx.supabase, studyId: id, userId: ctx.userId },
    );

    return {
      object: "study_settings",
      study_id: id,
      study_type: studyType,
      settings:
        ((result as { dataPayload?: { settings?: unknown } }).dataPayload
          ?.settings as Record<string, unknown>) ?? validated.value,
      updated_keys: Object.keys(validated.value as object),
    };
  },
};

export const getStudyValidation: RouteDefinition = {
  method: "GET",
  path: "/studies/{study_id}/validation",
  operationId: "validateStudy",
  summary: "Check whether a study is ready to launch",
  description:
    "Run the same readiness checks the launch endpoint runs, without launching. Set " +
    "`include_methodology=true` to also get UX research guidance for this study type — useful when the " +
    "content was generated rather than designed by a researcher.",
  tag: "Studies",
  scopes: ["studies:read"],
  resource: { kind: "study", argKey: "study_id", role: "viewer" },
  cost: "read",
  inputs: {
    path: z.object(studyId),
    query: z.object({
      include_methodology: queryBool({
        default: false,
        description: "Append best-practice guidance for this study type.",
      }),
    }),
  },
  response: z.object({
    object: z.literal("study_validation"),
    study_id: z.string(),
    ready: z.boolean().nullable(),
    validation: z.record(z.string(), z.unknown()),
    launch_readiness: z.record(z.string(), z.unknown()),
    methodology_guidance: z.unknown().nullable(),
  }),
  handler: async ({ path, query }, ctx) => {
    const id = path.study_id as string;
    const base = { supabase: ctx.supabase, studyId: id, userId: ctx.userId };

    const [setup, readiness] = await Promise.all([
      executeBuilderTool("validate_study_setup", {}, base),
      executeBuilderTool("check_launch_readiness", {}, base),
    ]);

    const unwrap = (raw: unknown) =>
      ((raw as { result?: unknown }).result ?? raw) as Record<string, unknown>;
    const launchReadiness = unwrap(readiness);

    return {
      object: "study_validation",
      study_id: id,
      ready: (launchReadiness.ready as boolean | undefined) ?? null,
      validation: unwrap(setup),
      launch_readiness: launchReadiness,
      methodology_guidance: query.include_methodology
        ? getMethodologyGuidance(await resolveStudyType(ctx.supabase, id))
        : null,
    };
  },
};

export const STUDY_ROUTES: RouteDefinition[] = [
  listStudies,
  createStudyRoute,
  getStudyRoute,
  updateStudyRoute,
  deleteStudyRoute,
  launchStudy,
  setStudyStatus,
  archiveStudyRoute,
  restoreStudyRoute,
  duplicateStudy,
  getStudySettings,
  updateStudySettings,
  getStudyValidation,
];
