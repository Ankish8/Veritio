'use client'

import { create } from 'zustand'

/**
 * Video Editor Store
 *
 * Central state management for the professional video editor interface.
 * Manages:
 * - Playback state (time, playing, rate)
 * - Timeline state (zoom, scroll, snap)
 * - Selection state (selected clip, editing clip)
 * - Clip creation state (in/out points)
 *
 * Usage:
 * ```tsx
 * const { currentTime, setCurrentTime, zoomLevel } = useVideoEditorStore()
 * ```
 */

export interface ClipCreationState {
  /** In-point for new clip (set with 'I' key) */
  inPoint: number | null
  /** Out-point for new clip (set with 'O' key) */
  outPoint: number | null
}

export interface VideoEditorState {
  // ─── Playback State ─────────────────────────────
  /** Current playback time in milliseconds */
  currentTime: number
  /** Total duration in milliseconds */
  duration: number
  /** Whether video is currently playing */
  isPlaying: boolean
  /** Playback rate (0.5, 1, 1.5, 2) */
  playbackRate: number

  // ─── Timeline State ─────────────────────────────
  /** Zoom level (1 = 100%, 2 = 200%, etc.) */
  zoomLevel: number
  /** Horizontal scroll position in pixels */
  scrollPosition: number
  /** Whether snapping is enabled */
  snapEnabled: boolean
  /** Timeline container width in pixels (for calculations) */
  timelineWidth: number

  // ─── Selection State ────────────────────────────
  /** Currently selected clip ID */
  selectedClipId: string | null
  /** Clip currently being edited (trimming) */
  editingClipId: string | null
  /** Whether we're in clip creation mode */
  isCreatingClip: boolean

  // ─── Clip Creation State ────────────────────────
  clipCreation: ClipCreationState

  // ─── Actions ────────────────────────────────────

  // Playback actions
  setCurrentTime: (time: number) => void
  setDuration: (duration: number) => void
  setIsPlaying: (playing: boolean) => void
  togglePlayback: () => void
  setPlaybackRate: (rate: number) => void
  seekTo: (time: number) => void
  stepForward: (ms?: number) => void
  stepBackward: (ms?: number) => void

  // Timeline actions
  setZoomLevel: (level: number) => void
  zoomIn: () => void
  zoomOut: () => void
  fitToView: () => void
  setScrollPosition: (position: number) => void
  setSnapEnabled: (enabled: boolean) => void
  toggleSnap: () => void
  setTimelineWidth: (width: number) => void

  // Selection actions
  selectClip: (id: string | null) => void
  setEditingClip: (id: string | null) => void
  setIsCreatingClip: (creating: boolean) => void
  clearSelection: () => void

  // Clip creation actions
  setInPoint: (time: number | null) => void
  setOutPoint: (time: number | null) => void
  setInPointAtPlayhead: () => void
  setOutPointAtPlayhead: () => void
  clearClipCreation: () => void

  // ─── Computed Values ────────────────────────────
  /** Get pixels per millisecond at current zoom */
  getPixelsPerMs: () => number
  /** Convert time to pixel position */
  timeToPixels: (timeMs: number) => number
  /** Convert pixel position to time */
  pixelsToTime: (pixels: number) => number
}

// Zoom level constraints
const MIN_ZOOM = 0.5
const MAX_ZOOM = 4
const ZOOM_STEP = 0.25

const DEFAULT_STEP_MS = 1000

