/**
 * Veritio AI Assistant — Builder Write Tool Handlers
 *
 * Tools for the 'builder' mode that MODIFY study configuration:
 * update metadata, settings, and study-type-specific content.
 * Each handler calls existing services (same code paths as API steps).
 *
 * This is the entry point — study-type handlers and normalizers live in
 * co-located files for maintainability:
 *   - builder-write-normalizers.ts    — data normalization utilities
 *   - builder-write-study-type-handlers.ts — per-study-type CRUD handlers
 *   - builder-write-flow-handlers.ts  — flow configuration (Phase 3)
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { BuilderWriteToolName, ToolExecutionResult } from './types'
import { updateStudy } from '../study-service'
import { createFlowQuestion, updateFlowQuestion, deleteFlowQuestion, listFlowQuestions } from '../flow-question-service'
import {
  deepMerge,
  prepareQuestionData,
  prepareConfig,
  normalizeBranchingLogic,
  normalizeOptionLabels,
  ensureOptionIds,
  mergeItemLevelArrays,
} from './builder-write-normalizers'
import {
  handleManageCards,
  handleManageCategories,
  handleManageTreeNodes,
  handleManageTreeTestTasks,
  handleManageCustomSections,
  handleManageABTests,
} from './builder-write-content-handlers'
import {
  handleManagePrototypeTasks,
  handleManageFirstClickTasks,
  handleManageFirstImpressionDesigns,
  handleManageLiveWebsiteTasks,
  handleManageSurveyRules,
} from './builder-write-study-type-handlers'
import {
  handleConfigureFlowSection,
  handleConfigureFlowQuestions,
  handleConfigureParticipantId,
  autoEnableFlowSection,
} from './builder-write-flow-handlers'

// Re-export normalizers that are used by other files (e.g. chat.step.ts)
export { prepareQuestionData, normalizeBranchingLogic } from './builder-write-normalizers'

/** Motia state manager interface (subset of full StateManager) */
interface StateManager {
  get(groupId: string, key: string): Promise<unknown>
  set(groupId: string, key: string, value: unknown): Promise<void>
  delete(groupId: string, key: string): Promise<void>
}

export interface WriteToolContext {
  supabase: SupabaseClient
  studyId: string
  userId: string
  /** Motia state manager — used by flow config tools to defer writes */
  state?: StateManager
  /** Conversation ID — used as Motia state group key for flow config */
  conversationId?: string
}

// Tool handler type for router map
type ToolHandler = (args: Record<string, unknown>, ctx: WriteToolContext) => Promise<ToolExecutionResult>

// Type for executeManageItems, exported for use by study-type handlers
export interface ManageItemsConfig {
  action: string
  items: Record<string, unknown>[]
  ctx: WriteToolContext
  dataChangedSections: string[]
  addFn?: (item: Record<string, unknown>) => Promise<unknown>
  updateFn?: (item: Record<string, unknown>) => Promise<unknown>
  removeFn?: (item: Record<string, unknown>) => Promise<void>
  listFn?: () => Promise<unknown[]>
  replaceAllFn?: (items: Record<string, unknown>[]) => Promise<unknown>
}

export type ExecuteManageItemsFn = (config: ManageItemsConfig) => Promise<ToolExecutionResult>

/**
 * Auto-enable a description toggle in study settings when items with descriptions are created.
 * Only updates if the setting is currently false/undefined — never disables it.
 */
async function autoEnableDescriptionToggle(ctx: WriteToolContext, settingKey: 'showCardDescriptions' | 'showCategoryDescriptions'): Promise<void> {
  try {
    const { data: study } = await ctx.supabase
      .from('studies')
      .select('settings')
      .eq('id', ctx.studyId)
      .single()
    const currentSettings = (study?.settings as Record<string, unknown>) ?? {}
    if (currentSettings[settingKey] === true) return // Already enabled
    await updateStudy(ctx.supabase, ctx.studyId, ctx.userId, {
      settings: { ...currentSettings, [settingKey]: true },
    })
  } catch {
    // Non-critical — descriptions are still saved, just toggle stays off
  }
}

