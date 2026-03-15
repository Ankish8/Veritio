/**
 * Create-mode gates: force-break the LLM loop with synthetic responses
 * containing contextual suggestion chips after specific tool executions.
 */

import { addMessage } from '../../../services/assistant/conversation-service'
import { draftCache } from '../../../services/assistant/draft-cache'
import type { SSEEvent } from '../../../services/assistant/types'
import type { ToolExecutionContext } from './chat-tool-execution'
import { executeOneToolCall } from './chat-tool-execution'

export const DRAFT_PREVIEW_TOOLS = new Set([
  'preview_cards', 'preview_categories', 'preview_settings',
  'preview_tree_nodes', 'preview_tree_tasks',
  'preview_survey_questions',
  'preview_first_click_tasks',
  'preview_first_impression_designs',
  'preview_prototype_tasks',
  'preview_live_website_tasks',
])

export const FLOW_CONFIG_TOOLS = new Set(['configure_flow_section', 'configure_flow_questions', 'configure_participant_id'])

/** Handle the set_draft_basics gate: execute only set_draft_basics, drop the rest, force-break with chips */
export async function handleDraftBasicsGate(
  toolCallsDetected: any[],
  ctx: ToolExecutionContext,
): Promise<SSEEvent[]> {
  // Execute only set_draft_basics, drop everything else
  for (let i = 0; i < toolCallsDetected.length; i++) {
    const tc = toolCallsDetected[i]
    if (tc.function.name === 'set_draft_basics') {
      await executeOneToolCall(tc, ctx, i)
    } else {
      const dropResult = JSON.stringify({ skipped: true, reason: 'Dropped — user must provide card names first.' })
      ctx.openaiMessages.push({ role: 'tool', content: dropResult, tool_call_id: tc.id })
      await addMessage(ctx.supabase, ctx.conversationId, 'tool', dropResult, { toolCallId: tc.id })
      ctx.logger.info('Dropped tool call after set_draft_basics', { droppedTool: tc.function.name })
    }
  }

  // Determine study type from the executed set_draft_basics result
  const draftBasicsResult = (() => {
    try {
      const tc = toolCallsDetected.find((t: any) => t.function.name === 'set_draft_basics')
      return tc ? JSON.parse(tc.function.arguments || '{}') : {}
    } catch { return {} }
  })()
  const draftStudyType = draftBasicsResult.study_type as string | undefined

  const BUILDER_ONLY_TYPES = new Set(['prototype_test', 'first_click', 'first_impression'])
  const isBuilderOnly = draftStudyType && BUILDER_ONLY_TYPES.has(draftStudyType)

  const BUILDER_ONLY_MESSAGES: Record<string, string> = {
    prototype_test: 'Prototype tests require a Figma prototype to be connected, which is done in the builder. I\'ll create the study with these details — you can connect your Figma file and set up tasks in the builder.',
    first_click: 'First click tests require images for each task, which are uploaded in the builder. I\'ll create the study with these details — you can add images and tasks in the builder.',
    first_impression: 'First impression tests require design images, which are uploaded in the builder. I\'ll create the study with these details — you can add designs in the builder.',
  }

  let draftMsg: string
  let draftSuggestions: string[]
  if (isBuilderOnly) {
    draftMsg = BUILDER_ONLY_MESSAGES[draftStudyType] ?? 'This study type is best set up in the builder.'
    draftSuggestions = ['Create and open in Builder', 'Add description first']
  } else {
    draftMsg = 'Review the study details above, then continue.'
    const DRAFT_BASICS_CHIPS: Record<string, string[]> = {
      card_sort: ['Suggest cards for me', "I'll type my own"],
      tree_test: ['Suggest a tree structure', "I'll describe my structure"],
      survey: ['Suggest questions for me', "I'll write my own"],
      live_website_test: ["I'll provide the URL", 'Help me plan tasks'],
    }
    draftSuggestions = (draftStudyType && DRAFT_BASICS_CHIPS[draftStudyType]) || ['Continue']
  }

  const draftMetadata = { type: 'text' as const, suggestions: draftSuggestions }
  const assistantMsg = await addMessage(ctx.supabase, ctx.conversationId, 'assistant', draftMsg, { metadata: draftMetadata })
  const draftTextEvt: SSEEvent = { type: 'text_delta', content: draftMsg }
  const draftDoneEvt: SSEEvent = { type: 'message_complete', messageId: assistantMsg.id, conversationId: ctx.conversationId, content: draftMsg, metadata: draftMetadata }
  ctx.events.push(draftTextEvt, draftDoneEvt)
  await ctx.pushEvent(draftTextEvt)
  ctx.pushEvent(draftDoneEvt)
  ctx.logger.info('[chat] set_draft_basics gate: forced break with synthetic response', { isBuilderOnly })

  return ctx.events
}

