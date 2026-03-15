import { Suspense } from 'react'
import { cookies } from 'next/headers'
import { AlertCircle } from 'lucide-react'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { LazyPublicResultsClient } from './results-loader'
import { PasswordGate } from './password-gate'
import { ResultsSkeleton } from './results-skeleton'
import { verifyAccessCookie } from './actions'
import { trackPublicResultsView } from '@/services/public-results-service'
import { ThemeProvider } from '@/components/study-flow/player/theme-provider'
import { BrandingProvider } from '@/components/study-flow/player/branding-provider'
import type { BrandingSettings } from '@/components/builders/shared/types'

import { getCardSortOverview } from '@/services/results/card-sort-overview'
import { getTreeTestOverview } from '@/services/results/tree-test-overview'
import { getSurveyOverview } from '@/services/results/survey-overview'
import { getPrototypeTestOverview } from '@/services/results/prototype-test-overview'
import { getFirstClickOverview } from '@/services/results/first-click-overview'
import { getFirstImpressionOverview } from '@/services/results/first-impression-overview'
import { getLiveWebsiteOverview } from '@/services/results/live-website-overview'
import { fetchAllFlowResponses } from '@/services/results/pagination'
// Dynamic import to avoid Turbopack bundling @aws-sdk/client-s3 at module evaluation
async function getR2PlaybackUrl(storagePath: string, expiresIn: number): Promise<string> {
  const { getPlaybackUrl } = await import('@/services/storage/r2-client')
  return getPlaybackUrl(storagePath, expiresIn)
}

interface PublicResultsPageProps {
  params: Promise<{ token: string }>
}

const STUDY_TYPE_LABELS: Record<string, string> = {
  card_sort: 'Card Sort',
  tree_test: 'Tree Test',
  survey: 'Survey',
  prototype_test: 'Figma Prototype Test',
  first_click: 'First Click',
  first_impression: 'First Impression',
  live_website_test: 'Web App Test',
}

/** Lightweight server-rendered error screen — zero client JS */
function ErrorScreen({ title, message }: { title: string; message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <AlertCircle className="h-8 w-8 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        <p className="mt-4 text-muted-foreground">{message}</p>
      </div>
    </div>
  )
}

/** Inline error shown inside the page shell when data fetch fails */
function InlineError() {
  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-medium mb-2">Failed to Load Results</h3>
        <p className="text-sm text-muted-foreground">Please try refreshing the page.</p>
      </div>
    </div>
  )
}

async function fetchResultsByType(supabase: any, studyId: string, studyType: string) {
  switch (studyType) {
    case 'card_sort':
      return getCardSortOverview(supabase, studyId)
    case 'tree_test':
      return getTreeTestOverview(supabase, studyId)
    case 'survey':
      return getSurveyOverview(supabase, studyId)
    case 'prototype_test':
      return getPrototypeTestOverview(supabase, studyId)
    case 'first_click':
      return getFirstClickOverview(supabase, studyId)
    case 'first_impression':
      return getFirstImpressionOverview(supabase, studyId)
    case 'live_website_test':
      return getLiveWebsiteOverview(supabase, studyId)
    default:
      return { data: null, error: new Error('Unsupported study type') }
  }
}

/**
 * Heavy data fetcher — runs inside a nested Suspense boundary so the page shell
 * (header + skeleton) streams to the browser immediately after auth.
 *
 * Fetches results, AI insights, and survey flow responses in parallel.
 */
