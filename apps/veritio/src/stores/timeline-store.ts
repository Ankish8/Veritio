'use client'

/**
 * Timeline Store
 *
 * Central state management for the multi-track timeline.
 * Manages tracks, items, and selection state.
 *
 * Uses normalized state (tracks by ID) for efficient updates.
 */

import { create } from 'zustand'
import { nanoid } from 'nanoid'
import { DEFAULT_TRACK_CONFIGS } from '@/lib/video-editor/tracks/track-types'
import type {
  TrackType,
  TrackItem,
  TrackProperties,
  TrackConfig,
} from '@/lib/video-editor/tracks/track-types'

// ─────────────────────────────────────────────────────────────────────────────
// State Types
// ─────────────────────────────────────────────────────────────────────────────

/** Simplified track state for the store */
export interface TrackState {
  id: string
  type: TrackType
  name: string
  position: number
  properties: TrackProperties
  items: TrackItem[]
}

export interface TimelineState {
  // ─── Track State ─────────────────────────────────
  /** Tracks indexed by ID */
  tracks: Record<string, TrackState>
  /** Track order (IDs sorted by position) */
  trackOrder: string[]
  /** Recording ID this timeline belongs to */
  recordingId: string | null
  /** Total duration in milliseconds */
  duration: number

  // ─── Selection State ─────────────────────────────
  /** Selected item IDs */
  selectedItemIds: Set<string>
  /** Selected track IDs */
  selectedTrackIds: Set<string>
  /** Is multi-select active */
  isMultiSelect: boolean

  // ─── Initialization ──────────────────────────────
  /** Whether timeline has been initialized */
  isInitialized: boolean

  // ─── Actions ─────────────────────────────────────

  // Initialization
  initializeTimeline: (recordingId: string, duration: number, hasWebcam: boolean) => void
  resetTimeline: () => void

  // Track management
  addTrack: (config: Omit<TrackConfig, 'id'>) => string
  removeTrack: (trackId: string) => void
  updateTrack: (trackId: string, updates: Partial<TrackState>) => void
  updateTrackProperties: (trackId: string, updates: Partial<TrackProperties>) => void
  reorderTracks: (trackIds: string[]) => void
  toggleTrackVisibility: (trackId: string) => void
  toggleTrackAudio: (trackId: string) => void
  toggleTrackLock: (trackId: string) => void

  // Item management
  addItem: (trackId: string, item: Omit<TrackItem, 'id' | 'trackId'>) => string
  removeItem: (itemId: string) => boolean
  updateItem: (itemId: string, updates: Partial<TrackItem>) => boolean
  moveItem: (itemId: string, newTrackId: string, newStartMs: number) => boolean
  getItem: (itemId: string) => TrackItem | undefined
  getItemsByTrack: (trackId: string) => TrackItem[]
  getItemsInRange: (startMs: number, endMs: number) => TrackItem[]

  // Selection
  selectItem: (itemId: string, addToSelection?: boolean) => void
  selectItems: (itemIds: string[]) => void
  selectTrack: (trackId: string, addToSelection?: boolean) => void
  clearSelection: () => void
  setMultiSelect: (isMultiSelect: boolean) => void

  // Utilities
  getTrack: (trackId: string) => TrackState | undefined
  getTrackByType: (type: TrackType) => TrackState | undefined
  getAllItems: () => TrackItem[]
  findItemAtTime: (trackId: string, timeMs: number) => TrackItem | undefined

  // Clipboard operations
  duplicateItems: (itemIds: string[], offsetMs: number) => string[]

