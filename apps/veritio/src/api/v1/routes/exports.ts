/**
 * Exports and AI insight reports.
 *
 * Both are long-running, so both are modelled as jobs: you create one, get an
 * id back, and poll it. The one exception is a small export, which is returned
 * inline because making a caller poll for a 30-row CSV is worse than the
 * round trip it saves.
 *
 * Which of the two happened is stated in `mode` rather than left for the caller
 * to infer from which fields are populated.
 */

import { z } from "zod4";
import { executeStudyTool } from "@/services/assistant/study-tools";
import { ApiError } from "../../http/errors";
import type { RouteDefinition } from "../define-route";
import { listOf, page, paginationQuery, queryBool, uuidParam } from "../schemas";
import { resolveStudyType, window } from "./_shared";

const studyId = { study_id: uuidParam("study") };

const exportJobSchema = z
  .object({
    object: z.literal("export_job"),
    id: z.string(),
    study_id: z.string(),
    status: z.enum(["pending", "processing", "completed", "failed", "cancelled"]),
    integration: z.string(),
    format: z.string().nullable(),
    progress: z.record(z.string(), z.unknown()).nullable(),
    download_url: z
      .string()
      .nullable()
      .describe("Present once status is `completed`. Time-limited."),
    error: z.string().nullable(),
    created_at: z.string().nullable(),
    completed_at: z.string().nullable(),
  })
  .describe("A background export.");

function serializeJob(row: Record<string, unknown>): Record<string, unknown> {
  const result = (row.result ?? {}) as Record<string, unknown>;
  return {
    object: "export_job",
    id: row.id,
    study_id: row.study_id,
    status: row.status,
    integration: row.integration,
    format: (row.format as string | null) ?? null,
    progress: (row.progress as Record<string, unknown> | null) ?? null,
    download_url:
      (row.download_url as string | null) ??
      (result.downloadUrl as string | null) ??
      (result.url as string | null) ??
      null,
    error: (row.error_message as string | null) ?? (row.error as string | null) ?? null,
    created_at: (row.created_at as string | null) ?? null,
    completed_at: (row.completed_at as string | null) ?? null,
  };
}

/**
 * The narrow slice of the Supabase client these handlers use.
 *
 * `export_jobs` and `ai_insights_reports` are not in the generated `Database`
 * type (they predate it), so the generated client rejects them. Typing the
 * builder loosely here is contained to this module; the alternative is `any`
 * spreading through every call site.
 */
type LooseQuery = {
  select: (columns: string, options?: Record<string, unknown>) => LooseQuery;
  eq: (column: string, value: unknown) => LooseQuery;
  order: (column: string, options?: Record<string, unknown>) => LooseQuery;
  range: (from: number, to: number) => LooseQuery;
  update: (values: Record<string, unknown>) => LooseQuery;
  limit: (count: number) => LooseQuery;
  maybeSingle: () => Promise<{ data: unknown; error: { message: string } | null }>;
  then: PromiseLike<{
    data: unknown;
    error: { message: string } | null;
    count?: number | null;
  }>["then"];
};

type LooseTables = { from: (table: string) => LooseQuery };

/** Reach the tables the generated Database type does not describe. */
function tables(supabase: unknown): LooseTables {
  return supabase as LooseTables;
}

async function runStudyTool(
  name: Parameters<typeof executeStudyTool>[0],
  args: Record<string, unknown>,
  ctx: { supabase: never; studyId: string; studyType: string; userId: string },
) {
  const raw = await executeStudyTool(name, args, ctx);
  return ((raw as { result?: unknown }).result ?? raw) as Record<string, unknown>;
}

