import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { addMessage } from '../../../services/assistant/conversation-service'
import { draftCache } from '../../../services/assistant/draft-cache'

const bodySchema = z.object({
  conversationId: z.string().uuid(),
  componentId: z.string(),
  componentName: z.string(),
  state: z.record(z.unknown()),
})

export const config = {
  name: 'AssistantComponentState',
  description: 'Store updated component state from an interactable generative UI component',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/assistant/component-state',
    middleware: [authMiddleware, errorHandlerMiddleware],
    bodySchema: bodySchema as any,
  }],
  enqueues: [],
  flows: ['assistant'],
} satisfies StepConfig

/** Draft component names that should merge edits into Motia state */
const DRAFT_COMPONENT_STATE_KEYS: Record<string, string> = {
  DraftCardStack: 'cards',
  DraftCategoryList: 'categories',
  DraftSettingsPanel: 'settings',
}

export const handler = async (req: ApiRequest, { logger, state: motiaState }: ApiHandlerContext) => {
  const _userId = req.headers['x-user-id'] as string
  const { conversationId, componentId, componentName, state } = bodySchema.parse(req.body)
  const supabase = getMotiaSupabaseClient()

  // If this is a draft component, merge the edit into draftCache (same in-process store as create-tools.ts)
  if (componentName === 'DraftStudyDetails') {
    // DraftStudyDetails merges individual fields into draft root
    const details = (state as Record<string, unknown>).details as Record<string, unknown> | undefined
    if (details) {
      const draft = ((draftCache.get(conversationId)) ?? {}) as Record<string, unknown>
      if (details.title !== undefined) draft.title = details.title
      if (details.description !== undefined) draft.description = details.description
      if (details.sortMode !== undefined) {
        draft.settings = { ...((draft.settings as Record<string, unknown>) ?? {}), mode: details.sortMode }
      }
      if (details.purpose !== undefined) draft.purpose = details.purpose
      if (details.participantRequirements !== undefined) draft.participantRequirements = details.participantRequirements
      draftCache.set(conversationId, draft)
      logger.info('DraftStudyDetails state merged', { conversationId })
    }
  } else if (componentName === 'DraftLiveWebsiteTaskList') {
    const draft = ((draftCache.get(conversationId)) ?? {}) as Record<string, unknown>
    const tasks = (state as Record<string, unknown>).tasks
    if (tasks !== undefined) draft.liveWebsiteTasks = tasks
    const websiteUrl = (state as Record<string, unknown>).websiteUrl
    const mode = (state as Record<string, unknown>).mode
    if (websiteUrl !== undefined || mode !== undefined) {
      draft.settings = {
        ...((draft.settings as Record<string, unknown>) ?? {}),
        ...(websiteUrl !== undefined ? { websiteUrl } : {}),
        ...(mode !== undefined ? { mode } : {}),
      }
    }
    draftCache.set(conversationId, draft)
    logger.info('DraftLiveWebsiteTaskList state merged', { conversationId })
  } else {
    const draftKey = DRAFT_COMPONENT_STATE_KEYS[componentName]
    if (draftKey) {
      const draft = (draftCache.get(conversationId) ?? {}) as Record<string, unknown>
      draft[draftKey] = (state as Record<string, unknown>)[draftKey]
      draftCache.set(conversationId, draft)
      logger.info('Draft state merged', { conversationId, componentName, draftKey })
    }
  }

  // Phase 3 flow components — store edits in Motia state (deferred save)
  const FLOW_STATE_COMPONENTS = new Set(['DraftFlowSection', 'DraftParticipantId', 'DraftFlowQuestions'])
  if (FLOW_STATE_COMPONENTS.has(componentName) && motiaState) {
    try {
      const flowConfig = ((await motiaState.get(conversationId, 'flowConfig')) ?? {}) as Record<string, any>

      if (componentName === 'DraftFlowSection') {
        const flowSection = (state as Record<string, unknown>).flowSection as Record<string, unknown> | undefined
        if (flowSection) {
          const sectionType = flowSection.sectionType as string
          if (sectionType) {
            const { sectionType: _, ...sectionFields } = flowSection
            const sections = (flowConfig.sections ?? {}) as Record<string, any>
            sections[sectionType] = { ...((sections[sectionType] as Record<string, unknown>) ?? {}), ...sectionFields }
            flowConfig.sections = sections
          }
        }
      } else if (componentName === 'DraftParticipantId') {
        const participantId = (state as Record<string, unknown>).participantId as Record<string, unknown> | undefined
        if (participantId) {
          flowConfig.participantId = participantId
        }
      } else if (componentName === 'DraftFlowQuestions') {
        const questions = (state as Record<string, unknown>).questions as unknown[] | undefined
        const section = ((state as Record<string, unknown>).section as string) ?? 'screening'
        if (questions) {
          const flowQuestions = (flowConfig.questions ?? {}) as Record<string, any>
          flowQuestions[section] = questions
          flowConfig.questions = flowQuestions
          // Debug: log option labels being stored
          for (const q of questions as any[]) {
            const opts = q?.config?.options ?? q?.config?.items ?? []
            if (opts.length > 0) {
              logger.info('[DEBUG] DraftFlowQuestions option labels', {
                conversationId,
                questionText: q?.question_text,
                options: (opts as any[]).map((o: any) => o?.label ?? o),
              })
            }
          }
        }
        const sectionSettings = (state as Record<string, unknown>).sectionSettings as Record<string, unknown> | undefined
        if (sectionSettings) {
          const sections = (flowConfig.sections ?? {}) as Record<string, any>
          sections[section] = { ...((sections[section] as Record<string, unknown>) ?? {}), ...sectionSettings }
          flowConfig.sections = sections
        }
      }

      // Increment version so save-flow-config can detect concurrent edits
      flowConfig._version = ((flowConfig._version as number) ?? 0) + 1
      await motiaState.set(conversationId, 'flowConfig', flowConfig)
      logger.info('Flow component state stored in Motia state', { conversationId, componentName, version: flowConfig._version })
    } catch (err) {
      logger.error('Failed to store flow component in Motia state', { conversationId, componentName, error: err })
    }
  }

  // Store the component state as a system message in the conversation
  // so the next LLM turn can pick up user edits
  const stateContent = JSON.stringify({
    _componentStateUpdate: true,
    componentId,
    componentName,
    updatedState: state,
  })

  await addMessage(supabase, conversationId, 'system', stateContent)

  logger.info('Component state updated', { conversationId, componentId, componentName })

  return { status: 200, body: { ok: true } }
}
