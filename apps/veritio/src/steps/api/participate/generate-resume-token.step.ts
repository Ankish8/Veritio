import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiRequest } from '../../../lib/motia/types'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import type { Json } from '@veritio/study-types'

export const config = {
  name: 'GenerateResumeToken',
  description: 'Generate a resume token for saving survey progress (public endpoint)',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/participate/:shareCode/resume-token',
    middleware: [errorHandlerMiddleware],
  }],
  enqueues: [],
  flows: ['participation'],
} satisfies StepConfig

const paramsSchema = z.object({
  shareCode: z.string().min(1),
})

const progressSchema = z.object({
  currentStep: z.string(),
  currentQuestionIndex: z.number(),
  responses: z.array(z.object({
    questionId: z.string(),
    value: z.unknown(),
  })),
}).optional()

const bodySchema = z.object({
  sessionToken: z.string().min(1, 'Session token required'),
  progress: progressSchema,
})

export const handler = async (req: ApiRequest) => {
  const params = paramsSchema.parse(req.pathParams)
  const body = bodySchema.parse(req.body || {})
  const supabase = getMotiaSupabaseClient()

  const { data: study, error: studyError } = await supabase
    .from('studies')
    .select('id')
    .or(`share_code.eq.${params.shareCode},url_slug.eq.${params.shareCode}`)
    .single()

  if (studyError || !study) {
    return {
      status: 404,
      body: { error: 'Study not found' },
    }
  }

  const { data: participant, error: participantError } = await supabase
    .from('participants')
    .select('id, session_token, metadata')
    .eq('study_id', study.id)
    .eq('session_token', body.sessionToken)
    .single()

  if (participantError || !participant) {
    return {
      status: 401,
      body: { error: 'Invalid session token' },
    }
  }

  if (body.progress) {
    const currentMetadata = (participant.metadata as Record<string, unknown>) || {}
    const updatedMetadata = {
      ...currentMetadata,
      saved_progress: {
        ...body.progress,
        saved_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      },
    }

    await supabase
      .from('participants')
      .update({ metadata: updatedMetadata as Json })
      .eq('id', participant.id)
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4001'
  const resumeUrl = `${baseUrl}/s/${params.shareCode}?resume=${participant.session_token}`

  return {
    status: 200,
    body: {
      data: {
        resumeToken: participant.session_token,
        resumeUrl,
        expiresIn: '7 days',
      },
    },
  }
}
