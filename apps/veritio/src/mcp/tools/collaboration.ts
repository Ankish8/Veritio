/**
 * Collaboration surfaces: comments, study tags, recordings.
 *
 * All deferred — reached through `tools_search` / `tool_execute` rather than
 * advertised. These are the things a researcher occasionally wants an agent to
 * touch, not the ones it reaches for on every task.
 */

import { z } from 'zod4'
import { listStudyComments, createStudyComment } from '../../services/comments-service'
import { listStudyTags, getTagsForStudy, setStudyTags } from '../../services/study-tags-service'
import { listClipsByRecording } from '../../services/recording/recording-clip-service'
import type { ToolDefinition } from '../authz/define-tool'
import { uuid, markUntrusted } from '../schemas/common'
import { rethrow, resolveOrganizationId } from './_shared'

export const commentsList: ToolDefinition = {
  name: 'study_comments_list',
  title: 'List study comments',
  description:
    'Read the internal discussion thread on a study. These are comments from your team, not from ' +
    'participants — use responses_list for participant text.',
  feature: 'collaboration',
  deferred: true,
  inputSchema: z.object({
    study_id: uuid('study'),
    limit: z.number().int().min(1).max(100).default(50),
  }),
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  scopes: ['studies:read'],
  resource: { kind: 'study', argKey: 'study_id', role: 'viewer' },
  handler: async (args, ctx) => {
    const a = args as { study_id: string; limit: number }
    const { data, error } = await listStudyComments(ctx.supabase as never, a.study_id, ctx.userId, {
      limit: a.limit,
    })
    rethrow(error)
    return { study_id: a.study_id, comments: data ?? [] }
  },
}

export const commentAdd: ToolDefinition = {
  name: 'study_comment_add',
  title: 'Add a study comment',
  description:
    'Post an internal comment on a study, optionally as a reply. Visible to collaborators, never to ' +
    'participants. Useful for leaving a written summary of an analysis alongside the study itself.',
  feature: 'collaboration',
  deferred: true,
  inputSchema: z.object({
    study_id: uuid('study'),
    content: z.string().min(1).max(10000),
    parent_comment_id: uuid('parent comment').optional().describe('Reply to this comment instead of starting a thread.'),
  }),
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  scopes: ['studies:write'],
  resource: { kind: 'study', argKey: 'study_id', role: 'editor' },
  handler: async (args, ctx) => {
    const a = args as { study_id: string; content: string; parent_comment_id?: string }
    const { data, error } = await createStudyComment(ctx.supabase as never, a.study_id, ctx.userId, {
      content: a.content,
      parentCommentId: a.parent_comment_id ?? null,
    })
    rethrow(error)
    return { comment: data }
  },
}

export const studyTagsList: ToolDefinition = {
  name: 'study_tags_list',
  title: 'List study tags',
  description:
    'Tags available across the workspace for organising studies, with usage counts. Pass a study_id to get ' +
    'just the tags on that study instead.',
  feature: 'collaboration',
  deferred: true,
  inputSchema: z.object({
    organization_id: uuid('organization').optional(),
    study_id: uuid('study').optional().describe('Return only this study`s tags.'),
  }),
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  scopes: ['studies:read'],
  resource: { kind: 'none' },
  handler: async (args, ctx) => {
    const a = args as { organization_id?: string; study_id?: string }

    if (a.study_id) {
      const { data, error } = await getTagsForStudy(ctx.supabase as never, a.study_id, ctx.userId)
      rethrow(error)
      return { study_id: a.study_id, tags: data ?? [] }
    }

    const orgId = await resolveOrganizationId(ctx.supabase, ctx.userId, a.organization_id)
    const { data, error } = await listStudyTags(ctx.supabase as never, orgId, ctx.userId)
    rethrow(error, 'organization')
    return { organization_id: orgId, tags: data ?? [] }
  },
}

export const studyTagsSet: ToolDefinition = {
  name: 'study_tags_set',
  title: 'Set a study`s tags',
  description:
    'Replace the full set of tags on a study. Tag ids must already exist — use study_tags_list to find them.',
  feature: 'collaboration',
  deferred: true,
  inputSchema: z.object({
    study_id: uuid('study'),
    tag_ids: z.array(uuid('tag')).max(50).describe('The complete set. An empty array clears all tags.'),
  }),
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  scopes: ['studies:write'],
  resource: { kind: 'study', argKey: 'study_id', role: 'editor' },
  handler: async (args, ctx) => {
    const a = args as { study_id: string; tag_ids: string[] }
    // Note the argument order: setStudyTags takes (studyId, tagIds, userId),
    // unlike the sibling functions in this service which put userId third.
    const { data, error } = await setStudyTags(ctx.supabase as never, a.study_id, a.tag_ids, ctx.userId)
    rethrow(error)
    return { study_id: a.study_id, tags: data ?? [] }
  },
}

export const recordingsList: ToolDefinition = {
  name: 'recordings_list',
  title: 'List session recordings',
  description:
    'Session recordings captured for a study, with duration and transcript availability. Requires a plan ' +
    'that includes recordings. Video itself is never returned over MCP — only metadata and clip markers.',
  feature: 'collaboration',
  deferred: true,
  inputSchema: z.object({
    study_id: uuid('study'),
    limit: z.number().int().min(1).max(100).default(25),
  }),
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  scopes: ['results:read'],
  resource: { kind: 'study', argKey: 'study_id', role: 'viewer' },
  entitlement: 'recordings',
  handler: async (args, ctx) => {
    const a = args as { study_id: string; limit: number }
    const { data, error } = await ctx.supabase
      .from('session_recordings')
      .select('id, participant_id, status, duration_ms, has_transcript, created_at')
      .eq('study_id', a.study_id)
      .order('created_at', { ascending: false })
      .limit(a.limit)

    if (error) rethrow(new Error(error.message))
    return { study_id: a.study_id, recordings: data ?? [] }
  },
}

export const recordingClipsList: ToolDefinition = {
  name: 'recording_clips_list',
  title: 'List clips on a recording',
  description:
    'Clips a researcher has marked on a session recording, with their timestamps and labels. Clip labels are ' +
    'written by your team; any transcript text they quote is participant-authored.',
  feature: 'collaboration',
  deferred: true,
  inputSchema: z.object({
    study_id: uuid('study').describe('The study the recording belongs to. Used to authorize the call.'),
    recording_id: uuid('recording'),
  }),
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  scopes: ['results:read'],
  resource: { kind: 'study', argKey: 'study_id', role: 'viewer' },
  entitlement: 'recordings',
  handler: async (args, ctx) => {
    const a = args as { study_id: string; recording_id: string }

    // The recording must belong to the study we authorized against, otherwise
    // a caller with access to any study could read clips from any recording.
    const { data: owner } = await ctx.supabase
      .from('session_recordings')
      .select('study_id')
      .eq('id', a.recording_id)
      .single()

    if ((owner as { study_id?: string } | null)?.study_id !== a.study_id) {
      rethrow(new Error('not found'), 'recording')
    }

    const { data, error } = await listClipsByRecording(ctx.supabase as never, a.recording_id)
    rethrow(error, 'recording')
    return {
      recording_id: a.recording_id,
      clips: markUntrusted((data ?? []) as unknown as Array<Record<string, unknown>>, ['transcript_excerpt']),
    }
  },
}

export const COLLABORATION_TOOLS: ToolDefinition[] = [
  commentsList,
  commentAdd,
  studyTagsList,
  studyTagsSet,
  recordingsList,
  recordingClipsList,
]
