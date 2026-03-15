import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { authMiddleware } from '../../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../../lib/supabase/motia-client'
import { exportTranscriptAsText, exportTranscriptAsJson } from '../../../../services/recording/index'

const querySchema = z.object({
  format: z.enum(['text', 'json']).optional().default('text'),
  include_timestamps: z.string().optional(), // 'true' or 'false'
  include_speakers: z.string().optional(), // 'true' or 'false'
})

export const config = {
  name: 'ExportRecordingTranscript',
  description: 'Export transcript in text or JSON format',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/studies/:studyId/recordings/:recordingId/export/transcript',
    middleware: [authMiddleware, errorHandlerMiddleware],
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
  const userId = req.headers['x-user-id'] as string
  const { studyId, recordingId } = req.pathParams
  const queryParams = (req as any).query || {}
  const query = querySchema.parse(queryParams)

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

  if (query.format === 'json') {
    const { data, error } = await exportTranscriptAsJson(supabase, recordingId)

    if (error) {
      logger.error('Failed to export transcript as JSON', { error: error.message, recordingId })
      return {
        status: 404,
        body: { error: error.message },
      }
    }

    return {
      status: 200,
      body: data,
    }
  }

  const { data, error } = await exportTranscriptAsText(supabase, recordingId, {
    includeTimestamps: query.include_timestamps !== 'false',
    includeSpeakers: query.include_speakers !== 'false',
  })

  if (error) {
    logger.error('Failed to export transcript as text', { error: error.message, recordingId })
    return {
      status: 404,
      body: { error: error.message },
    }
  }

  return {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
      'Content-Disposition': `attachment; filename="transcript-${recordingId}.txt"`,
    },
    body: data,
  }
}
