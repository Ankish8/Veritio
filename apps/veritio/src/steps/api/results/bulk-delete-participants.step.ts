import type { StepConfig } from '@/lib/motia/types'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { requireStudyEditor } from '../../../middlewares/permissions.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import {
  deleteStudyParticipants,
  invalidateParticipantResultsCache,
} from '../../../services/participant-deletion-service'

const bodySchema = z.object({
  participantIds: z.array(z.string().uuid()).min(1).max(500),
})

const paramsSchema = z.object({
  studyId: z.string().uuid(),
})

export const config = {
  name: 'BulkDeleteStudyParticipants',
  description:
    'Permanently delete study participant responses, analysis data, and recordings',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/studies/:studyId/participants/bulk-delete',
    middleware: [
      authMiddleware,
      requireStudyEditor('studyId'),
      errorHandlerMiddleware,
    ],
    bodySchema: bodySchema as any,
  }],
  enqueues: ['results-analysis-requested'],
  flows: ['results-analysis', 'recording-management'],
} satisfies StepConfig

export const handler = async (
  req: ApiRequest,
  { logger, enqueue, state }: ApiHandlerContext,
) => {
  const { studyId } = paramsSchema.parse(req.pathParams)
  const { participantIds } = bodySchema.parse(req.body)
  const supabase = getMotiaSupabaseClient()

  const result = await deleteStudyParticipants(
    supabase,
    studyId,
    participantIds,
  )

  if (!result.success) {
    logger.error('Study participant deletion failed', {
      studyId,
      requestedCount: participantIds.length,
      errorCode: result.errorCode,
      error: result.error,
    })

    return {
      status: result.errorCode === 'not_found' ? 404 : 500,
      body: {
        error: result.error ?? 'Failed to delete participants',
      },
    }
  }

  invalidateParticipantResultsCache(studyId)

  await state
    .delete('closure-analysis', studyId)
    .catch((error: unknown) => {
      logger.warn('Failed to clear closure analysis state after deletion', {
        studyId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    })

  const { data: study } = await supabase
    .from('studies')
    .select('study_type')
    .eq('id', studyId)
    .maybeSingle()

  if (study?.study_type) {
    enqueue({
      topic: 'results-analysis-requested',
      data: {
        studyId,
        studyType: study.study_type,
        priority: 'high',
      },
    }).catch(() => {})
  }

  logger.info('Study participants permanently deleted', {
    studyId,
    deletedCount: result.deletedCount,
    deletedRecordingCount: result.deletedRecordingCount,
  })

  return {
    status: 200,
    body: {
      success: true,
      deletedCount: result.deletedCount,
      deletedParticipantIds: result.deletedParticipantIds,
      deletedRecordingCount: result.deletedRecordingCount,
    },
  }
}
