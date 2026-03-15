import { createClient } from '@/lib/supabase/server'
import { CompleteClient, type CompletionStatus } from './complete-client'

/**
 * CompletePage - Server component that fetches study data and renders completion UI
 *
 * Query params:
 * - status: 'complete' | 'screenout' | 'quota_full' (defaults to 'complete')
 *
 * Features:
 * - Fetches study settings for redirect URLs and branding
 * - Passes data to client component for countdown/redirect
 */

interface CompletePageProps {
  params: Promise<{ studyCode: string }>
  searchParams: Promise<{ status?: string }>
}

export default async function CompletePage({ params, searchParams }: CompletePageProps) {
  const { studyCode } = await params
  const { status: statusParam } = await searchParams

  // Validate status parameter
  const validStatuses: CompletionStatus[] = ['complete', 'screenout', 'quota_full']
  const status: CompletionStatus = validStatuses.includes(statusParam as CompletionStatus)
    ? (statusParam as CompletionStatus)
    : 'complete'

  // Fetch study data for thank you message, redirect settings, and branding
  const supabase = await createClient()
  const { data: study } = await supabase
    .from('studies')
    .select('thank_you_message, settings, branding')
    .eq('share_code', studyCode)
    .single()

  // Also check by url_slug if not found by share_code
  let studyData = study
  if (!studyData) {
    const { data: slugStudy } = await supabase
      .from('studies')
      .select('thank_you_message, settings, branding')
      .eq('url_slug', studyCode)
      .single()
    studyData = slugStudy
  }

  // Extract redirect settings from studyFlow settings
  const settings = studyData?.settings as {
    studyFlow?: {
      thankYou?: {
        redirectUrl?: string
        redirectDelay?: number
      }
    }
    redirects?: {
      completionUrl?: string
      screenoutUrl?: string
      quotaFullUrl?: string
      redirectDelay?: number
    }
  } | null

  // Build redirect settings from either studyFlow.thankYou or settings.redirects
  const redirectSettings = settings?.redirects || (settings?.studyFlow?.thankYou ? {
    completionUrl: settings.studyFlow.thankYou.redirectUrl,
    redirectDelay: settings.studyFlow.thankYou.redirectDelay,
  } : undefined)

  const branding = studyData?.branding as {
    primaryColor?: string
    logo?: { url: string }
  } | null

  return (
    <CompleteClient
      status={status}
      thankYouMessage={studyData?.thank_you_message || undefined}
      redirectSettings={redirectSettings}
      branding={branding || undefined}
    />
  )
}
