import useSWR from 'swr'
import type { Json } from '@veritio/prototype-test/lib/supabase/study-flow-types'
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
export function usePrototypeTestTaskAttemptPaths(studyId: string | null) {
  const { data, error, isLoading } = useSWR<TaskAttemptPathData[]>(
    studyId ? `/api/studies/${studyId}/prototype-test-task-attempt-paths` : null,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // Cache for 1 minute
    }
  )

  return {
    taskAttemptPaths: data || [],
    error: error?.message || null,
    isLoading,
  }
}
