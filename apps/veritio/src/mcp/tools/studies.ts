/**
 * Study lifecycle tools.
 *
 * These call the services layer directly rather than the assistant handlers,
 * because three of them (`study_launch`, `study_set_status`, `share_manage`)
 * have no assistant equivalent — the in-app assistant can read `status` back
 * but has never been able to set it, so an agent could build a study and never
 * ship it.
 */

import { z } from 'zod4'
import {
  archiveStudy,
  createStudy,
  deleteStudy,
  getStudy,
  publishStudy,
  restoreStudy,
  updateStudy,
} from '../../services/study-service'
import {
  createStudyDuplicateShell,
  duplicateStudyContent,
} from '../../services/study-duplication/duplicate-content'
import { executeBuilderTool } from '../../services/assistant/builder-tools'
import { EntitlementError } from '../../lib/api/classify-error'
import { invalidInput, planRequired, noAccess, ToolError } from '../authz/errors'
import type { ToolDefinition } from '../authz/define-tool'
import { studyTypeSchema, uuid, responseFormat } from '../schemas/common'

/** Services signal failure by returning `{ error }`; translate to a ToolError. */
function rethrow(error: Error | null, resource = 'study'): void {
  if (!error) return
  if (error instanceof EntitlementError) throw planRequired('activeStudies', error.message)
  if (/not found|access denied|permission/i.test(error.message)) throw noAccess(resource)
  throw new ToolError('upstream_error', error.message)
}

function participationUrl(shareCode: string | null | undefined): string | null {
  if (!shareCode) return null
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://veritio.io'
  return `${base}/s/${shareCode}`
}

export const studyCreate: ToolDefinition = {
  name: 'study_create',
  title: 'Create study',
  description:
    'Create a study in a project. Returns the study id. The study starts in draft and is not visible to ' +
    'participants until study_launch. After creating, add content with study_content_set, then validate ' +
    'with study_validate before launching.',
  feature: 'studies',
  inputSchema: z.object({
    project_id: uuid('project'),
    title: z.string().min(1).max(255).describe('Human-readable study name.'),
    study_type: studyTypeSchema,
    description: z.string().max(2000).nullish().describe('Optional internal description.'),
  }),
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  scopes: ['studies:write'],
  resource: { kind: 'project', argKey: 'project_id', role: 'editor' },
  examples: [
    {
      description: 'Create an open card sort',
      arguments: { project_id: '3f1b…', title: 'Homepage IA card sort', study_type: 'card_sort' },
    },
  ],
  handler: async (args, ctx) => {
    const a = args as { project_id: string; title: string; study_type: never; description?: string | null }
    const { data, error } = await createStudy(ctx.supabase as never, a.project_id, ctx.userId, {
      title: a.title,
      study_type: a.study_type,
      description: a.description ?? null,
    })
    rethrow(error, 'project')
    if (!data) throw noAccess('project')

    return {
      study_id: data.id,
      project_id: a.project_id,
      study_type: data.study_type,
      title: data.title,
      status: data.status,
      next_steps: 'Add content with study_content_set, then study_validate, then study_launch.',
    }
  },
}

export const studyGet: ToolDefinition = {
  name: 'study_get',
  title: 'Get study',
  description:
    'Fetch a study: metadata, status, settings, and counts. Use response_format "detailed" only when you ' +
    'need the full settings object — the concise form is enough to reason about setup.',
  feature: 'studies',
  inputSchema: z.object({ study_id: uuid('study'), response_format: responseFormat }),
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  scopes: ['studies:read'],
  resource: { kind: 'study', argKey: 'study_id', role: 'viewer' },
  handler: async (args, ctx) => {
    const a = args as { study_id: string; response_format: 'concise' | 'detailed' }
    const { data, error } = await getStudy(ctx.supabase as never, a.study_id, ctx.userId)
    rethrow(error)
    if (!data) throw noAccess('study')

    const base = {
      study_id: data.id,
      title: data.title,
      study_type: data.study_type,
      status: data.status,
      description: data.description,
      participant_count: data.participant_count,
      participation_url: participationUrl(data.share_code),
      your_role: data.user_role,
      created_at: data.created_at,
    }

    if (a.response_format === 'concise') return base
    return { ...base, settings: data.settings, url_slug: data.url_slug, language: data.language }
  },
}

