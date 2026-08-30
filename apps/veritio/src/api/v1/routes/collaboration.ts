/**
 * Team-facing surfaces: comments, study tags, session recordings.
 *
 * Comments here are internal discussion between colleagues. They are never
 * shown to participants, and they are not the same thing as participant
 * responses — a distinction worth stating plainly, because "comments" is the
 * obvious name for both and picking the wrong one leaks internal notes into an
 * analysis or buries participant quotes in a team thread.
 */

import { z } from "zod4";
import {
  createStudyComment,
  listStudyComments,
} from "@/services/comments-service";
import {
  getTagsForStudy,
  listStudyTags,
  setStudyTags,
} from "@/services/study-tags-service";
import { listClipsByRecording } from "@/services/recording/recording-clip-service";
import { markUntrusted } from "@/mcp/schemas/common";
import { ApiError } from "../../http/errors";
import type { RouteDefinition } from "../define-route";
import { listOf, page, paginationQuery, uuidParam } from "../schemas";
import {
  noAccess,
  paginate,
  resolveOrganizationId,
  rethrow,
  window,
} from "./_shared";

const studyId = { study_id: uuidParam("study") };

const commentSchema = z
  .object({
    object: z.literal("comment"),
    id: z.string(),
    study_id: z.string(),
    content: z.string(),
    author_id: z.string().nullable(),
    parent_comment_id: z.string().nullable(),
    resolved: z.boolean().nullable(),
    created_at: z.string().nullable(),
  })
  .describe("An internal comment on a study. Never visible to participants.");

function serializeComment(row: Record<string, unknown>): Record<string, unknown> {
  return {
    object: "comment",
    id: row.id,
    study_id: row.study_id,
    content: row.content,
    author_id: (row.user_id as string | null) ?? (row.author_id as string | null) ?? null,
    parent_comment_id: (row.parent_comment_id as string | null) ?? null,
    resolved: (row.resolved as boolean | null) ?? null,
    created_at: (row.created_at as string | null) ?? null,
  };
}

export const listComments: RouteDefinition = {
  method: "GET",
  path: "/studies/{study_id}/comments",
  operationId: "listStudyComments",
  summary: "List study comments",
  description:
    "The internal discussion thread on a study — comments from your team. For what participants wrote, use " +
    "the responses endpoint instead.",
  tag: "Collaboration",
  scopes: ["studies:read"],
  resource: { kind: "study", argKey: "study_id", role: "viewer" },
  cost: "read",
  inputs: {
    path: z.object(studyId),
    query: z.object(paginationQuery),
  },
  response: listOf(commentSchema, "comments"),
  handler: async ({ path, query }, ctx) => {
    const { offset, limit } = window(query);
    const { data, error } = await listStudyComments(
      ctx.supabase as never,
      path.study_id as string,
      ctx.userId,
      // Read one page's worth from the offset; the service caps at `limit`.
      { limit: offset + limit },
    );
    rethrow(error);
    const rows = ((data ?? []) as unknown as Array<Record<string, unknown>>).map(
      serializeComment,
    );
    return page(rows.slice(offset, offset + limit), {
      offset,
      limit,
      total: null,
    });
  },
};

export const addComment: RouteDefinition = {
  method: "POST",
  path: "/studies/{study_id}/comments",
  operationId: "createStudyComment",
  summary: "Add a study comment",
  description:
    "Post an internal comment, optionally as a reply to another. Useful for leaving a written summary of an " +
    "analysis alongside the study it came from, where the next person will actually find it.",
  tag: "Collaboration",
  scopes: ["studies:write"],
  resource: { kind: "study", argKey: "study_id", role: "editor" },
  cost: "write",
  idempotent: true,
  inputs: {
    path: z.object(studyId),
    body: z.object({
      content: z.string().min(1).max(10000),
      parent_comment_id: uuidParam("parent comment")
        .optional()
        .describe("Reply to this comment instead of starting a new thread."),
    }),
  },
  response: commentSchema,
  handler: async ({ path, body }, ctx) => {
    const { data, error } = await createStudyComment(
      ctx.supabase as never,
      path.study_id as string,
      ctx.userId,
      {
        content: body.content as string,
        parentCommentId: (body.parent_comment_id as string | null) ?? null,
      },
    );
    rethrow(error);
    return serializeComment(data as never as Record<string, unknown>);
  },
};

