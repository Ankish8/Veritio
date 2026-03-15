/**
 * Video Editor Types
 *
 * Shared type definitions used across the video editor.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Layout Types
// ─────────────────────────────────────────────────────────────────────────────

/** Video layout presets for screen + webcam composition */
export type LayoutPreset =
  | 'fullscreen'       // Screen only, fullscreen
  | 'pip-top-left'     // Screen full, webcam small top-left
  | 'pip-top-right'    // Screen full, webcam small top-right
  | 'pip-bottom-left'  // Screen full, webcam small bottom-left
  | 'pip-bottom-right' // Screen full, webcam small bottom-right (default)
  | 'side-by-side'     // Screen and webcam side by side (50/50)
  | 'screen-only'      // Only screen visible
  | 'webcam-only'      // Only webcam visible

/** Layout preset configuration */
export interface LayoutConfig {
  preset: LayoutPreset
  /** Webcam size as percentage of video (for PiP layouts) */
  webcamSize?: number
  /** Webcam position offset (for fine-tuning) */
  webcamOffset?: { x: number; y: number }
}

// ─────────────────────────────────────────────────────────────────────────────
// Timeline Types
// ─────────────────────────────────────────────────────────────────────────────

/** Snap point for timeline snapping */
export interface SnapPoint {
  /** Time in milliseconds */
  timeMs: number
  /** Type of snap point */
  type: SnapPointType
  /** Optional reference ID (item, marker, etc.) */
  referenceId?: string
  /** Optional label for display */
  label?: string
}

/** Types of snap points */
export type SnapPointType =
  | 'playhead'       // Current playhead position
  | 'item-start'     // Start of a track item
  | 'item-end'       // End of a track item
  | 'marker'         // Comment or task marker
  | 'timeline-start' // Start of timeline (0)
  | 'timeline-end'   // End of timeline (duration)

/** Timeline zoom configuration */
export interface TimelineZoom {
  /** Current zoom level (1 = 100%, 2 = 200%, etc.) */
  level: number
  /** Minimum zoom level */
  min: number
  /** Maximum zoom level */
  max: number
  /** Zoom step for increment/decrement */
  step: number
}

/** Default zoom configuration */
export const DEFAULT_TIMELINE_ZOOM: TimelineZoom = {
  level: 1,
  min: 0.25,
  max: 8,
  step: 0.25,
}

// ─────────────────────────────────────────────────────────────────────────────
// Selection Types
// ─────────────────────────────────────────────────────────────────────────────

/** Selection state for timeline */
export interface SelectionState {
  /** Selected item IDs */
  itemIds: Set<string>
  /** Selected track IDs */
  trackIds: Set<string>
  /** Is multi-select active (Shift held) */
  isMultiSelect: boolean
  /** Selection box for drag selection */
  selectionBox?: SelectionBox
}

/** Selection box for drag-to-select */
export interface SelectionBox {
  startX: number
  startY: number
  endX: number
  endY: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Mouse Event Types
// ─────────────────────────────────────────────────────────────────────────────

/** Enhanced mouse event for timeline interactions */
export interface TimelineMouseEvent {
  /** X position relative to timeline */
  x: number
  /** Y position relative to timeline */
  y: number
  /** Time in milliseconds at cursor position */
  timeMs: number
  /** Track ID under cursor (null if not over a track) */
  trackId: string | null
  /** Item ID under cursor (null if not over an item) */
  itemId: string | null
  /** Edge of item under cursor (for trim handles) */
  edge: 'start' | 'end' | null
  /** Mouse button (0 = left, 1 = middle, 2 = right) */
  button: number
  /** Alt/Option key pressed */
  altKey: boolean
  /** Shift key pressed */
  shiftKey: boolean
  /** Ctrl key pressed */
  ctrlKey: boolean
  /** Meta/Cmd key pressed */
  metaKey: boolean
  /** Original DOM event */
  originalEvent: MouseEvent
}

// ─────────────────────────────────────────────────────────────────────────────
// Cursor Types
// ─────────────────────────────────────────────────────────────────────────────

/** Cursor types for different tool states */
export type CursorType =
  | 'default'
  | 'pointer'
  | 'move'
  | 'grab'
  | 'grabbing'
  | 'ew-resize'   // East-west resize (trim handles)
  | 'col-resize'  // Column resize (track height)
  | 'crosshair'   // Annotation drawing
  | 'text'        // Text editing
  | 'not-allowed' // Disabled/locked
  | 'copy'        // Copy operation (Alt+drag)

// ─────────────────────────────────────────────────────────────────────────────
// Playback Types
// ─────────────────────────────────────────────────────────────────────────────

/** Playback state */
export interface PlaybackState {
  /** Current playback time in milliseconds */
  currentTime: number
  /** Total duration in milliseconds */
  duration: number
  /** Whether video is playing */
  isPlaying: boolean
  /** Playback rate (0.5, 1, 1.5, 2) */
  playbackRate: number
}

/** Playback rates available */
export const PLAYBACK_RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const

export type PlaybackRate = (typeof PLAYBACK_RATES)[number]

// ─────────────────────────────────────────────────────────────────────────────
// Export Types
// ─────────────────────────────────────────────────────────────────────────────

/** Export configuration */
export interface ExportConfig {
  /** Output format */
  format: 'mp4' | 'webm'
  /** Video quality (0-1) */
  quality: number
  /** Output resolution */
  resolution: ExportResolution
  /** Time range to export (null = full duration) */
  timeRange: { startMs: number; endMs: number } | null
  /** Include annotations in export */
  includeAnnotations: boolean
  /** Layout preset for export */
  layoutPreset: LayoutPreset
}

/** Export resolution options */
export type ExportResolution = '720p' | '1080p' | '4k' | 'original'

/** Export progress state */
export interface ExportProgress {
  /** Export status */
  status: 'idle' | 'preparing' | 'encoding' | 'uploading' | 'complete' | 'error'
  /** Progress percentage (0-100) */
  progress: number
  /** Error message if status is 'error' */
  error?: string
  /** Download URL when complete */
  downloadUrl?: string
}