export const createExport: RouteDefinition = {
  method: "POST",
  path: "/studies/{study_id}/exports",
  operationId: "createExport",
  summary: "Export a study's data",
  description:
    "Export raw responses. Small studies come back inline with `mode: \"inline\"` and the data attached. " +
    "Anything over 100 completed participants is queued instead and returns `mode: \"job\"` with an id to " +
    "poll at `GET /exports/{export_id}`. Use the results endpoint if you want analysis rather than rows.",
  tag: "Exports",
  scopes: ["export:write"],
  // Viewer is correct: an export surfaces data the caller can already read, so
  // it grants no access they did not have. The write is a job record, not a
  // change to the study.
  resource: { kind: "study", argKey: "study_id", role: "viewer" },
  mutates: "derived",
  cost: "heavy",
  idempotent: true,
  inputs: {
    path: z.object(studyId),
    body: z.object({
      format: z
        .enum(["raw", "summary", "both"])
        .default("both")
        .describe("Which sheets to include when the export is queued."),
      integration: z
        .enum(["csv_download", "googlesheets"])
        .default("csv_download")
        .describe(
          "Where a queued export is delivered. `googlesheets` requires that integration to be connected.",
        ),
      force_job: z
        .boolean()
        .default(false)
        .describe("Always queue, even for a small study."),
    }),
  },
  response: z.object({
    object: z.literal("export"),
    study_id: z.string(),
    mode: z.enum(["inline", "job"]),
    data: z
      .unknown()
      .nullable()
      .describe("The exported sheets, when mode is `inline`."),
    job: exportJobSchema.partial().nullable().describe("When mode is `job`."),
  }),
  examples: [
    { summary: "Export a small study", path: { study_id: "3f1b…" }, body: {} },
  ],
  handler: async ({ path, body }, ctx) => {
    const id = path.study_id as string;
    const studyType = await resolveStudyType(ctx.supabase, id);
    const base = {
      supabase: ctx.supabase as never,
      studyId: id,
      studyType,
      userId: ctx.userId,
    };

    if (!body.force_job) {
      const direct = await runStudyTool("export_study_data", {}, base);
      // The inline path refuses above 100 participants and says so. Fall
      // through to a job rather than making the caller parse that refusal.
      if (typeof direct.error !== "string") {
        return {
          object: "export",
          study_id: id,
          mode: "inline",
          data: direct,
          job: null,
        };
      }
    }

    const job = await runStudyTool(
      "create_export_job",
      { integration: body.integration, format: body.format },
      base,
    );
    if (typeof job.error === "string") {
      throw new ApiError(
        "conflict",
        (job.message as string) ?? (job.error as string),
      );
    }

    return {
      object: "export",
      study_id: id,
      mode: "job",
      data: null,
      job: {
        object: "export_job",
        id: job.jobId,
        study_id: id,
        status: job.status ?? "pending",
        integration: body.integration,
        format: body.format,
      },
    };
  },
};

