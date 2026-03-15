/**
 * Tool Types and Interfaces
 *
 * Tools define how user interactions on the timeline are handled.
 * Each tool has different behavior for mouse and keyboard events.
 */

import type { TimelineMouseEvent, CursorType } from '../types'

// ─────────────────────────────────────────────────────────────────────────────
// Tool Types
// ─────────────────────────────────────────────────────────────────────────────

/** Available tool types */
export type ToolType = 'select' | 'razor' | 'annotation' | 'slip' | 'slide'

/** Tool mode for annotation tool */
export type AnnotationMode = 'text' | 'rectangle' | 'circle' | 'arrow' | 'blur' | 'highlight'

// ─────────────────────────────────────────────────────────────────────────────
// Tool Interface
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ITool Interface
 *
 * All timeline tools implement this interface.
 * Tools handle user interactions and delegate actions to the command system.
 */
export interface ITool {
  /** Tool type */
  type: ToolType
  /** Display name */
  name: string
  /** Keyboard shortcut to activate (single key) */
  shortcut: string

  // ─── Cursor ──────────────────────────────────────
  /** Get cursor for current state */
  getCursor(): CursorType

  // ─── Mouse Events ────────────────────────────────
  /** Mouse button pressed */
  onMouseDown(event: TimelineMouseEvent, context: ToolContext): void
  /** Mouse moved (with or without button pressed) */
  onMouseMove(event: TimelineMouseEvent, context: ToolContext): void
  /** Mouse button released */
  onMouseUp(event: TimelineMouseEvent, context: ToolContext): void

  // ─── Keyboard Events ─────────────────────────────
  /** Key pressed - return true if handled */
  onKeyDown(event: KeyboardEvent, context: ToolContext): boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool Context
// ─────────────────────────────────────────────────────────────────────────────

/** Track item base type for tool context */
export interface ToolContextTrackItem {
  id: string
  trackId: string
  startMs: number
  endMs: number
  type?: string
  layer?: number
}

/** Track state for tool context */
export interface ToolContextTrack {
  id: string
  type: string
  items: ToolContextTrackItem[]
}

/**
 * Context provided to tools for accessing timeline state and stores
 */
export interface ToolContext {
  /** Current playback time (ms) */
  currentTimeMs: number
  /** Total duration (ms) */
  duration: number

  /** Timeline store for track/item management */
  timelineStore: {
    getItem: (id: string) => ToolContextTrackItem | undefined
    addItem: (trackId: string, item: Omit<ToolContextTrackItem, 'id' | 'trackId'>) => string
    updateItem: (id: string, updates: Partial<ToolContextTrackItem>) => boolean
    removeItem: (id: string) => boolean
    moveItem: (itemId: string, newTrackId: string, newStartMs: number) => boolean
    getAllItems: () => ToolContextTrackItem[]
    getTrack: (trackId: string) => ToolContextTrack | undefined
    getTrackByType: (type: string) => ToolContextTrack | undefined
    getItemsByTrack: (trackId: string) => ToolContextTrackItem[]
    selectItem: (id: string, add?: boolean) => void
    selectItems: (ids: string[]) => void
    clearSelection: () => void
    duplicateItems: (ids: string[], offset: number) => string[]
    selectedItemIds: Set<string>
    duration: number
  }

  /** History store for undo/redo */
  historyStore: {
    execute: (command: unknown) => Promise<void>
  }

  /** Tool store for tool state */
  toolStore: {
    setActiveTool: (tool: ToolType) => void
    setRazorCursor: (time: number | null, itemId: string | null, trackId: string | null) => void
    startDrag: (itemId: string, x: number, time: number) => void
    endDrag: () => void
    startTrim: (itemId: string, edge: 'start' | 'end') => void
    endTrim: () => void
    startBoxSelect: (x: number, y: number) => void
    updateBoxSelect: (x: number, y: number) => void
    endBoxSelect: () => void
    setCopyMode: (mode: boolean) => void
    setOriginalPosition: (pos: { startMs: number; endMs: number; trackId: string } | null) => void
    startAnnotationDraw: (x: number, y: number, time: number) => void
    updateAnnotationDraw: (x: number, y: number, time: number) => void
    endAnnotationDraw: () => void
    setAnnotationMode: (mode: AnnotationMode) => void
    annotationState: AnnotationToolState
    selectState: SelectToolState
  }

  /** Snap engine for magnetic snapping */
  snapEngine: {
    snap: (time: number, type: string) => { snapped: boolean; position: number }
  }
}

/**
 * Render context for tool overlays
 */
export interface ToolRenderContext {
  /** Canvas 2D context */
  ctx: CanvasRenderingContext2D
  /** Canvas width */
  width: number
  /** Canvas height */
  height: number
  /** Pixels per millisecond */
  pixelsPerMs: number
  /** Scroll position */
  scrollPosition: number
  /** Current time */
  currentTime: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool State
// ─────────────────────────────────────────────────────────────────────────────

/** State for select tool */
export interface SelectToolState {
  /** Is dragging an item */
  isDragging: boolean
  /** Item being dragged */
  dragItemId: string | null
  /** Drag start position */
  dragStartX: number
  /** Drag start time */
  dragStartTime: number
  /** Is trimming (resizing) */
  isTrimming: boolean
  /** Which edge is being trimmed */
  trimEdge: 'start' | 'end' | null
  /** Is doing a selection box drag */
  isBoxSelecting: boolean
  /** Selection box bounds */
  selectionBox: { startX: number; startY: number; endX: number; endY: number } | null
  /** Original item position before drag (for undo) */
  originalPosition: { startMs: number; endMs: number; trackId: string } | null
  /** Is copy mode (Alt held) */
  isCopyMode: boolean
}

/** State for razor tool */
export interface RazorToolState {
  /** Current cursor time */
  cursorTime: number | null
  /** Item under cursor */
  itemUnderCursor: string | null
  /** Track under cursor */
  trackUnderCursor: string | null
}

/** State for annotation tool */
export interface AnnotationToolState {
  /** Current annotation mode */
  mode: AnnotationMode
  /** Is drawing */
  isDrawing: boolean
  /** Drawing start position */
  drawStart: { x: number; y: number; timeMs: number } | null
  /** Current drawing position */
  drawCurrent: { x: number; y: number; timeMs: number } | null
  /** Selected annotation style */
  style: {
    color: string
    fontSize: number
    fontFamily: string
    blurRadius: number
    opacity: number
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool Configuration
// ─────────────────────────────────────────────────────────────────────────────

/** Tool definitions for toolbar */
export const TOOL_DEFINITIONS: Record<ToolType, { name: string; shortcut: string; description: string }> = {
  select: {
    name: 'Select',
    shortcut: 'V',
    description: 'Select, move, and trim items',
  },
  razor: {
    name: 'Razor',
    shortcut: 'C',
    description: 'Split clips at cursor position',
  },
  annotation: {
    name: 'Annotation',
    shortcut: 'A',
    description: 'Add text, shapes, and annotations',
  },
  slip: {
    name: 'Slip',
    shortcut: 'Y',
    description: 'Slip content within item boundaries',
  },
  slide: {
    name: 'Slide',
    shortcut: 'U',
    description: 'Slide item, rippling adjacent items',
  },
}

/** Default annotation tool style */
export const DEFAULT_ANNOTATION_STYLE: AnnotationToolState['style'] = {
  color: '#f59e0b',
  fontSize: 24,
  fontFamily: 'Inter, sans-serif',
  blurRadius: 20,
  opacity: 1,
}
