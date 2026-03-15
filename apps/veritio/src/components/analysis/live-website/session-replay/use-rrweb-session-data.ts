import useSWR from 'swr'
import { useAuthFetch } from '@/hooks'
import { computeDurationFromEvents, extractPagesFromRrwebEvents, extractViewportFromRrwebEvents } from './utils'
import type { RrwebPage } from './utils'

interface RrwebSessionMetadata {
  session_id: string
  started_at: string
  ended_at: string | null
  duration_ms: number | null
  computed_duration_ms: number | null
  event_count: number
  viewport_width: number | null
  viewport_height: number | null
  user_agent: string | null
}

interface RrwebSessionData {
  events: any[]
  metadata: RrwebSessionMetadata
  pages: RrwebPage[]
}

export function useRrwebSessionData(studyId: string, sessionId: string | null) {
  const authFetch = useAuthFetch()

  const { data, error, isLoading } = useSWR<RrwebSessionData>(
    studyId && sessionId ? `/api/studies/${studyId}/rrweb-sessions/${sessionId}` : null,
    async (url: string) => {
      const res = await authFetch(url)
      if (!res.ok) throw new Error('Failed to fetch session')
      const json = await res.json()
      const session = json.session

      // Fetch all chunks in parallel
      const chunkUrls: string[] = session.chunk_paths || []
      const chunkPromises = chunkUrls.map(async (chunkUrl: string) => {
        const chunkRes = await fetch(chunkUrl)
        if (!chunkRes.ok) return []
        return chunkRes.json()
      })

      const chunks = await Promise.all(chunkPromises)
      const allEvents = chunks.flat().sort((a: any, b: any) => a.timestamp - b.timestamp)

      // Compute fallback duration from events when duration_ms is null
      const computedDuration = computeDurationFromEvents(allEvents)

      // Extract page list from rrweb Meta events
      const pages = extractPagesFromRrwebEvents(allEvents)

      // Extract true viewport from rrweb Meta events (overrides DB metadata which may be stale)
      const rrwebViewport = extractViewportFromRrwebEvents(allEvents)

      return {
        events: allEvents,
        metadata: {
          session_id: session.session_id,
          started_at: session.started_at,
          ended_at: session.ended_at,
          duration_ms: session.duration_ms,
          computed_duration_ms: session.duration_ms ?? computedDuration,
          event_count: session.event_count,
          viewport_width: rrwebViewport?.width ?? session.viewport_width,
          viewport_height: rrwebViewport?.height ?? session.viewport_height,
          user_agent: session.user_agent ?? null,
        },
        pages,
      }
    },
    { revalidateOnFocus: false }
  )

  return { sessionData: data, error, isLoading }
}
