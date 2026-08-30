/**
 * Helpers shared by the route modules.
 *
 * Most of these are re-exports from the MCP tool layer rather than copies. The
 * two surfaces resolve organizations, translate service errors and build
 * participation URLs identically — duplicating that logic is how the REST API
 * and the MCP server would start disagreeing about which organization "the
 * default one" is.
 */

import { z } from "zod4";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  rethrow,
  resolveOrganizationId,
  resolveStudyType,
  participationUrl,
  mapEntitlement,
} from "@/mcp/tools/_shared";
import { noAccess } from "@/mcp/authz/errors";
import { decodeCursor, page, type Page } from "../schemas";
import { badRequest } from "../../http/errors";

export {
  rethrow,
  resolveOrganizationId,
  resolveStudyType,
  participationUrl,
  mapEntitlement,
  noAccess,
};

/**
 * Turn the `cursor` + `limit` query pair into an offset window.
 *
 * A corrupt cursor is a 400 rather than a silent restart from page one, which
 * would look to the caller like the collection had duplicated itself.
 */
export function window(query: { limit?: unknown; cursor?: unknown }): {
  offset: number;
  limit: number;
} {
  const limit = typeof query.limit === "number" ? query.limit : 25;
  try {
    return { offset: decodeCursor(query.cursor as string | undefined), limit };
  } catch {
    throw badRequest("The `cursor` parameter is not a cursor this API issued.", [
      { path: "query.cursor", message: "Malformed cursor." },
    ]);
  }
}

/**
 * Paginate a list the underlying service returned in full.
 *
 * Several services predate pagination and return every row. Slicing here keeps
 * the public contract consistent across all collections; the note in each
 * route's description says where the read is genuinely cheap.
 */
export function paginate<T>(
  rows: readonly T[],
  query: { limit?: unknown; cursor?: unknown },
): Page<T> {
  const { offset, limit } = window(query);
  return page(rows.slice(offset, offset + limit), {
    offset,
    limit,
    total: rows.length,
  });
}

/** Reject an empty PATCH rather than reporting a no-op as a successful update. */
export function requirePatch<T extends Record<string, unknown>>(body: T): T {
  if (Object.keys(body).length === 0) {
    throw badRequest(
      "No fields to update.",
      [{ path: "body", message: "Send at least one field." }],
    );
  }
  return body;
}

/** Load a study's type and share code in one read, for routes that need both. */
export async function studyRow(
  supabase: SupabaseClient,
  studyId: string,
): Promise<{
  study_type: string;
  share_code: string | null;
  url_slug: string | null;
  status: string;
}> {
  const { data, error } = await supabase
    .from("studies")
    .select("study_type, share_code, url_slug, status")
    .eq("id", studyId)
    .single();
  if (error || !data) throw noAccess("study");
  return data as never;
}

// --- Response fragments reused across modules ------------------------------

export const roleSchema = z
  .enum(["owner", "admin", "manager", "editor", "viewer"])
  .describe("The caller's role on this resource.");

export const studySchema = z
  .object({
    object: z.literal("study"),
    id: z.string(),
    project_id: z.string().nullable(),
    title: z.string(),
    description: z.string().nullable(),
    study_type: z.string(),
    status: z.string(),
    participant_count: z
      .number()
      .int()
      .nullable()
      .describe("Participants who have started, including incomplete sessions."),
    participation_url: z
      .string()
      .nullable()
      .describe("The public link participants open. Live only once status is active."),
    language: z.string().nullable(),
    url_slug: z.string().nullable(),
    your_role: roleSchema.nullable(),
    settings: z
      .record(z.string(), z.unknown())
      .nullable()
      .describe("Behavioural settings. Shape depends on study_type."),
    created_at: z.string(),
    updated_at: z.string().nullable(),
  })
  .describe("A study.");

/** Normalize a study row from any service into the published shape. */
export function serializeStudy(
  row: Record<string, unknown>,
  opts: { includeSettings?: boolean } = {},
): Record<string, unknown> {
  return {
    object: "study",
    id: row.id,
    project_id: row.project_id ?? null,
    title: row.title,
    description: row.description ?? null,
    study_type: row.study_type,
    status: row.status,
    participant_count:
      (row.participant_count as number | undefined) ??
      (row.response_count as number | undefined) ??
      null,
    participation_url: participationUrl(
      (row.url_slug as string | null) ?? (row.share_code as string | null),
    ),
    language: row.language ?? null,
    url_slug: row.url_slug ?? null,
    your_role: (row.user_role as string | undefined) ?? null,
    settings: opts.includeSettings ? ((row.settings as object) ?? null) : null,
    created_at: row.created_at,
    updated_at: row.updated_at ?? null,
  };
}

export const projectSchema = z
  .object({
    object: z.literal("project"),
    id: z.string(),
    organization_id: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    visibility: z.string().nullable(),
    archived: z.boolean().nullable(),
    your_role: roleSchema.nullable(),
    created_at: z.string(),
    updated_at: z.string().nullable(),
  })
  .describe("A project. Studies live inside projects.");

export function serializeProject(
  row: Record<string, unknown>,
): Record<string, unknown> {
  return {
    object: "project",
    id: row.id,
    organization_id: row.organization_id,
    name: row.name,
    description: row.description ?? null,
    visibility: row.visibility ?? null,
    archived: (row.archived_at ?? null) !== null,
    your_role: (row.user_role as string | undefined) ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at ?? null,
  };
}
