import type { ApiRequest, ApiHandlerContext } from '../../../lib/motia/types'
import type { StepConfig } from 'motia'
import { getMotiaSupabaseClient } from '../../../lib/supabase/motia-client'
import { authMiddleware } from '../../../middlewares/auth.middleware'

export const config = {
  name: 'GetWidgetAnalytics',
  description: 'Get comprehensive widget performance analytics',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/studies/:studyId/analytics/widget',
    middleware: [authMiddleware],
  }],
  enqueues: [],
  flows: ['analytics'],
} satisfies StepConfig

interface ResponseBody {
  totalImpressions: number
  totalClicks: number
  totalDismissals: number
  totalConversions: number
  clickThroughRate: number
  dismissalRate: number
  conversionRate: number
  timeSeries: { date: string; impressions: number; clicks: number; dismissals: number; conversions: number }[]
  byTrigger: { triggerType: string; impressions: number; clicks: number; ctr: number }[]
  sessionInsights: { averageTimeOnPageMs: number; averageTimeVisibleMs: number; uniqueDevices: number; returningDevices: number }
}

export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const supabase = getMotiaSupabaseClient()
  const userId = req.headers['x-user-id'] as string
  const { studyId } = (req as any).params

  if (!studyId) {
    return {
      status: 400,
      body: { error: 'Missing studyId parameter' },
    }
  }

  try {
    // Verify user owns the study
    const { data: study, error: studyError } = await supabase
      .from('studies')
      .select('id, user_id')
      .eq('id', studyId)
      .eq('user_id', userId)
      .single()

    if (studyError || !study) {
      return {
        status: 404,
        body: { error: 'Study not found or access denied' },
      }
    }

    const { data: events, error: eventsError } = await (supabase as any)
      .from('link_analytics')
      .select('event_type, widget_metadata, created_at')
      .eq('study_id', studyId)
      .eq('source', 'widget')
      .order('created_at', { ascending: true })

    if (eventsError) {
      logger.error('Error fetching widget analytics:', { error: eventsError })
      return {
        status: 500,
        body: { error: 'Failed to fetch analytics' },
      }
    }

    const impressions = (events as any[] || []).filter((e: any) => e.event_type === 'widget_impression')
    const clicks = (events as any[] || []).filter((e: any) => e.event_type === 'widget_click')
    const dismissals = (events as any[] || []).filter((e: any) => e.event_type === 'widget_dismiss')

    const { data: conversions } = await (supabase as any)
      .from('link_analytics')
      .select('id')
      .eq('study_id', studyId)
      .eq('source', 'widget')
      .eq('event_type', 'complete')

    const totalImpressions = impressions.length
    const totalClicks = clicks.length
    const totalDismissals = dismissals.length
    const totalConversions = conversions?.length || 0

    const clickThroughRate = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
    const dismissalRate = totalImpressions > 0 ? (totalDismissals / totalImpressions) * 100 : 0
    const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0

    const timeSeriesMap = new Map<string, any>()

    for (const evt of events || []) {
      const date = new Date(evt.created_at).toISOString().split('T')[0]
      const existing = timeSeriesMap.get(date) || {
        date,
        impressions: 0,
        clicks: 0,
        dismissals: 0,
        conversions: 0,
      }

      if (evt.event_type === 'widget_impression') existing.impressions++
      if (evt.event_type === 'widget_click') existing.clicks++
      if (evt.event_type === 'widget_dismiss') existing.dismissals++

      timeSeriesMap.set(date, existing)
    }

    for (const conv of conversions || []) {
      const date = new Date((conv as any).created_at).toISOString().split('T')[0]
      const existing = timeSeriesMap.get(date)
      if (existing) {
        existing.conversions++
      }
    }

    const timeSeries = Array.from(timeSeriesMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    )

    const triggerMap = new Map<string, any>()

    for (const evt of impressions) {
      const metadata = evt.widget_metadata as any
      const triggerType = metadata?.triggerType || 'unknown'

      const existing = triggerMap.get(triggerType) || {
        triggerType,
        impressions: 0,
        clicks: 0,
        ctr: 0,
      }

      existing.impressions++
      triggerMap.set(triggerType, existing)
    }

    for (const evt of clicks) {
      const metadata = evt.widget_metadata as any
      const triggerType = metadata?.triggerType || 'unknown'

      const existing = triggerMap.get(triggerType)
      if (existing) {
        existing.clicks++
      }
    }

    const byTrigger = Array.from(triggerMap.values()).map((item) => ({
      ...item,
      ctr: item.impressions > 0 ? (item.clicks / item.impressions) * 100 : 0,
    }))

    const timeOnPageValues = impressions
      .map((e) => (e.widget_metadata as any)?.timeOnPageMs)
      .filter((t) => typeof t === 'number' && t > 0)

    const averageTimeOnPageMs =
      timeOnPageValues.length > 0
        ? timeOnPageValues.reduce((sum, val) => sum + val, 0) / timeOnPageValues.length
        : 0

    const timeVisibleValues = [...clicks, ...dismissals]
      .map((e) => (e.widget_metadata as any)?.timeVisibleMs)
      .filter((t) => typeof t === 'number' && t > 0)

    const averageTimeVisibleMs =
      timeVisibleValues.length > 0
        ? timeVisibleValues.reduce((sum, val) => sum + val, 0) / timeVisibleValues.length
        : 0

    const { data: sessions } = await (supabase as any)
      .from('widget_sessions')
      .select('device_fingerprint, impression_count')
      .eq('study_id', studyId)

    const uniqueDevices = sessions?.length || 0
    const returningDevices = sessions?.filter((s: any) => s.impression_count > 1).length || 0

    const response: ResponseBody = {
      totalImpressions,
      totalClicks,
      totalDismissals,
      totalConversions,
      clickThroughRate,
      dismissalRate,
      conversionRate,
      timeSeries,
      byTrigger,
      sessionInsights: {
        averageTimeOnPageMs,
        averageTimeVisibleMs,
        uniqueDevices,
        returningDevices,
      },
    }

    return {
      status: 200,
      body: response,
    }
  } catch (error) {
    logger.error('Error getting widget analytics:', { error: String(error) })
    return {
      status: 500,
      body: { error: 'Internal server error' },
    }
  }
}
