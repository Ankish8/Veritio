import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { updateUserPreferences } from '../../../services/user-preferences-service'

const bodySchema = z.object({
  profile: z.object({
    avatarUrl: z.string().nullable().optional(),
    displayNamePreference: z.enum(['full_name', 'first_name', 'email']).optional(),
  }).optional(),
  studyDefaults: z.object({
    branding: z.object({
      primaryColor: z.string().optional(),
      backgroundColor: z.string().optional(),
      stylePreset: z.enum(['default', 'vega', 'nova', 'maia', 'lyra', 'mira']).optional(),
      radiusOption: z.enum(['none', 'small', 'default', 'large']).optional(),
      themeMode: z.enum(['light', 'dark', 'system']).optional(),
      logoUrl: z.string().nullable().optional(),
      logoSize: z.number().min(24).max(80).optional(),
    }).optional(),
    settings: z.object({
      language: z.string().optional(),
      closingRuleType: z.enum(['none', 'date', 'participant_count', 'both']).optional(),
      maxParticipants: z.number().nullable().optional(),
      responsePreventionLevel: z.enum(['none', 'relaxed', 'moderate', 'strict']).optional(),
    }).optional(),
    notifications: z.object({
      enabled: z.boolean().optional(),
      everyResponse: z.boolean().optional(),
      milestones: z.boolean().optional(),
      milestoneValues: z.array(z.number()).optional(),
      dailyDigest: z.boolean().optional(),
      onClose: z.boolean().optional(),
    }).optional(),
  }).optional(),
  dashboard: z.object({
    theme: z.enum(['light', 'dark', 'system']).optional(),
    tableDensity: z.enum(['compact', 'default', 'comfortable']).optional(),
    showArchived: z.boolean().optional(),
  }).optional(),
  notifications: z.object({
    marketing: z.boolean().optional(),
    productUpdates: z.boolean().optional(),
    securityAlerts: z.boolean().optional(),
  }).optional(),
  privacy: z.object({
    analyticsEnabled: z.boolean().optional(),
  }).optional(),
  workspace: z.object({
    lastActiveOrgId: z.string().nullable().optional(),
  }).optional(),
}).partial()

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
})

export const config = {
  name: 'UpdateUserPreferences',
  description: 'Update user preferences (supports partial updates)',
  triggers: [{
    type: 'http',
    method: 'PATCH',
    path: '/api/user/preferences',
    middleware: [authMiddleware, errorHandlerMiddleware],
    bodySchema: bodySchema as any,
    responseSchema: {
    200: responseSchema as any,
    400: z.object({ error: z.string(), details: z.any().optional() }) as any,
    401: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: ['user-preferences-updated'],
  flows: ['user-settings'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string

  const parsed = bodySchema.safeParse(req.body)
  if (!parsed.success) {
    logger.warn('Invalid preferences update request', { userId, errors: parsed.error.issues })
    return {
      status: 400,
      body: { error: 'Validation failed', details: parsed.error.issues },
    }
  }

  logger.info('Updating user preferences', { userId, fields: Object.keys(parsed.data), data: parsed.data })

  const supabase = getMotiaSupabaseClient()
  const { data: updateData, error: updateError } = await updateUserPreferences(supabase, userId, parsed.data)

  logger.info('Update result', { userId, updateData, updateError: updateError?.message })

  if (updateError) {
    logger.error('Failed to update user preferences', { userId, error: updateError.message })
    return {
      status: 500,
      body: { error: 'Failed to update preferences' },
    }
  }

  // Return the upsert result directly - it already contains all columns via .select('*')
  // This avoids potential timing/caching issues with a separate fetch
  if (!updateData) {
    logger.error('Update succeeded but returned no data', { userId })
    return {
      status: 500,
      body: { error: 'Update returned no data' },
    }
  }

  // Sync avatar URL to the user table so it propagates to comments, member lists, etc.
  if (parsed.data.profile?.avatarUrl !== undefined) {
    const { error: userUpdateError } = await supabase
      .from('user')
      .update({ image: parsed.data.profile.avatarUrl })
      .eq('id', userId)

    if (userUpdateError) {
      logger.warn('Failed to sync avatar to user table', { userId, error: userUpdateError.message })
      // Non-fatal — preferences were already saved
    }
  }

  enqueue({
    topic: 'user-preferences-updated',
    data: {
      resourceType: 'user-preferences',
      action: 'updated',
      userId,
      metadata: { updatedFields: Object.keys(parsed.data) },
    },
  }).catch(() => {})

  return {
    status: 200,
    body: updateData,
  }
}
