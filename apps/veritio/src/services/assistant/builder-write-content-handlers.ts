/**
 * Content-oriented write tool handlers: card sort, tree test, and survey.
 *
 * Handles manage_cards, manage_categories, manage_tree_nodes,
 * manage_tree_test_tasks, manage_custom_sections, manage_ab_tests,
 * and manage_survey_rules.
 */

import type { ToolExecutionResult } from './types'
import { createCard, updateCard, deleteCard, bulkUpdateCards, listCards } from '../card-service'
import { createCategory, updateCategory, deleteCategory, bulkUpdateCategories, listCategories } from '../category-service'
import { createTreeNode, updateTreeNode, deleteTreeNode, bulkUpdateTreeNodes, listTreeNodes } from '../tree-node-service'
import { createTask, updateTask, deleteTask, listTasks } from '../task-service'
import { createSurveySection, updateSurveySection, deleteSurveySection, listSurveySections } from '../survey-sections-service'
import { createABTest, updateABTest, deleteABTest, getABTestsForStudy } from '../ab-test-service'
import { normalizeImage } from './builder-write-normalizers'
import type { WriteToolContext, ExecuteManageItemsFn } from './builder-write-tools'

// ---------------------------------------------------------------------------
// Card Sort handlers
// ---------------------------------------------------------------------------

export async function handleManageCards(
  args: Record<string, unknown>,
  ctx: WriteToolContext,
  executeManageItems: ExecuteManageItemsFn,
  autoEnableDescriptionToggle: (ctx: WriteToolContext, key: 'showCardDescriptions' | 'showCategoryDescriptions') => Promise<void>,
): Promise<ToolExecutionResult> {
  const action = args.action as string
  const items = args.items as Record<string, unknown>[]

  if (!action || !items) {
    return { result: { error: 'Missing required fields: action, items' } }
  }

  const result = await executeManageItems({
    action,
    items,
    ctx,
    dataChangedSections: ['cards'],
    addFn: async (item) => {
      const image = normalizeImage(item.image)
      const { data, error } = await createCard(ctx.supabase, ctx.studyId, {
        label: String(item.label || ''),
        description: item.description ? String(item.description) : null,
        ...(image ? { image } : {}),
      })
      if (error) throw error
      return data
    },
    updateFn: async (item) => {
      const input: Record<string, unknown> = {}
      if (item.label !== undefined) input.label = String(item.label)
      if (item.description !== undefined) input.description = item.description ? String(item.description) : null
      if (item.image !== undefined) input.image = normalizeImage(item.image)

      const { data, error } = await updateCard(ctx.supabase, String(item.id), ctx.studyId, input as any)
      if (error) throw error
      return data
    },
    removeFn: async (item) => {
      const { error } = await deleteCard(ctx.supabase, String(item.id), ctx.studyId)
      if (error) throw error
    },
    listFn: async () => {
      const { data } = await listCards(ctx.supabase, ctx.studyId)
      return data ?? []
    },
    replaceAllFn: async (newItems) => {
      const cardsWithIds = newItems.map((item, i) => {
        const image = normalizeImage(item.image)
        return {
          id: crypto.randomUUID(),
          label: String(item.label || ''),
          description: item.description ? String(item.description) : null,
          ...(image ? { image } : {}),
          position: i,
        }
      })
      const { data, error } = await bulkUpdateCards(ctx.supabase, ctx.studyId, cardsWithIds)
      if (error) throw error
      return data
    },
  })

  // Auto-enable showCardDescriptions when any card has a description
  if (result.dataChanged && !('error' in (result.result as Record<string, unknown>))) {
    const hasDescriptions = items.some((item) => item.description && String(item.description).trim().length > 0)
    if (hasDescriptions) {
      await autoEnableDescriptionToggle(ctx, 'showCardDescriptions')
      if (!result.dataChanged.includes('settings')) {
        result.dataChanged.push('settings', 'study')
      }
    }
  }

  return result
}

