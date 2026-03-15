import type { StepConfig } from 'motia'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../../lib/motia/types'
import { authMiddleware } from '../../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../../middlewares/error-handler.middleware'
import { rateLimitMiddleware } from '../../../../middlewares/rate-limit/rate-limit.middleware'
import { getMotiaSupabaseClient } from '../../../../lib/supabase/motia-client'
const querySchema = z.object({
  format: z.enum(['csv', 'json']).optional().default('csv'),
  status: z.string().optional(),
  source: z.string().optional(),
})

export const config = {
  name: 'ExportPanelParticipants',
  description: 'Export all panel participants',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/panel/participants/export',
    middleware: [authMiddleware, rateLimitMiddleware({ tier: 'authenticated-mutation' }), errorHandlerMiddleware],
  }],
  enqueues: ['panel-participants-exported'],
  flows: ['panel'],
} satisfies StepConfig

export const handler = async (req: ApiRequest, { logger, enqueue }: ApiHandlerContext) => {
  const userId = req.headers['x-user-id'] as string
  const organizationId = (req.queryParams?.organizationId as string) || ''
  const query = querySchema.parse(req.queryParams || {})

  logger.info('Exporting panel participants', { userId, format: query.format })

  const supabase = getMotiaSupabaseClient()

  try {
    const PAGE_SIZE = 1000
    const MAX_PARTICIPANTS = 50000
    let offset = 0
     
    const participants: any[] = []

    while (true) {
       
      let dbQuery = (supabase as any)
        .from('panel_participants')
        .select(`
          *,
          panel_participant_tags!left (
            panel_tags (name)
          )
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1)

      if (query.status) {
        dbQuery = dbQuery.eq('status', query.status)
      }
      if (query.source) {
        dbQuery = dbQuery.eq('source', query.source)
      }

      const { data: page, error } = await dbQuery

      if (error) throw error
      if (!page || page.length === 0) break

      participants.push(...page)
      offset += PAGE_SIZE

      if (offset >= MAX_PARTICIPANTS) {
        logger.warn('Export truncated at 50K participants', { userId })
        break
      }
    }

    const exportData = (participants || []).map((p: any) => {
      const tags = (p.panel_participant_tags || [])
        .map((pt: { panel_tags: { name: string } | null }) => pt.panel_tags?.name)
        .filter(Boolean)
        .join(', ')

      const demographics = p.demographics as Record<string, string> || {}

      return {
        email: p.email,
        first_name: p.first_name || '',
        last_name: p.last_name || '',
        status: p.status,
        source: p.source,
        tags,
        country: demographics.country || '',
        age_range: demographics.age_range || '',
        gender: demographics.gender || '',
        industry: demographics.industry || '',
        job_role: demographics.job_role || '',
        company_size: demographics.company_size || '',
        language: demographics.language || '',
        created_at: p.created_at,
        last_active_at: p.last_active_at || '',
      }
    })

    enqueue({
      topic: 'panel-participants-exported',
      data: { userId, count: exportData.length, format: query.format },
    }).catch(() => {})

    if (query.format === 'json') {
      logger.info('Exported participants as JSON', { userId, count: exportData.length })
      return {
        status: 200,
        body: exportData,
      }
    }

    if (exportData.length === 0) {
      return {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="participants.csv"',
        },
        body: 'email,first_name,last_name,status,source,tags,country,age_range,gender,industry,job_role,company_size,language,created_at,last_active_at\n',
      }
    }

    const headers = Object.keys(exportData[0])
    const csvRows = [
      headers.join(','),
      ...exportData.map((row: any) =>
        headers.map((h) => {
          const value = String(row[h as keyof typeof row] || '')
          // Escape quotes and wrap in quotes if contains comma
          if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`
          }
          return value
        }).join(',')
      ),
    ]

    logger.info('Exported participants as CSV', { userId, count: exportData.length })

    return {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="participants.csv"',
      },
      body: csvRows.join('\n'),
    }
  } catch (error) {
    logger.error('Failed to export participants', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return {
      status: 500,
      body: { error: 'Failed to export participants' },
    }
  }
}
