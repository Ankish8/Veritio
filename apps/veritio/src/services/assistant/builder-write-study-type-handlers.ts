/**
 * Study-type-specific write tool handlers: prototype test, first click,
 * first impression, and live website test.
 *
 * Card sort, tree test, and survey handlers live in
 * builder-write-content-handlers.ts.
 */

import type { ToolExecutionResult } from './types'
import { createPrototypeTask, updatePrototypeTask, deletePrototypeTask, listPrototypeTasks } from '../prototype-task-service'
import { createDesign, updateDesign, deleteDesign, listDesigns } from '../first-impression-service'
import { createSurveyRule, updateSurveyRule, deleteSurveyRule, listSurveyRules } from '../survey-rules-service'
import { getTasks as getLiveWebsiteTasks, saveTasks as saveLiveWebsiteTasks } from '../live-website-service'
import type { LiveWebsiteTaskInput } from '../live-website-service'
import { normalizeImage, ensurePostTaskQuestionIds } from './builder-write-normalizers'
import type { WriteToolContext, ExecuteManageItemsFn } from './builder-write-tools'

// ---------------------------------------------------------------------------
// Prototype Test handler
// ---------------------------------------------------------------------------

export async function handleManagePrototypeTasks(
  args: Record<string, unknown>,
  ctx: WriteToolContext,
  executeManageItems: ExecuteManageItemsFn,
): Promise<ToolExecutionResult> {
  const action = args.action as string
  const items = args.items as Record<string, unknown>[]

  if (!action || !items) {
    return { result: { error: 'Missing required fields: action, items' } }
  }

  return executeManageItems({
    action,
    items,
    ctx,
    dataChangedSections: ['prototype_tasks'],
    addFn: async (item) => {
      const { data, error } = await createPrototypeTask(ctx.supabase, ctx.studyId, {
        title: String(item.title || ''),
        instruction: item.description ? String(item.description) : null,
      })
      if (error) throw error
      return data
    },
    updateFn: async (item) => {
      const input: Record<string, unknown> = {}
      if (item.title !== undefined) input.title = String(item.title)
      if (item.description !== undefined) input.instruction = item.description ? String(item.description) : null

      const { data, error } = await updatePrototypeTask(ctx.supabase, String(item.id), ctx.studyId, input as any)
      if (error) throw error
      return data
    },
    removeFn: async (item) => {
      const { error } = await deletePrototypeTask(ctx.supabase, String(item.id), ctx.studyId)
      if (error) throw error
    },
    listFn: async () => {
      const { data } = await listPrototypeTasks(ctx.supabase, ctx.studyId)
      return data ?? []
    },
  })
}

// ---------------------------------------------------------------------------
// First Click handler
// ---------------------------------------------------------------------------