export const studyUpdate: ToolDefinition = {
  name: 'study_update',
  title: 'Update study metadata',
  description:
    'Update a study`s title, description, purpose, participant requirements, language, or URL slug. ' +
    'This does NOT change status — use study_launch or study_set_status for that, and study_settings_set ' +
    'for behavioural settings.',
  feature: 'studies',
  inputSchema: z.object({
    study_id: uuid('study'),
    title: z.string().min(1).max(255).optional(),
    description: z.string().max(2000).nullish(),
    purpose: z.string().nullish().describe('Shown to participants. HTML supported.'),
    participant_requirements: z.string().nullish().describe('Shown to participants. HTML supported.'),
    language: z.string().max(10).optional(),
    url_slug: z
      .string()
      .regex(/^[a-z0-9-]*$/, 'lowercase letters, numbers and hyphens only')
      .max(100)
      .nullish(),
  }),
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  scopes: ['studies:write'],
  resource: { kind: 'study', argKey: 'study_id', role: 'editor' },
  handler: async (args, ctx) => {
    const { study_id, ...patch } = args as { study_id: string } & Record<string, unknown>
    if (Object.keys(patch).length === 0) {
      throw invalidInput('No fields to update.', 'Pass at least one field besides study_id.')
    }
    const { data, error } = await updateStudy(ctx.supabase as never, study_id, ctx.userId, patch)
    rethrow(error)
    if (!data) throw noAccess('study')
    return { study_id: data.id, title: data.title, status: data.status, updated: Object.keys(patch) }
  },
}

/**
 * Launch is deliberately its own tool rather than a flag on `study_set_status`.
 *
 * It is the one irreversible, outward-facing act in the whole surface: it makes
 * the study reachable by real participants at a public URL. A separate,
 * explicitly-named tool with `destructiveHint` is what lets a client prompt for
 * confirmation before an agent does it unattended.
 */
export const studyLaunch: ToolDefinition = {
  name: 'study_launch',
  title: 'Launch study',
  description:
    'Take a study live. This exposes it to real participants at a public URL and begins collecting ' +
    'responses — confirm with the user before calling. Launch readiness is checked first and the launch is ' +
    'refused if the study is incomplete; fix what it reports rather than overriding. Returns the ' +
    'participation URL. Use study_set_status to pause or close a live study.',
  feature: 'studies',
  inputSchema: z.object({
    study_id: uuid('study'),
    confirm: z
      .literal(true)
      .describe('Must be true. Set this only after the user has explicitly agreed to go live.'),
    override_validation: z
      .boolean()
      .default(false)
      .describe(
        'Launch despite failed readiness checks. Only set this if the user has seen the specific problems ' +
          'and told you to proceed anyway.',
      ),
  }),
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
  scopes: ['studies:write'],
  resource: { kind: 'study', argKey: 'study_id', role: 'manager' },
  handler: async (args, ctx) => {
    const a = args as { study_id: string; override_validation: boolean }

    /**
     * Gate the launch on readiness.
     *
     * `updateStudy` will happily set status to active on a study with no tasks
     * and no flow steps — the builder UI warns a human, but nothing enforces it.
     * For an agent that is a genuine footgun: the call returns success, and the
     * user ends up with a live study participants cannot complete. So the check
     * runs here, and skipping it has to be asked for explicitly.
     */
    if (!a.override_validation) {
      const readiness = await executeBuilderTool('check_launch_readiness', {}, {
        supabase: ctx.supabase,
        studyId: a.study_id,
        userId: ctx.userId,
      })
      const report = ((readiness as { result?: unknown }).result ?? readiness) as {
        ready?: boolean
        checklist?: Array<{ item: string; status: string; detail?: string }>
      }

      if (report?.ready === false) {
        const failures = (report.checklist ?? [])
          .filter((c) => c.status === 'fail')
          .map((c) => `${c.item}: ${c.detail ?? 'failed'}`)

        throw new ToolError(
          'conflict',
          `This study is not ready to launch. ${failures.join('; ')}.`,
          'Fix these first. If the user has seen them and still wants to go live, call again with override_validation: true.',
        )
      }
    }

    const { data, error } = await publishStudy(
      ctx.supabase as never,
      a.study_id,
      ctx.userId,
      'mcp',
    )
    rethrow(error)
    if (!data) throw noAccess('study')

    return {
      study_id: data.id,
      status: data.status,
      participation_url: participationUrl(data.share_code),
      launched_with_override: a.override_validation,
      message: 'Study is live and collecting responses.',
    }
  },
}

export const studySetStatus: ToolDefinition = {
  name: 'study_set_status',
  title: 'Pause, resume or close a study',
  description:
    'Move a study between paused, completed and draft. To take a study live for the first time use ' +
    'study_launch instead. Pausing stops new participants without losing existing responses.',
  feature: 'studies',
  inputSchema: z.object({
    study_id: uuid('study'),
    status: z
      .enum(['draft', 'paused', 'completed'])
      .describe('paused stops new responses; completed closes the study; draft returns it to editing.'),
  }),
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
  scopes: ['studies:write'],
  resource: { kind: 'study', argKey: 'study_id', role: 'manager' },
  handler: async (args, ctx) => {
    const a = args as { study_id: string; status: 'draft' | 'paused' | 'completed' }
    const { data, error } = await updateStudy(ctx.supabase as never, a.study_id, ctx.userId, {
      status: a.status,
    })
    rethrow(error)
    if (!data) throw noAccess('study')
    return { study_id: data.id, status: data.status }
  },
}

