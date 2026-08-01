/**
 * Getting things out of Veritio: share links, exports, insight reports.
 *
 * The long-running ones (export, insights) already run as background jobs on
 * the backend, so these tools return a handle rather than blocking — which is
 * also what keeps them inside a client's request timeout.
 */

import { z } from 'zod4'
import { executeStudyTool } from '../../services/assistant/study-tools'
import { createShareLink, listStudyShareLinks, revokeShareLink } from '../../services/share-link-service'
import type { ToolDefinition } from '../authz/define-tool'
import { uuid } from '../schemas/common'
import { invalidInput, noAccess } from '../authz/errors'
import { rethrow, resolveStudyType, participationUrl } from './_shared'

export const shareManage: ToolDefinition = {
  name: 'share_manage',
  title: 'Manage sharing',
  description:
    'Get a study`s participation URL, and list, create or revoke share links. The participation URL is the ' +
    'public link participants use; share links are separate, revocable links you can hand to specific people.',
  feature: 'delivery',
  inputSchema: z.object({
    study_id: uuid('study'),
    action: z.enum(['get', 'create_link', 'revoke_link']).default('get'),
    link_id: z.string().optional().describe('Required for revoke_link.'),
    label: z.string().max(120).optional().describe('Optional label when creating a link.'),
  }),
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  scopes: ['studies:write'],
  resource: { kind: 'study', argKey: 'study_id', role: 'editor' },
  handler: async (args, ctx) => {
    const a = args as { study_id: string; action: string; link_id?: string; label?: string }

    if (a.action === 'revoke_link') {
      if (!a.link_id) throw invalidInput('link_id is required to revoke a link.')
      const { error } = await revokeShareLink(ctx.supabase as never, a.link_id, ctx.userId)
      rethrow(error, 'share link')
      return { revoked: a.link_id }
    }

    if (a.action === 'create_link') {
      const { data, error } = await createShareLink(ctx.supabase as never, a.study_id, ctx.userId, {
        ...(a.label ? { label: a.label } : {}),
      } as never)
      rethrow(error)
      return { link: data }
    }

    const { data: study, error: studyError } = await ctx.supabase
      .from('studies')
      .select('share_code, url_slug, status')
      .eq('id', a.study_id)
      .single()
    if (studyError || !study) throw noAccess('study')

    const s = study as { share_code: string | null; url_slug: string | null; status: string }
    const { data: links } = await listStudyShareLinks(ctx.supabase as never, a.study_id, ctx.userId)

    return {
      study_id: a.study_id,
      status: s.status,
      participation_url: participationUrl(s.url_slug ?? s.share_code),
      // A draft study has a URL but will not accept participants until launched.
      live: s.status === 'active',
      share_links: links ?? [],
    }
  },
}

export const exportCreate: ToolDefinition = {
  name: 'export_create',
  title: 'Export study data',
  description:
    'Export a study`s data. Returns the data directly for small studies; for anything over 100 participants ' +
    'it queues a background job and returns a job id instead. Use results_get if you want analysis rather ' +
    'than raw rows.',
  feature: 'delivery',
  inputSchema: z.object({
    study_id: uuid('study'),
    format: z.enum(['raw', 'summary', 'both']).default('both'),
  }),
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  scopes: ['export:write'],
  resource: { kind: 'study', argKey: 'study_id', role: 'viewer' },
  // Viewer is correct: exporting surfaces data the caller can already read.
  mutates: 'derived',
  handler: async (args, ctx) => {
    const a = args as { study_id: string; format: string }
    const studyType = await resolveStudyType(ctx.supabase, a.study_id)
    const base = {
      supabase: ctx.supabase as never,
      studyId: a.study_id,
      studyType,
      userId: ctx.userId,
    }

    const direct = await executeStudyTool('export_study_data', {}, base)
    const payload = (direct as { result?: unknown }).result ?? direct

    // The handler refuses above 100 participants and says so; fall through to
    // the async job in that case rather than making the agent figure it out.
    if (payload && typeof payload === 'object' && 'error' in payload) {
      const job = await executeStudyTool(
        'create_export_job',
        { integration: 'csv_download', format: a.format },
        base,
      )
      return {
        mode: 'async',
        job: (job as { result?: unknown }).result ?? job,
        message: 'Study is too large for a direct export; a background job was queued instead.',
      }
    }

    return { mode: 'direct', data: payload }
  },
}

export const insightsGenerate: ToolDefinition = {
  name: 'insights_generate',
  title: 'Generate an insights report',
  description:
    'Kick off Veritio`s AI insights report (PDF) for a study. This runs in the background and can take a ' +
    'few minutes. Requires a plan that includes AI features.',
  feature: 'delivery',
  inputSchema: z.object({
    study_id: uuid('study'),
    regenerate: z.boolean().default(false).describe('Force a fresh report instead of returning a cached one.'),
  }),
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  scopes: ['export:write'],
  resource: { kind: 'study', argKey: 'study_id', role: 'editor' },
  mutates: 'derived',
  entitlement: 'ai',
  handler: async (args, ctx) => {
    const a = args as { study_id: string; regenerate: boolean }
    const studyType = await resolveStudyType(ctx.supabase, a.study_id)
    const result = await executeStudyTool(
      'generate_insights_report',
      { regenerate: a.regenerate },
      { supabase: ctx.supabase as never, studyId: a.study_id, studyType, userId: ctx.userId },
    )
    return (result as { result?: unknown }).result ?? result
  },
}

export const DELIVERY_TOOLS: ToolDefinition[] = [shareManage, exportCreate, insightsGenerate]