// --- Study tags ------------------------------------------------------------

const studyTagSchema = z
  .object({
    object: z.literal("study_tag"),
    id: z.string(),
    name: z.string(),
    color: z.string().nullable(),
    study_count: z.number().int().nullable(),
  })
  .describe("A tag for organising studies across the workspace.");

function serializeTag(row: Record<string, unknown>): Record<string, unknown> {
  return {
    object: "study_tag",
    id: row.id,
    name: row.name,
    color: (row.color as string | null) ?? null,
    study_count:
      (row.study_count as number | undefined) ??
      (row.usage_count as number | undefined) ??
      null,
  };
}

export const listWorkspaceStudyTags: RouteDefinition = {
  method: "GET",
  path: "/study-tags",
  operationId: "listStudyTags",
  summary: "List study tags",
  description:
    "Tags available across the workspace for organising studies, with usage counts. These are the ids to " +
    "send when setting a study's tags.",
  tag: "Collaboration",
  scopes: ["studies:read"],
  resource: { kind: "none" },
  cost: "read",
  inputs: {
    query: z.object({
      organization_id: uuidParam("organization").optional(),
    }),
  },
  response: listOf(studyTagSchema, "study tags"),
  handler: async ({ query }, ctx) => {
    const orgId = await resolveOrganizationId(
      ctx.supabase,
      ctx.userId,
      query.organization_id as string | undefined,
    );
    const { data, error } = await listStudyTags(
      ctx.supabase as never,
      orgId,
      ctx.userId,
    );
    rethrow(error, "organization");
    return paginate(
      ((data ?? []) as unknown as Array<Record<string, unknown>>).map(serializeTag),
      {},
    );
  },
};

export const getStudyTagsRoute: RouteDefinition = {
  method: "GET",
  path: "/studies/{study_id}/tags",
  operationId: "getStudyTags",
  summary: "List a study's tags",
  description:
    "Tags currently applied to one study. Use `PUT` on the same path to change them, sending the complete " +
    "set rather than a delta.",
  tag: "Collaboration",
  scopes: ["studies:read"],
  resource: { kind: "study", argKey: "study_id", role: "viewer" },
  cost: "read",
  inputs: { path: z.object(studyId) },
  response: listOf(studyTagSchema, "study tags"),
  handler: async ({ path }, ctx) => {
    const { data, error } = await getTagsForStudy(
      ctx.supabase as never,
      path.study_id as string,
      ctx.userId,
    );
    rethrow(error);
    return paginate(
      ((data ?? []) as unknown as Array<Record<string, unknown>>).map(serializeTag),
      {},
    );
  },
};

export const setStudyTagsRoute: RouteDefinition = {
  method: "PUT",
  path: "/studies/{study_id}/tags",
  operationId: "setStudyTags",
  summary: "Set a study's tags",
  description:
    "Replace the complete set of tags on a study. Tag ids must already exist — create them in the dashboard " +
    "or look them up with `GET /study-tags`. An empty array clears every tag.",
  tag: "Collaboration",
  scopes: ["studies:write"],
  resource: { kind: "study", argKey: "study_id", role: "editor" },
  cost: "write",
  status: 200,
  inputs: {
    path: z.object(studyId),
    body: z.object({
      tag_ids: z.array(uuidParam("tag")).max(50).describe("The complete set."),
    }),
  },
  response: listOf(studyTagSchema, "study tags"),
  handler: async ({ path, body }, ctx) => {
    // Argument order differs from its siblings in this service: studyId,
    // tagIds, userId rather than studyId, userId, input.
    const { data, error } = await setStudyTags(
      ctx.supabase as never,
      path.study_id as string,
      body.tag_ids as string[],
      ctx.userId,
    );
    rethrow(error);
    return paginate(
      ((data ?? []) as unknown as Array<Record<string, unknown>>).map(serializeTag),
      {},
    );
  },
};

