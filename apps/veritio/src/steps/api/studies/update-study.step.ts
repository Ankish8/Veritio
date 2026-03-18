import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { validateRequest } from '../../../lib/api/validate-request'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireStudyEditor } from '../../../middlewares/permissions.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { updateStudy } from '../../../services/study-service'
import { updateStudySchema } from '../../../services/types'
import {
  scheduleEvent,
  cancelScheduledEvent,
  getScheduledEvent,
} from '../../../services/scheduler-service'

const responseSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  user_id: z.string(),
  study_type: z.enum(['card_sort', 'tree_test', 'survey', 'prototype_test', 'first_click', 'first_impression', 'live_website_test']),
  title: z.string(),
  description: z.string().nullable(),
  status: z.enum(['draft', 'active', 'paused', 'completed']),
  share_code: z.string(),
  settings: z.any(),
  welcome_message: z.string().nullable(),
  thank_you_message: z.string().nullable(),
  launched_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  // New fields for study settings
  purpose: z.string().nullable(),
  participant_requirements: z.string().nullable(),
  url_slug: z.string().nullable(),
  language: z.string(),
  password: z.string().nullable(),
  session_recording_settings: z.any(),
  closing_rule: z.any(),
  branding: z.any(),
})

export const config = {
  name: 'UpdateStudy',
  description: 'Update a study',
  triggers: [{
    type: 'http',
    method: 'PATCH',
    path: '/api/studies/:studyId',
    middleware: [authMiddleware, requireStudyEditor('studyId'), errorHandlerMiddleware],
    responseSchema: {
    200: responseSchema as any,
    400: z.object({
      error: z.string(),
      details: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
    }) as any,
    401: z.object({ error: z.string() }) as any,
    404: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: ['study-updated'],
  flows: ['study-management'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const { studyId } = req.pathParams

  const validation = validateRequest(updateStudySchema, req.body, logger)
  if (!validation.success) return validation.response

  logger.info('Updating study', { userId, studyId })

  const supabase = getMotiaSupabaseClient()
  const { data: study, error } = await updateStudy(supabase, studyId, userId, validation.data)

  if (error) {
    if (error.message === 'Study not found') {
      logger.warn('Study not found for update', { userId, studyId })
      return {
        status: 404,
        body: { error: 'Study not found' },
      }
    }

    if (error.message.includes('Permission denied')) {
      logger.warn('Permission denied for study update', { userId, studyId, error: error.message })
      return {
        status: 403,
        body: { error: error.message },
      }
    }

    logger.error('Failed to update study', { userId, studyId, error: error.message })
    return {
      status: 500,
      body: { error: 'Failed to update study' },
    }
  }

  logger.info('Study updated successfully', { userId, studyId })

  // Handle scheduled auto-close if closing_rule was updated
  if (validation.data.closing_rule !== undefined) {
    const closingRule = validation.data.closing_rule as {
      type?: 'none' | 'date' | 'participant_count' | 'both'
      closeDate?: string
      maxParticipants?: number
    } | null

    const jobId = `study-close-${studyId}`

    const hasDateRule =
      closingRule &&
      (closingRule.type === 'date' || closingRule.type === 'both') &&
      closingRule.closeDate

    if (hasDateRule) {
      const closeDate = new Date(closingRule.closeDate!)

      if (closeDate > new Date()) {
        const existingJob = await getScheduledEvent(jobId)

        if (existingJob) {
          await cancelScheduledEvent(jobId)
        }

        await scheduleEvent({
          topic: 'study-auto-close',
          data: { studyId, reason: 'date' },
          scheduledFor: closeDate,
          jobId,
        })

        logger.info('Scheduled study auto-close', { studyId, closeDate: closingRule.closeDate })
      }
    } else {
      const cancelled = await cancelScheduledEvent(jobId)
      if (cancelled) {
        logger.info('Cancelled scheduled study auto-close', { studyId })
      }
    }
  }

  // Await emit to prevent worker crash during shutdown (EPIPE cascade).
  // Workers are short-lived — if emit is fire-and-forget, the worker can exit
  // before emit completes, causing "Process exited with code 1" errors.
  enqueue({
    topic: 'study-updated',
    data: { resourceType: 'study', resourceId: studyId, action: 'update', userId, studyId },
  }).catch(() => {})

  return {
    status: 200,
    body: study!,
  }
}
