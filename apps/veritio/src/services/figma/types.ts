/**
 * Figma REST API Types
 *
 * All exported interfaces and types for the Figma client modules.
 */

/** Flow starting point in a prototype */
export interface FlowStartingPoint {
  /** Node ID of the starting frame */
  nodeId: string
  /** Name of the flow (e.g., "Flow 1") */
  name: string
}

/** Prototype interaction action */
export interface FigmaInteractionAction {
  type: string
  /** Target frame ID for navigation actions */
  destinationId?: string
  navigation?: string
}

/** Prototype interaction/reaction on a node */
export interface FigmaInteraction {
  trigger: { type: string }
  actions: FigmaInteractionAction[]
}

/** Figma bounding box with position and dimensions */
export interface FigmaBoundingBox {
  x: number
  y: number
  width: number
  height: number
}

export interface FigmaNode {
  id: string
  name: string
  type: string
  children?: FigmaNode[]
  /** Prototype flow starting points (on CANVAS/page nodes) */
  flowStartingPoints?: FlowStartingPoint[]
  /** Prototype interactions (on frame nodes) */
  interactions?: FigmaInteraction[]
  /** Legacy: single transition target (deprecated, use interactions) */
  transitionNodeID?: string
  /** Bounding box with position and dimensions (on frame nodes) */
  absoluteBoundingBox?: FigmaBoundingBox
  /** For INSTANCE nodes: the ID of the component this is an instance of */
  componentId?: string
}

export interface FigmaDocument {
  id: string
  name: string
  type: string
  children: FigmaNode[]
}

/**
 * Component metadata from the Figma API response.
 * The `components` field maps node IDs to this structure.
 */
export interface FigmaComponentMeta {
  /** The unique key for this component (used to fetch library components) */
  key: string
  /** Component name */
  name: string
  /** Component description */
  description?: string
  /** ID of the component set this component belongs to (for variants) */
  componentSetId?: string
  /** Documentation links */
  documentationLinks?: { uri: string }[]
}

/**
 * Component set metadata from the Figma API response.
 * The `componentSets` field maps node IDs to this structure.
 */
export interface FigmaComponentSetMeta {
  /** The unique key for this component set */
  key: string
  /** Component set name */
  name: string
  /** Component set description */
  description?: string
}

export interface FigmaFile {
  name: string
  lastModified: string
  thumbnailUrl: string
  version: string
  document: FigmaDocument
  /**
   * Map of component node IDs to component metadata.
   * Includes both local and library components used in the file.
   * Library components will have a `key` that can be used to fetch details.
   */
  components?: Record<string, FigmaComponentMeta>
  /**
   * Map of component set node IDs to component set metadata.
   * Component sets contain variants of a component.
   */
  componentSets?: Record<string, FigmaComponentSetMeta>
}

export interface FigmaFrame {
  nodeId: string
  name: string
  type: 'FRAME' | 'COMPONENT' | 'INSTANCE'
  /** The name of the Figma page containing this frame */
  pageName: string
  /** If this frame is a flow starting point, the flow name */
  flowName?: string
  /** Frame width in pixels (from absoluteBoundingBox) */
  width?: number
  /** Frame height in pixels (from absoluteBoundingBox) */
  height?: number
  /** Whether this frame is an overlay target (detected from Figma interactions or name heuristics) */
  isOverlay?: boolean
  /** Classification of the overlay type */
  overlayType?: 'modal' | 'sheet' | 'popover' | 'panel' | 'toast'
}

export interface FigmaImageResponse {
  images: Record<string, string> // nodeId -> imageUrl
}

export interface FigmaApiError {
  status: number
  err: string
}

export interface ComponentVariantInfo {
  componentSetId: string       // Parent component set ID
  componentSetName: string     // e.g., "Tab Bar"
  variants: {
    variantId: string          // Individual variant node ID
    variantName: string        // e.g., "State=Active"
    properties: Record<string, string>  // { State: "Active" }
    /** Variant width from absoluteBoundingBox (for accurate compositing) */
    width?: number
    /** Variant height from absoluteBoundingBox */
    height?: number
  }[]
}

export interface ComponentVariantImage {
  componentSetId: string
  componentSetName: string
  variantId: string
  variantName: string
  variantProperties: Record<string, string>
  imageUrl: string
  width?: number
  height?: number
}

/**
 * Component instance position within a frame.
 * Used for compositing variant images at correct positions on frame thumbnails.
 */
export interface ComponentInstanceInfo {
  /** Figma node ID within the frame (INSTANCE or nested FRAME) */
  instanceId: string
  /** Human-readable name from Figma */
  instanceName: string
  /** Parent frame's Figma node ID */
  frameNodeId: string
  /** Component ID for instances, or node ID for nested frames */
  componentId: string
  /** Parent component set ID (if component belongs to a set) */
  componentSetId?: string
  /** X position relative to frame origin */
  relativeX: number
  /** Y position relative to frame origin */
  relativeY: number
  /** Instance width */
  width: number
  /** Instance height */
  height: number
  /** Parent frame width */
  frameWidth: number
  /** Parent frame height */
  frameHeight: number
}

/**
 * Response from GET /v1/components/:key endpoint
 */
export interface FigmaComponentResponse {
  meta: {
    key: string
    file_key: string
    node_id: string
    thumbnail_url: string
    name: string
    description: string
    containing_frame?: {
      nodeId: string
      name: string
      pageName: string
    }
    /** For variants: the key of the parent component set */
    component_set_key?: string
  }
}

/**
 * Response from GET /v1/component_sets/:key endpoint
 */
export interface FigmaComponentSetResponse {
  meta: {
    key: string
    file_key: string
    node_id: string
    thumbnail_url: string
    name: string
    description: string
  }
}

/**
 * Response structure from GET /v1/files/:key/nodes endpoint
 */
export interface FigmaNodesResponse {
  name: string
  lastModified: string
  thumbnailUrl: string
  version: string
  nodes: Record<string, {
    document: FigmaNode
    components?: Record<string, FigmaComponentMeta>
  }>
}

/**
 * Options for generating Figma embed URLs.
 */
export interface GenerateEmbedUrlOptions {
  /** Starting node/frame ID */
  startNodeId?: string | null
  /** Enable Embed API for prototype controls (requires client-id) */
  enableEmbedApi?: boolean
  /** Show hotspot hints (blue outlines on clickable areas) */
  showHotspotHints?: boolean
  /** Background color (hex without #) */
  bgColor?: string
  /** Scaling mode for the prototype (handles legacy boolean values) */
  scaleMode?: import('@veritio/study-types').PrototypeScaleMode | boolean | null
}

/** Optional logger interface for dependency injection */
export interface FigmaLogger {
  info: (message: string, data?: Record<string, unknown>) => void
  warn: (message: string, data?: Record<string, unknown>) => void
  error: (message: string, data?: Record<string, unknown>) => void
}
