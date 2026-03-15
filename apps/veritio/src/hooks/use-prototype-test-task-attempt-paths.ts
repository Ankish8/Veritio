import useSWR from 'swr'
import type { Json } from '@/lib/supabase/database.types'

export interface TaskAttemptPathData {
  id: string
  participant_id: string
  task_id: string
  path_taken: Json | null
  outcome: string
  is_direct: boolean | null
  success_pathway_snapshot: Json | null
  session_id: string
}

/** Lazy loads task attempt path data, fetched separately due to large JSON payloads. */
export function usePrototypeTestTaskAttemptPaths(studyId: string | null) {
  const { data, error, isLoading } = useSWR<TaskAttemptPathData[]>(
    studyId ? `/api/studies/${studyId}/prototype-test-task-attempt-paths` : null,
    {
      revalidateOnFocus: false,
      // 60s: path data is static once recorded, rarely changes during analysis
      dedupingInterval: 60000,
    }
  )

  return {
    taskAttemptPaths: data ?? [],
    error: error?.message ?? null,
    isLoading,
  }
}
