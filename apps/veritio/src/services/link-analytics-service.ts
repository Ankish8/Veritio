import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@veritio/study-types'

export type LinkEventType = 'view' | 'start' | 'complete' | 'screenout' | 'quota_full'
export type LinkSource = 'direct' | 'qr_code' | 'email' | 'widget' | 'custom'

export interface TrackLinkEventInput {
  studyId: string
  source: LinkSource
  eventType: LinkEventType
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  utmTerm?: string
  utmContent?: string
  customParams?: Record<string, string>
  participantId?: string
  ipHash?: string
  userAgent?: string
}

export interface LinkAnalyticsSummary {
  totalViews: number
  totalStarts: number
  totalCompletions: number
  sourceBreakdown: {
    source: string
    views: number
    starts: number
    completions: number
  }[]
  utmCampaigns: {
    campaign: string
    source: string
    medium: string
    views: number
    completions: number
  }[]
}

export function determineSource(params: URLSearchParams): LinkSource {
  const utmSource = params.get('utm_source')?.toLowerCase()

  if (utmSource === 'qr' || utmSource === 'qr_code' || utmSource === 'qrcode') {
    return 'qr_code'
  }
  if (utmSource === 'email' || utmSource === 'newsletter') {
    return 'email'
  }
  if (utmSource === 'widget' || utmSource === 'intercept') {
    return 'widget'
  }

  if (utmSource || params.get('utm_medium') || params.get('utm_campaign')) {
    return 'custom'
  }

  return 'direct'
}

export async function trackLinkEvent(
  supabase: SupabaseClient<Database>,
  input: TrackLinkEventInput,
  logger?: { info: (msg: string, data?: Record<string, unknown>) => void; warn: (msg: string, data?: Record<string, unknown>) => void; error: (msg: string, data?: Record<string, unknown>) => void }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await (supabase as any).from('link_analytics').insert({
      study_id: input.studyId,
      source: input.source,
      event_type: input.eventType,
      utm_source: input.utmSource || null,
      utm_medium: input.utmMedium || null,
      utm_campaign: input.utmCampaign || null,
      utm_term: input.utmTerm || null,
      utm_content: input.utmContent || null,
      custom_params: input.customParams || null,
      participant_id: input.participantId || null,
      ip_hash: input.ipHash || null,
      user_agent: input.userAgent || null,
    })

    if (error) {
      logger?.error('[LinkAnalytics] Failed to track event', { error })
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    logger?.error('[LinkAnalytics] Unexpected error', { error: err instanceof Error ? err.message : String(err) })
    return { success: false, error: 'Failed to track event' }
  }
}

export async function getLinkAnalytics(
  supabase: SupabaseClient<Database>,
  studyId: string,
  logger?: { info: (msg: string, data?: Record<string, unknown>) => void; warn: (msg: string, data?: Record<string, unknown>) => void; error: (msg: string, data?: Record<string, unknown>) => void }
): Promise<{ data: LinkAnalyticsSummary | null; error?: string }> {
  try {
    const { data: eventCounts, error: countsError } = await (supabase as any)
      .from('link_analytics')
      .select('event_type')
      .eq('study_id', studyId)

    if (countsError) {
      return { data: null, error: countsError.message }
    }

    const counts = {
      view: 0,
      start: 0,
      complete: 0,
    }

    for (const row of eventCounts || []) {
      if (row.event_type === 'view') counts.view++
      else if (row.event_type === 'start') counts.start++
      else if (row.event_type === 'complete') counts.complete++
    }

    const { data: sourceData, error: sourceError } = await (supabase as any)
      .from('link_analytics')
      .select('source, event_type')
      .eq('study_id', studyId)

    if (sourceError) {
      return { data: null, error: sourceError.message }
    }

    const sourceMap = new Map<string, { views: number; starts: number; completions: number }>()

    for (const row of sourceData || []) {
      const existing = sourceMap.get(row.source) || { views: 0, starts: 0, completions: 0 }
      if (row.event_type === 'view') existing.views++
      else if (row.event_type === 'start') existing.starts++
      else if (row.event_type === 'complete') existing.completions++
      sourceMap.set(row.source, existing)
    }

    const sourceBreakdown = Array.from(sourceMap.entries()).map(([source, data]) => ({
      source,
      ...data,
    }))

    const { data: utmData, error: utmError } = await (supabase as any)
      .from('link_analytics')
      .select('utm_campaign, utm_source, utm_medium, event_type')
      .eq('study_id', studyId)
      .not('utm_campaign', 'is', null)

    if (utmError) {
      return { data: null, error: utmError.message }
    }

    const utmMap = new Map<
      string,
      { campaign: string; source: string; medium: string; views: number; completions: number }
    >()

    for (const row of (utmData || []) as any[]) {
      const key = `${row.utm_campaign}|${row.utm_source}|${row.utm_medium}`
      const existing = utmMap.get(key) || {
        campaign: row.utm_campaign || '',
        source: row.utm_source || '',
        medium: row.utm_medium || '',
        views: 0,
        completions: 0,
      }
      if (row.event_type === 'view') existing.views++
      else if (row.event_type === 'complete') existing.completions++
      utmMap.set(key, existing)
    }

    const utmCampaigns = Array.from(utmMap.values())

    return {
      data: {
        totalViews: counts.view,
        totalStarts: counts.start,
        totalCompletions: counts.complete,
        sourceBreakdown,
        utmCampaigns,
      },
    }
  } catch (err) {
    logger?.error('[LinkAnalytics] Unexpected error', { error: err instanceof Error ? err.message : String(err) })
    return { data: null, error: 'Failed to get analytics' }
  }
}