// --- Session recordings ----------------------------------------------------

const recordingSchema = z
  .object({
    object: z.literal("recording"),
    id: z.string(),
    study_id: z.string(),
    participant_id: z.string().nullable(),
    status: z.string(),
    duration_ms: z.number().int().nullable(),
    has_transcript: z.boolean().nullable(),
    created_at: z.string().nullable(),
  })
  .describe("Metadata for a session recording. The video itself is not served here.");

export const listRecordings: RouteDefinition = {
  method: "GET",
  path: "/studies/{study_id}/recordings",
  operationId: "listRecordings",
  summary: "List session recordings",
  description:
    "Recordings captured for a study, with duration and whether a transcript exists. Video and audio are " +
    "never returned by this API — play them in the dashboard, where access is audited per view. Requires a " +
    "plan that includes recordings.",
  tag: "Collaboration",
  scopes: ["results:read"],
  resource: { kind: "study", argKey: "study_id", role: "viewer" },
  entitlement: "recordings",
  cost: "read",
  inputs: {
    path: z.object(studyId),
    query: z.object(paginationQuery),
  },
  response: listOf(recordingSchema, "recordings"),
  handler: async ({ path, query }, ctx) => {
    const { offset, limit } = window(query);
    const { data, error, count } = await ctx.supabase
      .from("session_recordings")
      .select(
        "id, study_id, participant_id, status, duration_ms, has_transcript, created_at",
        { count: "exact" },
      )
      .eq("study_id", path.study_id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw new ApiError("upstream_error", error.message);

    return page(
      ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
        object: "recording",
        id: row.id,
        study_id: row.study_id,
        participant_id: (row.participant_id as string | null) ?? null,
        status: row.status,
        duration_ms: (row.duration_ms as number | null) ?? null,
        has_transcript: (row.has_transcript as boolean | null) ?? null,
        created_at: (row.created_at as string | null) ?? null,
      })),
      { offset, limit, total: count ?? null },
    );
  },
};

export const listRecordingClips: RouteDefinition = {
  method: "GET",
  path: "/studies/{study_id}/recordings/{recording_id}/clips",
  operationId: "listRecordingClips",
  summary: "List clips on a recording",
  description:
    "Clips a researcher has marked on a recording, with timestamps and labels. Labels are written by your " +
    "team; any transcript text they quote is participant-authored and comes back wrapped as untrusted.",
  tag: "Collaboration",
  scopes: ["results:read"],
  resource: { kind: "study", argKey: "study_id", role: "viewer" },
  entitlement: "recordings",
  cost: "read",
  inputs: {
    path: z.object({ ...studyId, recording_id: uuidParam("recording") }),
  },
  response: listOf(z.record(z.string(), z.unknown()), "clips"),
  handler: async ({ path }, ctx) => {
    // The recording must belong to the study we authorized against. Without
    // this check, access to any one study would grant clips from every
    // recording in the system.
    const { data: owner } = await ctx.supabase
      .from("session_recordings")
      .select("study_id")
      .eq("id", path.recording_id)
      .single();

    if ((owner as { study_id?: string } | null)?.study_id !== path.study_id) {
      throw noAccess("recording");
    }

    const { data, error } = await listClipsByRecording(
      ctx.supabase as never,
      path.recording_id as string,
    );
    rethrow(error, "recording");

    return paginate(
      markUntrusted(
        (data ?? []) as unknown as Array<Record<string, unknown>>,
        ["transcript_excerpt"],
      ),
      {},
    );
  },
};

export const COLLABORATION_ROUTES: RouteDefinition[] = [
  listComments,
  addComment,
  listWorkspaceStudyTags,
  getStudyTagsRoute,
  setStudyTagsRoute,
  listRecordings,
  listRecordingClips,
];
