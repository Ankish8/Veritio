/**
 * Veritio AI Assistant — Builder Tool Handlers
 *
 * Tools for the 'builder' mode: inspect study configuration,
 * validate setup completeness, and check launch readiness.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { BuilderToolName, ToolExecutionResult } from './types'
import { getMethodologyGuidance } from './methodology-guidance'
import { getStudyFlowReference } from './study-flow-reference'

interface BuilderToolContext {
  supabase: SupabaseClient
  studyId: string
  userId: string
}

/**
 * Route a builder tool call to the appropriate handler.
 */
export async function executeBuilderTool(
  toolName: BuilderToolName,
  _args: Record<string, unknown>,
  ctx: BuilderToolContext,
): Promise<ToolExecutionResult> {
  switch (toolName) {
    case 'get_study_config':
      return handleGetStudyConfig(ctx)
    case 'validate_study_setup':
      return handleValidateStudySetup(ctx)
    case 'get_task_list':
      return handleGetTaskList(ctx)
    case 'check_launch_readiness':
      return handleCheckLaunchReadiness(ctx)
    case 'get_best_practices':
      return handleGetBestPractices(ctx)
    case 'get_study_flow_reference':
      return handleGetStudyFlowReference(_args)
    default:
      return { result: { error: `Unknown builder tool: ${toolName}` } }
  }
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

async function handleGetStudyConfig(ctx: BuilderToolContext): Promise<ToolExecutionResult> {
  const { data: study, error } = await ctx.supabase
    .from('studies')
    .select('id, title, study_type, status, settings, created_at, updated_at, share_code')
    .eq('id', ctx.studyId)
    .single()

  if (error || !study) {
    return { result: { error: 'Failed to fetch study configuration' } }
  }

  /*
   * Both of these used to be their own queries against `study_flow_steps` and
   * `tasks`, and both were wrong in the same way the readiness check was — the
   * flow table is written by nothing, and `tasks` has neither `title` nor
   * `description` nor `order_position`. Each silently returned an empty list, so
   * this handler reported every study as having no flow and no content.
   */
  const readiness = await readStudyReadiness(ctx.supabase, ctx.studyId, study)

  return {
    result: {
      study,
      flowSections: readiness.enabledSections,
      contentCount: readiness.contentCount,
      contentLabel: readiness.contentLabel,
      // Old names kept so existing callers keep reading.
      taskCount: readiness.contentCount,
      flowStepCount: readiness.enabledSections.length,
    },
  }
}

async function handleValidateStudySetup(ctx: BuilderToolContext): Promise<ToolExecutionResult> {
  const { data: study } = await ctx.supabase
    .from('studies')
    .select('id, title, study_type, status, settings')
    .eq('id', ctx.studyId)
    .single()

  if (!study) return { result: { error: 'Study not found' } }

  const readiness = await readStudyReadiness(ctx.supabase, ctx.studyId, study)
  const issues = validateStudy(study, readiness)

  return {
    result: {
      valid: issues.length === 0,
      issueCount: issues.length,
      issues,
      studyType: study.study_type,
      contentCount: readiness.contentCount,
      contentLabel: readiness.contentLabel,
      // Kept under its old name so existing callers and transcripts still read.
      taskCount: readiness.contentCount,
      flowStepCount: readiness.enabledSections.length,
    },
  }
}

async function handleGetTaskList(ctx: BuilderToolContext): Promise<ToolExecutionResult> {
  const { data: tasks, error } = await ctx.supabase
    .from('tasks')
    .select('*')
    .eq('study_id', ctx.studyId)
    .order('order_position', { ascending: true })

  if (error) {
    return { result: { error: 'Failed to fetch tasks' } }
  }

  return {
    result: {
      tasks: tasks ?? [],
      count: tasks?.length ?? 0,
    },
  }
}

async function handleGetBestPractices(ctx: BuilderToolContext): Promise<ToolExecutionResult> {
  // Look up study type from DB so we return the right guidance
  const { data: study } = await ctx.supabase
    .from('studies')
    .select('study_type')
    .eq('id', ctx.studyId)
    .single()

  const studyType = study?.study_type ?? ''
  const guidance = getMethodologyGuidance(studyType)

  if (!guidance) {
    return { result: { message: `No specific methodology guidance available for study type "${studyType}".` } }
  }

  return { result: { guidance } }
}

function handleGetStudyFlowReference(args: Record<string, unknown>): ToolExecutionResult {
  const section = typeof args.section === 'string' ? args.section : undefined
  const reference = getStudyFlowReference(section)
  return { result: { reference } }
}

async function handleCheckLaunchReadiness(ctx: BuilderToolContext): Promise<ToolExecutionResult> {
  const { data: study } = await ctx.supabase
    .from('studies')
    .select('id, title, study_type, status, settings')
    .eq('id', ctx.studyId)
    .single()

  if (!study) return { result: { error: 'Study not found' } }

  const readiness = await readStudyReadiness(ctx.supabase, ctx.studyId, study)
  const checklist = buildLaunchChecklist(study, readiness)
  const counts = {
    pass: checklist.filter((c) => c.status === 'pass').length,
    fail: checklist.filter((c) => c.status === 'fail').length,
    warn: checklist.filter((c) => c.status === 'warn').length,
  }

  return {
    result: {
      ready: counts.fail === 0,
      summary: `${counts.pass} passed, ${counts.fail} failed, ${counts.warn} warnings`,
      checklist,
    },
  }
}

// ---------------------------------------------------------------------------
// Validation Helpers
// ---------------------------------------------------------------------------

/**
 * Where each study type's content actually lives, and what one item is called.
 *
 * THE VALIDATOR USED TO COUNT `tasks` FOR ALL SIX TYPES, and `tasks` is the TREE
 * TEST's table — it carries `question` and `correct_node_id`. So readiness asked
 * the wrong table for five types out of six, and asked the sixth for columns it
 * does not have (`title`, `description`), which PostgREST answers with an error
 * rather than rows. Both failures land in the same place: `data` comes back null,
 * the count is 0, and a finished study is reported as having no content.
 *
 * Measured before this fix, against a LIVE card sort with 24 cards and 6
 * categories that was already collecting responses:
 *
 *   valid: false, taskCount: 0
 *   "No tasks configured — card_sort studies require at least one task"
 *
 * That is the worst shape a validation bug can take. It does not throw; it reports
 * a complete study as incomplete, so `study_launch` refuses every study built
 * through MCP or the assistant and the only way past is `override_validation` —
 * which is how a safety check becomes a step people are taught to skip.
 *
 * `label` is the column carrying the item's own words, and it differs per table.
 * Checking a fixed `title` is what produced the phantom "N task(s) have no title"
 * on tree tests, whose column is `question`.
 *
 * `survey` is deliberately absent. It was never in the checked set, so leaving it
 * unchecked is not a regression, and adding it would mean guessing at a table this
 * fix has not verified against the write path.
 */
const STUDY_CONTENT_SOURCES: Record<string, { table: string; label: string; noun: string }> = {
  card_sort: { table: 'cards', label: 'label', noun: 'card' },
  tree_test: { table: 'tasks', label: 'question', noun: 'task' },
  prototype_test: { table: 'prototype_test_tasks', label: 'title', noun: 'task' },
  first_click: { table: 'first_click_tasks', label: 'instruction', noun: 'task' },
  first_impression: { table: 'first_impression_designs', label: 'name', noun: 'design' },
  live_website_test: { table: 'live_website_tasks', label: 'title', noun: 'task' },
}

/**
 * The participant journey is a JSON object on `studies.settings.studyFlow`, keyed
 * by section, each with its own `enabled` flag — NOT rows in `study_flow_steps`.
 * `study_flow_set` and the dashboard both write it there, so the table the
 * validator read is populated by no current write path at all, and every study in
 * the product reported "Study flow has no steps configured".
 */
const FLOW_INSTRUCTIONS_KEY = 'activityInstructions'
const FLOW_THANK_YOU_KEY = 'thankYou'

export interface StudyReadiness {
  /** Items of the type's own content — cards, designs, tasks. */
  contentCount: number
  /** What one item is called, for a message a human reads. */
  contentLabel: string
  /** Items whose own label is blank. */
  unlabelledCount: number
  /** Whether this type is content-checked at all. */
  contentChecked: boolean
  enabledSections: string[]
}

/**
 * Read everything readiness depends on, once.
 *
 * ONE BODY, TWO CALLERS (`handleValidateStudySetup` and
 * `handleCheckLaunchReadiness`). They were two copies of the same pair of queries
 * and drifted already — one selected `title, description`, the other `title` — so
 * the two surfaces could disagree about the same study. A second copy is also how
 * one of them keeps reading the wrong table after the other is fixed.
 */
async function readStudyReadiness(
  supabase: BuilderToolContext['supabase'],
  studyId: string,
  study: { study_type: string; settings?: unknown },
): Promise<StudyReadiness> {
  const source = STUDY_CONTENT_SOURCES[study.study_type]

  const settings = (study.settings ?? {}) as Record<string, unknown>
  const studyFlow = (settings.studyFlow ?? {}) as Record<string, { enabled?: boolean }>
  const enabledSections = Object.keys(studyFlow).filter((key) => studyFlow[key]?.enabled !== false)

  if (!source) {
    return {
      contentCount: 0,
      contentLabel: 'item',
      unlabelledCount: 0,
      contentChecked: false,
      enabledSections,
    }
  }

  /*
   * The error is READ, not discarded. Swallowing it is what let a missing column
   * present as an empty table for however long this has been shipping; a query
   * that failed must never be reported as "nothing is configured".
   */
  const { data, error } = await (supabase.from(source.table as never) as never as {
    select: (columns: string) => {
      eq: (column: string, value: string) => Promise<{ data: Record<string, unknown>[] | null; error: unknown }>
    }
  })
    .select(`id, ${source.label}`)
    .eq('study_id', studyId)

  if (error) {
    throw new Error(
      `Could not read ${source.table} for study ${studyId}: ${
        (error as { message?: string })?.message ?? String(error)
      }`,
    )
  }

  const rows = data ?? []
  return {
    contentCount: rows.length,
    contentLabel: source.noun,
    unlabelledCount: rows.filter((row) => {
      const value = row[source.label]
      return typeof value !== 'string' || value.trim().length === 0
    }).length,
    contentChecked: true,
    enabledSections,
  }
}

function validateStudy(
  study: { title: string; study_type: string },
  readiness: StudyReadiness,
): string[] {
  const issues: string[] = []

  if (!study.title || study.title === 'Untitled Study') {
    issues.push('Study has no custom title')
  }

  if (readiness.contentChecked && readiness.contentCount === 0) {
    issues.push(
      `No ${readiness.contentLabel}s configured — ${study.study_type} studies require at least one ${readiness.contentLabel}`,
    )
  }

  if (readiness.unlabelledCount > 0) {
    issues.push(`${readiness.unlabelledCount} ${readiness.contentLabel}(s) have no text`)
  }

  if (readiness.enabledSections.length === 0) {
    issues.push('Study flow has no steps configured')
  }

  if (!readiness.enabledSections.includes(FLOW_INSTRUCTIONS_KEY)) {
    issues.push('No instructions step in the study flow')
  }

  if (!readiness.enabledSections.includes(FLOW_THANK_YOU_KEY)) {
    issues.push('No thank-you step in the study flow')
  }

  return issues
}

type ChecklistItem = { item: string; status: 'pass' | 'fail' | 'warn'; detail?: string }

function buildLaunchChecklist(
  study: { title: string; study_type: string; status: string },
  readiness: StudyReadiness,
): ChecklistItem[] {
  const checklist: ChecklistItem[] = []

  // Study status
  if (study.status === 'active') {
    checklist.push({ item: 'Study status', status: 'warn', detail: 'Study is already active' })
  } else if (study.status === 'completed') {
    checklist.push({ item: 'Study status', status: 'warn', detail: 'Study is already completed' })
  } else {
    checklist.push({ item: 'Study status', status: 'pass', detail: `Status: ${study.status}` })
  }

  // Title
  checklist.push(
    !study.title || study.title === 'Untitled Study'
      ? { item: 'Study title', status: 'fail', detail: 'No custom title set' }
      : { item: 'Study title', status: 'pass', detail: study.title },
  )

  // Content — cards, designs or tasks, whichever this type actually stores.
  if (readiness.contentChecked) {
    const noun = readiness.contentLabel
    checklist.push(
      readiness.contentCount === 0
        ? { item: 'Content', status: 'fail', detail: `No ${noun}s configured` }
        : { item: 'Content', status: 'pass', detail: `${readiness.contentCount} ${noun}(s) configured` },
    )
  }

  // Study flow
  checklist.push(
    readiness.enabledSections.length === 0
      ? { item: 'Study flow', status: 'fail', detail: 'No flow steps configured' }
      : {
          item: 'Study flow',
          status: 'pass',
          detail: `${readiness.enabledSections.length} step(s) in flow`,
        },
  )

  // Instructions step
  checklist.push(
    readiness.enabledSections.includes(FLOW_INSTRUCTIONS_KEY)
      ? { item: 'Instructions step', status: 'pass' }
      : { item: 'Instructions step', status: 'warn', detail: 'No instructions step — participants start immediately' },
  )

  // Thank-you step
  checklist.push(
    readiness.enabledSections.includes(FLOW_THANK_YOU_KEY)
      ? { item: 'Thank-you step', status: 'pass' }
      : { item: 'Thank-you step', status: 'warn', detail: 'No thank-you step at end of study' },
  )

  return checklist
}