export async function handleManageCategories(
  args: Record<string, unknown>,
  ctx: WriteToolContext,
  executeManageItems: ExecuteManageItemsFn,
  autoEnableDescriptionToggle: (ctx: WriteToolContext, key: 'showCardDescriptions' | 'showCategoryDescriptions') => Promise<void>,
): Promise<ToolExecutionResult> {
  const action = args.action as string
  const items = args.items as Record<string, unknown>[]

  if (!action || !items) {
    return { result: { error: 'Missing required fields: action, items' } }
  }

  const result = await executeManageItems({
    action,
    items,
    ctx,
    dataChangedSections: ['categories'],
    addFn: async (item) => {
      const { data, error } = await createCategory(ctx.supabase, ctx.studyId, {
        label: String(item.label || ''),
        description: item.description ? String(item.description) : null,
      })
      if (error) throw error
      return data
    },
    updateFn: async (item) => {
      const input: Record<string, unknown> = {}
      if (item.label !== undefined) input.label = String(item.label)
      if (item.description !== undefined) input.description = item.description ? String(item.description) : null

      const { data, error } = await updateCategory(ctx.supabase, String(item.id), ctx.studyId, input as any)
      if (error) throw error
      return data
    },
    removeFn: async (item) => {
      const { error } = await deleteCategory(ctx.supabase, String(item.id), ctx.studyId)
      if (error) throw error
    },
    listFn: async () => {
      const { data } = await listCategories(ctx.supabase, ctx.studyId)
      return data ?? []
    },
    replaceAllFn: async (newItems) => {
      const catsWithIds = newItems.map((item, i) => ({
        id: crypto.randomUUID(),
        label: String(item.label || ''),
        description: item.description ? String(item.description) : null,
        position: i,
      }))
      const { data, error } = await bulkUpdateCategories(ctx.supabase, ctx.studyId, catsWithIds)
      if (error) throw error
      return data
    },
  })

  // Auto-enable showCategoryDescriptions when any category has a description
  if (result.dataChanged && !('error' in (result.result as Record<string, unknown>))) {
    const hasDescriptions = items.some((item) => item.description && String(item.description).trim().length > 0)
    if (hasDescriptions) {
      await autoEnableDescriptionToggle(ctx, 'showCategoryDescriptions')
      if (!result.dataChanged.includes('settings')) {
        result.dataChanged.push('settings', 'study')
      }
    }
  }

  return result
}

// ---------------------------------------------------------------------------
// Tree Test handlers
// ---------------------------------------------------------------------------

export async function handleManageTreeNodes(
  args: Record<string, unknown>,
  ctx: WriteToolContext,
  executeManageItems: ExecuteManageItemsFn,
): Promise<ToolExecutionResult> {
  const action = args.action as string
  const items = args.items as Record<string, unknown>[]

  if (!action || !items) {
    return { result: { error: 'Missing required fields: action, items' } }
  }

  if (action === 'replace_all') {
    return handleReplaceAllTreeNodes(items, ctx)
  }

  return executeManageItems({
    action,
    items,
    ctx,
    dataChangedSections: ['tree_nodes'],
    addFn: async (item) => {
      const { data, error } = await createTreeNode(ctx.supabase, ctx.studyId, {
        label: String(item.label || ''),
        parent_id: item.parent_id ? String(item.parent_id) : null,
      })
      if (error) throw error
      return data
    },
    updateFn: async (item) => {
      const input: Record<string, unknown> = {}
      if (item.label !== undefined) input.label = String(item.label)
      if (item.parent_id !== undefined) input.parent_id = item.parent_id ? String(item.parent_id) : null

      const { data, error } = await updateTreeNode(ctx.supabase, String(item.id), ctx.studyId, input as any)
      if (error) throw error
      return data
    },
    removeFn: async (item) => {
      const { error } = await deleteTreeNode(ctx.supabase, String(item.id), ctx.studyId)
      if (error) throw error
    },
    listFn: async () => {
      const { data } = await listTreeNodes(ctx.supabase, ctx.studyId)
      return data ?? []
    },
  })
}

async function handleReplaceAllTreeNodes(
  items: Record<string, unknown>[],
  ctx: WriteToolContext,
): Promise<ToolExecutionResult> {
  const tempIdMap = new Map<string, string>()
  const nodesWithIds = items.map((item, i) => {
    const realId = crypto.randomUUID()
    if (item.temp_id) {
      tempIdMap.set(String(item.temp_id), realId)
    }
    return {
      id: realId,
      label: String(item.label || ''),
      parent_id: item.parent_id ? String(item.parent_id) : null,
      position: i,
      _tempId: item.temp_id ? String(item.temp_id) : undefined,
    }
  })

  for (const node of nodesWithIds) {
    if (node.parent_id && tempIdMap.has(node.parent_id)) {
      node.parent_id = tempIdMap.get(node.parent_id)!
    }
  }

  const bulkData = nodesWithIds.map(({ _tempId, ...rest }) => rest)
  const { data, error } = await bulkUpdateTreeNodes(ctx.supabase, ctx.studyId, bulkData)
  if (error) {
    return { result: { error: `Failed to replace tree nodes: ${error.message}` } }
  }

  const idMapping = nodesWithIds
    .filter((n) => n._tempId)
    .map((n) => ({ temp_id: n._tempId, id: n.id, label: n.label }))

  return {
    result: {
      success: true,
      action: 'replace_all',
      count: data?.length ?? 0,
      id_mapping: idMapping.length > 0 ? idMapping : undefined,
    },
    dataChanged: ['tree_nodes'],
  }
}