// Centralized router map
const TOOL_HANDLERS: Record<BuilderWriteToolName, ToolHandler> = {
  // Common
  update_study: handleUpdateStudy,
  update_study_settings: handleUpdateStudySettings,
  manage_flow_questions: handleManageFlowQuestions,
  // Card sort
  manage_cards: (args, ctx) => handleManageCards(args, ctx, executeManageItems, autoEnableDescriptionToggle),
  manage_categories: (args, ctx) => handleManageCategories(args, ctx, executeManageItems, autoEnableDescriptionToggle),
  // Tree test
  manage_tree_nodes: (args, ctx) => handleManageTreeNodes(args, ctx, executeManageItems),
  manage_tree_test_tasks: (args, ctx) => handleManageTreeTestTasks(args, ctx, executeManageItems),
  // Survey
  manage_survey_questions: handleManageSurveyQuestions,
  manage_custom_sections: (args, ctx) => handleManageCustomSections(args, ctx, executeManageItems),
  manage_ab_tests: handleManageABTests,
  manage_survey_rules: handleManageSurveyRules,
  // Prototype test
  manage_prototype_tasks: (args, ctx) => handleManagePrototypeTasks(args, ctx, executeManageItems),
  // First click
  manage_first_click_tasks: (args, ctx) => handleManageFirstClickTasks(args, ctx, executeManageItems),
  // First impression
  manage_first_impression_designs: (args, ctx) => handleManageFirstImpressionDesigns(args, ctx, executeManageItems),
  // Live website test
  manage_live_website_tasks: handleManageLiveWebsiteTasks,
  // Flow configuration (Phase 3 — interactive generative UI)
  configure_flow_section: handleConfigureFlowSection,
  configure_flow_questions: handleConfigureFlowQuestions,
  configure_participant_id: handleConfigureParticipantId,
}

/**
 * Route a builder write tool call to the appropriate handler.
 */
export async function executeBuilderWriteTool(
  toolName: BuilderWriteToolName,
  args: Record<string, unknown>,
  ctx: WriteToolContext,
): Promise<ToolExecutionResult> {
  const handler = TOOL_HANDLERS[toolName]
  if (!handler) {
    return { result: { error: `Unknown builder write tool: ${toolName}` } }
  }
  return handler(args, ctx)
}

// ---------------------------------------------------------------------------
// Common write handlers
// ---------------------------------------------------------------------------

async function handleUpdateStudy(
  args: Record<string, unknown>,
  ctx: WriteToolContext,
): Promise<ToolExecutionResult> {
  const input: Record<string, unknown> = {}
  if (args.title !== undefined) input.title = String(args.title)
  if (args.description !== undefined) input.description = args.description ? String(args.description) : null
  if (args.purpose !== undefined) input.purpose = args.purpose ? String(args.purpose) : null
  if (args.participant_requirements !== undefined) input.participant_requirements = args.participant_requirements ? String(args.participant_requirements) : null
  if (args.language !== undefined) input.language = String(args.language)
  if (args.password !== undefined) input.password = args.password ? String(args.password) : null
  if (args.url_slug !== undefined) input.url_slug = args.url_slug ? String(args.url_slug) : null

  if (Object.keys(input).length === 0) {
    return { result: { error: 'No fields provided to update' } }
  }

  const { data, error } = await updateStudy(ctx.supabase, ctx.studyId, ctx.userId, input as any)
  if (error) {
    return { result: { error: `Failed to update study: ${error.message}` } }
  }

  return {
    result: {
      success: true,
      updated: Object.keys(input),
      study: { title: data!.title, description: data!.description, status: data!.status },
    },
    dataChanged: ['study'],
    dataPayload: { study: data },
  }
}

async function handleUpdateStudySettings(
  args: Record<string, unknown>,
  ctx: WriteToolContext,
): Promise<ToolExecutionResult> {
  const updateInput: Record<string, unknown> = {}
  const changedSections: string[] = ['settings']

  // Deep-merge settings with existing
  if (args.settings && typeof args.settings === 'object') {
    const { data: study } = await ctx.supabase
      .from('studies')
      .select('settings')
      .eq('id', ctx.studyId)
      .single()

    const currentSettings = (study?.settings as Record<string, unknown>) ?? {}
    const mergedSettings = deepMerge(currentSettings, args.settings as Record<string, unknown>)
    updateInput.settings = mergedSettings
  }

  if (args.closing_rules !== undefined) updateInput.closing_rule = args.closing_rules
  if (args.branding !== undefined) updateInput.branding = args.branding

  if (Object.keys(updateInput).length === 0) {
    return { result: { error: 'No settings provided to update' } }
  }

  const { data: _data, error } = await updateStudy(ctx.supabase, ctx.studyId, ctx.userId, updateInput as any)
  if (error) {
    return { result: { error: `Failed to update settings: ${error.message}` } }
  }

  return {
    result: { success: true, updated: Object.keys(updateInput) },
    dataChanged: changedSections,
    dataPayload: updateInput.settings ? { settings: updateInput.settings } : undefined,
  }
}

