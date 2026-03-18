import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireStudyManager } from '../../../middlewares/permissions.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { archiveStudy } from '../../../services/study-service'
import { classifyError } from '../../../lib/api/classify-error'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

const responseSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  is_archived: z.boolean(),
})

export const config = {
  name: 'ArchiveStudy',
  description: 'Archive a study',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/studies/:id/archive',
    middleware: [authMiddleware, requireStudyManager('id'), errorHandlerMiddleware],
    responseSchema: {
    200: responseSchema as any,
    401: z.object({ error: z.string() }) as any,
    404: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: ['study-archived'],
  flows: ['study-management'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const { id: studyId } = paramsSchema.parse(req.pathParams)

  logger.info('Archiving study', { userId, studyId })

  const supabase = getMotiaSupabaseClient()
  const { data: study, error } = await archiveStudy(supabase, studyId, userId)

  if (error) {
    return classifyError(error, logger, 'Archive study', {
      fallbackMessage: 'Failed to archive study',
    })
  }

  logger.info('Study archived successfully', { userId, studyId })

  enqueue({
    topic: 'study-archived',
    data: { resourceType: 'study', action: 'archive', userId, resourceId: studyId },
  }).catch(() => {})

  return {
    status: 200,
    body: { id: study!.id, title: study!.title, is_archived: study!.is_archived },
  }
}
