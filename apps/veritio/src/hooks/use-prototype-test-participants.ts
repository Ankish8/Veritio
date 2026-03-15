import useSWR from 'swr'
import type {
  Participant,
  PrototypeTestTask,
  PrototypeTestTaskAttempt,
  StudyFlowQuestionRow,
  StudyFlowResponseRow,
} from '@veritio/study-types'

interface PrototypeTestParticipantsData {
  participants: Participant[]
  tasks: PrototypeTestTask[]
  taskAttempts: PrototypeTestTaskAttempt[]
  flowQuestions: StudyFlowQuestionRow[]
  flowResponses: StudyFlowResponseRow[]
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
    refreshInterval = 2 * 60 * 1000, // 2 minutes
    revalidateOnFocus = true,
  } = options

  const { data, error, isLoading, isValidating, mutate } = useSWR<PrototypeTestParticipantsData>(
    studyId ? `/api/studies/${studyId}/prototype-test-results` : null,
    {
      fallbackData,
      // 5s: participant data changes during active sessions (new participants, status updates)
      dedupingInterval: 5000,
      refreshInterval,
      revalidateOnFocus,
      revalidateOnReconnect: true,
      keepPreviousData: true,
    }
  )

  return {
    participants: data?.participants ?? [],
    tasks: data?.tasks ?? [],
    taskAttempts: data?.taskAttempts ?? [],
    flowQuestions: data?.flowQuestions ?? [],
    flowResponses: data?.flowResponses ?? [],
    isLoading,
    isValidating,
    error: error?.message ?? null,
    mutate,
  }
}
