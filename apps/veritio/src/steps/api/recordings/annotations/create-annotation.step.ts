import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { authMiddleware } from '../../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../../lib/supabase/motia-client'
import { errorResponse } from '../../../../lib/response-helpers'

const styleSchema = z.object({
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  width: z.number().min(0).max(100).optional(),
  height: z.number().min(0).max(100).optional(),
  color: z.string().optional(),
  backgroundColor: z.string().optional(),
  fontSize: z.number().min(8).max(200).optional(),
  fontFamily: z.string().optional(),
  fontWeight: z.enum(['normal', 'bold']).optional(),
  textAlign: z.enum(['left', 'center', 'right']).optional(),
  borderWidth: z.number().optional(),
  borderColor: z.string().optional(),
  opacity: z.number().min(0).max(1).optional(),
  shapeType: z.enum(['rectangle', 'circle', 'arrow', 'line']).optional(),
  blurRadius: z.number().min(0).max(100).optional(),
  rotation: z.number().optional(),
})

const bodySchema = z.object({
  start_ms: z.number().min(0),
  end_ms: z.number().min(1),
  annotation_type: z.enum(['text', 'shape', 'blur', 'highlight']),
  content: z.string().max(1000).optional().nullable(),
  style: styleSchema,
  layer: z.number().min(0).max(100).optional().default(0),
})

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
  name: 'CreateRecordingAnnotation',
  description: 'Create a new annotation on a recording',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/studies/:studyId/recordings/:recordingId/annotations',
    middleware: [authMiddleware, errorHandlerMiddleware],
    bodySchema: bodySchema as any,
    responseSchema: {
    201: z.object({ data: annotationSchema }) as any,
    400: z.object({ error: z.string() }) as any,
    403: z.object({ error: z.string() }) as any,
    404: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: ['recording-annotation-created'],
  flows: ['recording-management'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const { studyId, recordingId } = req.pathParams
  const body = bodySchema.parse(req.body)

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
    .select('id, duration_ms')
    .eq('id', recordingId)
    .eq('study_id', studyId)
    .is('deleted_at', null)
    .single() as any

  if (recordingError || !recording) {
    return errorResponse.notFound('Recording not found')
  }

  if (body.end_ms <= body.start_ms) {
    return errorResponse.badRequest('End time must be after start time')
  }

  if (recording.duration_ms && body.end_ms > recording.duration_ms) {
    return errorResponse.badRequest('Annotation end time exceeds recording duration')
  }

  const { data: annotation, error } = await supabase
    .from('recording_annotations')
    .insert({
      recording_id: recordingId,
      start_ms: body.start_ms,
      end_ms: body.end_ms,
      annotation_type: body.annotation_type,
      content: body.content || null,
      style: body.style,
      layer: body.layer,
      created_by: userId,
    })
    .select()
    .single()

  if (error) {
    logger.error('Failed to create annotation', { error: error.message, recordingId })
    return errorResponse.badRequest(error.message)
  }

  enqueue({
    topic: 'recording-annotation-created',
    data: {
      resourceType: 'recording_annotation',
      resourceId: annotation.id,
      action: 'create',
      recordingId,
      studyId,
    },
  }).catch(() => {})

  return { status: 201, body: { data: annotation } }
}
