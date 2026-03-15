import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { deleteRecording as deleteFromR2 } from '../../../services/storage/r2-client'

const querySchema = z.object({
  permanent: z.string().optional(), // 'true' for permanent delete
})

const responseSchema = z.object({
  success: z.boolean(),
})

export const config = {
  name: 'DeleteRecording',
  description: 'Delete a recording (soft delete by default, permanent if specified)',
  triggers: [{
    type: 'http',
    method: 'DELETE',
    path: '/api/studies/:studyId/recordings/:recordingId',
    middleware: [authMiddleware, errorHandlerMiddleware],
    responseSchema: {
    200: responseSchema as any,
    401: z.object({ error: z.string() }) as any,
    403: z.object({ error: z.string() }) as any,
    404: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: ['recording-deleted'],
  flows: ['recording-management'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const { studyId, recordingId } = req.pathParams
  const queryParams = (req as any).query || {}
  const query = querySchema.parse(queryParams)
  const isPermanent = query.permanent === 'true'

  const supabase = getMotiaSupabaseClient()

  const { data: study, error: studyError } = await supabase
    .from('studies')
    .select('id, user_id')
    .eq('id', studyId)
    .eq('user_id', userId)
    .single()

  if (studyError || !study) {
    logger.warn('Study not found or access denied', { studyId, userId })
    return {
      status: 403,
      body: { error: 'Access denied' },
    }
  }

  const { data: recording, error: recordingError } = await supabase
    .from('recordings')
    .select('id, storage_path, deleted_at')
    .eq('id', recordingId)
    .eq('study_id', studyId)
    .single() as any

  if (recordingError || !recording) {
    logger.warn('Recording not found', { recordingId, studyId })
    return {
      status: 404,
      body: { error: 'Recording not found' },
    }
  }

  if (isPermanent) {
    logger.info('Permanently deleting recording', { recordingId, studyId })

    try {
      await deleteFromR2(recording.storage_path)
    } catch (error) {
      logger.error('Failed to delete from R2', { error, recordingId })
      // Continue with database deletion even if R2 fails
    }

    const { error: deleteError } = await supabase
      .from('recordings')
      .delete()
      .eq('id', recordingId) as any

    if (deleteError) {
      logger.error('Failed to delete recording from database', { error: deleteError, recordingId })
      return {
        status: 500,
        body: { error: 'Failed to delete recording' },
      }
    }

    enqueue({
      topic: 'recording-deleted',
      data: {
        resourceType: 'recording',
        resourceId: recordingId,
        action: 'delete',
        studyId,
        permanent: true,
      },
    }).catch(() => {})

    return {
      status: 200,
      body: { success: true },
    }
  }

  logger.info('Soft deleting recording', { recordingId, studyId })

  const { error: updateError } = await supabase
    .from('recordings')
    .update({
      deleted_at: new Date().toISOString(),
      status: 'deleted',
      updated_at: new Date().toISOString(),
    } as any)
    .eq('id', recordingId)

  if (updateError) {
    logger.error('Failed to soft delete recording', { error: updateError, recordingId })
    return {
      status: 500,
      body: { error: 'Failed to delete recording' },
    }
  }

  enqueue({
    topic: 'recording-deleted',
    data: {
      resourceType: 'recording',
      resourceId: recordingId,
      action: 'delete',
      studyId,
      permanent: false,
    },
  }).catch(() => {})

  return {
    status: 200,
    body: { success: true },
  }
}