export const useVideoEditorStore = create<VideoEditorState>()((set, get) => ({
  // ─── Initial State ──────────────────────────────
  currentTime: 0,
  duration: 0,
  isPlaying: false,
  playbackRate: 1,

  zoomLevel: 1,
  scrollPosition: 0,
  snapEnabled: true,
  timelineWidth: 800,

  selectedClipId: null,
  editingClipId: null,
  isCreatingClip: false,

  clipCreation: {
    inPoint: null,
    outPoint: null,
  },

  // ─── Playback Actions ───────────────────────────

  setCurrentTime: (time) => {
    // Guard against Infinity, NaN, negative values
    if (!Number.isFinite(time) || time < 0) return
    set({ currentTime: time })
  },

  setDuration: (duration) => {
    // Guard against Infinity, NaN, negative values
    if (!Number.isFinite(duration) || duration < 0) return
    set({ duration })
  },

  setIsPlaying: (playing) => {
    set({ isPlaying: playing })
  },

  togglePlayback: () => {
    set((state) => ({ isPlaying: !state.isPlaying }))
  },

  setPlaybackRate: (rate) => {
    set({ playbackRate: rate })
  },

  seekTo: (time) => {
    const { duration } = get()
    set({ currentTime: Math.max(0, Math.min(time, duration)) })
  },

  stepForward: (ms = DEFAULT_STEP_MS) => {
    const { currentTime, duration } = get()
    set({ currentTime: Math.min(currentTime + ms, duration) })
  },

  stepBackward: (ms = DEFAULT_STEP_MS) => {
    const { currentTime } = get()
    set({ currentTime: Math.max(currentTime - ms, 0) })
  },

  // ─── Timeline Actions ───────────────────────────

  setZoomLevel: (level) => {
    set({ zoomLevel: Math.max(MIN_ZOOM, Math.min(level, MAX_ZOOM)) })
  },

  zoomIn: () => {
    const { zoomLevel } = get()
    set({ zoomLevel: Math.min(zoomLevel + ZOOM_STEP, MAX_ZOOM) })
  },

  zoomOut: () => {
    const { zoomLevel } = get()
    set({ zoomLevel: Math.max(zoomLevel - ZOOM_STEP, MIN_ZOOM) })
  },

  fitToView: () => {
    const { duration, timelineWidth } = get()
    if (duration <= 0 || timelineWidth <= 0) return

    // Calculate zoom to fit entire duration with some padding
    const padding = 40 // px
    const availableWidth = timelineWidth - padding
    const basePixelsPerMs = availableWidth / duration
    // Convert to zoom level (assuming 1x zoom = 0.1 pixels per ms for a typical recording)
    const targetZoom = Math.max(MIN_ZOOM, Math.min(basePixelsPerMs * 10000, MAX_ZOOM))

    set({
      zoomLevel: targetZoom,
      scrollPosition: 0,
    })
  },

  setScrollPosition: (position) => {
    set({ scrollPosition: Math.max(0, position) })
  },

  setSnapEnabled: (enabled) => {
    set({ snapEnabled: enabled })
  },

  toggleSnap: () => {
    set((state) => ({ snapEnabled: !state.snapEnabled }))
  },

  setTimelineWidth: (width) => {
    set({ timelineWidth: width })
  },

  // ─── Selection Actions ──────────────────────────

  selectClip: (id) => {
    set({ selectedClipId: id })
  },

  setEditingClip: (id) => {
    set({ editingClipId: id })
  },

  setIsCreatingClip: (creating) => {
    set({ isCreatingClip: creating })
  },

  clearSelection: () => {
    set({
      selectedClipId: null,
      editingClipId: null,
    })
  },

  // ─── Clip Creation Actions ──────────────────────

  setInPoint: (time) => {
    set((state) => ({
      clipCreation: { ...state.clipCreation, inPoint: time },
    }))
  },

  setOutPoint: (time) => {
    set((state) => ({
      clipCreation: { ...state.clipCreation, outPoint: time },
    }))
  },

  setInPointAtPlayhead: () => {
    const { currentTime } = get()
    set((state) => ({
      clipCreation: { ...state.clipCreation, inPoint: Math.round(currentTime) },
      isCreatingClip: true,
    }))
  },

  setOutPointAtPlayhead: () => {
    const { currentTime } = get()
    set((state) => ({
      clipCreation: { ...state.clipCreation, outPoint: Math.round(currentTime) },
      isCreatingClip: true,
    }))
  },

  clearClipCreation: () => {
    set({
      clipCreation: { inPoint: null, outPoint: null },
      isCreatingClip: false,
    })
  },

  // ─── Computed Values ────────────────────────────

  getPixelsPerMs: () => {
    const { zoomLevel } = get()
    // Base: 0.1 pixels per ms at 1x zoom (100px per second)
    return 0.1 * zoomLevel
  },

  timeToPixels: (timeMs) => {
    return timeMs * get().getPixelsPerMs()
  },

  pixelsToTime: (pixels) => {
    const pxPerMs = get().getPixelsPerMs()
    return pxPerMs > 0 ? pixels / pxPerMs : 0
  },
}))

// ─── Convenience Selectors ────────────────────────

export const useCurrentTime = () =>
  useVideoEditorStore((state) => state.currentTime)

export const useIsPlaying = () =>
  useVideoEditorStore((state) => state.isPlaying)

export const useZoomLevel = () =>
  useVideoEditorStore((state) => state.zoomLevel)

export const useSelectedClipId = () =>
  useVideoEditorStore((state) => state.selectedClipId)

export const useSnapEnabled = () =>
  useVideoEditorStore((state) => state.snapEnabled)

export const useClipCreation = () =>
  useVideoEditorStore((state) => state.clipCreation)

export const usePlaybackControls = () =>
  useVideoEditorStore((state) => ({
    togglePlayback: state.togglePlayback,
    stepForward: state.stepForward,
    stepBackward: state.stepBackward,
    seekTo: state.seekTo,
    setPlaybackRate: state.setPlaybackRate,
    playbackRate: state.playbackRate,
    isPlaying: state.isPlaying,
  }))

export const useTimelineControls = () =>
  useVideoEditorStore((state) => ({
    zoomIn: state.zoomIn,
    zoomOut: state.zoomOut,
    fitToView: state.fitToView,
    setZoomLevel: state.setZoomLevel,
    toggleSnap: state.toggleSnap,
    zoomLevel: state.zoomLevel,
    snapEnabled: state.snapEnabled,
  }))
