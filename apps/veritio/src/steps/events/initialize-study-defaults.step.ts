import type { StepConfig } from 'motia'
import { getMotiaSupabaseClient } from '../../lib/supabase/motia-client'
import type { EventHandlerContext } from '../../lib/motia/types'
import { studyCreatedSchema, type StudyCreatedEvent } from '../../lib/events/schemas'

export const config = {
  name: 'InitializeStudyDefaults',
  description: 'Set up default settings and content for a new study based on type',
  triggers: [{
    type: 'queue',
    topic: 'study-created',
  }],
  enqueues: ['study-initialized'],
  flows: ['study-management'],
} satisfies StepConfig

export const handler = async (input: StudyCreatedEvent, { logger, enqueue }: EventHandlerContext) => {
  try {
    const data = studyCreatedSchema.parse(input)
    const supabase = getMotiaSupabaseClient()

    logger.info(`Initializing defaults for ${data.studyType} study: ${data.studyId}`)

    const getDefaultSettings = () => {
      switch (data.studyType) {
        case 'card_sort':
          return {
            sortType: 'open', // open, closed, hybrid
            allowCustomCategories: true,
            randomizeCards: true,
            showCardDescriptions: false,
          }
        case 'tree_test':
          return {
            showBackButton: true,
            randomizeTasks: false,
            showProgress: true,
            allowSkip: false,
          }
        case 'survey':
          return {
            showOneQuestionPerPage: true,
            randomizeQuestions: false,
            showProgressBar: true,
            allowSkipQuestions: false,
          }
        case 'prototype_test':
          return {
            showTaskInstructions: true,
            randomizeTasks: false,
            showProgress: true,
            allowSkip: false,
            recordClicks: true,
            recordNavigation: true,
          }
        case 'live_website_test':
          return {
            mode: 'reverse_proxy',
            allowSkipTasks: true,
            showTaskProgress: true,
            allowMobile: false,
            recordScreen: true,
            recordWebcam: false,
            recordMicrophone: false,
            trackClickEvents: true,
            trackScrollDepth: true,
            widgetPosition: 'bottom-right',
            blockBeforeStart: true,
          }
      }
    }

    const defaultSettings = getDefaultSettings()

    // Fetch existing settings (may include initial_settings from creation)
    const { data: existingStudy } = await supabase
      .from('studies')
      .select('settings')
      .eq('id', data.studyId)
      .single()

    const existingSettings = (existingStudy?.settings as Record<string, unknown>) || {}
    // Merge: event defaults as base, existing creation-time overrides persist
    const mergedSettings = { ...defaultSettings, ...existingSettings }

    await supabase
      .from('studies')
      .update({ settings: mergedSettings })
      .eq('id', data.studyId)

    logger.info(`Study ${data.studyId} initialized with ${data.studyType} defaults`)

    enqueue({
      topic: 'study-initialized',
      data: {
        studyId: data.studyId,
        studyType: data.studyType,
        userId: data.userId,
      },
    }).catch(() => {})
  } catch (error) {
    logger.error('InitializeStudyDefaults failed', { error, input })
    // Don't re-throw: prevents infinite BullMQ retry on non-transient errors
  }
}
