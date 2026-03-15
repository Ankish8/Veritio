import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { getDashboardStats, getRecentStudies, getDashboardInsights, getStudyTypeResponses, getProjectList } from '../../../services/dashboard-service'

const querySchema = z.object({
  organizationId: z.string().uuid().optional(),
})

const responseSchema = z.object({
  stats: z.object({
    totalProjects: z.number(),
    totalStudies: z.number(),
    activeStudies: z.number(),
    totalParticipants: z.number(),
  }),
  recentStudies: z.array(z.object({
    id: z.string().uuid(),
    title: z.string(),
    study_type: z.enum(['card_sort', 'tree_test', 'survey', 'prototype_test', 'first_click', 'first_impression', 'live_website_test']),
    status: z.enum(['draft', 'active', 'paused', 'completed']),
    project_id: z.string().uuid(),
    project_name: z.string(),
    participant_count: z.number(),
    updated_at: z.string(),
  })),
  insights: z.object({
    avgResponsesPerStudy: z.number(),
    responsesThisWeek: z.number(),
    responsesLastWeek: z.number(),
    topStudyType: z.object({
      type: z.string(),
      percentage: z.number(),
    }).nullable(),
    avgCompletionRate: z.number(),
    topStudiesByResponses: z.array(z.object({
      id: z.string(),
      title: z.string(),
      participant_count: z.number(),
    })),
  }),
  studyTypeResponses: z.array(z.object({
    type: z.string(),
    label: z.string(),
    count: z.number(),
  })),
})

export const config = {
  name: 'GetDashboardStats',
  description: 'Get dashboard statistics and recent studies for the current user',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/dashboard/stats',
    middleware: [authMiddleware, errorHandlerMiddleware],
    responseSchema: {
    200: responseSchema as any,
    401: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: ['dashboard-fetched'],
  flows: ['dashboard'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const query = querySchema.parse(req.queryParams || {})
  const { organizationId } = query

  logger.info('Fetching dashboard stats', { userId, organizationId })

  const supabase = getMotiaSupabaseClient()

  // Fetch stats, recent studies, insights, study type responses, and projects in parallel
  // All functions now support organization filtering for multi-tenancy
  const [statsResult, recentResult, insightsResult, studyTypeResponsesResult, projectListResult] = await Promise.all([
    getDashboardStats(supabase, userId, organizationId),
    getRecentStudies(supabase, userId, 10, organizationId),
    getDashboardInsights(supabase, userId, organizationId),
    getStudyTypeResponses(supabase, userId, organizationId),
    getProjectList(supabase, userId, organizationId),
  ])

  if (statsResult.error) {
    logger.error('Failed to fetch dashboard stats', { userId, error: statsResult.error.message })
    return {
      status: 500,
      body: { error: 'Failed to fetch dashboard stats' },
    }
  }

  if (recentResult.error) {
    logger.error('Failed to fetch recent studies', { userId, error: recentResult.error.message })
    return {
      status: 500,
      body: { error: 'Failed to fetch recent studies' },
    }
  }

  const fallbackInsights = {
    avgResponsesPerStudy: 0,
    responsesThisWeek: 0,
    responsesLastWeek: 0,
    topStudyType: null,
    avgCompletionRate: 0,
    topStudiesByResponses: [],
  }

  if (insightsResult.error) {
    logger.error('Failed to fetch dashboard insights', { userId, error: insightsResult.error.message })
  }

  if (studyTypeResponsesResult.error) {
    logger.error('Failed to fetch study type responses', { userId, error: studyTypeResponsesResult.error.message })
  }

  logger.info('Dashboard stats fetched successfully', { userId })

  enqueue({
    topic: 'dashboard-fetched',
    data: { resourceType: 'dashboard', action: 'fetch', userId },
  }).catch(() => {})

  return {
    status: 200,
    body: {
      stats: statsResult.data,
      recentStudies: recentResult.data || [],
      insights: insightsResult.data ?? fallbackInsights,
      studyTypeResponses: studyTypeResponsesResult.data || [],
      projects: projectListResult.data || [],
    },
  }
}