/** Handle the study creation gate: force-break with flow section chips */
export async function handleStudyCreatedGate(ctx: ToolExecutionContext): Promise<void> {
  const BUILDER_ONLY_STUDY_TYPES = new Set(['prototype_test', 'first_click', 'first_impression'])
  const isBuilderOnlyStudy = ctx.currentStudyType && BUILDER_ONLY_STUDY_TYPES.has(ctx.currentStudyType)

  let createChipMsg: string
  let createChips: string[]
  if (isBuilderOnlyStudy) {
    createChipMsg = 'Your study is created! Open the builder to connect your content and finish setting up.'
    createChips = ['Open in Builder']
  } else {
    createChipMsg = 'Your study is created! You can now configure the participant journey:'
    createChips = ['Welcome message', 'Participant agreement', 'Screening questions', 'Participant identifier', 'Pre-study questions', 'Post-study questions', 'Thank you message', 'Save to Builder']
  }

  const createMetadata = { type: 'text' as const, suggestions: createChips }
  const createMsg = await addMessage(ctx.supabase, ctx.conversationId, 'assistant', createChipMsg, { metadata: createMetadata })
  const createTextEvt: SSEEvent = { type: 'text_delta', content: createChipMsg }
  const createDoneEvt: SSEEvent = { type: 'message_complete', messageId: createMsg.id, conversationId: ctx.conversationId, content: createChipMsg, metadata: createMetadata }
  ctx.events.push(createTextEvt, createDoneEvt)
  await ctx.pushEvent(createTextEvt)
  ctx.pushEvent(createDoneEvt)
  ctx.logger.info('[chat] create_complete_study gate: forced break', { isBuilderOnlyStudy })
}

/** Handle the draft preview gate: force-break with next-step chips */
export async function handleDraftPreviewGate(toolCallsDetected: any[], ctx: ToolExecutionContext): Promise<void> {
  const draft = ctx.conversationId ? draftCache.get(ctx.conversationId) as any : null
  const draftType = draft?.studyType as string | undefined
  const sortMode = draft?.settings?.mode as string | undefined
  const hasCards = (draft?.cards?.length ?? 0) > 0
  const hasCategories = (draft?.categories?.length ?? 0) > 0
  const isClosed = sortMode === 'closed' || sortMode === 'hybrid'

  const lastPreviewTool = toolCallsDetected.find((tc: any) => DRAFT_PREVIEW_TOOLS.has(tc.function.name))?.function.name
  let chipMsg = 'Edit the items above if needed, then choose a next step.'
  let chips: string[] = []

  if (lastPreviewTool === 'preview_cards') {
    chipMsg = 'Edit the cards above if needed, then choose a next step.'
    chips = isClosed
      ? ['Suggest categories', 'Configure settings', 'Looks good, create it!']
      : ['Configure settings', 'Looks good, create it!']
  } else if (lastPreviewTool === 'preview_categories') {
    chipMsg = 'Edit the categories above if needed, then choose a next step.'
    chips = ['Configure settings', 'Looks good, create it!']
  } else if (lastPreviewTool === 'preview_tree_nodes') {
    chipMsg = 'Edit the tree above if needed, then choose a next step.'
    chips = ['Suggest tasks', 'Configure settings', 'Looks good, create it!']
  } else if (lastPreviewTool === 'preview_tree_tasks') {
    chipMsg = 'Edit the tasks above if needed, then choose a next step.'
    chips = ['Review tree', 'Configure settings', 'Looks good, create it!']
  } else if (lastPreviewTool === 'preview_survey_questions') {
    chipMsg = 'Edit the questions above if needed, then choose a next step.'
    chips = ['Configure settings', 'Looks good, create it!']
  } else if (lastPreviewTool === 'preview_first_click_tasks') {
    chipMsg = 'Edit the tasks above if needed, then choose a next step.'
    chips = ['Configure settings', 'Looks good, create it!']
  } else if (lastPreviewTool === 'preview_first_impression_designs') {
    chipMsg = 'Edit the designs above if needed, then choose a next step.'
    chips = ['Configure settings', 'Looks good, create it!']
  } else if (lastPreviewTool === 'preview_prototype_tasks') {
    chipMsg = 'Edit the tasks above if needed, then choose a next step.'
    chips = ['Configure settings', 'Looks good, create it!']
  } else if (lastPreviewTool === 'preview_live_website_tasks') {
    chipMsg = 'Edit the tasks above if needed, then choose a next step.'
    chips = ['Configure settings', 'Looks good, create it!']
  } else if (lastPreviewTool === 'preview_settings') {
    chipMsg = 'Toggle settings above if needed.'
    if (draftType === 'card_sort') {
      chips = hasCards
        ? (isClosed && !hasCategories ? ['Review cards', 'Suggest categories', 'Looks good, create it!'] : ['Review cards', 'Looks good, create it!'])
        : ['Suggest cards for me', "I'll type my own"]
    } else if (draftType === 'tree_test') {
      chips = (draft?.nodes?.length ?? 0) > 0
        ? ['Review tree', 'Review tasks', 'Looks good, create it!']
        : ['Suggest a tree structure', "I'll describe my structure"]
    } else if (draftType === 'survey') {
      chips = (draft?.questions?.length ?? 0) > 0
        ? ['Review questions', 'Looks good, create it!']
        : ['Suggest questions for me', "I'll write my own"]
    } else if (draftType === 'first_click') {
      chips = (draft?.tasks?.length ?? 0) > 0
        ? ['Review tasks', 'Looks good, create it!']
        : ['I have images to upload', 'Help me plan tasks']
    } else if (draftType === 'first_impression') {
      chips = (draft?.designs?.length ?? 0) > 0
        ? ['Review designs', 'Looks good, create it!']
        : ['I have designs to upload', 'Help me plan']
    } else if (draftType === 'prototype_test') {
      chips = (draft?.prototypeTasks?.length ?? 0) > 0
        ? ['Review tasks', 'Looks good, create it!']
        : ["I'll describe my tasks", 'Help me plan tasks']
    } else if (draftType === 'live_website_test') {
      chips = (draft?.tasks?.length ?? 0) > 0
        ? ['Review tasks', 'Looks good, create it!']
        : ["I'll provide the URL", 'Help me plan tasks']
    } else {
      chips = ['Looks good, create it!']
    }
  }

  const previewMetadata = { type: 'text' as const, suggestions: chips }
  const previewMsg = await addMessage(ctx.supabase, ctx.conversationId, 'assistant', chipMsg, { metadata: previewMetadata })
  const previewTextEvt: SSEEvent = { type: 'text_delta', content: chipMsg }
  const previewDoneEvt: SSEEvent = { type: 'message_complete', messageId: previewMsg.id, conversationId: ctx.conversationId, content: chipMsg, metadata: previewMetadata }
  ctx.events.push(previewTextEvt, previewDoneEvt)
  await ctx.pushEvent(previewTextEvt)
  ctx.pushEvent(previewDoneEvt)
  ctx.logger.info('[chat] Draft preview gate: forced break with next-step chips', { lastPreviewTool, chips })
}

