import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'

const statsResponseSchema = z.object({
  studyId: z.string().uuid(),
  participantStats: z.object({
    total: z.number(),
    completed: z.number(),
    inProgress: z.number(),
    abandoned: z.number(),
    screened: z.number(),
  }),
  completionRate: z.number(),
  averageDurationSeconds: z.number().nullable(),
  responsesByDay: z.array(
    z.object({
      date: z.string(),
      count: z.number(),
    })
  ),
})

export const config = {
  name: 'GetStudyStats',
  description: 'Get statistics for a study including participant counts and completion rates',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/studies/:studyId/stats',
    middleware: [authMiddleware, errorHandlerMiddleware],
    responseSchema: {
    200: statsResponseSchema as any,
    401: z.object({ error: z.string() }) as any,
    404: z.object({ error: z.string() }) as any,
    500: z.object({ error: z.string() }) as any,
  },
  }],
  enqueues: [],
  flows: ['analytics', 'study-management'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const { studyId } = req.pathParams as { studyId: string }

  logger.info('Getting study stats', { userId, studyId })

  const supabase = getMotiaSupabaseClient()

  const { data: study, error: studyError } = await supabase
    .from('studies')
    .select('id, user_id')
    .eq('id', studyId)
    .single()

  if (studyError || !study) {
    logger.warn('Study not found', { userId, studyId })
    return {
      status: 404,
      body: { error: 'Study not found' },
    }
  }

  if (study.user_id !== userId) {
    logger.warn('Unauthorized access to study stats', { userId, studyId, ownerId: study.user_id })
    return {
      status: 401,
      body: { error: 'Unauthorized' },
    }
  }

  const { data: participants, error: participantsError } = await supabase
    .from('participants')
    .select('id, status, started_at, completed_at')
    .eq('study_id', studyId)

  if (participantsError) {
    logger.error('Failed to fetch participants', { userId, studyId, error: participantsError.message })
    return {
      status: 500,
      body: { error: 'Failed to fetch statistics' },
    }
  }

  const participantList = participants || []

  const participantStats = {
    total: participantList.length,
    completed: participantList.filter((p) => p.status === 'completed').length,
    inProgress: participantList.filter((p) => p.status === 'in_progress').length,
    abandoned: participantList.filter((p) => p.status === 'abandoned').length,
    screened: participantList.filter((p) => p.status === 'screened_out').length,
  }

  const completionRate =
    participantStats.total > 0
      ? Math.round((participantStats.completed / participantStats.total) * 100)
      : 0

  const completedWithDuration = participantList.filter(
    (p) => p.status === 'completed' && p.started_at && p.completed_at
  )

  let averageDurationSeconds: number | null = null
  if (completedWithDuration.length > 0) {
    const totalDuration = completedWithDuration.reduce((sum, p) => {
      const start = new Date(p.started_at!).getTime()
      const end = new Date(p.completed_at!).getTime()
      return sum + (end - start) / 1000
    }, 0)
    averageDurationSeconds = Math.round(totalDuration / completedWithDuration.length)
  }

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const responsesByDay = participantList
    .filter((p) => p.started_at && new Date(p.started_at) >= thirtyDaysAgo)
    .reduce(
      (acc, p) => {
        const date = new Date(p.started_at!).toISOString().split('T')[0]
        const existing = acc.find((d) => d.date === date)
        if (existing) {
          existing.count++
        } else {
          acc.push({ date, count: 1 })
        }
        return acc
      },
      [] as { date: string; count: number }[]
    )
    .sort((a, b) => a.date.localeCompare(b.date))

  logger.info('Study stats fetched successfully', {
    userId,
    studyId,
    totalParticipants: participantStats.total,
  })

  return {
    status: 200,
    body: {
      studyId,
      participantStats,
      completionRate,
      averageDurationSeconds,
      responsesByDay,
    },
  }
}
