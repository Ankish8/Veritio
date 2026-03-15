/**
 * Track Types and Interfaces
 *
 * Core type definitions for the multi-track timeline system.
 * All tracks implement the ITrack interface for consistent behavior.
 */

import type { LayoutPreset } from '../types'

// ─────────────────────────────────────────────────────────────────────────────
// Track Types
// ─────────────────────────────────────────────────────────────────────────────

/** Available track types in the timeline */
export type TrackType = 'screen' | 'webcam' | 'clips' | 'annotations' | 'markers'

/** Base track item - all items on tracks extend this */
export interface TrackItem {
  /** Unique identifier */
  id: string
  /** Parent track ID */
  trackId: string
  /** Start time in milliseconds */
  startMs: number
  /** End time in milliseconds */
  endMs: number
  /** Layer for overlapping items (0 = bottom, higher = on top) */
  layer: number
}

/** Clip item on the clips track */
export interface ClipItem extends TrackItem {
  type: 'clip'
  /** Reference to the database clip ID */
  clipId: string
  /** Clip title */
  title: string
  /** Tags for categorization */
  tags: string[]
  /** Optional thumbnail URL */
  thumbnailUrl: string | null
  /** Optional description */
  description: string | null
}

/** Annotation item on the annotations track */
export interface AnnotationItem extends TrackItem {
  type: 'annotation'
  /** Reference to the database annotation ID */
  annotationId: string
  /** Annotation type */
  annotationType: AnnotationType
  /** Content (for text annotations) */
  content: string
  /** Style properties */
  style: AnnotationStyle
}

/** Types of annotations supported */
export type AnnotationType = 'text' | 'shape' | 'blur' | 'highlight'

/** Shape types for shape annotations */
export type ShapeType = 'rectangle' | 'circle' | 'arrow' | 'line'

/** Annotation styling properties */
export interface AnnotationStyle {
  /** Position X (percentage of video width, 0-100) */
  x: number
  /** Position Y (percentage of video height, 0-100) */
  y: number
  /** Width (percentage of video width) */
  width?: number
  /** Height (percentage of video height) */
  height?: number
  /** Primary color (hex) */
  color?: string
  /** Background color (hex) */
  backgroundColor?: string
  /** Font size for text (px) */
  fontSize?: number
  /** Font family for text */
  fontFamily?: string
  /** Font weight */
  fontWeight?: 'normal' | 'bold'
  /** Text alignment */
  textAlign?: 'left' | 'center' | 'right'
  /** Border width (px) */
  borderWidth?: number
  /** Border color (hex) */
  borderColor?: string
  /** Opacity (0-1) */
  opacity?: number
  /** Shape type (for shape annotations) */
  shapeType?: ShapeType
  /** Blur radius (for blur annotations, px) */
  blurRadius?: number
  /** Rotation (degrees) */
  rotation?: number
}

/** Marker item (comments, tasks) - read-only on timeline */
export interface MarkerItem extends TrackItem {
  type: 'marker'
  /** Marker type */
  markerType: 'comment' | 'task'
  /** Reference to comment or task ID */
  referenceId: string
  /** Display label */
  label: string
  /** Color for display */
  color?: string
}

/** Media source item (screen recording, webcam) - represents the actual video content */
export interface MediaItem extends TrackItem {
  type: 'media'
  /** Media source type */
  mediaType: 'screen' | 'webcam'
  /** Display label */
  label: string
  /** Color for visual display */
  color?: string
  /** Whether this is the primary source (can't be deleted) */
  isPrimary?: boolean
}

/** Union type of all track items */
export type AnyTrackItem = ClipItem | AnnotationItem | MarkerItem | MediaItem

// ─────────────────────────────────────────────────────────────────────────────
// Track Properties
// ─────────────────────────────────────────────────────────────────────────────

/** Properties that control track behavior and display */
export interface TrackProperties {
  /** Whether track is visible in timeline */
  visible: boolean
  /** Whether audio from this track is enabled */
  audioEnabled: boolean
  /** Whether track is locked (no editing) */
  locked: boolean
  /** Track height in pixels */
  height: number
  /** Track opacity (0-1) */
  opacity: number
  /** Layout preset for video tracks (screen/webcam) */
  layoutPreset?: LayoutPreset
  /** Whether to show waveform visualization */
  showWaveform?: boolean
  /** Track color (for visual identification) */
  color?: string
}

/** Default track properties */
export const DEFAULT_TRACK_PROPERTIES: TrackProperties = {
  visible: true,
  audioEnabled: true,
  locked: false,
  height: 64,
  opacity: 1,
  showWaveform: false,
}

// ─────────────────────────────────────────────────────────────────────────────
// Track Interface
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ITrack Interface
 *
 * All tracks in the timeline implement this interface.
 * Provides consistent API for managing track items and properties.
 */
export interface ITrack<T extends TrackItem = TrackItem> {
  /** Unique track identifier */
  id: string
  /** Track type */
  type: TrackType
  /** Display name */
  name: string
  /** Track properties */
  properties: TrackProperties
  /** Items on this track */
  items: T[]

  // ─── Item Management ─────────────────────────────
  /** Add an item to the track */
  addItem(item: T): void
  /** Remove an item by ID */
  removeItem(itemId: string): boolean
  /** Update an item by ID */
  updateItem(itemId: string, updates: Partial<T>): boolean
  /** Get an item by ID */
  getItem(itemId: string): T | undefined
  /** Get item at a specific time */
  getItemAtTime(timeMs: number): T | undefined
  /** Get all items in a time range */
  getItemsInRange(startMs: number, endMs: number): T[]

  // ─── Validation ──────────────────────────────────
  /** Check if an item can be placed at the given time */
  canPlaceItem(item: T): boolean
  /** Validate item placement (returns validation result) */
  validatePlacement(item: T): TrackValidationResult

  // ─── Properties ──────────────────────────────────
  /** Update track properties */
  updateProperties(updates: Partial<TrackProperties>): void
  /** Toggle visibility */
  toggleVisibility(): void
  /** Toggle audio */
  toggleAudio(): void
  /** Toggle lock */
  toggleLock(): void
}

/** Result of track item validation */
export interface TrackValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Track Configuration (for persistence)
// ─────────────────────────────────────────────────────────────────────────────

/** Track configuration for saving/loading */
export interface TrackConfig {
  id: string
  type: TrackType
  name: string
  position: number
  properties: TrackProperties
}

/** Default track configurations */
export const DEFAULT_TRACK_CONFIGS: Omit<TrackConfig, 'id'>[] = [
  {
    type: 'screen',
    name: 'Screen Recording',
    position: 0,
    properties: { ...DEFAULT_TRACK_PROPERTIES, height: 80, showWaveform: true },
  },
  {
    type: 'webcam',
    name: 'Webcam',
    position: 1,
    properties: { ...DEFAULT_TRACK_PROPERTIES, height: 64 },
  },
  {
    type: 'clips',
    name: 'Clips',
    position: 2,
    properties: { ...DEFAULT_TRACK_PROPERTIES, height: 64, color: '#3b82f6' },
  },
  {
    type: 'annotations',
    name: 'Annotations',
    position: 3,
    properties: { ...DEFAULT_TRACK_PROPERTIES, height: 48, color: '#f59e0b' },
  },
  {
    type: 'markers',
    name: 'Comments & Tasks',
    position: 4,
    properties: { ...DEFAULT_TRACK_PROPERTIES, height: 40, locked: true, color: '#8b5cf6' },
  },
]
