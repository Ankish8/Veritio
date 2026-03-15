'use client'

/**
 * Timeline Editing Hook
 *
 * Manages trim and drag operations for timeline items.
 * Uses command pattern for undo/redo support.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTimelineStore } from '@/stores/timeline-store'
import { useHistoryStore } from '@/stores/history-store'
import { TrimClipCommand, MoveClipCommand } from '@/lib/video-editor/commands/clip-commands'
import type { ClipItem } from '@/lib/video-editor/tracks/track-types'

interface TrimState {
  itemId: string
  edge: 'start' | 'end'
  initialX: number
  initialStartMs: number
  initialEndMs: number
}

interface DragState {
  itemId: string
  initialX: number
  initialStartMs: number
  initialEndMs: number
  initialTrackId: string
}

interface UseTimelineEditingOptions {
  pixelsPerMs: number
  duration: number
  onClipTrim?: (clipId: string, startMs: number, endMs: number) => Promise<unknown>
}

export function useTimelineEditing({
  pixelsPerMs,
  duration,
  onClipTrim,
}: UseTimelineEditingOptions) {
  const [trimState, setTrimState] = useState<TrimState | null>(null)
  const [dragState, setDragState] = useState<DragState | null>(null)

  // Track final values for command creation
  const finalValuesRef = useRef<{ startMs: number; endMs: number } | null>(null)

  // Stores
  const getItem = useTimelineStore((s) => s.getItem)
  const updateItem = useTimelineStore((s) => s.updateItem)
  const _getTrackByType = useTimelineStore((s) => s.getTrackByType)
  const selectItem = useTimelineStore((s) => s.selectItem)
  const execute = useHistoryStore((s) => s.execute)

  // Start trimming an item edge
  const handleTrimStart = useCallback(
    (itemId: string, edge: 'start' | 'end', initialX: number) => {
      const item = getItem(itemId)
      if (!item) return

      // Select the item being trimmed
      selectItem(itemId, false)

      setTrimState({
        itemId,
        edge,
        initialX,
        initialStartMs: item.startMs,
        initialEndMs: item.endMs,
      })
    },
    [getItem, selectItem]
  )

  // Start dragging an item
  const handleDragStart = useCallback(
    (itemId: string, initialX: number) => {
      const item = getItem(itemId)
      if (!item) return

      // Select the item being dragged
      selectItem(itemId, false)

      setDragState({
        itemId,
        initialX,
        initialStartMs: item.startMs,
        initialEndMs: item.endMs,
        initialTrackId: item.trackId,
      })
    },
    [getItem, selectItem]
  )

  // Handle mouse move during trim/drag
  useEffect(() => {
    if (!trimState && !dragState) return

    const handleMouseMove = (e: MouseEvent) => {
      if (trimState) {
        const deltaX = e.clientX - trimState.initialX
        const deltaMs = deltaX / pixelsPerMs

        let newStartMs = trimState.initialStartMs
        let newEndMs = trimState.initialEndMs

        if (trimState.edge === 'start') {
          newStartMs = Math.max(0, Math.min(trimState.initialStartMs + deltaMs, trimState.initialEndMs - 100))
          updateItem(trimState.itemId, { startMs: newStartMs })
        } else {
          newEndMs = Math.max(trimState.initialStartMs + 100, Math.min(trimState.initialEndMs + deltaMs, duration))
          updateItem(trimState.itemId, { endMs: newEndMs })
        }

        // Track final values for command
        finalValuesRef.current = { startMs: trimState.edge === 'start' ? newStartMs : trimState.initialStartMs, endMs: trimState.edge === 'end' ? newEndMs : trimState.initialEndMs }
      }

      if (dragState) {
        const deltaX = e.clientX - dragState.initialX
        const deltaMs = deltaX / pixelsPerMs
        const itemDuration = dragState.initialEndMs - dragState.initialStartMs
        const newStartMs = Math.max(0, Math.min(dragState.initialStartMs + deltaMs, duration - itemDuration))
        const newEndMs = newStartMs + itemDuration

        updateItem(dragState.itemId, { startMs: newStartMs, endMs: newEndMs })
        finalValuesRef.current = { startMs: newStartMs, endMs: newEndMs }
      }
    }

    const handleMouseUp = async () => {
      const store = useTimelineStore.getState()

      if (trimState && finalValuesRef.current) {
        const item = store.getItem(trimState.itemId)
        if (item) {
          // First revert to original state
          store.updateItem(trimState.itemId, { startMs: trimState.initialStartMs, endMs: trimState.initialEndMs })

          // Create and execute command (this applies the change with undo support)
          const command = new TrimClipCommand(
            { clipId: trimState.itemId, trackId: item.trackId, originalStartMs: trimState.initialStartMs, originalEndMs: trimState.initialEndMs, newStartMs: finalValuesRef.current.startMs, newEndMs: finalValuesRef.current.endMs },
            { getItem: store.getItem, updateItem: store.updateItem }
          )
          await execute(command)

          // API call for clip items
          if (onClipTrim) {
            const clipsTrack = store.getTrackByType('clips')
            if (clipsTrack?.items.find((i) => i.id === trimState.itemId)) {
              const clipItem = item as ClipItem
              if (clipItem.clipId) onClipTrim(clipItem.clipId, finalValuesRef.current.startMs, finalValuesRef.current.endMs).catch(() => {})
            }
          }
        }
        setTrimState(null)
        finalValuesRef.current = null
      }

      if (dragState && finalValuesRef.current) {
        const item = store.getItem(dragState.itemId)
        if (item) {
          // Revert to original state
          store.updateItem(dragState.itemId, { startMs: dragState.initialStartMs, endMs: dragState.initialEndMs })

          // Create and execute command
          const command = new MoveClipCommand(
            { clipId: dragState.itemId, originalTrackId: dragState.initialTrackId, newTrackId: item.trackId, originalStartMs: dragState.initialStartMs, newStartMs: finalValuesRef.current.startMs },
            { getItem: store.getItem, moveItem: store.moveItem }
          )
          await execute(command)
        }
        setDragState(null)
        finalValuesRef.current = null
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [trimState, dragState, pixelsPerMs, duration, updateItem, execute, onClipTrim])

  return {
    trimState,
    dragState,
    handleTrimStart,
    handleDragStart,
    isEditing: !!(trimState || dragState),
  }
}
