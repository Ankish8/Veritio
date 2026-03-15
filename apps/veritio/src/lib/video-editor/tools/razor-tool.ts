/**
 * Razor Tool
 *
 * Tool for splitting clips at specific time points.
 * Click on a clip to split it into two separate clips.
 *
 * Features:
 * - Visual indicator showing where the split will occur
 * - Snapping to significant points (playhead, markers, other clip edges)
 * - Shift+click to split all clips on all tracks at that time
 */

import type { ITool, ToolContext, ToolType } from './tool-types'
import type { TimelineMouseEvent, CursorType } from '../types'
import { SplitClipCommand } from '../commands/clip-commands'
import { createBatchCommand } from '../commands/batch-command'

export class RazorTool implements ITool {
  readonly type: ToolType = 'razor'
  readonly name = 'Razor'
  readonly shortcut = 'C'

  getCursor(): CursorType {
    return 'crosshair'
  }

  onMouseDown(event: TimelineMouseEvent, context: ToolContext): void {
    // Razor tool action happens on mouse down
    const { itemId, trackId, timeMs, shiftKey } = event

    if (shiftKey) {
      // Split all clips at this time across all tracks
      this.splitAllAtTime(timeMs, context)
    } else if (itemId && trackId) {
      // Split single clip
      this.splitClip(itemId, trackId, timeMs, context)
    }
  }

  onMouseMove(event: TimelineMouseEvent, context: ToolContext): void {
    const { itemId, timeMs, trackId } = event

    // Update razor cursor position indicator
    if (itemId) {
      // Apply snapping
      const snapResult = context.snapEngine.snap(timeMs, 'playhead')
      const snappedTime = snapResult.snapped ? snapResult.position : timeMs

      context.toolStore.setRazorCursor(snappedTime, itemId, trackId)
    } else {
      context.toolStore.setRazorCursor(null, null, null)
    }
  }

  onMouseUp(_event: TimelineMouseEvent, _context: ToolContext): void {
    // No action on mouse up for razor tool
  }

  onKeyDown(event: KeyboardEvent, context: ToolContext): boolean {
    // S key splits at playhead
    if (event.key === 's' || event.key === 'S') {
      const currentTime = context.currentTimeMs

      // Find all items at current time
      const allItems = context.timelineStore.getAllItems()
      const itemsAtTime = allItems.filter(
        (item) => currentTime > item.startMs && currentTime < item.endMs
      )

      if (itemsAtTime.length > 0) {
        // Split all items at playhead
         
        const commands = itemsAtTime.map(
          (item) =>
            new SplitClipCommand(
              {
                clipId: item.id,
                trackId: item.trackId,
                splitTimeMs: currentTime,
              },
              context.timelineStore as any
            )
        )

        if (commands.length === 1) {
          context.historyStore.execute(commands[0])
        } else {
          context.historyStore.execute(
            createBatchCommand(commands, `Split ${commands.length} clips at playhead`)
          )
        }

        return true
      }
    }

    // Escape to switch back to select tool
    if (event.key === 'Escape') {
      context.toolStore.setActiveTool('select')
      return true
    }

    return false
  }

  private splitClip(
    itemId: string,
    trackId: string,
    timeMs: number,
    context: ToolContext
  ): void {
    const item = context.timelineStore.getItem(itemId)
    if (!item) return

    // Apply snapping
    const snapResult = context.snapEngine.snap(timeMs, 'playhead')
    const splitTime = snapResult.snapped ? snapResult.position : timeMs

    // Validate split point is within clip bounds
    const minSplitMargin = 100 // Minimum 100ms from edges
    if (splitTime <= item.startMs + minSplitMargin || splitTime >= item.endMs - minSplitMargin) {
      // Split point too close to edges, abort
      return
    }

    // Create and execute split command
     
    const command = new SplitClipCommand(
      {
        clipId: itemId,
        trackId,
        splitTimeMs: splitTime,
      },
      context.timelineStore as any
    )

    context.historyStore.execute(command)
  }

  private splitAllAtTime(timeMs: number, context: ToolContext): void {
    // Apply snapping
    const snapResult = context.snapEngine.snap(timeMs, 'playhead')
    const splitTime = snapResult.snapped ? snapResult.position : timeMs

    // Find all items that span this time
    const allItems = context.timelineStore.getAllItems()
    const itemsToSplit = allItems.filter((item) => {
      const minSplitMargin = 100
      return (
        splitTime > item.startMs + minSplitMargin && splitTime < item.endMs - minSplitMargin
      )
    })

    if (itemsToSplit.length === 0) return

    // Create commands for all splits
     
    const commands = itemsToSplit.map(
      (item) =>
        new SplitClipCommand(
          {
            clipId: item.id,
            trackId: item.trackId,
            splitTimeMs: splitTime,
          },
          context.timelineStore as any
        )
    )

    // Execute as batch
    if (commands.length === 1) {
      context.historyStore.execute(commands[0])
    } else {
      context.historyStore.execute(
        createBatchCommand(commands, `Split ${commands.length} clips`)
      )
    }
  }
}