export async function handleManageFirstClickTasks(
  args: Record<string, unknown>,
  ctx: WriteToolContext,
  executeManageItems: ExecuteManageItemsFn,
): Promise<ToolExecutionResult> {
  const action = args.action as string
  const items = args.items as Record<string, unknown>[]

  if (!action || !items) {
    return { result: { error: 'Missing required fields: action, items' } }
  }

  return executeManageItems({
    action,
    items,
    ctx,
    dataChangedSections: ['first_click_tasks'],
    addFn: async (item) => {
      const id = crypto.randomUUID()
      const { data: existing } = await ctx.supabase
        .from('first_click_tasks')
        .select('position')
        .eq('study_id', ctx.studyId)
        .order('position', { ascending: false })
        .limit(1)
      const position = (existing?.[0]?.position ?? -1) + 1

      const { data, error } = await ctx.supabase
        .from('first_click_tasks')
        .insert({
          id,
          study_id: ctx.studyId,
          instruction: String(item.instruction || ''),
          position,
          post_task_questions: [],
        })
        .select()
        .single()
      if (error) throw new Error(error.message)

      // Add image if provided
      const normalizedImg = normalizeImage(item.image)
      if (normalizedImg) {
        const imageId = crypto.randomUUID()
        const { error: imgError } = await ctx.supabase
          .from('first_click_images')
          .insert({
            id: imageId,
            task_id: id,
            study_id: ctx.studyId,
            image_url: normalizedImg.url,
            original_filename: null,
            source_type: 'upload',
          })
        if (imgError) throw new Error(imgError.message)
      }

      return data
    },
    updateFn: async (item) => {
      const updates: Record<string, unknown> = {}
      if (item.instruction !== undefined) updates.instruction = String(item.instruction)

      const { data, error } = await ctx.supabase
        .from('first_click_tasks')
        .update(updates)
        .eq('id', String(item.id))
        .eq('study_id', ctx.studyId)
        .select()
        .single()
      if (error) throw new Error(error.message)

      // Update image if provided
      const normalizedImg = normalizeImage(item.image)
      if (normalizedImg) {
        const taskId = String(item.id)
        const { data: existingImg } = await ctx.supabase
          .from('first_click_images')
          .select('id')
          .eq('task_id', taskId)
          .limit(1)

        if (existingImg && existingImg.length > 0) {
          await ctx.supabase
            .from('first_click_images')
            .update({ image_url: normalizedImg.url, source_type: 'upload' })
            .eq('id', existingImg[0].id)
        } else {
          await ctx.supabase
            .from('first_click_images')
            .insert({
              id: crypto.randomUUID(),
              task_id: taskId,
              study_id: ctx.studyId,
              image_url: normalizedImg.url,
              original_filename: null,
              source_type: 'upload',
            })
        }
      }

      return data
    },
    removeFn: async (item) => {
      const { error } = await ctx.supabase
        .from('first_click_tasks')
        .delete()
        .eq('id', String(item.id))
        .eq('study_id', ctx.studyId)
      if (error) throw new Error(error.message)
    },
    listFn: async () => {
      const { data } = await ctx.supabase
        .from('first_click_tasks')
        .select('*')
        .eq('study_id', ctx.studyId)
        .order('position', { ascending: true })
      return data ?? []
    },
  })
}

// ---------------------------------------------------------------------------
// First Impression handler
// ---------------------------------------------------------------------------

export async function handleManageFirstImpressionDesigns(
  args: Record<string, unknown>,
  ctx: WriteToolContext,
  executeManageItems: ExecuteManageItemsFn,
): Promise<ToolExecutionResult> {
  const action = args.action as string
  const items = args.items as Record<string, unknown>[]

  if (!action || !items) {
    return { result: { error: 'Missing required fields: action, items' } }
  }

  return executeManageItems({
    action,
    items,
    ctx,
    dataChangedSections: ['first_impression_designs'],
    addFn: async (item) => {
      const normalizedImg = normalizeImage(item.image)
      const { data, error } = await createDesign(ctx.supabase, ctx.studyId, {
        name: item.name ? String(item.name) : null,
        image_url: normalizedImg?.url ?? null,
        source_type: 'upload',
        is_practice: item.is_practice !== undefined ? Boolean(item.is_practice) : false,
        questions: Array.isArray(item.questions) ? item.questions as any : [],
      })
      if (error) throw error
      return data
    },
    updateFn: async (item) => {
      const input: Record<string, unknown> = {}
      if (item.name !== undefined) input.name = String(item.name)
      if (item.is_practice !== undefined) input.is_practice = Boolean(item.is_practice)
      if (item.questions !== undefined) input.questions = item.questions

      const normalizedImg = normalizeImage(item.image)
      if (normalizedImg) {
        input.image_url = normalizedImg.url
        input.source_type = 'upload'
      }

      const { data, error } = await updateDesign(ctx.supabase, String(item.id), ctx.studyId, input as any)
      if (error) throw error
      return data
    },
    removeFn: async (item) => {
      const { error } = await deleteDesign(ctx.supabase, String(item.id), ctx.studyId)
      if (error) throw error
    },
    listFn: async () => {
      const { data } = await listDesigns(ctx.supabase, ctx.studyId)
      return data ?? []
    },
  })
}

// ---------------------------------------------------------------------------
// Live Website Test handler
// ---------------------------------------------------------------------------

/**
 * Convert a DB row to LiveWebsiteTaskInput shape for the bulk-save service.
 */
function mapDbTaskToInput(row: any): LiveWebsiteTaskInput {
  return {
    id: row.id,
    title: row.title ?? '',
    instructions: row.instructions ?? '',
    target_url: row.target_url ?? '',
    success_url: row.success_url ?? null,
    success_criteria_type: row.success_criteria_type ?? 'self_reported',
    success_path: row.success_path ?? null,
    time_limit_seconds: row.time_limit_seconds ?? null,
    order_position: row.order_position ?? 0,
    post_task_questions: row.post_task_questions ?? [],
  }
}

