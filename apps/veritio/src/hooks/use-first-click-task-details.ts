import useSWR from 'swr'

interface FirstClickAOI {
  id: string
  name: string
  x: number
  y: number
  width: number
  height: number
  task_id: string
}

interface FirstClickImage {
  id: string
  image_url: string | null
  width: number | null
  height: number | null
  task_id: string
}

interface FirstClickTaskDetails {
  id: string
  study_id: string
  instruction: string | null
  position: number
  image: FirstClickImage | null
  aois: FirstClickAOI[]
}

export function useFirstClickTaskDetails(studyId: string | null, taskId: string | null) {
  const { data, error, isLoading } = useSWR<FirstClickTaskDetails>(
    studyId && taskId ? `/api/studies/${studyId}/first-click-tasks/${taskId}/details` : null,
  )

  return {
    taskDetails: data ?? null,
    error: error?.message ?? null,
    isLoading,
  }
}
