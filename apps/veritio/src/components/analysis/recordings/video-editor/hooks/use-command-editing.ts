'use client'

/**
 * Command-Based Editing Hook
 *
 * Provides timeline editing operations that go through the command pattern
 * for automatic undo/redo support.
 */

import { useCallback } from 'react'
import { useTimelineStore } from '@/stores/timeline-store'
import { useHistoryStore } from '@/stores/history-store'
import { useVideoEditorStore } from '@/stores/video-editor-store'
import {
  SplitClipCommand,
  TrimClipCommand,
  MoveClipCommand,
  DeleteClipCommand,
} from '@/lib/video-editor/commands/clip-commands'

export function useCommandEditing() {
  const execute = useHistoryStore((s) => s.execute)
  const undo = useHistoryStore((s) => s.undo)
  const redo = useHistoryStore((s) => s.redo)
  const canUndo = useHistoryStore((s) => s.canUndo)
  const canRedo = useHistoryStore((s) => s.canRedo)

  /** Split an item at a specific time */
  const splitItem = useCallback(
    async (itemId: string, splitTimeMs: number) => {
      const store = useTimelineStore.getState()
      const item = store.getItem(itemId)
      if (!item) return null

      const command = new SplitClipCommand(
        { clipId: itemId, trackId: item.trackId, splitTimeMs },
        { getItem: store.getItem, removeItem: store.removeItem, addItem: store.addItem, getTrack: store.getTrack }
      )
      await execute(command)
      return { leftId: itemId, rightId: command['rightItemId'] }
    },
    [execute]
  )

  /** Split all items under the playhead */
  const splitAtPlayhead = useCallback(async () => {
    const store = useTimelineStore.getState()
    const currentTime = useVideoEditorStore.getState().currentTime

    for (const trackId of store.trackOrder) {
      const track = store.tracks[trackId]
      if (!track || track.properties.locked) continue
      const item = store.findItemAtTime(trackId, currentTime)
      if (item) await splitItem(item.id, currentTime)
    }
  }, [splitItem])

  /** Trim an item to new bounds */
  const trimItem = useCallback(
    async (itemId: string, newStartMs: number, newEndMs: number) => {
      const store = useTimelineStore.getState()
      const item = store.getItem(itemId)
      if (!item) return false

      const command = new TrimClipCommand(
        { clipId: itemId, trackId: item.trackId, originalStartMs: item.startMs, originalEndMs: item.endMs, newStartMs, newEndMs },
        { getItem: store.getItem, updateItem: store.updateItem }
      )
      await execute(command)
      return true
    },
    [execute]
  )

  /** Move an item to a new position */
  const moveItem = useCallback(
    async (itemId: string, newTrackId: string, newStartMs: number) => {
      const store = useTimelineStore.getState()
      const item = store.getItem(itemId)
      if (!item) return false

      const command = new MoveClipCommand(
        { clipId: itemId, originalTrackId: item.trackId, newTrackId, originalStartMs: item.startMs, newStartMs },
        { getItem: store.getItem, moveItem: store.moveItem }
      )
      await execute(command)
      return true
    },
    [execute]
  )

  /** Delete an item */
  const deleteItem = useCallback(
    async (itemId: string) => {
      const store = useTimelineStore.getState()
      const item = store.getItem(itemId)
      if (!item) return false

      const command = new DeleteClipCommand(
        { clipId: itemId, trackId: item.trackId },
        { getItem: store.getItem, removeItem: store.removeItem, addItem: store.addItem }
      )
      await execute(command)
      return true
    },
    [execute]
  )

  /** Delete all selected items */
  const deleteSelected = useCallback(async () => {
    const store = useTimelineStore.getState()
    const selectedIds = Array.from(store.selectedItemIds)
    for (const id of selectedIds) await deleteItem(id)
    store.clearSelection()
    return selectedIds.length
  }, [deleteItem])

  /** Duplicate selected items with offset */
  const duplicateSelected = useCallback(async () => {
    const store = useTimelineStore.getState()
    const selectedIds = Array.from(store.selectedItemIds)
    if (selectedIds.length === 0) return

    // Duplicate each selected item with 1 second offset
    for (const id of selectedIds) {
      const item = store.getItem(id)
      if (!item) continue

      const offset = 1000 // 1 second
      const newItem = { ...item, startMs: item.startMs + offset, endMs: item.endMs + offset }
      store.addItem(item.trackId, newItem)
    }
  }, [])

  return {
    splitItem,
    splitAtPlayhead,
    trimItem,
    moveItem,
    deleteItem,
    deleteSelected,
    duplicateSelected,
    undo,
    redo,
    canUndo,
    canRedo,
  }
}