export async function handleManageTreeTestTasks(
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
    dataChangedSections: ['tasks'],
    addFn: async (item) => {
      const { data, error } = await createTask(ctx.supabase, ctx.studyId, {
        question: String(item.title || ''),
        correct_node_id: item.correct_node_id ? String(item.correct_node_id) : null,
      })
      if (error) throw error
      return data
    },
    updateFn: async (item) => {
      const input: Record<string, unknown> = {}
      if (item.title !== undefined) input.question = String(item.title)
      if (item.correct_node_id !== undefined) input.correct_node_id = item.correct_node_id ? String(item.correct_node_id) : null

      const { data, error } = await updateTask(ctx.supabase, String(item.id), ctx.studyId, input as any)
      if (error) throw error
      return data
    },
    removeFn: async (item) => {
      const { error } = await deleteTask(ctx.supabase, String(item.id), ctx.studyId)
      if (error) throw error
    },
    listFn: async () => {
      const { data } = await listTasks(ctx.supabase, ctx.studyId)
      return data ?? []
    },
  })
}

// ---------------------------------------------------------------------------
// Survey handlers
// ---------------------------------------------------------------------------

export async function handleManageCustomSections(
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
    dataChangedSections: ['custom_sections'],
    addFn: async (item) => {
      const { data, error } = await createSurveySection(ctx.supabase, ctx.studyId, {
        name: String(item.name || ''),
        description: item.description ? String(item.description) : null,
      })
      if (error) throw error
      return data
    },
    updateFn: async (item) => {
      const input: Record<string, unknown> = {}
      if (item.name !== undefined) input.name = String(item.name)
      if (item.description !== undefined) input.description = item.description ? String(item.description) : null
      if (item.is_visible !== undefined) input.is_visible = Boolean(item.is_visible)

      const { data, error } = await updateSurveySection(ctx.supabase, String(item.id), input as any)
      if (error) throw error
      return data
    },
    removeFn: async (item) => {
      const { error } = await deleteSurveySection(ctx.supabase, String(item.id))
      if (error) throw error
    },
    listFn: async () => {
      const { data } = await listSurveySections(ctx.supabase, ctx.studyId)
      return data ?? []
    },
  })
}

export async function handleManageABTests(
  args: Record<string, unknown>,
  ctx: WriteToolContext,
): Promise<ToolExecutionResult> {
  const action = args.action as string
  const items = (args.items as Record<string, unknown>[]) ?? []

  if (!action) {
    return { result: { error: 'Missing required field: action' } }
  }

  if (action === 'list') {
    const { data, error } = await getABTestsForStudy(ctx.supabase, ctx.studyId)
    if (error) {
      return { result: { error: `Failed to list A/B tests: ${error.message}` } }
    }
    return { result: { success: true, action: 'list', count: data.length, items: data } }
  }

  if (!items || items.length === 0) {
    return { result: { error: 'Missing required field: items' } }
  }

  try {
    switch (action) {
      case 'add': {
        const results = []
        for (const item of items) {
          if (!item.question_id) {
            return { result: { error: 'question_id is required for add action' } }
          }

          const { data: question } = await ctx.supabase
            .from('study_flow_questions')
            .select('question_text,description,config')
            .eq('id', String(item.question_id))
            .eq('study_id', ctx.studyId)
            .single()

          if (!question) {
            return { result: { error: `Question not found: ${item.question_id}` } }
          }

          const variantA = {
            question_text: question.question_text,
            description: question.description,
            config: question.config,
          }

          const { data, error } = await createABTest(ctx.supabase, {
            study_id: ctx.studyId,
            entity_type: 'question',
            entity_id: String(item.question_id),
            variant_a_content: variantA as any,
            variant_b_content: (item.variant_b_content ?? {}) as any,
            split_percentage: typeof item.split_percentage === 'number' ? item.split_percentage : 50,
            is_enabled: item.is_enabled !== false,
          })
          if (error) throw error
          results.push(data)
        }
        return {
          result: { success: true, action: 'add', count: results.length, items: results },
          dataChanged: ['ab_tests'],
        }
      }

      case 'update': {
        const results = []
        for (const item of items) {
          if (!item.id) {
            return { result: { error: 'id is required for update action' } }
          }
          const input: Record<string, unknown> = {}
          if (item.variant_b_content !== undefined) input.variant_b_content = item.variant_b_content
          if (item.split_percentage !== undefined) input.split_percentage = item.split_percentage
          if (item.is_enabled !== undefined) input.is_enabled = item.is_enabled

          const { data, error } = await updateABTest(ctx.supabase, String(item.id), input as any)
          if (error) throw error
          results.push(data)
        }
        return {
          result: { success: true, action: 'update', count: results.length, items: results },
          dataChanged: ['ab_tests'],
        }
      }

      case 'remove': {
        for (const item of items) {
          if (!item.id) {
            return { result: { error: 'id is required for remove action' } }
          }
          const { error } = await deleteABTest(ctx.supabase, String(item.id))
          if (error) throw error
        }
        return {
          result: { success: true, action: 'remove', count: items.length },
          dataChanged: ['ab_tests'],
        }
      }

      default:
        return { result: { error: `Unknown action: ${action}. Use "add", "update", "remove", or "list".` } }
    }
  } catch (err) {
    return { result: { error: `A/B test operation failed: ${err instanceof Error ? err.message : 'unknown error'}` } }
  }
}

