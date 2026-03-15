import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { errorHandlerMiddleware } from '../../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../../lib/supabase/motia-client'
import { createPanelWidgetService } from '../../../../services/panel/index'
import { demographicsSchema } from '../../../../lib/supabase/panel-types'

const paramsSchema = z.object({
  embedCodeId: z.string().min(8).max(20),
})

const geoLocationSchema = z.object({
  country: z.string().nullable().optional(),
  countryCode: z.string().nullable().optional(),
  region: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  postalCode: z.string().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  timezone: z.string().nullable().optional(),
  areaType: z.string().nullable().optional(),
}).optional()

const browserDataSchema = z.object({
  browser: z.string().optional(),
  operatingSystem: z.string().optional(),
  deviceType: z.string().optional(),
  language: z.string().optional(),
  timeZone: z.string().optional(),
  screenResolution: z.string().optional(),
  geoLocation: geoLocationSchema,
}).optional()

// Accept both camelCase (from widget) and snake_case (legacy) field names
const bodySchema = z.object({
  email: z.string().email(),
  // Accept both camelCase and snake_case
  firstName: z.string().max(100).optional(),
  first_name: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  last_name: z.string().max(100).optional(),
  demographics: demographicsSchema.optional(),
  studyId: z.string().optional(),
  study_id: z.string().optional(),
  pageUrl: z.string().url().optional(),
  page_url: z.string().url().optional(),
  referrer: z.string().optional(),
  browserData: browserDataSchema,
})

export const config = {
  name: 'WidgetCapture',
  description: 'Capture participant from widget',
  triggers: [{
    type: 'http',
    method: 'POST',
    path: '/api/panel/widget/capture/:embedCodeId',
    middleware: [errorHandlerMiddleware],
    bodySchema: bodySchema as any,
  }],
  enqueues: ['panel-widget-capture'],
  flows: ['panel'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const { embedCodeId } = paramsSchema.parse(req.pathParams)
  const body = bodySchema.parse(req.body || {})

  logger.info('Processing widget capture', { embedCodeId, email: body.email })

  const supabase = getMotiaSupabaseClient()
  const service = createPanelWidgetService(supabase)

  try {
    const widgetConfig = await service.getByEmbedCode(embedCodeId)
    if (!widgetConfig) {
      logger.warn('Widget not found', { embedCodeId })
      return {
        status: 404,
        body: { error: 'Widget not found' },
      }
    }

    const result = await service.processCapture(widgetConfig.user_id, widgetConfig.organization_id as string, {
      email: body.email,
      firstName: body.firstName || body.first_name,
      lastName: body.lastName || body.last_name,
      demographics: body.demographics,
      studyId: body.studyId || body.study_id || widgetConfig.active_study_id || undefined,
      pageUrl: body.pageUrl || body.page_url,
      referrer: body.referrer,
      browserData: body.browserData,
    })

    logger.info('Widget capture processed', {
      embedCodeId,
      participantId: result.participantId,
      isNew: result.isNewParticipant
    })

    enqueue({
      topic: 'panel-widget-capture',
      data: {
        resourceType: 'panel-participant',
        action: result.isNewParticipant ? 'create' : 'update',
        embedCodeId,
        participantId: result.participantId,
        participationCreated: result.participationCreated
      },
    }).catch(() => {})

    return {
      status: 200,
      body: {
        success: true,
        is_new_participant: result.isNewParticipant,
        participation_created: result.participationCreated,
        participant_id: result.participantId,
      },
    }
  } catch (error) {
    logger.error('Failed to process widget capture', {
      embedCodeId,
      email: body.email,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return {
      status: 500,
      body: { error: 'Failed to process capture' },
    }
  }
}
