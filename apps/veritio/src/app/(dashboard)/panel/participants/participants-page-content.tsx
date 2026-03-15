/**
 * Participants Page Content - Server Component
 *
 * Fetches initial participants and tags data directly from Supabase,
 * bypassing Motia IPC overhead (~900ms per call). Data is passed to
 * the client via SWR fallback cache for instant rendering.
 */

import 'server-only'
import { getPanelContext } from '@/lib/server/panel-context'
import { ParticipantsClientWrapper } from './participants-client-wrapper'
import { createPanelParticipantService, createPanelTagService } from '@/services/panel/index'

export async function ParticipantsPageContent() {
  const ctx = await getPanelContext()

  if (!ctx) {
    return <ParticipantsClientWrapper swrFallback={{}} organizationId="" />
  }

  const { userId, organizationId, supabase } = ctx

  const participantService = createPanelParticipantService(supabase as any)
  const tagService = createPanelTagService(supabase as any)

  const [participants, tags] = await Promise.all([
    participantService.list(userId, organizationId, {}, { page: 1, limit: 50 }).catch(() => null),
    tagService.list(userId, organizationId).catch(() => null),
  ])

  const swrFallback: Record<string, unknown> = {}

  if (participants) {
    // Key must match what usePanelParticipants builds with default options:
    // organizationId + page=1 + limit=50 (no sort_by/sort_order when not provided)
    const params = new URLSearchParams()
    params.set('organizationId', organizationId)
    params.set('page', '1')
    params.set('limit', '50')
    swrFallback[`/api/panel/participants?${params.toString()}`] = participants
  }

  if (tags) {
    swrFallback[`/api/panel/tags?organizationId=${organizationId}`] = tags
  }

  return (
    <ParticipantsClientWrapper
      swrFallback={swrFallback}
      organizationId={organizationId}
    />
  )
}