export const listExports: RouteDefinition = {
  method: "GET",
  path: "/exports",
  operationId: "listExports",
  summary: "List export jobs",
  description:
    "Export jobs this credential's user has created, newest first. Filter by study to poll one study's " +
    "exports.",
  tag: "Exports",
  scopes: ["export:write"],
  resource: { kind: "none" },
  cost: "read",
  inputs: {
    query: z.object({
      study_id: uuidParam("study").optional(),
      ...paginationQuery,
    }),
  },
  response: listOf(exportJobSchema, "export jobs"),
  handler: async ({ query }, ctx) => {
    const { offset, limit } = window(query);

    let request = tables(ctx.supabase)
      .from("export_jobs")
      .select("*", { count: "exact" })
      // Scoped to the caller's own jobs: an export carries a download URL, so
      // listing a colleague's would hand out their data.
      .eq("user_id", ctx.userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (query.study_id) request = request.eq("study_id", query.study_id);

    const { data, error, count } = await request;
    if (error) throw new ApiError("upstream_error", error.message);

    return page(
      ((data ?? []) as Array<Record<string, unknown>>).map(serializeJob),
      { offset, limit, total: count ?? null },
    );
  },
};

export const getExport: RouteDefinition = {
  method: "GET",
  path: "/exports/{export_id}",
  operationId: "getExport",
  summary: "Retrieve an export job",
  description:
    "Poll a queued export. Once `status` is `completed`, `download_url` holds a time-limited link to the " +
    "file. A one-second poll interval is plenty; most exports finish inside a minute.",
  tag: "Exports",
  scopes: ["export:write"],
  resource: { kind: "none" },
  cost: "read",
  inputs: { path: z.object({ export_id: uuidParam("export job") }) },
  response: exportJobSchema,
  handler: async ({ path }, ctx) => {
    const { data, error } = await tables(ctx.supabase)
      .from("export_jobs")
      .select("*")
      .eq("id", path.export_id)
      .eq("user_id", ctx.userId)
      .maybeSingle();

    if (error) throw new ApiError("upstream_error", error.message);
    if (!data) {
      throw new ApiError(
        "not_found",
        "No export job was found for that id, or it does not belong to you.",
      );
    }
    return serializeJob(data as Record<string, unknown>);
  },
};

export const cancelExport: RouteDefinition = {
  method: "DELETE",
  path: "/exports/{export_id}",
  operationId: "cancelExport",
  summary: "Cancel an export job",
  description:
    "Stop a queued or running export. Completed jobs cannot be cancelled — delete the file at its source " +
    "instead.",
  tag: "Exports",
  scopes: ["export:write"],
  // An export job belongs to the user who created it, not to a shared
  // resource, so there is no role to check. Every query below is scoped by
  // `ctx.userId` — that is the authorization.
  resource: { kind: "none" },
  mutates: "owned",
  cost: "write",
  inputs: { path: z.object({ export_id: uuidParam("export job") }) },
  response: z.object({
    object: z.literal("export_job"),
    id: z.string(),
    status: z.literal("cancelled"),
  }),
  handler: async ({ path }, ctx) => {
    const db = tables(ctx.supabase);
    const { data: job, error } = await db
      .from("export_jobs")
      .select("id, status, user_id")
      .eq("id", path.export_id)
      .eq("user_id", ctx.userId)
      .maybeSingle();

    if (error) throw new ApiError("upstream_error", error.message);
    if (!job) {
      throw new ApiError(
        "not_found",
        "No export job was found for that id, or it does not belong to you.",
      );
    }

    const status = (job as { status: string }).status;
    if (status !== "pending" && status !== "processing") {
      throw new ApiError(
        "conflict",
        `An export with status "${status}" cannot be cancelled.`,
      );
    }

    const { error: updateError } = await db
      .from("export_jobs")
      .update({ status: "cancelled", completed_at: new Date().toISOString() })
      .eq("id", path.export_id);
    if (updateError) throw new ApiError("upstream_error", updateError.message);

    return { object: "export_job", id: path.export_id, status: "cancelled" };
  },
};

// --- AI insight reports ----------------------------------------------------

const insightsReportSchema = z
  .object({
    object: z.literal("insights_report"),
    id: z.string().nullable(),
    study_id: z.string(),
    status: z.string(),
    sections: z.unknown().nullable(),
    download_url: z.string().nullable(),
    created_at: z.string().nullable(),
  })
  .describe("An AI-generated insights report.");

export const generateInsights: RouteDefinition = {
  method: "POST",
  path: "/studies/{study_id}/insights",
  operationId: "generateInsights",
  summary: "Generate an insights report",
  description:
    "Kick off Veritio's AI insights report for a study. It runs in the background and can take a few " +
    "minutes; poll `GET /studies/{study_id}/insights` for the result. Requires a plan that includes AI " +
    "features. By default an existing report is returned rather than regenerated.",
  tag: "Exports",
  scopes: ["export:write"],
  resource: { kind: "study", argKey: "study_id", role: "editor" },
  mutates: "derived",
  entitlement: "ai",
  cost: "heavy",
  status: 202,
  inputs: {
    path: z.object(studyId),
    body: z.object({
      regenerate: z
        .boolean()
        .default(false)
        .describe("Force a fresh report instead of returning a cached one."),
    }),
  },
  response: z.object({
    object: z.literal("insights_report"),
    study_id: z.string(),
    status: z.string(),
    report_id: z.string().nullable(),
    message: z.string().nullable(),
  }),
  handler: async ({ path, body }, ctx) => {
    const id = path.study_id as string;
    const studyType = await resolveStudyType(ctx.supabase, id);
    const result = await runStudyTool(
      "generate_insights_report",
      { regenerate: body.regenerate },
      {
        supabase: ctx.supabase as never,
        studyId: id,
        studyType,
        userId: ctx.userId,
      },
    );

    if (typeof result.error === "string") {
      throw new ApiError(
        "conflict",
        (result.message as string) ?? (result.error as string),
      );
    }

    return {
      object: "insights_report",
      study_id: id,
      status: (result.status as string) ?? "processing",
      report_id: (result.reportId as string | null) ?? (result.id as string | null) ?? null,
      message: (result.message as string | null) ?? null,
    };
  },
};

export const getInsights: RouteDefinition = {
  method: "GET",
  path: "/studies/{study_id}/insights",
  operationId: "getInsights",
  summary: "Retrieve the latest insights report",
  description:
    "The most recent AI insights report for the study, including its generation status. Returns `404` when " +
    "none has ever been generated.",
  tag: "Exports",
  scopes: ["results:read"],
  resource: { kind: "study", argKey: "study_id", role: "viewer" },
  cost: "read",
  inputs: {
    path: z.object(studyId),
    query: z.object({
      include_sections: queryBool({
        default: false,
        description:
          "Include the full generated sections. Large — omit when you only need status.",
      }),
    }),
  },
  response: insightsReportSchema,
  handler: async ({ path, query }, ctx) => {
    const { data, error } = await tables(ctx.supabase)
      .from("ai_insights_reports")
      .select("*")
      .eq("study_id", path.study_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new ApiError("upstream_error", error.message);
    if (!data) {
      throw new ApiError(
        "not_found",
        "No insights report has been generated for this study yet. Create one with POST /studies/{study_id}/insights.",
      );
    }

    const row = data as Record<string, unknown>;
    return {
      object: "insights_report",
      id: (row.id as string | null) ?? null,
      study_id: path.study_id,
      status: (row.status as string) ?? "unknown",
      sections: query.include_sections ? (row.sections ?? null) : null,
      download_url: (row.pdf_url as string | null) ?? null,
      created_at: (row.created_at as string | null) ?? null,
    };
  },
};

export const EXPORT_ROUTES: RouteDefinition[] = [
  createExport,
  listExports,
  getExport,
  cancelExport,
  generateInsights,
  getInsights,
];
