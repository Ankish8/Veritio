/**
 * Clip Commands
 *
 * Commands for manipulating clips on the timeline.
 * All commands support undo/redo through the command pattern.
 */

import { nanoid } from 'nanoid'
import { BaseCommand } from './base-command'
import type { ICommand, SplitClipData, TrimClipData, MoveClipData, CopyClipData, DeleteClipData, RippleDeleteData } from './command-types'
import type { TrackItem } from '../tracks/track-types'
import type { TimelineState } from '../../../stores/timeline-store'

// ─────────────────────────────────────────────────────────────────────────────
// Split Clip Command
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Split a clip at a specific time point, creating two clips
 */
export class SplitClipCommand extends BaseCommand {
  private originalItem: TrackItem | null = null
  private leftItemId: string | null = null
  private rightItemId: string | null = null

  constructor(
    private data: SplitClipData,
    private timelineStore: Pick<TimelineState, 'getItem' | 'removeItem' | 'addItem' | 'getTrack'>
  ) {
    super('split-clip', `Split clip at ${formatTime(data.splitTimeMs)}`)
  }

  execute(): void {
    const item = this.timelineStore.getItem(this.data.clipId)
    if (!item) {
      throw new Error(`Clip ${this.data.clipId} not found`)
    }

    // Validate split point
    if (this.data.splitTimeMs <= item.startMs || this.data.splitTimeMs >= item.endMs) {
      throw new Error('Split point must be within clip bounds')
    }

    // Store original for undo
    this.originalItem = { ...item }

    // Generate IDs for new clips
    this.leftItemId = nanoid()
    this.rightItemId = nanoid()

    // Create left clip (before split point)
    const leftItem: TrackItem = {
      ...item,
      id: this.leftItemId,
      endMs: this.data.splitTimeMs,
    }

    // Create right clip (after split point)
    const rightItem: TrackItem = {
      ...item,
      id: this.rightItemId,
      startMs: this.data.splitTimeMs,
    }

    // Remove original and add new clips
    this.timelineStore.removeItem(this.data.clipId)
    this.timelineStore.addItem(this.data.trackId, leftItem)
    this.timelineStore.addItem(this.data.trackId, rightItem)

    // Store created IDs for undo
    this.data.leftClipId = this.leftItemId
    this.data.rightClipId = this.rightItemId
  }

  undo(): void {
    if (!this.originalItem || !this.leftItemId || !this.rightItemId) {
      throw new Error('Cannot undo: no original state')
    }

    // Remove the split clips
    this.timelineStore.removeItem(this.leftItemId)
    this.timelineStore.removeItem(this.rightItemId)

    // Restore original clip
    this.timelineStore.addItem(this.data.trackId, this.originalItem)
  }