  // Split operations
  splitItem: (itemId: string, splitTimeMs: number) => { leftId: string; rightId: string } | null
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Find an item and its track across all tracks. Returns null if not found. */
function findItemInTracks(
  tracks: Record<string, TrackState>,
  itemId: string
): { trackId: string; track: TrackState; item: TrackItem; itemIndex: number } | null {
  for (const [trackId, track] of Object.entries(tracks)) {
    const itemIndex = track.items.findIndex((i) => i.id === itemId)
    if (itemIndex !== -1) {
      return { trackId, track, item: track.items[itemIndex], itemIndex }
    }
  }
  return null
}

/** Toggle a boolean property on a track's properties. */
function toggleProperty(
  get: () => TimelineState,
  set: (state: Partial<TimelineState>) => void,
  trackId: string,
  key: keyof TrackProperties
): void {
  const { tracks } = get()
  const track = tracks[trackId]
  if (!track) return
  set({ tracks: withUpdatedTrack(tracks, trackId, { properties: { ...track.properties, [key]: !track.properties[key] } }) })
}

/** Toggle an ID in a Set, returning a new Set. Used for selection toggling. */
function toggleInSet(currentSet: Set<string>, id: string): Set<string> {
  const newSet = new Set(currentSet)
  if (newSet.has(id)) {
    newSet.delete(id)
  } else {
    newSet.add(id)
  }
  return newSet
}

/** Update a single track in the tracks record (immutable). */
function withUpdatedTrack(
  tracks: Record<string, TrackState>,
  trackId: string,
  updates: Partial<TrackState>
): Record<string, TrackState> {
  return { ...tracks, [trackId]: { ...tracks[trackId], ...updates } }
}

// ─────────────────────────────────────────────────────────────────────────────
// Store Implementation
// ─────────────────────────────────────────────────────────────────────────────

export const useTimelineStore = create<TimelineState>()((set, get) => ({
  // ─── Initial State ───────────────────────────────
  tracks: {},
  trackOrder: [],
  recordingId: null,
  duration: 0,
  selectedItemIds: new Set(),
  selectedTrackIds: new Set(),
  isMultiSelect: false,
  isInitialized: false,

  // ─── Initialization ──────────────────────────────

  initializeTimeline: (recordingId, duration, hasWebcam) => {
    const tracks: Record<string, TrackState> = {}
    const trackOrder: string[] = []

    const configs = DEFAULT_TRACK_CONFIGS.filter(
      (config) => config.type !== 'webcam' || hasWebcam
    )

    configs.forEach((config) => {
      const id = nanoid()
      tracks[id] = {
        id,
        type: config.type,
        name: config.name,
        position: config.position,
        properties: { ...config.properties },
        items: [],
      }
      trackOrder.push(id)
    })

    trackOrder.sort((a, b) => tracks[a].position - tracks[b].position)

    set({
      tracks,
      trackOrder,
      recordingId,
      duration,
      selectedItemIds: new Set(),
      selectedTrackIds: new Set(),
      isMultiSelect: false,
      isInitialized: true,
    })
  },

  resetTimeline: () => {
    set({
      tracks: {},
      trackOrder: [],
      recordingId: null,
      duration: 0,
      selectedItemIds: new Set(),
      selectedTrackIds: new Set(),
      isMultiSelect: false,
      isInitialized: false,
    })
  },

  // ─── Track Management ────────────────────────────

  addTrack: (config) => {
    const id = nanoid()
    const { tracks, trackOrder } = get()

    const newTrack: TrackState = {
      id,
      type: config.type,
      name: config.name,
      position: config.position,
      properties: { ...config.properties },
      items: [],
    }

    const newTrackOrder = [...trackOrder, id].sort(
      (a, b) => (a === id ? config.position : tracks[a].position) - (b === id ? config.position : tracks[b].position)
    )

    set({
      tracks: { ...tracks, [id]: newTrack },
      trackOrder: newTrackOrder,
    })

    return id
  },

  removeTrack: (trackId) => {
    const { tracks, trackOrder, selectedTrackIds } = get()

    if (!tracks[trackId]) return

    const newTracks = { ...tracks }
    delete newTracks[trackId]

    const newSelectedTrackIds = new Set(selectedTrackIds)
    newSelectedTrackIds.delete(trackId)

    set({
      tracks: newTracks,
      trackOrder: trackOrder.filter((id) => id !== trackId),
      selectedTrackIds: newSelectedTrackIds,
    })
  },

  updateTrack: (trackId, updates) => {
    const { tracks } = get()
    if (!tracks[trackId]) return
    set({ tracks: withUpdatedTrack(tracks, trackId, updates) })
  },

  updateTrackProperties: (trackId, updates) => {
    const { tracks } = get()
    const track = tracks[trackId]
    if (!track) return
    set({ tracks: withUpdatedTrack(tracks, trackId, { properties: { ...track.properties, ...updates } }) })
  },

  reorderTracks: (trackIds) => {
    const { tracks } = get()

    // Update positions based on new order
    const updatedTracks = { ...tracks }
    trackIds.forEach((id, index) => {
      if (updatedTracks[id]) {
        updatedTracks[id] = { ...updatedTracks[id], position: index }
      }
    })

    set({
      tracks: updatedTracks,
      trackOrder: trackIds,
    })
  },

  toggleTrackVisibility: (trackId) => toggleProperty(get, set, trackId, 'visible'),

  toggleTrackAudio: (trackId) => toggleProperty(get, set, trackId, 'audioEnabled'),

  toggleTrackLock: (trackId) => toggleProperty(get, set, trackId, 'locked'),

  // ─── Item Management ─────────────────────────────

  addItem: (trackId, item) => {
    const { tracks } = get()
    const track = tracks[trackId]

    if (!track) return ''

    const id = nanoid()
    const newItem: TrackItem = {
      ...item,
      id,
      trackId,
      layer: item.layer ?? 0,
    }

    set({
      tracks: {
        ...tracks,
        [trackId]: {
          ...track,
          items: [...track.items, newItem],
        },
      },
    })

    return id
  },

  removeItem: (itemId) => {
    const { tracks, selectedItemIds } = get()
    const found = findItemInTracks(tracks, itemId)
    if (!found) return false

    const newSelectedItemIds = new Set(selectedItemIds)
    newSelectedItemIds.delete(itemId)

    set({
      tracks: withUpdatedTrack(tracks, found.trackId, {
        items: found.track.items.filter((i) => i.id !== itemId),
      }),
      selectedItemIds: newSelectedItemIds,
    })
    return true
  },

  updateItem: (itemId, updates) => {
    const { tracks } = get()
    const found = findItemInTracks(tracks, itemId)
    if (!found) return false

    const newItems = [...found.track.items]
    newItems[found.itemIndex] = { ...found.item, ...updates }

    set({ tracks: withUpdatedTrack(tracks, found.trackId, { items: newItems }) })
    return true
  },

  moveItem: (itemId, newTrackId, newStartMs) => {
    const { tracks } = get()
    const found = findItemInTracks(tracks, itemId)
    if (!found || !tracks[newTrackId]) return false

    const duration = found.item.endMs - found.item.startMs
    const movedItem: TrackItem = {
      ...found.item,
      trackId: newTrackId,
      startMs: newStartMs,
      endMs: newStartMs + duration,
    }

    const sourceItemsWithout = found.track.items.filter((i) => i.id !== itemId)

    if (found.trackId === newTrackId) {
      set({ tracks: withUpdatedTrack(tracks, found.trackId, { items: [...sourceItemsWithout, movedItem] }) })
    } else {
      const updatedTracks = withUpdatedTrack(tracks, found.trackId, { items: sourceItemsWithout })
      set({ tracks: withUpdatedTrack(updatedTracks, newTrackId, { items: [...tracks[newTrackId].items, movedItem] }) })
    }
    return true
  },

  getItem: (itemId) => {
    return findItemInTracks(get().tracks, itemId)?.item
  },

  getItemsByTrack: (trackId) => {
    const { tracks } = get()
    return tracks[trackId]?.items ?? []
  },

  // O(total items across all tracks) - scans every item in every track
  getItemsInRange: (startMs, endMs) => {
    const { tracks } = get()
    const items: TrackItem[] = []

    for (const track of Object.values(tracks)) {
      for (const item of track.items) {
        if (item.startMs < endMs && item.endMs > startMs) {
          items.push(item)
        }
      }
    }

    return items
  },

  // ─── Selection ───────────────────────────────────

  selectItem: (itemId, addToSelection = false) => {
    const { selectedItemIds, isMultiSelect } = get()
    const shouldAdd = addToSelection || isMultiSelect
    set({
      selectedItemIds: shouldAdd
        ? toggleInSet(selectedItemIds, itemId)
        : new Set([itemId]),
    })
  },

  selectItems: (itemIds) => {
    set({ selectedItemIds: new Set(itemIds) })
  },

  selectTrack: (trackId, addToSelection = false) => {
    const { selectedTrackIds, isMultiSelect } = get()
    const shouldAdd = addToSelection || isMultiSelect
    set({
      selectedTrackIds: shouldAdd
        ? toggleInSet(selectedTrackIds, trackId)
        : new Set([trackId]),
    })
  },

  clearSelection: () => {
    set({
      selectedItemIds: new Set(),
      selectedTrackIds: new Set(),
    })
  },

  setMultiSelect: (isMultiSelect) => {
    set({ isMultiSelect })
  },

  // ─── Utilities ───────────────────────────────────

  getTrack: (trackId) => {
    return get().tracks[trackId]
  },

  getTrackByType: (type) => {
    const { tracks } = get()
    return Object.values(tracks).find((track) => track.type === type)
  },

  getAllItems: () => {
    const { tracks } = get()
    const allItems: TrackItem[] = []

    for (const track of Object.values(tracks)) {
      allItems.push(...track.items)
    }

    return allItems
  },

  findItemAtTime: (trackId, timeMs) => {
    const { tracks } = get()
    const track = tracks[trackId]

    if (!track) return undefined

    return track.items.find((item) => timeMs >= item.startMs && timeMs <= item.endMs)
  },

  // ─── Clipboard Operations ────────────────────────

  duplicateItems: (itemIds, offsetMs) => {
    // Snapshot the original tracks for lookup; updatedTracks accumulates new items
    const originalTracks = get().tracks
    const newItemIds: string[] = []
    let updatedTracks = { ...originalTracks }

    for (const itemId of itemIds) {
      const found = findItemInTracks(originalTracks, itemId)
      if (!found) continue

      const newId = nanoid()
      const newItem: TrackItem = {
        ...found.item,
        id: newId,
        startMs: found.item.startMs + offsetMs,
        endMs: found.item.endMs + offsetMs,
      }

      updatedTracks = withUpdatedTrack(updatedTracks, found.trackId, {
        items: [...updatedTracks[found.trackId].items, newItem],
      })
      newItemIds.push(newId)
    }

    set({ tracks: updatedTracks })
    return newItemIds
  },

  // ─── Split Operations ───────────────────────────

  splitItem: (itemId, splitTimeMs) => {
    const { tracks } = get()
    const found = findItemInTracks(tracks, itemId)
    if (!found) return null

    if (splitTimeMs <= found.item.startMs || splitTimeMs >= found.item.endMs) {
      return null
    }

    const rightId = nanoid()
    const rightItem: TrackItem = { ...found.item, id: rightId, startMs: splitTimeMs }

    const updatedItems = found.track.items.map((item) =>
      item.id === itemId ? { ...item, endMs: splitTimeMs } : item
    )
    updatedItems.push(rightItem)

    set({ tracks: withUpdatedTrack(tracks, found.trackId, { items: updatedItems }) })
    return { leftId: itemId, rightId }
  },
}))

// ─────────────────────────────────────────────────────────────────────────────
// Selectors
// ─────────────────────────────────────────────────────────────────────────────

export const useTrackOrder = () => useTimelineStore((state) => state.trackOrder)

export const useTracks = () => useTimelineStore((state) => state.tracks)

export const useSelectedItemIds = () => useTimelineStore((state) => state.selectedItemIds)

export const useSelectedTrackIds = () => useTimelineStore((state) => state.selectedTrackIds)

export const useTimelineDuration = () => useTimelineStore((state) => state.duration)

export const useIsTimelineInitialized = () => useTimelineStore((state) => state.isInitialized)

export function useTrackByType(type: TrackType): TrackState | undefined {
  return useTimelineStore((state) =>
    Object.values(state.tracks).find((track) => track.type === type)
  )
}

export function useSelectedItems(): TrackItem[] {
  return useTimelineStore((state) => {
    const items: TrackItem[] = []
    for (const track of Object.values(state.tracks)) {
      for (const item of track.items) {
        if (state.selectedItemIds.has(item.id)) {
          items.push(item)
        }
      }
    }
    return items
  })
}
