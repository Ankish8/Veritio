import useSWR from 'swr'

export interface NavigationEventRow {
  session_id: string
  task_id: string
  from_frame_id: string | null
  to_frame_id: string
  timestamp: string | null
  sequence_number: number
}

export interface ComponentStateEventRow {
  session_id: string
  task_id: string
  frame_id: string | null
  component_node_id: string
  from_variant_id: string | null
  to_variant_id: string
  is_timed_change: boolean | null
  timestamp: string | null
  sequence_number: number
}

export interface ComponentInstanceRow {
  instance_id: string
  instance_name?: string
  component_set_id?: string
  frame_node_id: string
  component_id: string
  relative_x: number
  relative_y: number
  width: number
  height: number
  frame_width?: number
  frame_height?: number
}

export interface ComponentVariantRow {
  variant_id: string
  component_set_id: string
  component_set_name: string
  variant_name: string
  image_url: string
  image_width?: number
  image_height?: number
}

interface EventsResponse {
  navigationEvents: NavigationEventRow[]
  componentStateEvents: ComponentStateEventRow[]
  componentInstances: ComponentInstanceRow[]
  componentVariants: ComponentVariantRow[]
}

/** Lazy loads navigation/component events for prototype test analysis. */
export function usePrototypeTestAttemptEvents(studyId: string | null) {
  const { data, error, isLoading } = useSWR<EventsResponse>(
    studyId ? `/api/studies/${studyId}/prototype-test-navigation-events` : null,
    {
      revalidateOnFocus: false,
      // 60s: event data is static once recorded, rarely changes during analysis
      dedupingInterval: 60000,
    }
  )

  return {
    navEvents: data?.navigationEvents ?? [],
    stateEvents: data?.componentStateEvents ?? [],
    componentInstances: data?.componentInstances ?? [],
    componentVariants: data?.componentVariants ?? [],
    error: error?.message ?? null,
    isLoading,
  }
}
