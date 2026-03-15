import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiRequest } from '../../../lib/motia/types'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'

export const config = {
  name: 'ValidateSession',
  description: 'Validate a participant session token (public endpoint)',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/participate/:shareCode/validate-session',
    middleware: [errorHandlerMiddleware],
    bodySchema: z.object({ sessionToken: z.string().min(1) }) as any,
  }],
  enqueues: [],
  flows: ['participation'],
} satisfies StepConfig

const paramsSchema = z.object({
  shareCode: z.string().min(1),
})

const bodySchema = z.object({
  sessionToken: z.string().min(1),
})

export const handler = async (req: ApiRequest) => {
  const params = paramsSchema.parse(req.pathParams)
  const body = bodySchema.parse(req.body)
  const supabase = getMotiaSupabaseClient()

  const { data: study, error: studyError } = await supabase
    .from('studies')
    .select('id')
    .or(`share_code.eq.${params.shareCode},url_slug.eq.${params.shareCode}`)
    .single()

  if (studyError || !study) {
    return { status: 200, body: { valid: false } }
  }

  const { data: participant } = await supabase
    .from('participants')
    .select('id, status')
    .eq('study_id', study.id)
    .eq('session_token', body.sessionToken)
    .single()

  const valid = !!participant && participant.status === 'in_progress'
  return { status: 200, body: { valid } }
}
