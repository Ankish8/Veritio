import type { StepConfig } from 'motia'
import { z } from 'zod'
import { getMotiaSupabaseClient } from '../../lib/supabase/motia-client'
import type { EventHandlerContext } from '../../lib/motia/types'

const inputSchema = z.object({
  studyId: z.string().uuid(),
  studyType: z.enum(['card_sort', 'tree_test', 'survey', 'prototype_test', 'first_click', 'first_impression', 'live_website_test']),
  userId: z.string(),
})

export const config = {
  name: 'SendStudyCreatedNotification',
  description: 'Send notification when a new study is created and initialized',
  triggers: [{
    type: 'queue',
    topic: 'study-initialized',
    input: inputSchema as any,
  }],
  enqueues: ['notification'],
  flows: ['study-management', 'notifications'],
} satisfies StepConfig

export const handler = async (input: z.infer<typeof inputSchema>, { logger, enqueue }: EventHandlerContext) => {
  const data = inputSchema.parse(input)
  const supabase = getMotiaSupabaseClient()

  const { data: study } = await supabase
    .from('studies')
    .select('title')
    .eq('id', data.studyId)
    .single()

  const studyTypeNames: Record<string, string> = {
    card_sort: 'Card Sort',
    tree_test: 'Tree Test',
    prototype_test: 'Figma Prototype Test',
    first_click: 'First Click',
    first_impression: 'First Impression',
    survey: 'Survey',
    live_website_test: 'Web App Test',
  }
  const studyTypeName = studyTypeNames[data.studyType] || 'Study'

  logger.info(`Sending creation notification for study: ${data.studyId}`)

  enqueue({
    topic: 'notification',
    data: {
      userId: data.userId,
      type: 'study-created',
      title: 'Study Created',
      message: `Your ${studyTypeName} study "${study?.title || 'Untitled'}" is ready to configure.`,
      studyId: data.studyId,
    },
  }).catch(() => {})
}