export async function handleManageLiveWebsiteTasks(
  args: Record<string, unknown>,
  ctx: WriteToolContext,
): Promise<ToolExecutionResult> {
  const action = args.action as string
  const items = args.items as Record<string, unknown>[]

  if (!action || !items) {
    return { result: { error: 'Missing required fields: action, items' } }
  }

  try {
    // Read existing tasks
    const existingRows = await getLiveWebsiteTasks(ctx.supabase, ctx.studyId)
    let taskList: LiveWebsiteTaskInput[] = existingRows.map(mapDbTaskToInput)

    switch (action) {
      case 'add': {
        for (const item of items) {
          const postTaskQuestions = ensurePostTaskQuestionIds(item.post_task_questions)
          taskList.push({
            id: crypto.randomUUID(),
            title: String(item.title || ''),
            instructions: String(item.instructions || ''),
            target_url: String(item.target_url || ''),
            success_url: item.success_url ? String(item.success_url) : null,
            success_criteria_type: (['self_reported', 'url_match', 'exact_path'].includes(String(item.success_criteria_type || ''))
              ? String(item.success_criteria_type) as 'self_reported' | 'url_match' | 'exact_path'
              : 'self_reported'),
            success_path: null,
            time_limit_seconds: typeof item.time_limit_seconds === 'number' ? item.time_limit_seconds : null,
            order_position: taskList.length,
            post_task_questions: postTaskQuestions,
          })
        }
        break
      }

      case 'update': {
        const missingIds = items.filter((i) => !i.id)
        if (missingIds.length > 0) {
          return { result: { error: 'All items must have an "id" field for update action' } }
        }
        for (const item of items) {
          const idx = taskList.findIndex((t) => t.id === String(item.id))
          if (idx === -1) continue
          const existing = taskList[idx]
          taskList[idx] = {
            ...existing,
            title: item.title !== undefined ? String(item.title) : existing.title,
            instructions: item.instructions !== undefined ? String(item.instructions) : existing.instructions,
            target_url: item.target_url !== undefined ? String(item.target_url) : existing.target_url,
            success_url: item.success_url !== undefined ? (item.success_url ? String(item.success_url) : null) : existing.success_url,
            success_criteria_type: item.success_criteria_type !== undefined
              ? (['self_reported', 'url_match', 'exact_path'].includes(String(item.success_criteria_type))
                ? String(item.success_criteria_type) as 'self_reported' | 'url_match' | 'exact_path'
                : existing.success_criteria_type)
              : existing.success_criteria_type,
            success_path: existing.success_path,
            time_limit_seconds: item.time_limit_seconds !== undefined
              ? (typeof item.time_limit_seconds === 'number' ? item.time_limit_seconds : null)
              : existing.time_limit_seconds,
            post_task_questions: item.post_task_questions !== undefined
              ? ensurePostTaskQuestionIds(item.post_task_questions)
              : existing.post_task_questions,
          }
        }
        break
      }

      case 'remove': {
        const missingIds = items.filter((i) => !i.id)
        if (missingIds.length > 0) {
          return { result: { error: 'All items must have an "id" field for remove action' } }
        }
        const removeIds = new Set(items.map((i) => String(i.id)))
        taskList = taskList.filter((t) => !removeIds.has(t.id))
        break
      }

      case 'replace_all': {
        taskList = items.map((item, i) => {
          const postTaskQuestions = ensurePostTaskQuestionIds(item.post_task_questions)
          return {
            id: crypto.randomUUID(),
            title: String(item.title || ''),
            instructions: String(item.instructions || ''),
            target_url: String(item.target_url || ''),
            success_url: item.success_url ? String(item.success_url) : null,
            success_criteria_type: (['self_reported', 'url_match', 'exact_path'].includes(String(item.success_criteria_type || ''))
              ? String(item.success_criteria_type) as 'self_reported' | 'url_match' | 'exact_path'
              : 'self_reported'),
            success_path: null,
            time_limit_seconds: typeof item.time_limit_seconds === 'number' ? item.time_limit_seconds : null,
            order_position: i,
            post_task_questions: postTaskQuestions,
          }
        })
        break
      }

      default:
        return { result: { error: `Unknown action: ${action}. Use "add", "update", "remove", or "replace_all".` } }
    }

    // Re-index order_position
    taskList.forEach((t, i) => { t.order_position = i })

    // Bulk save (delete all + insert all)
    await saveLiveWebsiteTasks(ctx.supabase, ctx.studyId, taskList)

    return {
      result: {
        success: true,
        action,
        count: taskList.length,
        items: taskList.map((t) => ({ id: t.id, title: t.title, target_url: t.target_url })),
      },
      dataChanged: ['live_website_tasks'],
    }
  } catch (err) {
    return { result: { error: `Live website task operation failed: ${err instanceof Error ? err.message : 'unknown error'}` } }
  }
}

