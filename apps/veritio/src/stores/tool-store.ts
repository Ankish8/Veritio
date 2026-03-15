'use client'

/**
 * Tool Store
 *
 * Manages the active tool state for timeline interactions.
 * Each tool has different behavior for mouse and keyboard events.
 */

import { create } from 'zustand'
import type {
  ToolType,
  AnnotationMode,
  SelectToolState,
  RazorToolState,
  AnnotationToolState,
} from '@/lib/video-editor/tools/tool-types'

// ─────────────────────────────────────────────────────────────────────────────
// State Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ToolStoreState {
  /** Currently active tool */
  activeTool: ToolType
  /** Previous tool (for temp tool switching) */
  previousTool: ToolType | null

  /** Select tool state */
  selectState: SelectToolState
  /** Razor tool state */
  razorState: RazorToolState
  /** Annotation tool state */
  annotationState: AnnotationToolState

  // ─── Actions ─────────────────────────────────────

  /** Set active tool */
  setActiveTool: (tool: ToolType) => void
  /** Toggle to previous tool */
  toggleToPreviousTool: () => void
  /** Temporarily switch to a tool (remembers previous) */
  temporarySwitchTo: (tool: ToolType) => void
  /** Return from temporary switch */
  returnFromTemporary: () => void

  // Select tool actions
  startDrag: (itemId: string, startX: number, startTime: number) => void
  updateDrag: (endX: number, endTime: number) => void
  endDrag: () => void
  startTrim: (itemId: string, edge: 'start' | 'end') => void
  endTrim: () => void
  startBoxSelect: (startX: number, startY: number) => void
  updateBoxSelect: (endX: number, endY: number) => void
  endBoxSelect: () => void
  setCopyMode: (isCopyMode: boolean) => void
  setOriginalPosition: (position: { startMs: number; endMs: number; trackId: string } | null) => void

  // Razor tool actions
  setRazorCursor: (time: number | null, itemId: string | null, trackId: string | null) => void

  // Annotation tool actions
  setAnnotationMode: (mode: AnnotationMode) => void
  startAnnotationDraw: (x: number, y: number, timeMs: number) => void
  updateAnnotationDraw: (x: number, y: number, timeMs: number) => void
  endAnnotationDraw: () => void
  setAnnotationStyle: (style: Partial<AnnotationToolState['style']>) => void

  /** Reset all tool states */
  resetToolStates: () => void
}

// ─────────────────────────────────────────────────────────────────────────────
// Initial States
// ─────────────────────────────────────────────────────────────────────────────

const initialSelectState: SelectToolState = {
  isDragging: false,
  dragItemId: null,
  dragStartX: 0,
  dragStartTime: 0,
  isTrimming: false,
  trimEdge: null,
  isBoxSelecting: false,
  selectionBox: null,
  originalPosition: null,
  isCopyMode: false,
}

const initialRazorState: RazorToolState = {
  cursorTime: null,
  itemUnderCursor: null,
  trackUnderCursor: null,
}

