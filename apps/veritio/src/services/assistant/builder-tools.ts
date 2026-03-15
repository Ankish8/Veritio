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

  // Fetch study flow steps
  const { data: flowSteps } = await ctx.supabase
    .from('study_flow_steps')
    .select('id, step_type, config, order_position')
    .eq('study_id', ctx.studyId)
    .order('order_position', { ascending: true })

  // Fetch tasks
  const { data: tasks } = await ctx.supabase
    .from('tasks')
    .select('id, title, description, order_position')
    .eq('study_id', ctx.studyId)
    .order('order_position', { ascending: true })

  return {
    result: {
      study,
      flowSteps: flowSteps ?? [],
      tasks: tasks ?? [],
      taskCount: tasks?.length ?? 0,
      flowStepCount: flowSteps?.length ?? 0,
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

  const [
    { data: tasks },
    { data: flowSteps },
  ] = await Promise.all([
    ctx.supabase.from('tasks').select('id, title, description').eq('study_id', ctx.studyId),
    ctx.supabase.from('study_flow_steps').select('id, step_type, config').eq('study_id', ctx.studyId),
  ])

  const issues = validateStudy(study, tasks ?? [], flowSteps ?? [])

  return {
    result: {
      valid: issues.length === 0,
      issueCount: issues.length,
      issues,
      studyType: study.study_type,
      taskCount: tasks?.length ?? 0,
      flowStepCount: flowSteps?.length ?? 0,
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

  const [
    { data: tasks },
    { data: flowSteps },
  ] = await Promise.all([
    ctx.supabase.from('tasks').select('id, title').eq('study_id', ctx.studyId),
    ctx.supabase.from('study_flow_steps').select('id, step_type').eq('study_id', ctx.studyId),
  ])

  const checklist = buildLaunchChecklist(study, tasks ?? [], flowSteps ?? [])
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

const STUDY_TYPES_NEEDING_TASKS = ['tree_test', 'prototype_test', 'first_click', 'first_impression', 'card_sort', 'live_website_test']

function validateStudy(
  study: { title: string; study_type: string },
  tasks: Array<{ title?: string }>,
  flowSteps: Array<{ step_type: string }>,
): string[] {
  const issues: string[] = []

  if (!study.title || study.title === 'Untitled Study') {
    issues.push('Study has no custom title')
  }

  if (STUDY_TYPES_NEEDING_TASKS.includes(study.study_type) && tasks.length === 0) {
    issues.push(`No tasks configured — ${study.study_type} studies require at least one task`)
  }

  const untitledTasks = tasks.filter((t) => !t.title)
  if (untitledTasks.length > 0) {
    issues.push(`${untitledTasks.length} task(s) have no title`)
  }

  if (flowSteps.length === 0) {
    issues.push('Study flow has no steps configured')
  }

  if (!flowSteps.some((s) => s.step_type === 'instructions')) {
    issues.push('No instructions step in the study flow')
  }

  if (!flowSteps.some((s) => s.step_type === 'thank_you')) {
    issues.push('No thank-you step in the study flow')
  }

  return issues
}

type ChecklistItem = { item: string; status: 'pass' | 'fail' | 'warn'; detail?: string }

function buildLaunchChecklist(
  study: { title: string; study_type: string; status: string },
  tasks: Array<{ id: string }>,
  flowSteps: Array<{ step_type: string }>,
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

  // Tasks
  if (STUDY_TYPES_NEEDING_TASKS.includes(study.study_type)) {
    checklist.push(
      tasks.length === 0
        ? { item: 'Tasks', status: 'fail', detail: 'No tasks configured' }
        : { item: 'Tasks', status: 'pass', detail: `${tasks.length} task(s) configured` },
    )
  }

  // Study flow
  checklist.push(
    flowSteps.length === 0
      ? { item: 'Study flow', status: 'fail', detail: 'No flow steps configured' }
      : { item: 'Study flow', status: 'pass', detail: `${flowSteps.length} step(s) in flow` },
  )

  // Instructions step
  checklist.push(
    flowSteps.some((s) => s.step_type === 'instructions')
      ? { item: 'Instructions step', status: 'pass' }
      : { item: 'Instructions step', status: 'warn', detail: 'No instructions step — participants start immediately' },
  )

  // Thank-you step
  checklist.push(
    flowSteps.some((s) => s.step_type === 'thank_you')
      ? { item: 'Thank-you step', status: 'pass' }
      : { item: 'Thank-you step', status: 'warn', detail: 'No thank-you step at end of study' },
  )

  return checklist
}
