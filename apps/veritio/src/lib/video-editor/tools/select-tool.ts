/**
 * Select Tool
 *
 * The default tool for selecting, moving, and resizing items on the timeline.
 * Supports:
 * - Click to select
 * - Shift+click to add to selection
 * - Drag to move
 * - Alt+drag to copy
 * - Edge drag to trim
 * - Box selection
 */

import type { ITool, ToolContext, ToolType } from './tool-types'
import type { TimelineMouseEvent, CursorType } from '../types'
import { MoveClipCommand, TrimClipCommand, CopyClipCommand } from '../commands/clip-commands'

/** Edge detection threshold in pixels */
const _EDGE_THRESHOLD = 8

/** Minimum drag distance to initiate drag */
const DRAG_THRESHOLD = 3

interface DragState {
  type: 'move' | 'copy' | 'trim-start' | 'trim-end' | 'box-select'
  itemId: string | null
  startX: number
  startY: number
  startTimeMs: number
  originalStartMs: number
  originalEndMs: number
  trackId: string | null
  hasMoved: boolean
}

export class SelectTool implements ITool {
  readonly type: ToolType = 'select'
  readonly name = 'Select'
  readonly shortcut = 'V'

  private dragState: DragState | null = null
  private cursor: CursorType = 'default'

  getCursor(): CursorType {
    return this.cursor
  }

  onMouseDown(event: TimelineMouseEvent, context: ToolContext): void {
    const { timeMs, itemId, trackId, edge, shiftKey, altKey } = event

    // If clicking on an item
    if (itemId && trackId) {
      const item = context.timelineStore.getItem(itemId)
      if (!item) return

      // Check if clicking on an edge for trimming
      if (edge === 'start' || edge === 'end') {
        this.dragState = {
          type: edge === 'start' ? 'trim-start' : 'trim-end',
          itemId,
          startX: event.x,
          startY: event.y,
          startTimeMs: timeMs,
          originalStartMs: item.startMs,
          originalEndMs: item.endMs,
          trackId,
          hasMoved: false,
        }
        context.toolStore.startTrim(itemId, edge)
        return
      }

      // Select the item
      context.timelineStore.selectItem(itemId, shiftKey)

      // Store original position for move/copy
      context.toolStore.setOriginalPosition({
        startMs: item.startMs,
        endMs: item.endMs,
        trackId: item.trackId,
      })

      // Determine if this is a copy operation
      const isCopy = altKey
      context.toolStore.setCopyMode(isCopy)

      this.dragState = {
        type: isCopy ? 'copy' : 'move',
        itemId,
        startX: event.x,
        startY: event.y,
        startTimeMs: timeMs,
        originalStartMs: item.startMs,
        originalEndMs: item.endMs,
        trackId,
        hasMoved: false,
      }

      context.toolStore.startDrag(itemId, event.x, timeMs)
    } else {
      // Clicking on empty space - start box selection or clear selection
      if (!shiftKey) {
        context.timelineStore.clearSelection()
      }

      if (trackId) {
        this.dragState = {
          type: 'box-select',
          itemId: null,
          startX: event.x,
          startY: event.y,
          startTimeMs: timeMs,
          originalStartMs: 0,
          originalEndMs: 0,
          trackId,
          hasMoved: false,
        }
        context.toolStore.startBoxSelect(event.x, event.y)
      }
    }
  }

  onMouseMove(event: TimelineMouseEvent, context: ToolContext): void {
    const { itemId, edge, x, y, timeMs, trackId } = event

    // Update cursor based on hover state
    if (!this.dragState) {
      if (itemId) {
        if (edge === 'start' || edge === 'end') {
          this.cursor = 'ew-resize'
        } else {
          this.cursor = 'move'
        }
      } else {
        this.cursor = 'default'
      }
      return
    }

    // Check if we've started dragging
    const dx = x - this.dragState.startX
    const dy = y - this.dragState.startY
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (!this.dragState.hasMoved && distance < DRAG_THRESHOLD) {
      return
    }

    this.dragState.hasMoved = true

    // Handle different drag types
    switch (this.dragState.type) {
      case 'move':
      case 'copy':
        this.handleMoveDrag(timeMs, trackId, context)
        break

      case 'trim-start':
      case 'trim-end':
        this.handleTrimDrag(timeMs, context)
        break

      case 'box-select':
        context.toolStore.updateBoxSelect(x, y)
        this.updateBoxSelection(context)
        break
    }
  }

