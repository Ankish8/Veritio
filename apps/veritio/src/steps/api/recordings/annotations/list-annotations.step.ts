import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { authMiddleware } from '../../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../../lib/supabase/motia-client'
import { errorResponse } from '../../../../lib/response-helpers'

const annotationSchema = z.object({
  id: z.string().uuid(),
  recording_id: z.string().uuid(),
  start_ms: z.number(),
  end_ms: z.number(),
  annotation_type: z.enum(['text', 'shape', 'blur', 'highlight']),
  content: z.string().nullable(),
  style: z.record(z.unknown()),
  layer: z.number(),
  created_by: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
})

export const config = {
  name: 'ListRecordingAnnotations',
  description: 'List all annotations for a recording',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/studies/:studyId/recordings/:recordingId/annotations',
    middleware: [authMiddleware, errorHandlerMiddleware],
    responseSchema: {
    200: z.object({ data: z.array(annotationSchema) }) as any,
    403: z.object({ error: z.string() }) as any,
    404: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: [],
  flows: ['recording-management'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const { studyId, recordingId } = req.pathParams

  const supabase = getMotiaSupabaseClient()

  const { data: study, error: studyError } = await supabase
    .from('studies')
    .select('id, user_id')
    .eq('id', studyId)
    .eq('user_id', userId)
    .single()

  if (studyError || !study) {
    logger.warn('Study not found or access denied', { studyId, userId })
    return errorResponse.forbidden('Access denied')
  }

  const { data: recording, error: recordingError } = await supabase
    .from('recordings')
    .select('id')
    .eq('id', recordingId)
    .eq('study_id', studyId)
    .is('deleted_at', null)
    .single()

  if (recordingError || !recording) {
    return errorResponse.notFound('Recording not found')
  }

  const { data: annotations, error } = await supabase
    .from('recording_annotations')
    .select('*')
    .eq('recording_id', recordingId)
    .is('deleted_at', null)
    .order('start_ms', { ascending: true })
    .order('layer', { ascending: true })

  if (error) {
    logger.error('Failed to fetch annotations', { error: error.message, recordingId })
    return errorResponse.serverError('Failed to fetch annotations')
  }

  return { status: 200, body: { data: annotations || [] } }
}
