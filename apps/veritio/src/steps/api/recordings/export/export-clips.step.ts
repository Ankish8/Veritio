import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { authMiddleware } from '../../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../../middlewares/error-handler.middleware'
import { requireStudyEditor } from '../../../../middlewares/permissions.middleware'
import { getMotiaSupabaseClient } from '../../../../lib/supabase/motia-client'
import { exportClipsAsJson } from '../../../../services/recording/index'

export const config = {
  name: 'ExportRecordingClips',
  description: 'Export clips with transcript segments as JSON',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/studies/:studyId/recordings/:recordingId/export/clips',
    middleware: [authMiddleware, requireStudyEditor('studyId'), errorHandlerMiddleware],
    responseSchema: {
    200: z.any() as any,
    401: z.object({ error: z.string() }) as any,
    403: z.object({ error: z.string() }) as any,
    404: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: [],
  flows: ['recording-management'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const { studyId, recordingId } = req.pathParams

  const supabase = getMotiaSupabaseClient()

  const { data: recording, error: recordingError } = await supabase
    .from('recordings')
    .select('id')
    .eq('id', recordingId)
    .eq('study_id', studyId)
    .is('deleted_at', null)
    .single()

  if (recordingError || !recording) {
    return {
      status: 404,
      body: { error: 'Recording not found' },
    }
  }

  const { data, error } = await exportClipsAsJson(supabase, recordingId)

  if (error) {
    logger.error('Failed to export clips', { error: error.message, recordingId })
    return {
      status: 500,
      body: { error: 'Internal server error' },
    }
  }

  return {
    status: 200,
    body: data,
  }
}
