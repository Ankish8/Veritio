/**
 * Study configuration: content, flow, settings, validation.
 *
 * These wrap the existing handlers in `services/assistant/`, which already know
 * how to write every content type correctly. What is added here is the part
 * that layer never had: authorization (handled upstream by the gate), input
 * validation, and refusing to apply content that does not belong to the
 * study's actual type.
 */

import { z } from 'zod4'
import { executeBuilderWriteTool } from '../../services/assistant/builder-write-tools'
import { executeBuilderTool } from '../../services/assistant/builder-tools'
import { getMethodologyGuidance } from '../../services/assistant/methodology-guidance'
import { getStudy } from '../../services/study-service'
import { readStudyContent } from '../../services/study-content'
import type { ToolDefinition } from '../authz/define-tool'
import { uuid } from '../schemas/common'
import { invalidInput } from '../authz/errors'
import { validateSettingsFor, settingsKeysFor } from '../schemas/settings'
import {
  CONTENT_TYPES,
  CONTENT_TOOL,
  contentTypesFor,
  validateItems,
  type ContentType,
} from '../schemas/content'
import { resolveStudyType } from './_shared'
import {
  FLOW_QUESTION_SECTIONS,
  readFlowQuestions,
  type FlowQuestionSection,
} from '../../services/study-content'

const ALL_CONTENT_TYPES = Object.keys(CONTENT_TYPES) as [ContentType, ...ContentType[]]

export const studyContentSet: ToolDefinition = {
  name: 'study_content_set',
  title: 'Set study content',
  description:
    'Add, update, remove or replace the content of a study — cards, categories, tree nodes, tasks, survey ' +
    'questions, designs. content_type must match the study type (cards need a card_sort, tree_nodes need a ' +
    'tree_test, and so on). Use action "replace_all" to set the whole list at once, which is usually what you ' +
    'want when building a study from a sitemap or content inventory. For tree_nodes with replace_all, give each ' +
    'node a temp_id and reference it as parent_id on its children.',
  feature: 'content',
  inputSchema: z.object({
    study_id: uuid('study'),
    content_type: z.enum(ALL_CONTENT_TYPES),
    action: z
      .enum(['add', 'update', 'remove', 'replace_all'])
      .describe('replace_all discards existing items — confirm with the user before using it on a live study.'),
    items: z
      .array(z.record(z.string(), z.unknown()))
      .min(1)
      .max(500)
      .describe('Item shape depends on content_type. Omit id to add, supply id to update or remove.'),
  }),
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  scopes: ['studies:write'],
  resource: { kind: 'study', argKey: 'study_id', role: 'editor' },
  examples: [
    {
      description: 'Build a card sort deck in one call',
      arguments: {
        study_id: '3f1b…',
        content_type: 'cards',
        action: 'replace_all',
        items: [{ label: 'Order history' }, { label: 'Payment methods' }, { label: 'Returns' }],
      },
    },
    {
      description: 'Build a two-level tree, referencing the parent by temp_id',
      arguments: {
        study_id: '3f1b…',
        content_type: 'tree_nodes',
        action: 'replace_all',
        items: [
          { temp_id: 'acct', label: 'Account' },
          { temp_id: 'orders', label: 'Orders', parent_id: 'acct' },
        ],
      },
    },
  ],
  handler: async (args, ctx) => {
    const a = args as {
      study_id: string
      content_type: ContentType
      action: string
      items: Record<string, unknown>[]
    }

    // The study's real type comes from the database, never from the caller.
    const studyType = await resolveStudyType(ctx.supabase, a.study_id)
    const allowed = contentTypesFor(studyType)
    if (!allowed.includes(a.content_type)) {
      throw invalidInput(
        `A ${studyType} study has no "${a.content_type}" content.`,
        `Valid content_type values for this study: ${allowed.join(', ')}.`,
      )
    }

    const validated = validateItems(a.content_type, a.items)
    if (!validated.ok) {
      throw invalidInput(`Invalid items — ${validated.errors.slice(0, 8).join('; ')}.`)
    }

    const result = await executeBuilderWriteTool(
      CONTENT_TOOL[a.content_type] as never,
      { action: a.action, items: validated.value },
      { supabase: ctx.supabase, studyId: a.study_id, userId: ctx.userId },
    )

    return result
  },
}