/**
 * Duplication, which used to be impossible here.
 *
 * The old path created the study row and enqueued a background job to copy its
 * content. `enqueue` is an iii-engine primitive with no equivalent in a Next.js
 * route handler, so an MCP version could only ever have produced an empty
 * study while reporting success. The copying now lives in
 * `services/study-duplication/duplicate-content.ts`, callable from either
 * runtime, so this waits for the copy and returns a study that is actually
 * populated.
 */
export const studyDuplicate: ToolDefinition = {
  name: 'study_duplicate',
  title: 'Duplicate a study',
  description:
    'Copy a study`s whole setup - cards, categories, tree, tasks, flow questions, settings and branding - ' +
    'into a new draft. Responses are never copied and the copy gets its own participation URL. Use this to ' +
    'run a second round of the same study, or to fork a design before changing it.',
  feature: 'studies',
  inputSchema: z.object({
    study_id: uuid('study'),
    title: z.string().min(1).max(255).optional().describe('Defaults to the original title with " (Copy)".'),
  }),
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  scopes: ['studies:write'],
  resource: { kind: 'study', argKey: 'study_id', role: 'manager' },
  handler: async (args, ctx) => {
    const a = args as { study_id: string; title?: string }
    const shell = await createStudyDuplicateShell(ctx.supabase, a.study_id, a.title)
    const copied = await duplicateStudyContent(ctx.supabase, {
      originalStudyId: a.study_id,
      newStudyId: shell.id,
    })
    return {
      study_id: shell.id,
      title: shell.title,
      status: 'draft',
      study_type: shell.study_type,
      project_id: shell.project_id,
      copied,
      next_steps: 'The copy is a draft. Edit it, then study_validate and study_launch when ready.',
    }
  },
}

export const studyArchive: ToolDefinition = {
  name: 'study_archive',
  title: 'Archive or restore a study',
  description:
    'Move a study out of the default listing without deleting anything, or bring an archived one back. ' +
    'Prefer this over study_delete: archiving is reversible and keeps every response.',
  feature: 'studies',
  // Deferred: the advertised surface is capped (see budget.test.ts) and
  // archiving is asked for far less often than duplicating or status changes.
  deferred: true,
  inputSchema: z.object({
    study_id: uuid('study'),
    archived: z.boolean().default(true).describe('true archives; false restores.'),
  }),
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
  scopes: ['studies:write'],
  resource: { kind: 'study', argKey: 'study_id', role: 'manager' },
  handler: async (args, ctx) => {
    const a = args as { study_id: string; archived: boolean }
    const { data, error } = a.archived
      ? await archiveStudy(ctx.supabase as never, a.study_id, ctx.userId)
      : await restoreStudy(ctx.supabase as never, a.study_id, ctx.userId)
    rethrow(error)
    if (!data) throw noAccess('study')
    return { study_id: data.id, archived: a.archived, status: data.status }
  },
}

/**
 * Deletion is deferred and destructive-hinted on purpose.
 *
 * It removes every response ever collected, which is research data that cannot
 * be reproduced by re-running the study - the participants are gone. Keeping it
 * out of `tools/list` means an agent reaches it only after deliberately
 * searching for it, which is the right amount of friction for the one
 * irreversible data-loss operation in the surface.
 */
export const studyDelete: ToolDefinition = {
  name: 'study_delete',
  title: 'Delete a study permanently',
  description:
    'Permanently delete a study and every response collected in it. This cannot be undone and the data ' +
    'cannot be recreated. Confirm explicitly with the user first, and suggest study_archive instead unless ' +
    'they specifically want the data gone.',
  feature: 'studies',
  deferred: true,
  inputSchema: z.object({
    study_id: uuid('study'),
    confirm: z
      .literal(true)
      .describe('Must be true. Set this only after the user has agreed to lose the responses.'),
  }),
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
  scopes: ['studies:write'],
  resource: { kind: 'study', argKey: 'study_id', role: 'manager' },
  handler: async (args, ctx) => {
    const a = args as { study_id: string }
    const { error } = await deleteStudy(ctx.supabase as never, a.study_id, ctx.userId)
    rethrow(error)
    return { study_id: a.study_id, deleted: true }
  },
}

export const STUDY_TOOLS: ToolDefinition[] = [
  studyCreate,
  studyGet,
  studyUpdate,
  studyLaunch,
  studySetStatus,
  studyDuplicate,
  studyArchive,
  studyDelete,
]
