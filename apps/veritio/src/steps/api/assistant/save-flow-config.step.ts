import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { updateStudy } from '../../../services/study-service'
import { createFlowQuestion, invalidateFlowQuestionsCache } from '../../../services/flow-question-service'
import { prepareQuestionData, normalizeBranchingLogic } from '../../../services/assistant/builder-write-tools'
import { errorResponse } from '../../../lib/response-helpers'

const bodySchema = z.object({
  conversationId: z.string().uuid(),
})

export const config = {
  name: 'SaveFlowConfig',
  description: 'Batch save deferred flow configuration from Motia state to the database',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/assistant/save-flow-config',
    middleware: [authMiddleware, errorHandlerMiddleware],
    bodySchema: bodySchema as any,
  }],
  enqueues: [],
  flows: ['assistant'],
} satisfies StepConfig

/** Maps flow section keys to study settings keys */
const SECTION_KEY_MAP: Record<string, string> = {
  welcome: 'welcome',
  agreement: 'participantAgreement',
  thank_you: 'thankYou',
  instructions: 'activityInstructions',
  screening: 'screening',
  pre_study: 'preStudyQuestions',
  post_study: 'postStudyQuestions',
}

export const handler = async (req: ApiRequest, { logger, state: motiaState }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const { conversationId } = bodySchema.parse(req.body)
  const supabase = getMotiaSupabaseClient()

  // Look up study_id from the conversation
  const { data: conv } = await (supabase as any)
    .from('assistant_conversations')
    .select('study_id')
    .eq('id', conversationId)
    .single() as { data: { study_id: string | null } | null }

  const studyId = conv?.study_id
  if (!studyId) {
    return errorResponse.badRequest('No study associated with this conversation')
  }

  // Read flowConfig from Motia state
  if (!motiaState) {
    return errorResponse.serverError('State manager not available')
  }

  const flowConfig = (await motiaState.get(conversationId, 'flowConfig')) as Record<string, any> | null
  if (!flowConfig || Object.keys(flowConfig).length === 0) {
    logger.info('save-flow-config: flowConfig is empty/null, nothing to save', { conversationId, studyId })
    return { status: 200, body: { ok: true, message: 'Nothing to save' } }
  }

  // Record version at read-time to detect concurrent component-state updates
  const savedVersion = (flowConfig._version as number) ?? 0

  // Debug: log the full flowConfig questions with option labels
  const debugQuestions = flowConfig.questions as Record<string, any[]> | undefined
  if (debugQuestions) {
    for (const [sec, qs] of Object.entries(debugQuestions)) {
      for (const q of qs) {
        const opts = q?.config?.options ?? q?.config?.items ?? []
        if (opts.length > 0) {
          logger.info('[DEBUG] save-flow-config question options', {
            conversationId, studyId, section: sec,
            questionText: q?.question_text,
            options: (opts as any[]).map((o: any) => o?.label ?? o),
          })
        }
      }
    }
  }

  logger.info('Saving flow config', { conversationId, studyId, sections: Object.keys(flowConfig) })

  // Read current study settings
  const { data: study } = await supabase
    .from('studies')
    .select('settings')
    .eq('id', studyId)
    .single()

  const currentSettings = (study?.settings as Record<string, any>) ?? {}
  const studyFlow = { ...((currentSettings.studyFlow ?? {}) as Record<string, any>) }

  // Merge sections into settings
  let sectionCount = 0
  const sections = (flowConfig.sections ?? {}) as Record<string, any>
  for (const [sectionKey, sectionData] of Object.entries(sections)) {
    const settingsKey = SECTION_KEY_MAP[sectionKey]
    if (!settingsKey) continue
    const existing = (studyFlow[settingsKey] ?? {}) as Record<string, any>
    studyFlow[settingsKey] = { ...existing, ...sectionData, enabled: true }
    sectionCount++
  }

  // Merge participant identifier
  if (flowConfig.participantId) {
    const existing = (studyFlow.participantIdentifier ?? {}) as Record<string, any>
    studyFlow.participantIdentifier = { ...existing, ...flowConfig.participantId }
    sectionCount++
  }

  // Single settings update
  if (sectionCount > 0) {
    const mergedSettings = { ...currentSettings, studyFlow }
    const { error } = await updateStudy(supabase, studyId, userId, { settings: mergedSettings } as any)
    if (error) {
      logger.error('Failed to save flow settings', { studyId, error: error.message })
      return errorResponse.serverError(`Failed to save settings: ${error.message}`)
    }
  }

  // Create questions for each section (delete existing first to avoid duplicates on re-save)
  let questionCount = 0
  const flowQuestions = (flowConfig.questions ?? {}) as Record<string, any[]>
  for (const [section, questions] of Object.entries(flowQuestions)) {
    if (!Array.isArray(questions) || questions.length === 0) continue

    // Delete existing questions for this section before re-creating
    const { error: deleteError } = await supabase
      .from('study_flow_questions')
      .delete()
      .eq('study_id', studyId)
      .eq('section', section)
    if (deleteError) {
      logger.error('Failed to clear existing questions', { studyId, section, error: deleteError.message })
    } else {
      invalidateFlowQuestionsCache(studyId, section as any)
    }

    for (let i = 0; i < questions.length; i++) {
      const item = questions[i]
      const { questionType, config } = prepareQuestionData(item)
      const { error } = await createFlowQuestion(supabase, studyId, {
        section: section as any,
        question_type: questionType,
        question_text: String(item.question_text || ''),
        description: item.description ? String(item.description) : null,
        is_required: item.is_required !== false,
        config,
        branching_logic: normalizeBranchingLogic(
          (item.branching_logic as Record<string, unknown>) ?? undefined,
          questionType,
          config,
        ) ?? undefined,
        position: i,
      })
      if (error) {
        logger.error('Failed to create flow question', { studyId, section, index: i, error: error.message })
      } else {
        questionCount++
      }
    }
  }

  // Safety net: enable sections that have questions but no explicit section config
  let needsSettingsUpdate = false
  for (const section of Object.keys(flowQuestions)) {
    const settingsKey = SECTION_KEY_MAP[section]
    if (settingsKey && !sections[section]) {
      const existing = (studyFlow[settingsKey] ?? {}) as Record<string, any>
      if (!existing.enabled) {
        studyFlow[settingsKey] = { ...existing, enabled: true }
        needsSettingsUpdate = true
      }
    }
  }
  if (needsSettingsUpdate) {
    const mergedSettings = { ...currentSettings, studyFlow }
    const { error } = await updateStudy(supabase, studyId, userId, { settings: mergedSettings } as any)
    if (error) {
      logger.error('Failed to enable question sections', { studyId, error: error.message })
    }
  }

  // Only clear flowConfig if no concurrent component-state updates occurred while we were saving.
  // If the version changed, a user edit arrived mid-save — leave it for the next auto-save cycle.
  const currentFlowConfig = (await motiaState.get(conversationId, 'flowConfig')) as Record<string, any> | null
  const currentVersion = (currentFlowConfig?._version as number) ?? 0
  if (currentVersion !== savedVersion) {
    logger.info('FlowConfig updated during save, skipping delete to preserve user edits', {
      conversationId, studyId, savedVersion, currentVersion,
    })
  } else {
    await motiaState.delete(conversationId, 'flowConfig')
  }

  logger.info('Flow config saved', { conversationId, studyId, sectionCount, questionCount })

  return {
    status: 200,
    body: { ok: true, saved: { sectionCount, questionCount } },
  }
}
