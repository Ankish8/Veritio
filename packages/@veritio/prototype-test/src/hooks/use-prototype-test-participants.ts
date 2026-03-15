import useSWR from 'swr'
import type {
  Participant,
  PrototypeTestTask,
  PrototypeTestTaskAttempt,
  StudyFlowQuestion,
  StudyFlowResponse,
} from '@veritio/prototype-test/lib/supabase/study-flow-types'
interface PrototypeTestParticipantsData {
  participants: Participant[]
  tasks: PrototypeTestTask[]
  taskAttempts: PrototypeTestTaskAttempt[]
  flowQuestions: StudyFlowQuestion[]
  flowResponses: StudyFlowResponse[]
}

interface UsePrototypeTestParticipantsOptions {
  fallbackData?: PrototypeTestParticipantsData
  refreshInterval?: number
  revalidateOnFocus?: boolean
}
export function usePrototypeTestParticipants(
  studyId: string | null,
  options: UsePrototypeTestParticipantsOptions = {}
) {
  const {
    fallbackData,
    refreshInterval = 30000, // Default: poll every 30 seconds
    revalidateOnFocus = true,
  } = options

  const { data, error, isLoading, isValidating, mutate } = useSWR<PrototypeTestParticipantsData>(
    studyId ? `/api/studies/${studyId}/prototype-test-results` : null,
    {
      fallbackData,
      dedupingInterval: 5000, // Dedupe requests within 5 seconds
      refreshInterval, // Poll at specified interval
      revalidateOnFocus,
      revalidateOnReconnect: true, // Refetch when connection restores
      // Keep previous data while revalidating for smooth UX
      keepPreviousData: true,
    }
  )

  return {
    // Data (falls back to initial server data)
    participants: data?.participants ?? fallbackData?.participants ?? [],
    tasks: data?.tasks ?? fallbackData?.tasks ?? [],
    taskAttempts: data?.taskAttempts ?? fallbackData?.taskAttempts ?? [],
    flowQuestions: data?.flowQuestions ?? fallbackData?.flowQuestions ?? [],
    flowResponses: data?.flowResponses ?? fallbackData?.flowResponses ?? [],
    // Loading states
    isLoading, // True on initial load (false if fallbackData provided)
    isValidating, // True while revalidating (polling)
    // Error handling
    error: error?.message ?? null,
    // Manual revalidation trigger
    mutate,
  }
}
