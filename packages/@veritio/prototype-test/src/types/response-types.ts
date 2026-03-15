import type { Json } from '@veritio/study-types'
export interface PrototypeTestFrameRow {
  id: string
  study_id: string
  prototype_id: string
  figma_node_id: string
  name: string
  page_name: string | null
  position: number | null
  thumbnail_url: string | null
  width: number | null
  height: number | null
  is_overlay: boolean | null
  overlay_type: string | null
  created_at: string | null
  updated_at: string | null
}
export interface PrototypeTestSessionRow {
  id: string
  study_id: string
  participant_id: string
  started_at: string | null
  completed_at: string | null
  total_time_ms: number | null
  device_info: Json | null
  created_at: string | null
}
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
export interface EventsResponse {
  navigationEvents: NavigationEventRow[]
  componentStateEvents: ComponentStateEventRow[]
  componentInstances: ComponentInstanceRow[]
  componentVariants: ComponentVariantRow[]
}
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
