import useSWR from 'swr'
import { useAuthFetch } from '@/hooks'
import type { LiveWebsiteRrwebSession } from '@/app/(dashboard)/projects/[projectId]/studies/[studyId]/results/types'

export function useRrwebSessions(studyId: string, options?: { status?: string; participantId?: string }) {
  const authFetch = useAuthFetch()

  const params = new URLSearchParams()
  if (options?.status) params.set('status', options.status)
  if (options?.participantId) params.set('participant_id', options.participantId)
  const query = params.toString()
  const url = `/api/studies/${studyId}/rrweb-sessions${query ? `?${query}` : ''}`

  const { data, error, isLoading, mutate } = useSWR<LiveWebsiteRrwebSession[]>(
    studyId ? url : null,
    async (url: string) => {
      const res = await authFetch(url)
      if (!res.ok) throw new Error('Failed to fetch sessions')
      const json = await res.json()
      return json.sessions
    }
  )

  return { sessions: data ?? [], error, isLoading, mutate }
}
