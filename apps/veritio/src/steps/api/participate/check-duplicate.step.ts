import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import {
  checkForDuplicate,
  getPreventionSettingsFromColumn,
  getBlockMessage,
} from '../../../services/response-prevention-service'
import { getStudyStatusErrorMessage } from '../../../services/participant/types'
import type { StudyStatusForError } from '../../../services/participant/types'
import { getClientIP } from '../../../lib/utils/visitor-hash'

export const config = {
  name: 'CheckDuplicate',
  description: 'Check if participant can take study (duplicate prevention)',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/participate/:shareCode/check-duplicate',
    middleware: [errorHandlerMiddleware],
  }],
  enqueues: [],
  flows: ['participation'],
} satisfies StepConfig

const paramsSchema = z.object({
  shareCode: z.string().min(1),
})

const bodySchema = z.object({
  cookieId: z.string().nullable().optional(),
  fingerprintHash: z.string().nullable().optional(),
  fingerprintConfidence: z.number().nullable().optional(),
})

export const handler = async (
  req: ApiRequest,
  { logger }: ApiHandlerContext
) => {
  const params = paramsSchema.parse(req.pathParams)
  const body = bodySchema.parse(req.body || {})
  const supabase = getMotiaSupabaseClient()

  const { data: study, error: studyError } = await supabase
    .from('studies')
    .select('id, status, response_prevention_settings')
    .or(`share_code.eq.${params.shareCode},url_slug.eq.${params.shareCode}`)
    .single()

  if (studyError || !study) {
    return {
      status: 404,
      body: { error: 'Study not found' },
    }
  }

  if (study.status !== 'active') {
    return {
      status: 403,
      body: { error: getStudyStatusErrorMessage(study.status as StudyStatusForError) },
    }
  }

  const preventionSettings = getPreventionSettingsFromColumn(study.response_prevention_settings)

  if (preventionSettings.level === 'none') {
    return {
      status: 200,
      body: {
        canParticipate: true,
        preventionLevel: 'none',
      },
    }
  }

  const clientIP = getClientIP(req.headers)

  logger.info('Duplicate check input', {
    studyId: study.id,
    level: preventionSettings.level,
    hasCookieId: !!body.cookieId,
    cookieIdLength: body.cookieId?.length,
    hasIP: !!clientIP,
    hasFingerprintHash: !!body.fingerprintHash,
  })

  const result = await checkForDuplicate(supabase, study.id, preventionSettings, {
    studyId: study.id,
    cookieId: body.cookieId,
    ipAddress: clientIP,
    fingerprintHash: body.fingerprintHash,
    fingerprintConfidence: body.fingerprintConfidence,
  })

  logger.info('Duplicate check result', {
    studyId: study.id,
    level: preventionSettings.level,
    isDuplicate: result.isDuplicate,
    reason: result.reason,
    hasFingerprintInRequest: !!body.fingerprintHash,
    fingerprintHashPrefix: body.fingerprintHash?.substring(0, 8),
  })

  if (result.isDuplicate) {
    return {
      status: 200,
      body: {
        canParticipate: false,
        reason: result.reason,
        message: getBlockMessage(result.reason),
        preventionLevel: preventionSettings.level,
      },
    }
  }

  return {
    status: 200,
    body: {
      canParticipate: true,
      preventionLevel: preventionSettings.level,
    },
  }
}
