/**
 * Getting things out of Veritio: share links, exports, insight reports.
 *
 * The long-running ones (export, insights) already run as background jobs on
 * the backend, so these tools return a handle rather than blocking — which is
 * also what keeps them inside a client's request timeout.
 */

import { z } from "zod4";
import { executeStudyTool } from "../../services/assistant/study-tools";
import {
  createShareLink,
  listStudyShareLinks,
  revokeShareLink,
} from "../../services/share-link-service";
import type { ToolDefinition } from "../authz/define-tool";
import { uuid } from "../schemas/common";
import { invalidInput, noAccess, ToolError } from "../authz/errors";
import { rethrow, resolveStudyType, participationUrl } from "./_shared";

export const shareManage: ToolDefinition = {
  name: "share_manage",
  title: "Manage sharing",
  description:
    "Get a study`s participation URL, and list, create or revoke share links. The participation URL is the " +
    "public link participants use; share links are separate, revocable links you can hand to specific people.",
  feature: "delivery",
  inputSchema: z.object({
    study_id: uuid("study"),
    action: z.enum(["get", "create_link", "revoke_link"]).default("get"),
    link_id: z.string().optional().describe("Required for revoke_link."),
    label: z
      .string()
      .max(120)
      .optional()
      .describe("Optional label when creating a link."),
  }),
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  },
  scopes: ["studies:write"],
  resource: { kind: "study", argKey: "study_id", role: "editor" },
  handler: async (args, ctx) => {
    const a = args as {
      study_id: string;
      action: string;
      link_id?: string;
      label?: string;
    };

    if (a.action === "revoke_link") {
      if (!a.link_id)
        throw invalidInput("link_id is required to revoke a link.");
      const { error } = await revokeShareLink(
        ctx.supabase as never,
        a.link_id,
        ctx.userId,
      );
      rethrow(error, "share link");
      return { revoked: a.link_id };
    }

    if (a.action === "create_link") {
      const { data, error } = await createShareLink(
        ctx.supabase as never,
        a.study_id,
        ctx.userId,
        {
          ...(a.label ? { label: a.label } : {}),
        } as never,
      );
      rethrow(error);
      return { link: data };
    }

    const { data: study, error: studyError } = await ctx.supabase
      .from("studies")
      .select("share_code, url_slug, status")
      .eq("id", a.study_id)
      .single();
    if (studyError || !study) throw noAccess("study");

    const s = study as {
      share_code: string | null;
      url_slug: string | null;
      status: string;
    };
    const { data: links } = await listStudyShareLinks(
      ctx.supabase as never,
      a.study_id,
      ctx.userId,
    );

    return {
      study_id: a.study_id,
      status: s.status,
      participation_url: participationUrl(s.url_slug ?? s.share_code),
      // A draft study has a URL but will not accept participants until launched.
      live: s.status === "active",
      share_links: links ?? [],
    };
  },
};

export const exportCreate: ToolDefinition = {
  name: "export_create",
  title: "Export study data",
  description:
    "Export a study`s data. Returns the data directly for small studies; for anything over 100 participants " +
    "it queues a background job and returns a job id instead. Use results_get if you want analysis rather " +
    "than raw rows.",
  feature: "delivery",
  inputSchema: z.object({
    study_id: uuid("study"),
    format: z.enum(["raw", "summary", "both"]).default("both"),
  }),
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  scopes: ["export:write"],
  resource: { kind: "study", argKey: "study_id", role: "viewer" },
  // Viewer is correct: exporting surfaces data the caller can already read.
  mutates: "derived",
  handler: async (args, ctx) => {
    const a = args as { study_id: string; format: string };
    const studyType = await resolveStudyType(ctx.supabase, a.study_id);
    const base = {
      supabase: ctx.supabase as never,
      studyId: a.study_id,
      studyType,
      userId: ctx.userId,
    };

    const direct = await executeStudyTool("export_study_data", {}, base);
    const payload = (direct as { result?: unknown }).result ?? direct;

    // The handler refuses above 100 participants and says so; fall through to
    // the async job in that case rather than making the agent figure it out.
    if (payload && typeof payload === "object" && "error" in payload) {
      const job = await executeStudyTool(
        "create_export_job",
        { integration: "csv_download", format: a.format },
        base,
      );
      return {
        mode: "async",
        job: (job as { result?: unknown }).result ?? job,
        message:
          "Study is too large for a direct export; a background job was queued instead.",
      };
    }

    return { mode: "direct", data: payload };
  },
};

export const insightsGenerate: ToolDefinition = {
  name: "insights_generate",
  title: "Generate an insights report",
  description:
    "Kick off Veritio`s AI insights report (PDF) for a study. This runs in the background and can take a " +
    "few minutes. Requires a plan that includes AI features.",
  feature: "delivery",
  // This is a costly, long-running workflow rather than a routine primitive.
  // Keep it searchable without spending every client's baseline tool budget.
  deferred: true,
  inputSchema: z.object({
    study_id: uuid("study"),
    regenerate: z
      .boolean()
      .default(false)
      .describe("Force a fresh report instead of returning a cached one."),
  }),
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  scopes: ["export:write"],
  resource: { kind: "study", argKey: "study_id", role: "editor" },
  mutates: "derived",
  entitlement: "ai",
  handler: async (args, ctx) => {
    const a = args as { study_id: string; regenerate: boolean };
    const studyType = await resolveStudyType(ctx.supabase, a.study_id);
    const result = await executeStudyTool(
      "generate_insights_report",
      { regenerate: a.regenerate },
      {
        supabase: ctx.supabase as never,
        studyId: a.study_id,
        studyType,
        userId: ctx.userId,
      },
    );
    return (result as { result?: unknown }).result ?? result;
  },
};

/**
 * Polling an export.
 *
 * `export_create` returns a job id for anything over 100 participants, and
 * without this tool that id was a dead end: the agent had no way to learn the
 * job finished, let alone where the file went.
 */
export const exportStatus: ToolDefinition = {
  name: "export_status",
  title: "Check an export job",
  description:
    "Check a background export started by export_create. Returns its status and, once complete, a " +
    "time-limited download URL. Exports usually finish inside a minute; poll rather than assuming failure.",
  feature: "delivery",
  deferred: true,
  inputSchema: z.object({
    job_id: uuid("export job"),
  }),
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
  scopes: ["export:write"],
  // An export job belongs to the user who created it rather than to a study,
  // so there is no role to check. The query below is scoped to ctx.userId,
  // which is the entire authorization.
  resource: { kind: "none" },
  handler: async (args, ctx) => {
    const a = args as { job_id: string };
    const { data, error } = await ctx.supabase
      .from("export_jobs")
      .select(
        "id, study_id, status, integration, format, progress, download_url, error_message, created_at, completed_at",
      )
      .eq("id", a.job_id)
      .eq("user_id", ctx.userId)
      .maybeSingle();

    if (error) throw new ToolError("upstream_error", error.message);
    if (!data) throw noAccess("export job");

    const row = data as Record<string, unknown>;
    return {
      job_id: row.id,
      study_id: row.study_id,
      status: row.status,
      integration: row.integration,
      format: row.format,
      progress: row.progress ?? null,
      download_url: row.download_url ?? null,
      error: row.error_message ?? null,
      created_at: row.created_at,
      completed_at: row.completed_at ?? null,
    };
  },
};

export const DELIVERY_TOOLS: ToolDefinition[] = [
  shareManage,
  exportCreate,
  exportStatus,
  insightsGenerate,
];