async function handleManageFlowQuestions(
  args: Record<string, unknown>,
  ctx: WriteToolContext,
): Promise<ToolExecutionResult> {
  const action = args.action as string
  const section = args.section as 'screening' | 'pre_study' | 'post_study'
  const items = args.items as Record<string, unknown>[]

  if (!action || !section || !items) {
    return { result: { error: 'Missing required fields: action, section, items' } }
  }

  // Auto-enable section whenever questions are being written (add, update, replace_all).
  // The LLM may use any action to populate an empty section — always ensure the toggle is on.
  let settingsChanged = false
  if (action !== 'remove') {
    settingsChanged = await autoEnableFlowSection(ctx, section)
  }

  const dataChangedSections = settingsChanged ? ['flow_questions', 'settings'] : ['flow_questions']

  return executeManageItems({
    action,
    items,
    ctx,
    dataChangedSections,
    addFn: async (item) => {
      const { questionType, config } = prepareQuestionData(item)
      const { data, error } = await createFlowQuestion(ctx.supabase, ctx.studyId, {
        section,
        question_type: questionType,
        question_text: String(item.question_text || ''),
        description: item.description ? String(item.description) : null,
        is_required: item.is_required !== false,
        config,
        display_logic: (item.display_logic as Record<string, unknown>) ?? undefined,
        branching_logic: normalizeBranchingLogic(
          (item.branching_logic as Record<string, unknown>) ?? undefined,
          questionType,
          config,
        ) ?? undefined,
        survey_branching_logic: (item.survey_branching_logic as Record<string, unknown>) ?? undefined,
        custom_section_id: item.custom_section_id ? String(item.custom_section_id) : undefined,
      })
      if (error) throw error
      return data
    },
    updateFn: async (item) => {
      const input: Record<string, unknown> = {}

      if (item.question_type !== undefined) {
        const { questionType, config } = prepareQuestionData(item)
        input.question_type = questionType
        input.config = config
      } else if (item.config !== undefined) {
        input.config = prepareConfig(item, item.config as Record<string, unknown>)
      } else {
        // LLM may send options at item level
        const merged = mergeItemLevelArrays(item, {})
        if (Object.keys(merged).length > 0) {
          input.config = ensureOptionIds(normalizeOptionLabels(merged))
        }
      }

      if (item.question_text !== undefined) input.question_text = String(item.question_text)
      if (item.description !== undefined) input.description = item.description ? String(item.description) : null
      if (item.is_required !== undefined) input.is_required = Boolean(item.is_required)
      if (item.display_logic !== undefined) input.display_logic = item.display_logic as Record<string, unknown> | null
      if (item.branching_logic !== undefined) {
        const qType = String(item.question_type ?? input.question_type ?? '')
        const cfg = (input.config ?? {}) as Record<string, unknown>
        input.branching_logic = normalizeBranchingLogic(
          item.branching_logic as Record<string, unknown> | null,
          qType,
          cfg,
        )
      }
      if (item.survey_branching_logic !== undefined) input.survey_branching_logic = item.survey_branching_logic as Record<string, unknown> | null
      if (item.custom_section_id !== undefined) input.custom_section_id = item.custom_section_id ? String(item.custom_section_id) : null

      const { data, error } = await updateFlowQuestion(ctx.supabase, String(item.id), ctx.studyId, input as any)
      if (error) throw error
      return data
    },
    removeFn: async (item) => {
      const { error } = await deleteFlowQuestion(ctx.supabase, String(item.id), ctx.studyId)
      if (error) throw error
    },
    listFn: async () => {
      const { data } = await listFlowQuestions(ctx.supabase, ctx.studyId, section)
      return data ?? []
    },
    replaceAllFn: async (newItems) => {
      // Delete all existing, then add new
      const { data: existing } = await listFlowQuestions(ctx.supabase, ctx.studyId, section)
      for (const q of existing ?? []) {
        await deleteFlowQuestion(ctx.supabase, q.id, ctx.studyId)
      }

      const results = []
      for (let i = 0; i < newItems.length; i++) {
        const item = newItems[i]
        const { questionType, config } = prepareQuestionData(item)
        const { data, error } = await createFlowQuestion(ctx.supabase, ctx.studyId, {
          section,
          question_type: questionType,
          question_text: String(item.question_text || ''),
          description: item.description ? String(item.description) : null,
          is_required: item.is_required !== false,
          config,
          display_logic: (item.display_logic as Record<string, unknown>) ?? undefined,
          branching_logic: normalizeBranchingLogic(
            (item.branching_logic as Record<string, unknown>) ?? undefined,
            questionType,
            config,
          ) ?? undefined,
          survey_branching_logic: (item.survey_branching_logic as Record<string, unknown>) ?? undefined,
          custom_section_id: item.custom_section_id ? String(item.custom_section_id) : undefined,
          position: i,
        })
        if (error) throw error
        results.push(data)
      }
      return results
    },
  })
}