// ---------------------------------------------------------------------------
// Survey Rules handler
// ---------------------------------------------------------------------------

export async function handleManageSurveyRules(
  args: Record<string, unknown>,
  ctx: WriteToolContext,
): Promise<ToolExecutionResult> {
  const action = args.action as string
  const items = (args.items as Record<string, unknown>[]) ?? []

  if (!action) {
    return { result: { error: 'Missing required field: action' } }
  }

  if (action === 'list') {
    const { data, error } = await listSurveyRules(ctx.supabase, ctx.studyId)
    if (error) {
      return { result: { error: `Failed to list survey rules: ${error.message}` } }
    }
    return { result: { success: true, action: 'list', count: data?.length ?? 0, items: data } }
  }

  if (!items || items.length === 0) {
    return { result: { error: 'Missing required field: items' } }
  }

  try {
    switch (action) {
      case 'add': {
        const results = []
        for (const item of items) {
          if (!item.name || !item.action_type) {
            return { result: { error: 'name and action_type are required for add action' } }
          }
          const { data, error } = await createSurveyRule(ctx.supabase, ctx.studyId, {
            name: String(item.name),
            description: item.description ? String(item.description) : undefined,
            is_enabled: item.is_enabled !== false,
            trigger_type: (item.trigger_type as string) ?? 'on_answer',
            trigger_config: (item.trigger_config as Record<string, unknown>) ?? {},
            action_type: String(item.action_type),
            action_config: (item.action_config as Record<string, unknown>) ?? {},
            conditions: (item.conditions as any) ?? { groups: [] },
          } as any)
          if (error) throw error
          results.push(data)
        }
        return {
          result: { success: true, action: 'add', count: results.length, items: results },
          dataChanged: ['survey_rules'],
        }
      }

      case 'update': {
        const results = []
        for (const item of items) {
          if (!item.id) {
            return { result: { error: 'id is required for update action' } }
          }
          const updates: Record<string, unknown> = {}
          if (item.name !== undefined) updates.name = String(item.name)
          if (item.description !== undefined) updates.description = item.description ? String(item.description) : null
          if (item.is_enabled !== undefined) updates.is_enabled = Boolean(item.is_enabled)
          if (item.trigger_type !== undefined) updates.trigger_type = String(item.trigger_type)
          if (item.trigger_config !== undefined) updates.trigger_config = item.trigger_config
          if (item.action_type !== undefined) updates.action_type = String(item.action_type)
          if (item.action_config !== undefined) updates.action_config = item.action_config
          if (item.conditions !== undefined) updates.conditions = item.conditions

          const { data, error } = await updateSurveyRule(ctx.supabase, String(item.id), ctx.studyId, updates as any)
          if (error) throw error
          results.push(data)
        }
        return {
          result: { success: true, action: 'update', count: results.length, items: results },
          dataChanged: ['survey_rules'],
        }
      }

      case 'remove': {
        for (const item of items) {
          if (!item.id) {
            return { result: { error: 'id is required for remove action' } }
          }
          const { error } = await deleteSurveyRule(ctx.supabase, String(item.id), ctx.studyId)
          if (error) throw error
        }
        return {
          result: { success: true, action: 'remove', count: items.length },
          dataChanged: ['survey_rules'],
        }
      }

      default:
        return { result: { error: `Unknown action: ${action}. Use "add", "update", "remove", or "list".` } }
    }
  } catch (err) {
    return { result: { error: `Survey rule operation failed: ${err instanceof Error ? err.message : 'unknown error'}` } }
  }
}
