import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { authMiddleware } from '../../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../../lib/supabase/motia-client'
import { errorResponse } from '../../../../lib/response-helpers'

export const config = {
  name: 'DeleteRecordingAnnotation',
  description: 'Soft delete an annotation',
  triggers: [{
    type: 'http',
    method: 'DELETE',
    path: '/api/studies/:studyId/recordings/:recordingId/annotations/:annotationId',
    middleware: [authMiddleware, errorHandlerMiddleware],
    responseSchema: {
    200: z.object({ success: z.boolean() }) as any,
    403: z.object({ error: z.string() }) as any,
    404: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: ['recording-annotation-deleted'],
  flows: ['recording-management'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const { studyId, recordingId, annotationId } = req.pathParams

  const supabase = getMotiaSupabaseClient()

  const { data: study, error: studyError } = await supabase
    .from('studies')
    .select('id, user_id')
    .eq('id', studyId)
    .eq('user_id', userId)
    .single()

  if (studyError || !study) {
    return errorResponse.forbidden('Access denied')
  }

  const { data: existing, error: fetchError } = await supabase
    .from('recording_annotations')
    .select('id')
    .eq('id', annotationId)
    .eq('recording_id', recordingId)
    .is('deleted_at', null)
    .single()

  if (fetchError || !existing) {
    return errorResponse.notFound('Annotation not found')
  }

  const { error } = await supabase
    .from('recording_annotations')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', annotationId)

  if (error) {
    logger.error('Failed to delete annotation', { error: error.message, annotationId })
    return errorResponse.serverError('Failed to delete annotation')
  }

  enqueue({
    topic: 'recording-annotation-deleted',
    data: {
      resourceType: 'recording_annotation',
      resourceId: annotationId,
      action: 'delete',
      recordingId,
      studyId,
    },
  }).catch(() => {})

  return { status: 200, body: { success: true } }
}
