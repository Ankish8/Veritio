import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { authMiddleware } from '../../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../../lib/supabase/motia-client'
import { errorResponse } from '../../../../lib/response-helpers'

const styleSchema = z.object({
  x: z.number().min(0).max(100).optional(),
  y: z.number().min(0).max(100).optional(),
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
}).partial()

const bodySchema = z.object({
  start_ms: z.number().min(0).optional(),
  end_ms: z.number().min(1).optional(),
  content: z.string().max(1000).optional().nullable(),
  style: styleSchema.optional(),
  layer: z.number().min(0).max(100).optional(),
})

export const config = {
  name: 'UpdateRecordingAnnotation',
  description: 'Update an existing annotation',
  triggers: [{
    type: 'http',
    method: 'PATCH',
    path: '/api/studies/:studyId/recordings/:recordingId/annotations/:annotationId',
    middleware: [authMiddleware, errorHandlerMiddleware],
    bodySchema: bodySchema as any,
    responseSchema: {
    200: z.object({ data: z.any() }) as any,
    400: z.object({ error: z.string() }) as any,
    403: z.object({ error: z.string() }) as any,
    404: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: ['recording-annotation-updated'],
  flows: ['recording-management'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const { studyId, recordingId, annotationId } = req.pathParams
  const body = bodySchema.parse(req.body)

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
    .select('*')
    .eq('id', annotationId)
    .eq('recording_id', recordingId)
    .is('deleted_at', null)
    .single()

  if (fetchError || !existing) {
    return errorResponse.notFound('Annotation not found')
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (body.start_ms !== undefined) updates.start_ms = body.start_ms
  if (body.end_ms !== undefined) updates.end_ms = body.end_ms
  if (body.content !== undefined) updates.content = body.content
  if (body.layer !== undefined) updates.layer = body.layer
  if (body.style !== undefined) {
    const existingStyle = typeof existing.style === 'object' && existing.style !== null
      ? existing.style as Record<string, unknown>
      : {}
    updates.style = { ...existingStyle, ...body.style }
  }

  const startMs = (updates.start_ms as number) ?? existing.start_ms
  const endMs = (updates.end_ms as number) ?? existing.end_ms
  if (endMs <= startMs) {
    return errorResponse.badRequest('End time must be after start time')
  }

  const { data: annotation, error } = await supabase
    .from('recording_annotations')
    .update(updates)
    .eq('id', annotationId)
    .select()
    .single()

  if (error) {
    logger.error('Failed to update annotation', { error: error.message, annotationId })
    return errorResponse.badRequest(error.message)
  }

  enqueue({
    topic: 'recording-annotation-updated',
    data: {
      resourceType: 'recording_annotation',
      resourceId: annotationId,
      action: 'update',
      recordingId,
      studyId,
    },
  }).catch(() => {})

  return { status: 200, body: { data: annotation } }
}