  onMouseUp(event: TimelineMouseEvent, context: ToolContext): void {
    if (!this.dragState) return

    const { type, hasMoved } = this.dragState

    if (hasMoved) {
      // Commit the operation
      switch (type) {
        case 'move':
          this.commitMove(context)
          break
        case 'copy':
          this.commitCopy(context)
          break
        case 'trim-start':
        case 'trim-end':
          this.commitTrim(context)
          break
        case 'box-select':
          // Selection is already applied during drag
          break
      }
    }

    // Reset state
    this.dragState = null
    this.cursor = 'default'

    // Reset tool store states
    context.toolStore.endDrag()
    context.toolStore.endTrim()
    context.toolStore.endBoxSelect()
  }

  onKeyDown(event: KeyboardEvent, context: ToolContext): boolean {
    // Handle delete/backspace for selected items
    if (event.key === 'Delete' || event.key === 'Backspace') {
      const selectedIds = Array.from(context.timelineStore.selectedItemIds)
      if (selectedIds.length > 0) {
        // Delete selected items (would create commands here)
        for (const itemId of selectedIds) {
          context.timelineStore.removeItem(itemId)
        }
        context.timelineStore.clearSelection()
        return true
      }
    }

    // Handle Escape to cancel drag or clear selection
    if (event.key === 'Escape') {
      if (this.dragState) {
        this.cancelDrag(context)
        return true
      }
      context.timelineStore.clearSelection()
      return true
    }

    // Handle Ctrl/Cmd+A for select all
    if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
      const allItems = context.timelineStore.getAllItems()
      context.timelineStore.selectItems(allItems.map((i) => i.id))
      return true
    }

    // Handle Ctrl/Cmd+D for duplicate
    if ((event.ctrlKey || event.metaKey) && event.key === 'd') {
      const selectedIds = Array.from(context.timelineStore.selectedItemIds)
      if (selectedIds.length > 0) {
        const newIds = context.timelineStore.duplicateItems(selectedIds, 1000) // 1 second offset
        context.timelineStore.selectItems(newIds)
        return true
      }
    }