  protected getSerializationData(): Record<string, unknown> {
    return {
      ...this.data,
      originalItem: this.originalItem,
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Trim Clip Command
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Trim a clip's start or end point
 */
export class TrimClipCommand extends BaseCommand {
  constructor(
    private data: TrimClipData,
    private timelineStore: Pick<TimelineState, 'getItem' | 'updateItem'>
  ) {
    super('trim-clip', `Trim clip`)
  }

  execute(): void {
    const item = this.timelineStore.getItem(this.data.clipId)
    if (!item) {
      throw new Error(`Clip ${this.data.clipId} not found`)
    }

    // Store original values for undo
    this.data.originalStartMs = item.startMs
    this.data.originalEndMs = item.endMs

    // Apply new values
    this.timelineStore.updateItem(this.data.clipId, {
      startMs: this.data.newStartMs,
      endMs: this.data.newEndMs,
    })
  }

  undo(): void {
    this.timelineStore.updateItem(this.data.clipId, {
      startMs: this.data.originalStartMs,
      endMs: this.data.originalEndMs,
    })
  }

  canMergeWith(other: ICommand): boolean {
    // Allow merging consecutive trims of the same clip
    if (other.type !== 'trim-clip') return false
    const otherTrim = other as TrimClipCommand
    return otherTrim.data.clipId === this.data.clipId
  }

  mergeWith(other: ICommand): ICommand {
    const otherTrim = other as TrimClipCommand
    // Keep original values from this command, use new values from other
    return new TrimClipCommand(
      {
        ...this.data,
        newStartMs: otherTrim.data.newStartMs,
        newEndMs: otherTrim.data.newEndMs,
      },
      this.timelineStore
    )
  }

  protected getSerializationData(): Record<string, unknown> {
    return this.data as unknown as Record<string, unknown>
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Move Clip Command
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Move a clip to a new position (and optionally a new track)
 */
export class MoveClipCommand extends BaseCommand {
  constructor(
    private data: MoveClipData,
    private timelineStore: Pick<TimelineState, 'getItem' | 'moveItem'>
  ) {
    super('move-clip', `Move clip`)
  }

  execute(): void {
    const item = this.timelineStore.getItem(this.data.clipId)
    if (!item) {
      throw new Error(`Clip ${this.data.clipId} not found`)
    }

    // Store original position for undo
    this.data.originalTrackId = item.trackId
    this.data.originalStartMs = item.startMs

    // Move to new position
    this.timelineStore.moveItem(this.data.clipId, this.data.newTrackId, this.data.newStartMs)
  }

  undo(): void {
    this.timelineStore.moveItem(
      this.data.clipId,
      this.data.originalTrackId,
      this.data.originalStartMs
    )
  }

  canMergeWith(other: ICommand): boolean {
    // Allow merging consecutive moves of the same clip
    if (other.type !== 'move-clip') return false
    const otherMove = other as MoveClipCommand
    return otherMove.data.clipId === this.data.clipId
  }

  mergeWith(other: ICommand): ICommand {
    const otherMove = other as MoveClipCommand
    // Keep original position from this command, use new position from other
    return new MoveClipCommand(
      {
        ...this.data,
        newTrackId: otherMove.data.newTrackId,
        newStartMs: otherMove.data.newStartMs,
      },
      this.timelineStore
    )
  }

  protected getSerializationData(): Record<string, unknown> {
    return this.data as unknown as Record<string, unknown>
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Copy Clip Command
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Copy a clip to a new position
 */
export class CopyClipCommand extends BaseCommand {
  private createdItemId: string | null = null

  constructor(
    private data: CopyClipData,
    private timelineStore: Pick<TimelineState, 'getItem' | 'addItem' | 'removeItem'>
  ) {
    super('copy-clip', `Copy clip`)
  }

  execute(): void {
    const sourceItem = this.timelineStore.getItem(this.data.sourceClipId)
    if (!sourceItem) {
      throw new Error(`Source clip ${this.data.sourceClipId} not found`)
    }

    // Calculate duration
    const duration = sourceItem.endMs - sourceItem.startMs

    // Create new item
    const newItem: TrackItem = {
      ...sourceItem,
      id: nanoid(),
      startMs: this.data.newStartMs,
      endMs: this.data.newStartMs + duration,
    }

    // Add to track
    this.createdItemId = this.timelineStore.addItem(this.data.trackId, newItem)
    this.data.createdClipId = this.createdItemId
  }

  undo(): void {
    if (this.createdItemId) {
      this.timelineStore.removeItem(this.createdItemId)
    }
  }

  protected getSerializationData(): Record<string, unknown> {
    return {
      ...this.data,
      createdItemId: this.createdItemId,
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Delete Clip Command
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Delete a clip from the timeline
 */
export class DeleteClipCommand extends BaseCommand {
  private deletedItem: TrackItem | null = null

  constructor(
    private data: DeleteClipData,
    private timelineStore: Pick<TimelineState, 'getItem' | 'removeItem' | 'addItem'>
  ) {
    super('delete-clip', `Delete clip`)
  }

  execute(): void {
    const item = this.timelineStore.getItem(this.data.clipId)
    if (!item) {
      throw new Error(`Clip ${this.data.clipId} not found`)
    }

    // Store for undo
    this.deletedItem = { ...item }
    this.data.clipData = { ...item }

    // Remove the clip
    this.timelineStore.removeItem(this.data.clipId)
  }

  undo(): void {
    if (!this.deletedItem) {
      throw new Error('Cannot undo: no deleted item')
    }

    // Restore the clip
    this.timelineStore.addItem(this.data.trackId, this.deletedItem)
  }

  protected getSerializationData(): Record<string, unknown> {
    return {
      ...this.data,
      deletedItem: this.deletedItem,
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Ripple Delete Command
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Delete a clip and shift all following clips to fill the gap
 */
export class RippleDeleteCommand extends BaseCommand {
  private deletedItem: TrackItem | null = null
  private shiftedItems: Array<{ clipId: string; originalStartMs: number; originalEndMs: number }> = []

  constructor(
    private data: RippleDeleteData,
    private timelineStore: Pick<TimelineState, 'getItem' | 'removeItem' | 'addItem' | 'updateItem' | 'getItemsByTrack'>
  ) {
    super('ripple-delete-clip', `Ripple delete clip`)
  }

  execute(): void {
    const item = this.timelineStore.getItem(this.data.clipId)
    if (!item) {
      throw new Error(`Clip ${this.data.clipId} not found`)
    }

    // Store for undo
    this.deletedItem = { ...item }
    this.data.deletedClipData = { ...item }
    this.data.gapDurationMs = item.endMs - item.startMs

    // Get all items on the same track that come after this clip
    const trackItems = this.timelineStore.getItemsByTrack(this.data.trackId)
    const itemsToShift = trackItems.filter((i) => i.startMs >= item.endMs)

    // Store original positions for undo
    this.shiftedItems = itemsToShift.map((i) => ({
      clipId: i.id,
      originalStartMs: i.startMs,
      originalEndMs: i.endMs,
    }))
    this.data.shiftedClips = this.shiftedItems

    // Remove the clip
    this.timelineStore.removeItem(this.data.clipId)

    // Shift all following items
    for (const shiftItem of itemsToShift) {
      this.timelineStore.updateItem(shiftItem.id, {
        startMs: shiftItem.startMs - this.data.gapDurationMs,
        endMs: shiftItem.endMs - this.data.gapDurationMs,
      })
    }
  }

  undo(): void {
    if (!this.deletedItem) {
      throw new Error('Cannot undo: no deleted item')
    }

    // Restore shifted items to original positions
    for (const shiftedItem of this.shiftedItems) {
      this.timelineStore.updateItem(shiftedItem.clipId, {
        startMs: shiftedItem.originalStartMs,
        endMs: shiftedItem.originalEndMs,
      })
    }

    // Restore the deleted clip
    this.timelineStore.addItem(this.data.trackId, this.deletedItem)
  }

  protected getSerializationData(): Record<string, unknown> {
    return {
      ...this.data,
      deletedItem: this.deletedItem,
      shiftedItems: this.shiftedItems,
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Format time in milliseconds to MM:SS.mmm
 */
function formatTime(ms: number): string {
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  const millis = ms % 1000
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${millis.toString().padStart(3, '0')}`
}