async function handleManageSurveyQuestions(
  args: Record<string, unknown>,
  ctx: WriteToolContext,
): Promise<ToolExecutionResult> {
  // Survey questions use flow_questions with section='survey'
  return handleManageFlowQuestions(
    { action: args.action, section: 'survey', items: args.items },
    ctx,
  )
}

// ---------------------------------------------------------------------------
// Generic manage items executor
// ---------------------------------------------------------------------------

async function executeManageItems(config: ManageItemsConfig): Promise<ToolExecutionResult> {
  const { action, items, dataChangedSections } = config

  try {
    switch (action) {
      case 'add': {
        if (!config.addFn) {
          return { result: { error: 'Add is not supported for this item type' } }
        }
        const results = []
        for (const item of items) {
          const result = await config.addFn(item)
          results.push(result)
        }
        return {
          result: { success: true, action: 'add', count: results.length, items: results },
          dataChanged: dataChangedSections,
        }
      }

      case 'update': {
        if (!config.updateFn) {
          return { result: { error: 'Update is not supported for this item type' } }
        }
        const missingIds = items.filter((i) => !i.id)
        if (missingIds.length > 0) {
          return { result: { error: 'All items must have an "id" field for update action' } }
        }
        const results = []
        for (const item of items) {
          const result = await config.updateFn(item)
          results.push(result)
        }
        return {
          result: { success: true, action: 'update', count: results.length, items: results },
          dataChanged: dataChangedSections,
        }
      }

      case 'remove': {
        if (!config.removeFn) {
          return { result: { error: 'Remove is not supported for this item type' } }
        }
        const missingIds = items.filter((i) => !i.id)
        if (missingIds.length > 0) {
          return { result: { error: 'All items must have an "id" field for remove action' } }
        }
        for (const item of items) {
          await config.removeFn(item)
        }
        return {
          result: { success: true, action: 'remove', count: items.length },
          dataChanged: dataChangedSections,
        }
      }

      case 'replace_all': {
        if (config.replaceAllFn) {
          const result = await config.replaceAllFn(items)
          return {
            result: { success: true, action: 'replace_all', count: items.length, items: result },
            dataChanged: dataChangedSections,
          }
        }
        // Fallback: delete all then add
        if (!config.addFn || !config.listFn || !config.removeFn) {
          return { result: { error: 'Replace all is not supported for this item type' } }
        }
        const existing = await config.listFn()
        for (const item of existing as { id: string }[]) {
          await config.removeFn({ id: item.id })
        }
        const results = []
        for (const item of items) {
          const result = await config.addFn(item)
          results.push(result)
        }
        return {
          result: { success: true, action: 'replace_all', count: results.length, items: results },
          dataChanged: dataChangedSections,
        }
      }

      default:
        return { result: { error: `Unknown action: ${action}. Use "add", "update", "remove", or "replace_all".` } }
    }
  } catch (err) {
    return { result: { error: `Operation failed: ${err instanceof Error ? err.message : 'unknown error'}` } }
  }
}