export const studySettingsSet: ToolDefinition = {
  name: 'study_settings_set',
  title: 'Set study settings',
  description:
    'Update behavioural settings for a study. Fields are validated against the study type, so a card sort ' +
    'rejects tree test settings rather than silently ignoring them. This is a deep merge: omitted fields keep ' +
    'their current values. Call study_get with response_format "detailed" first to see current settings.',
  feature: 'content',
  inputSchema: z.object({
    study_id: uuid('study'),
    settings: z
      .record(z.string(), z.unknown())
      .describe('Partial settings object. Valid keys depend on the study type — an invalid key is an error.'),
  }),
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  scopes: ['studies:write'],
  resource: { kind: 'study', argKey: 'study_id', role: 'editor' },
  examples: [
    {
      description: 'Turn a card sort into a closed sort',
      arguments: { study_id: '3f1b…', settings: { mode: 'closed', randomizeCards: true } },
    },
  ],
  handler: async (args, ctx) => {
    const a = args as { study_id: string; settings: Record<string, unknown> }
    const studyType = await resolveStudyType(ctx.supabase, a.study_id)

    const validated = validateSettingsFor(studyType, a.settings)
    if (!validated.ok) {
      throw invalidInput(
        `Invalid settings for a ${studyType} study — ${validated.errors.slice(0, 8).join('; ')}.`,
        `Valid keys: ${settingsKeysFor(studyType).join(', ')}.`,
      )
    }

    return executeBuilderWriteTool(
      'update_study_settings',
      { settings: validated.value },
      { supabase: ctx.supabase, studyId: a.study_id, userId: ctx.userId },
    )
  },
}

const FLOW_SECTIONS = [
  'welcome',
  'participantAgreement',
  'screening',
  'participantIdentifier',
  'preStudyQuestions',
  'activityInstructions',
  'postStudyQuestions',
  'surveyQuestionnaire',
  'thankYou',
  'closedStudy',
] as const

export const studyFlowSet: ToolDefinition = {
  name: 'study_flow_set',
  title: 'Configure the participant journey',
  description:
    'Configure what participants see around the core activity: welcome screen, consent, screening questions, ' +
    'participant identification, pre/post-study questions, and the thank-you screen. Screening questions must ' +
    'carry branching_logic with rejection rules, or nobody gets screened out.',
  feature: 'content',
  inputSchema: z.object({
    study_id: uuid('study'),
    section: z.enum(FLOW_SECTIONS).describe('Which part of the journey to configure.'),
    enabled: z.boolean().optional().describe('Show or hide this section.'),
    config: z
      .record(z.string(), z.unknown())
      .optional()
      .describe('Section settings, e.g. { title, message, includeStudyTitle }. Merged into the existing config.'),
    questions: z
      .array(z.record(z.string(), z.unknown()))
      .optional()
      .describe(
        'For screening, preStudyQuestions and postStudyQuestions. Each needs question_type and question_text. ' +
          'Screening questions also need branching_logic: {rules:[{optionId,target:"next"|"reject"}],defaultTarget:"next"}.',
      ),
  }),
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  scopes: ['studies:write'],
  resource: { kind: 'study', argKey: 'study_id', role: 'editor' },
  handler: async (args, ctx) => {
    const a = args as {
      study_id: string
      section: (typeof FLOW_SECTIONS)[number]
      enabled?: boolean
      config?: Record<string, unknown>
      questions?: Record<string, unknown>[]
    }

    const QUESTION_SECTIONS: Record<string, string> = {
      screening: 'screening',
      preStudyQuestions: 'pre_study',
      postStudyQuestions: 'post_study',
    }

    if (a.questions) {
      const mapped = QUESTION_SECTIONS[a.section]
      if (!mapped) {
        throw invalidInput(
          `The "${a.section}" section does not take questions.`,
          'Questions apply to screening, preStudyQuestions and postStudyQuestions.',
        )
      }
      return executeBuilderWriteTool(
        'manage_flow_questions',
        { action: 'replace_all', section: mapped, items: a.questions },
        { supabase: ctx.supabase, studyId: a.study_id, userId: ctx.userId },
      )
    }

    if (a.enabled === undefined && !a.config) {
      throw invalidInput('Nothing to change.', 'Pass enabled, config, or questions.')
    }

    // Flow sections live under the studyFlow key of the settings blob.
    const patch: Record<string, unknown> = { ...(a.config ?? {}) }
    if (a.enabled !== undefined) patch.enabled = a.enabled

    return executeBuilderWriteTool(
      'update_study_settings',
      { settings: { studyFlow: { [a.section]: patch } } },
      { supabase: ctx.supabase, studyId: a.study_id, userId: ctx.userId },
    )
  },
}

export const studyValidate: ToolDefinition = {
  name: 'study_validate',
  title: 'Validate a study before launch',
  description:
    'Check a study for problems and report whether it is ready to launch. Run this before study_launch. ' +
    'Set include_methodology to also get UX research best-practice guidance for this study type — useful when ' +
    'you designed the content yourself and want a second opinion on it.',
  feature: 'content',
  inputSchema: z.object({
    study_id: uuid('study'),
    include_methodology: z.boolean().default(false),
  }),
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  scopes: ['studies:read'],
  resource: { kind: 'study', argKey: 'study_id', role: 'viewer' },
  handler: async (args, ctx) => {
    const a = args as { study_id: string; include_methodology: boolean }
    const base = { supabase: ctx.supabase, studyId: a.study_id, userId: ctx.userId }

    const [setup, readiness] = await Promise.all([
      executeBuilderTool('validate_study_setup', {}, base),
      executeBuilderTool('check_launch_readiness', {}, base),
    ])

    const out: Record<string, unknown> = {
      validation: (setup as { result?: unknown }).result ?? setup,
      launch_readiness: (readiness as { result?: unknown }).result ?? readiness,
    }

    if (a.include_methodology) {
      const studyType = await resolveStudyType(ctx.supabase, a.study_id)
      out.methodology_guidance = getMethodologyGuidance(studyType)
    }

    return out
  },
}

