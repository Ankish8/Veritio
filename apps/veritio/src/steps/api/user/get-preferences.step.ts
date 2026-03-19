import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { getUserPreferences } from '../../../services/user-preferences-service'

const responseSchema = z.object({
  profile: z.object({
    avatarUrl: z.string().nullable(),
    displayNamePreference: z.enum(['full_name', 'first_name', 'email']),
  }),
  studyDefaults: z.object({
    branding: z.object({
      primaryColor: z.string(),
      backgroundColor: z.string(),
      stylePreset: z.enum(['default', 'vega', 'nova', 'maia', 'lyra', 'mira']),
      radiusOption: z.enum(['none', 'small', 'default', 'large']),
      themeMode: z.enum(['light', 'dark', 'system']),
      logoUrl: z.string().nullable(),
      logoSize: z.number(),
    }),
    settings: z.object({
      language: z.string(),
      closingRuleType: z.enum(['none', 'date', 'participant_count', 'both']),
      maxParticipants: z.number().nullable(),
      responsePreventionLevel: z.enum(['none', 'relaxed', 'moderate', 'strict']),
    }),
    notifications: z.object({
      enabled: z.boolean(),
      everyResponse: z.boolean(),
      milestones: z.boolean(),
      milestoneValues: z.array(z.number()),
      dailyDigest: z.boolean(),
      onClose: z.boolean(),
    }),
  }),
  dashboard: z.object({
    theme: z.enum(['light', 'dark', 'system']),
    tableDensity: z.enum(['compact', 'default', 'comfortable']),
    showArchived: z.boolean(),
  }),
  notifications: z.object({
    marketing: z.boolean(),
    productUpdates: z.boolean(),
    securityAlerts: z.boolean(),
  }),
  privacy: z.object({
    analyticsEnabled: z.boolean(),
  }),
  workspace: z.object({
    lastActiveOrgId: z.string().nullable(),
  }),
  ai: z.object({
    openai: z.object({ apiKeyMasked: z.string().nullable(), hasApiKey: z.boolean(), baseUrl: z.string().nullable(), model: z.string().nullable() }),
    mercury: z.object({ apiKeyMasked: z.string().nullable(), hasApiKey: z.boolean(), baseUrl: z.string().nullable(), model: z.string().nullable() }),
    useSameProvider: z.boolean(),
  }),
})

export const config = {
  name: 'GetUserPreferences',
  description: 'Get user preferences including profile, study defaults, and dashboard settings',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/user/preferences',
    middleware: [authMiddleware, errorHandlerMiddleware],
    responseSchema: {
    200: responseSchema as any,
    401: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: [],
  flows: ['user-settings'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string

  logger.info('Fetching user preferences', { userId })

  const supabase = getMotiaSupabaseClient()
  const { data, error } = await getUserPreferences(supabase, userId)

  if (error) {
    logger.error('Failed to fetch user preferences', { userId, error: error.message })
    return {
      status: 500,
      body: { error: 'Failed to fetch preferences' },
    }
  }

  logger.info('User preferences fetched successfully', { userId })

  return {
    status: 200,
    body: data,
  }
}