async function ResultsDataLoader({
  studyId,
  studyType,
  sharedMetrics,
  branding,
  token,
}: {
  studyId: string
  studyType: string
  sharedMetrics: {
    overview: boolean
    participants: boolean
    analysis: boolean
    questionnaire: boolean
    aiInsights: boolean
  }
  branding: Record<string, unknown> | undefined
  token: string
}) {
  const supabase = createServiceRoleClient()

  // Parallel fetch: results data + AI insights + survey flow responses + recordings
  const [resultsResponse, aiReport, surveyFlowResponses, recordingsResult] = await Promise.all([
    fetchResultsByType(supabase, studyId, studyType),
    sharedMetrics.aiInsights
      ? (supabase as any)
          .from('ai_insights_reports')
          .select('id, report_data, file_path, completed_at')
          .eq('study_id', studyId)
          .eq('status', 'completed')
          .order('completed_at', { ascending: false })
          .limit(1)
          .single()
          .then((r: any) => r.data)
      : Promise.resolve(null),
    studyType === 'survey'
      ? fetchAllFlowResponses(supabase, studyId)
      : Promise.resolve(null),
    // Fetch recordings for live website tests (RecordingsTab normally fetches via auth API)
    studyType === 'live_website_test'
      ? (supabase as any)
          .from('recordings')
          .select('id, participant_id, scope, task_attempt_id, capture_mode, duration_ms, file_size_bytes, status, started_at, completed_at, created_at, recording_type, storage_path, transcripts(status, word_count)')
          .eq('study_id', studyId)
          .eq('recording_type', 'primary')
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .then((r: any) => r.data || [])
      : Promise.resolve(null),
  ])

  if (resultsResponse.error || !resultsResponse.data) {
    return <InlineError />
  }

  const fullResults = resultsResponse.data as any

  // Merge survey flow responses (fetched in parallel above)
  if (studyType === 'survey' && surveyFlowResponses && surveyFlowResponses.length > 0) {
    fullResults.flowResponses = surveyFlowResponses
  }

  // Merge recordings for live website tests (fetched server-side since RecordingsTab uses auth API)
  if (recordingsResult && recordingsResult.length > 0) {
    // Generate signed playback URLs server-side (no auth needed on client)
    const recordingsWithUrls = await Promise.all(
      recordingsResult.map(async (r: any) => {
        let playbackUrl: string | null = null
        if (r.storage_path && (r.status === 'ready' || r.status === 'completed')) {
          try {
            playbackUrl = await getR2PlaybackUrl(r.storage_path, 3600)
          } catch { /* URL generation failed — player will show fallback */ }
        }
        return {
          id: r.id,
          participant_id: r.participant_id,
          scope: r.scope,
          task_attempt_id: r.task_attempt_id,
          capture_mode: r.capture_mode,
          duration_ms: r.duration_ms,
          file_size_bytes: r.file_size_bytes,
          status: r.status,
          started_at: r.started_at,
          completed_at: r.completed_at,
          created_at: r.created_at,
          has_transcript: r.transcripts?.length > 0,
          transcript_status: r.transcripts?.[0]?.status || null,
          transcript_word_count: r.transcripts?.[0]?.word_count || null,
          playback_url: playbackUrl,
        }
      })
    )
    fullResults.recordings = recordingsWithUrls
  }

  if (aiReport) {
    fullResults.insightsReport = aiReport
  }

  // Compute participant stats from results
  const participants = fullResults.participants || []
  const completed = participants.filter((p: any) => p.status === 'completed')
  const averageDuration =
    completed.length > 0
      ? completed.reduce((sum: number, p: any) => {
          if (p.completed_at && p.started_at) {
            const duration =
              new Date(p.completed_at).getTime() - new Date(p.started_at).getTime()
            return sum + duration
          }
          return sum
        }, 0) /
        completed.length /
        1000
      : 0

  const resultsData = {
    study: {
      id: studyId,
      title: '', // Not needed — header is rendered by shell
      type: studyType,
    },
    overview: sharedMetrics.overview
      ? {
          totalParticipants: participants.length,
          completedParticipants: completed.length,
          completionRate:
            participants.length > 0
              ? ((completed.length / participants.length) * 100).toFixed(1)
              : '0',
          averageDurationSeconds: Math.round(averageDuration),
        }
      : null,
    participantCount: sharedMetrics.participants ? completed.length : null,
    sharedMetrics,
    fullResults,
  }

  return (
    <LazyPublicResultsClient
      data={resultsData}
      token={token}
      branding={branding}
      contentOnly
    />
  )
}

/**
 * Auth gate + page shell.
 *
 * The auth check (single DB query + cookie read) is fast (~200ms).
 * After auth passes, the page shell (header + skeleton) streams IMMEDIATELY
 * while heavy data loads in a nested Suspense boundary.
 */