const initialAnnotationState: AnnotationToolState = {
  mode: 'text',
  isDrawing: false,
  drawStart: null,
  drawCurrent: null,
  style: {
    color: '#f59e0b',
    fontSize: 24,
    fontFamily: 'Inter, sans-serif',
    blurRadius: 20,
    opacity: 1,
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Store Implementation
// ─────────────────────────────────────────────────────────────────────────────

export const useToolStore = create<ToolStoreState>()((set, get) => ({
  // ─── Initial State ───────────────────────────────
  activeTool: 'select',
  previousTool: null,
  selectState: { ...initialSelectState },
  razorState: { ...initialRazorState },
  annotationState: { ...initialAnnotationState },

  // ─── Tool Switching ──────────────────────────────

  setActiveTool: (tool) => {
    const { activeTool } = get()

    // Reset the current tool's state
    get().resetToolStates()

    set({
      activeTool: tool,
      previousTool: activeTool,
    })
  },

  toggleToPreviousTool: () => {
    const { activeTool, previousTool } = get()

    if (previousTool) {
      get().resetToolStates()
      set({
        activeTool: previousTool,
        previousTool: activeTool,
      })
    }
  },

  temporarySwitchTo: (tool) => {
    const { activeTool, previousTool } = get()

    // Only save previous tool if not already in temporary mode
    if (!previousTool) {
      get().resetToolStates()
      set({
        activeTool: tool,
        previousTool: activeTool,
      })
    }
  },

  returnFromTemporary: () => {
    const { previousTool } = get()

    if (previousTool) {
      get().resetToolStates()
      set({
        activeTool: previousTool,
        previousTool: null,
      })
    }
  },

  // ─── Select Tool Actions ─────────────────────────

  startDrag: (itemId, startX, startTime) => {
    set({ selectState: { ...get().selectState, isDragging: true, dragItemId: itemId, dragStartX: startX, dragStartTime: startTime } })
  },

  updateDrag: () => {
    // Drag position is managed by mouse events; component calculates offset from startX/startTime
  },

  endDrag: () => {
    set({ selectState: { ...get().selectState, isDragging: false, dragItemId: null, dragStartX: 0, dragStartTime: 0, originalPosition: null, isCopyMode: false } })
  },

  startTrim: (itemId, edge) => {
    set({ selectState: { ...get().selectState, isTrimming: true, dragItemId: itemId, trimEdge: edge } })
  },

  endTrim: () => {
    set({ selectState: { ...get().selectState, isTrimming: false, dragItemId: null, trimEdge: null, originalPosition: null } })
  },

  startBoxSelect: (startX, startY) => {
    set({ selectState: { ...get().selectState, isBoxSelecting: true, selectionBox: { startX, startY, endX: startX, endY: startY } } })
  },

  updateBoxSelect: (endX, endY) => {
    const { selectState } = get()
    if (!selectState.selectionBox) return
    set({ selectState: { ...selectState, selectionBox: { ...selectState.selectionBox, endX, endY } } })
  },

  endBoxSelect: () => {
    set({ selectState: { ...get().selectState, isBoxSelecting: false, selectionBox: null } })
  },

  setCopyMode: (isCopyMode) => {
    set({ selectState: { ...get().selectState, isCopyMode } })
  },

  setOriginalPosition: (position) => {
    set({ selectState: { ...get().selectState, originalPosition: position } })
  },

  // ─── Razor Tool Actions ──────────────────────────

  setRazorCursor: (time, itemId, trackId) => {
    set({ razorState: { cursorTime: time, itemUnderCursor: itemId, trackUnderCursor: trackId } })
  },

  // ─── Annotation Tool Actions ─────────────────────

  setAnnotationMode: (mode) => {
    set({ annotationState: { ...get().annotationState, mode } })
  },

  startAnnotationDraw: (x, y, timeMs) => {
    set({ annotationState: { ...get().annotationState, isDrawing: true, drawStart: { x, y, timeMs }, drawCurrent: { x, y, timeMs } } })
  },

  updateAnnotationDraw: (x, y, timeMs) => {
    set({ annotationState: { ...get().annotationState, drawCurrent: { x, y, timeMs } } })
  },

  endAnnotationDraw: () => {
    set({ annotationState: { ...get().annotationState, isDrawing: false, drawStart: null, drawCurrent: null } })
  },

  setAnnotationStyle: (style) => {
    set({ annotationState: { ...get().annotationState, style: { ...get().annotationState.style, ...style } } })
  },

  // ─── Reset ───────────────────────────────────────

  resetToolStates: () => {
    set({
      selectState: { ...initialSelectState },
      razorState: { ...initialRazorState },
      annotationState: {
        ...initialAnnotationState,
        style: get().annotationState.style, // Preserve style settings
      },
    })
  },
}))

// ─────────────────────────────────────────────────────────────────────────────
// Selectors
// ─────────────────────────────────────────────────────────────────────────────

export const useActiveTool = () => useToolStore((state) => state.activeTool)

export const useSelectToolState = () => useToolStore((state) => state.selectState)

export const useRazorToolState = () => useToolStore((state) => state.razorState)

export const useAnnotationToolState = () => useToolStore((state) => state.annotationState)

export const useToolActions = () =>
  useToolStore((state) => ({
    setActiveTool: state.setActiveTool,
    toggleToPreviousTool: state.toggleToPreviousTool,
    temporarySwitchTo: state.temporarySwitchTo,
    returnFromTemporary: state.returnFromTemporary,
    resetToolStates: state.resetToolStates,
  }))

export const useSelectToolActions = () =>
  useToolStore((state) => ({
    startDrag: state.startDrag,
    updateDrag: state.updateDrag,
    endDrag: state.endDrag,
    startTrim: state.startTrim,
    endTrim: state.endTrim,
    startBoxSelect: state.startBoxSelect,
    updateBoxSelect: state.updateBoxSelect,
    endBoxSelect: state.endBoxSelect,
    setCopyMode: state.setCopyMode,
    setOriginalPosition: state.setOriginalPosition,
  }))

export const useRazorToolActions = () =>
  useToolStore((state) => ({
    setRazorCursor: state.setRazorCursor,
  }))

export const useAnnotationToolActions = () =>
  useToolStore((state) => ({
    setAnnotationMode: state.setAnnotationMode,
    startAnnotationDraw: state.startAnnotationDraw,
    updateAnnotationDraw: state.updateAnnotationDraw,
    endAnnotationDraw: state.endAnnotationDraw,
    setAnnotationStyle: state.setAnnotationStyle,
  }))
