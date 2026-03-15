import type { PathwayStep } from '@veritio/study-types'
import type { ComponentStateSnapshot } from '../../hooks/use-prototype-controls'

export interface ComponentVariant {
  component_set_id: string
  component_set_name: string
  variant_id: string
  variant_name: string
  variant_properties: Record<string, string>
  image_url: string
  image_width?: number
  image_height?: number
}

export interface ComponentInstance {
  instance_id: string
  frame_node_id: string
  component_id: string
  component_set_id?: string
  relative_x: number
  relative_y: number
  width: number
  height: number
  frame_width?: number
  frame_height?: number
  instance_name?: string
}

export interface BuilderStep {
  frameId: string
  componentStates: ComponentStateSnapshot
  changedComponents: string[]
}

export interface PathwayBuilderResult {
  steps?: PathwayStep[]
  frames: string[]
  name: string
  editingPathId?: string
}

export type PathMode = 'flexible' | 'strict'

export interface OverlayInfo {
  instanceId: string
  variantImageUrl?: string
  variantName: string
  relativeX: number
  relativeY: number
  width: number
  height: number
  frameWidth: number
  frameHeight: number
}