/**
 * Deliberately absent: `study_duplicate`.
 *
 * Duplication creates the new study row and then enqueues a background job to
 * copy its content (`steps/api/studies/duplicate-study.step.ts`). `enqueue` is
 * an iii-engine primitive with no equivalent in a Next.js route handler, so an
 * MCP version could create the shell study but never populate it — reporting
 * success while producing an empty study. Wiring this properly needs either an
 * engine-side trigger reachable from here or a service credential the backend
 * will accept, which is its own piece of work.
 */

/**
 * Reading content back, which was the surface's largest hole.
 *
 * Without this an agent could write cards but never read them, so changing one
 * card's label meant `replace_all` with a guessed list - discarding anything a
 * human had edited in the dashboard meanwhile. Reading first turns a
 * destructive rewrite into a targeted update.
 */
export const studyContentGet: ToolDefinition = {
  name: 'study_content_get',
  title: 'Read study content',
  description:
    'Read a study`s content - cards, categories, tree nodes, tasks, survey questions, designs - as stored, ' +
    'with their ids. Do this before any partial edit: study_content_set with action "update" needs real ids, ' +
    'and "replace_all" without reading first will silently discard work someone else did in the dashboard. ' +
    'Omit content_type to get every collection that applies to this study type.',
  feature: 'content',
  inputSchema: z.object({
    study_id: uuid('study'),
    content_type: z
      .enum(ALL_CONTENT_TYPES)
      .optional()
      .describe('Omit to read every collection valid for this study type.'),
  }),
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  scopes: ['studies:read'],
  resource: { kind: 'study', argKey: 'study_id', role: 'viewer' },
  examples: [
    {
      description: 'Read a tree before editing one node',
      arguments: { study_id: '3f1b…', content_type: 'tree_nodes' },
    },
  ],
  handler: async (args, ctx) => {
    const a = args as { study_id: string; content_type?: ContentType }
    const studyType = await resolveStudyType(ctx.supabase, a.study_id)
    const allowed = contentTypesFor(studyType)

    if (a.content_type && !allowed.includes(a.content_type)) {
      throw invalidInput(
        `A ${studyType} study has no "${a.content_type}" content.`,
        `Valid content_type values for this study: ${allowed.join(', ')}.`,
      )
    }

    const wanted = a.content_type ? [a.content_type] : allowed
    const collections: Record<string, unknown[]> = {}
    for (const contentType of wanted) {
      collections[contentType] = await readStudyContent(ctx.supabase, a.study_id, contentType)
    }

    return {
      study_id: a.study_id,
      study_type: studyType,
      content: collections,
      counts: Object.fromEntries(
        Object.entries(collections).map(([key, rows]) => [key, rows.length]),
      ),
    }
  },
}

export const studyFlowGet: ToolDefinition = {
  name: 'study_flow_get',
  title: 'Read the participant journey',
  description:
    'Read how the study is configured around its core activity: which of welcome, consent, screening, ' +
    'participant identification, pre/post-study questions and thank-you are enabled, and their copy. ' +
    'Read this before study_flow_set, which merges rather than replaces.',
  feature: 'content',
  inputSchema: z.object({
    study_id: uuid('study'),
    include_questions: z
      .boolean()
      .default(false)
      .describe('Also return the questions in screening, preStudyQuestions and postStudyQuestions.'),
  }),
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  scopes: ['studies:read'],
  resource: { kind: 'study', argKey: 'study_id', role: 'viewer' },
  handler: async (args, ctx) => {
    const a = args as { study_id: string; include_questions: boolean }
    const { data, error } = await getStudy(ctx.supabase as never, a.study_id, ctx.userId)
    if (error || !data) throw invalidInput('Could not read that study.')

    const settings = ((data as { settings?: Record<string, unknown> }).settings ?? {}) as Record<
      string,
      unknown
    >
    const flow = (settings.studyFlow ?? {}) as Record<string, unknown>

    const questions: Record<string, unknown[]> = {}
    if (a.include_questions) {
      for (const section of Object.keys(FLOW_QUESTION_SECTIONS) as FlowQuestionSection[]) {
        questions[section] = await readFlowQuestions(ctx.supabase, a.study_id, section)
      }
    }

    return {
      study_id: a.study_id,
      sections: FLOW_SECTIONS.map((section) => {
        const config = (flow[section] ?? {}) as Record<string, unknown>
        const { enabled, ...rest } = config
        return {
          section,
          enabled: typeof enabled === 'boolean' ? enabled : null,
          config: rest,
        }
      }),
      ...(a.include_questions ? { questions } : {}),
    }
  },
}

export const CONTENT_TOOLS: ToolDefinition[] = [
  studyContentGet,
  studyContentSet,
  studySettingsSet,
  studyFlowGet,
  studyFlowSet,
  studyValidate,
]
