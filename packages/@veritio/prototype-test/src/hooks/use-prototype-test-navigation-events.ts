import useSWR from 'swr'
export interface NavigationEventData {
  id: string
  session_id: string
  task_id: string
  study_id: string
  from_frame_id: string | null
  to_frame_id: string
  sequence_number: number
  time_on_from_frame_ms: number | null
  triggered_by: string
  timestamp: string | null
}
export interface ComponentStateEventData {
  id: string
  session_id: string
  task_id: string
  study_id: string
  frame_id: string | null
  component_node_id: string
  from_variant_id: string | null
  to_variant_id: string
  sequence_number: number
  is_timed_change: boolean | null
  timestamp: string | null
  custom_label: string | null
}
export interface ComponentInstanceData {
  instance_id: string
  instance_name: string | null
  component_set_id: string | null
  frame_node_id: string
  component_id: string
  relative_x: number
  relative_y: number
  width: number
  height: number
  frame_width: number | null
  frame_height: number | null
}
export interface ComponentVariantData {
  variant_id: string
  component_set_id: string
  component_set_name: string
  variant_name: string
  image_url: string
  image_width: number | null
  image_height: number | null
}
interface NavigationEventsResponse {
  navigationEvents: NavigationEventData[]
  componentStateEvents: ComponentStateEventData[]
  componentInstances: ComponentInstanceData[]
  componentVariants: ComponentVariantData[]
}
export function usePrototypeTestNavigationEvents(studyId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<NavigationEventsResponse>(
    studyId ? `/api/studies/${studyId}/prototype-test-navigation-events` : null,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // Cache for 1 minute
    }
  )

  return {
    navigationEvents: data?.navigationEvents || [],
    componentStateEvents: data?.componentStateEvents || [],
    componentInstances: data?.componentInstances || [],
    componentVariants: data?.componentVariants || [],
    error: error?.message || null,
    isLoading,
    mutate,
  }
}