    return false
  }

  private handleMoveDrag(timeMs: number, trackId: string | null, context: ToolContext): void {
    if (!this.dragState || !this.dragState.itemId) return

    const item = context.timelineStore.getItem(this.dragState.itemId)
    if (!item) return

    // Calculate new position
    const deltaMs = timeMs - this.dragState.startTimeMs
    let newStartMs = this.dragState.originalStartMs + deltaMs

    // Apply snapping
    const snapResult = context.snapEngine.snap(newStartMs, 'item-start')
    if (snapResult.snapped) {
      newStartMs = snapResult.position
    }

    // Clamp to timeline bounds
    const duration = this.dragState.originalEndMs - this.dragState.originalStartMs
    newStartMs = Math.max(0, newStartMs)
    const maxStart = context.timelineStore.duration - duration
    newStartMs = Math.min(newStartMs, maxStart)

    // Update item position visually (preview)
    context.timelineStore.updateItem(this.dragState.itemId, {
      startMs: newStartMs,
      endMs: newStartMs + duration,
    })
  }

  private handleTrimDrag(timeMs: number, context: ToolContext): void {
    if (!this.dragState || !this.dragState.itemId) return

    const isTrimStart = this.dragState.type === 'trim-start'

    // Apply snapping
    const snapResult = context.snapEngine.snap(timeMs, isTrimStart ? 'item-start' : 'item-end')
    let newTimeMs = snapResult.snapped ? snapResult.position : timeMs

    // Clamp to valid range
    if (isTrimStart) {
      // Start can't go past end - minimum 100ms duration
      newTimeMs = Math.max(0, newTimeMs)
      newTimeMs = Math.min(newTimeMs, this.dragState.originalEndMs - 100)
    } else {
      // End can't go before start - minimum 100ms duration
      newTimeMs = Math.max(this.dragState.originalStartMs + 100, newTimeMs)
      newTimeMs = Math.min(newTimeMs, context.timelineStore.duration)
    }

    // Update item (preview)
    context.timelineStore.updateItem(this.dragState.itemId, {
      startMs: isTrimStart ? newTimeMs : this.dragState.originalStartMs,
      endMs: isTrimStart ? this.dragState.originalEndMs : newTimeMs,
    })
  }

  private updateBoxSelection(context: ToolContext): void {
    const selectState = context.toolStore.selectState
    if (!selectState.selectionBox) return

    const { startX, startY: _startY, endX, endY: _endY } = selectState.selectionBox

    // Convert box coordinates to time range
    // This is simplified - would need proper coordinate conversion in real impl
    const minX = Math.min(startX, endX)
    const maxX = Math.max(startX, endX)

    // Find items that intersect with the box
    const allItems = context.timelineStore.getAllItems()
    const selectedIds: string[] = []

    for (const item of allItems) {
      // Simplified intersection check
      // In real implementation, would convert item times to pixel positions
      // and check against the selection box
      if (item.startMs >= minX && item.endMs <= maxX) {
        selectedIds.push(item.id)
      }
    }

    context.timelineStore.selectItems(selectedIds)
  }

  private commitMove(context: ToolContext): void {
    if (!this.dragState?.itemId) return

    const item = context.timelineStore.getItem(this.dragState.itemId)
    if (!item) return

    // Create and execute move command
     
    const command = new MoveClipCommand(
      {
        clipId: this.dragState.itemId,
        newTrackId: item.trackId,
        newStartMs: item.startMs,
        originalTrackId: this.dragState.trackId || item.trackId,
        originalStartMs: this.dragState.originalStartMs,
      },
      context.timelineStore as any
    )

    context.historyStore.execute(command)
  }

  private commitCopy(context: ToolContext): void {
    if (!this.dragState?.itemId) return

    const item = context.timelineStore.getItem(this.dragState.itemId)
    if (!item) return

    // Reset original item to its original position
    context.timelineStore.updateItem(this.dragState.itemId, {
      startMs: this.dragState.originalStartMs,
      endMs: this.dragState.originalEndMs,
    })

    // Create and execute copy command
     
    const command = new CopyClipCommand(
      {
        sourceClipId: this.dragState.itemId,
        trackId: item.trackId,
        newStartMs: item.startMs,
      },
      context.timelineStore as any
    )

    context.historyStore.execute(command)
  }

  private commitTrim(context: ToolContext): void {
    if (!this.dragState?.itemId) return

    const item = context.timelineStore.getItem(this.dragState.itemId)
    if (!item) return

    // Create and execute trim command
     
    const command = new TrimClipCommand(
      {
        clipId: this.dragState.itemId,
        trackId: item.trackId,
        newStartMs: item.startMs,
        newEndMs: item.endMs,
        originalStartMs: this.dragState.originalStartMs,
        originalEndMs: this.dragState.originalEndMs,
      },
      context.timelineStore as any
    )

    context.historyStore.execute(command)
  }

  private cancelDrag(context: ToolContext): void {
    if (!this.dragState?.itemId) return

    // Reset item to original position
    context.timelineStore.updateItem(this.dragState.itemId, {
      startMs: this.dragState.originalStartMs,
      endMs: this.dragState.originalEndMs,
    })

    // Reset state
    this.dragState = null
    context.toolStore.endDrag()
    context.toolStore.endTrim()
    context.toolStore.endBoxSelect()
  }
}
