/**
 * Segments Page Content - Server Component
 *
 * Fetches segments data directly from Supabase, bypassing Motia IPC
 * overhead. Data is passed to the client via SWR fallback cache.
 */

import 'server-only'
import { getPanelContext } from '@/lib/server/panel-context'
import { SegmentsClientWrapper } from './segments-client-wrapper'
import { createPanelSegmentService } from '@/services/panel/index'

export async function SegmentsPageContent() {
  const ctx = await getPanelContext()

  if (!ctx) {
    return <SegmentsClientWrapper swrFallback={{}} organizationId="" />
  }

  const { userId, organizationId, supabase } = ctx

  const segmentService = createPanelSegmentService(supabase as any)
  const segments = await segmentService.list(userId, organizationId).catch(() => null)

  const swrFallback: Record<string, unknown> = {}

  if (segments) {
    swrFallback[`/api/panel/segments?organizationId=${organizationId}`] = segments
  }

  return (
    <SegmentsClientWrapper
      swrFallback={swrFallback}
      organizationId={organizationId}
    />
  )
}