async function PublicResultsFetcher({ token }: { token: string }) {
  const supabase = createServiceRoleClient()

  // FAST: Single query for study metadata
  const { data: studyRaw, error } = await (supabase as any)
    .from('studies')
    .select('id, title, study_type, sharing_settings, branding, public_results_token')
    .eq('public_results_token', token)
    .single()

  const study = studyRaw as {
    id: string
    title: string
    study_type: string
    sharing_settings: unknown
    branding: unknown
    public_results_token: string | null
  } | null

  if (error || !study) {
    return (
      <ErrorScreen
        title="Results Not Found"
        message="These results could not be found. The link may have been changed or removed."
      />
    )
  }

  const sharingSettings = study.sharing_settings as {
    publicResults?: {
      enabled: boolean
      password?: string
      passwordHash?: string
      expiresAt?: string
      viewCount?: number
      lastViewedAt?: string
      sharedMetrics: {
        overview: boolean
        participants: boolean
        analysis: boolean
        questionnaire: boolean
        aiInsights?: boolean
      }
    }
  } | null

  const publicResults = sharingSettings?.publicResults

  if (!publicResults?.enabled) {
    return (
      <ErrorScreen
        title="Sharing Disabled"
        message="Public sharing has been disabled for this study."
      />
    )
  }

  // Check expiry
  if (publicResults.expiresAt) {
    const expiryDate = new Date(publicResults.expiresAt)
    if (expiryDate < new Date()) {
      return (
        <ErrorScreen
          title="Link Expired"
          message="This link has expired and is no longer accessible."
        />
      )
    }
  }

  // Check password via httpOnly cookie (never via URL)
  const hasPassword = publicResults.password || publicResults.passwordHash
  if (hasPassword) {
    const cookieStore = await cookies()
    const accessCookie = cookieStore.get(`pr_access_${token}`)?.value
    const hasValidAccess = await verifyAccessCookie(token, accessCookie)

    if (!hasValidAccess) {
      return (
        <PasswordGate
          token={token}
          studyTitle={study.title}
          branding={study.branding as Record<string, unknown>}
        />
      )
    }
  }

  // Fire-and-forget view tracking (don't await — don't slow page load)
  trackPublicResultsView(supabase, token).catch(() => {})

  // ─── AUTH PASSED — render shell IMMEDIATELY, stream data ───

  const brandingSettings = (study.branding || {}) as BrandingSettings
  const logoUrl = brandingSettings.logo?.url
  const logoSize = brandingSettings.logoSize || 48
  const sharedMetrics = {
    ...publicResults.sharedMetrics,
    aiInsights: publicResults.sharedMetrics.aiInsights ?? false,
  }

  return (
    <ThemeProvider themeMode={brandingSettings.themeMode}>
      <BrandingProvider branding={brandingSettings}>
        <div className="min-h-screen bg-background">
          {/* INSTANT: Header — rendered immediately after auth */}
          <header className="sticky top-0 z-50 bg-card border-b">
            <div className="max-w-6xl mx-auto px-4 py-6">
              <div className="flex items-center gap-4">
                {logoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element -- external branding URL
                  <img src={logoUrl} alt="Logo" className="object-contain" style={{ height: logoSize }} />
                )}
                <div>
                  <h1 className="text-xl font-bold text-foreground">{study.title}</h1>
                  <p className="text-sm text-muted-foreground">
                    {STUDY_TYPE_LABELS[study.study_type] || study.study_type} Results
                  </p>
                </div>
              </div>
            </div>
          </header>

          {/* STREAMED: Content area — skeleton shown while data loads */}
          <main className="max-w-6xl mx-auto px-4 py-8">
            <Suspense fallback={<ResultsSkeleton />}>
              <ResultsDataLoader
                studyId={study.id}
                studyType={study.study_type}
                sharedMetrics={sharedMetrics}
                branding={study.branding as Record<string, unknown>}
                token={token}
              />
            </Suspense>

            <footer className="mt-12 text-center text-sm text-muted-foreground/60">
              <p>This is a read-only view of study results.</p>
            </footer>
          </main>
        </div>
      </BrandingProvider>
    </ThemeProvider>
  )
}

export default async function PublicResultsPage({ params }: PublicResultsPageProps) {
  const { token } = await params

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    }>
      <PublicResultsFetcher token={token} />
    </Suspense>
  )
}