/** Handle the flow config gate: force-break with next-step chips */
export async function handleFlowConfigGate(toolCallsDetected: any[], ctx: ToolExecutionContext): Promise<void> {
  const lastFlowTool = toolCallsDetected.find((tc: any) => FLOW_CONFIG_TOOLS.has(tc.function.name))
  const toolArgs = (() => { try { return JSON.parse(lastFlowTool?.function?.arguments || '{}') } catch { return {} } })()
  const configuredSection = lastFlowTool?.function?.name === 'configure_participant_id'
    ? 'identifier'
    : (toolArgs.section || '')

  const FLOW_ORDER = [
    { key: 'welcome', chip: 'Welcome message' },
    { key: 'agreement', chip: 'Participant agreement' },
    { key: 'screening', chip: 'Screening questions' },
    { key: 'identifier', chip: 'Participant identifier' },
    { key: 'pre_study', chip: 'Pre-study questions' },
    { key: 'post_study', chip: 'Post-study questions' },
    { key: 'thank_you', chip: 'Thank you message' },
  ]

  const currentIdx = FLOW_ORDER.findIndex((s) => s.key === configuredSection)
  const remaining = currentIdx >= 0
    ? FLOW_ORDER.slice(currentIdx + 1).map((s) => s.chip)
    : FLOW_ORDER.map((s) => s.chip)
  const flowChips = [...remaining.slice(0, 3), 'Save to Builder']

  const sectionLabel = FLOW_ORDER.find((s) => s.key === configuredSection)?.chip || 'section'
  const flowChipMsg = `${sectionLabel} configured. Edit the details above if needed, then choose a next step.`
  const flowChipMetadata = { type: 'text' as const, suggestions: flowChips }
  const flowChipMsgRecord = await addMessage(ctx.supabase, ctx.conversationId, 'assistant', flowChipMsg, { metadata: flowChipMetadata })
  const flowTextEvt: SSEEvent = { type: 'text_delta', content: flowChipMsg }
  const flowDoneEvt: SSEEvent = { type: 'message_complete', messageId: flowChipMsgRecord.id, conversationId: ctx.conversationId, content: flowChipMsg, metadata: flowChipMetadata }
  ctx.events.push(flowTextEvt, flowDoneEvt)
  await ctx.pushEvent(flowTextEvt)
  ctx.pushEvent(flowDoneEvt)
  ctx.logger.info('[chat] Flow config gate: forced break with next-step chips', { configuredSection, flowChips })
}
