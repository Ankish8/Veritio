/**
 * Annotation Commands
 *
 * Commands for manipulating annotations on the timeline.
 */

import { nanoid } from 'nanoid'
import { BaseCommand } from './base-command'
import type { ICommand } from './command-types'
import type { AnnotationItem, AnnotationStyle, AnnotationType } from '../tracks/track-types'
import type { TimelineState } from '../../../stores/timeline-store'

// ─────────────────────────────────────────────────────────────────────────────
// Add Annotation Command
// ─────────────────────────────────────────────────────────────────────────────

export interface AddAnnotationData {
  trackId: string
  startMs: number
  endMs: number
  annotationType: AnnotationType
  content: string
  style: AnnotationStyle
}

/**
 * Add a new annotation to the timeline
 */
export class AddAnnotationCommand extends BaseCommand {
  private createdItemId: string | null = null

  constructor(
    private data: AddAnnotationData,
    private timelineStore: Pick<TimelineState, 'addItem' | 'removeItem'>
  ) {
    super('add-annotation', `Add ${data.annotationType} annotation`)
  }

  execute(): void {
    const annotationItem: Omit<AnnotationItem, 'id' | 'trackId'> = {
      type: 'annotation',
      annotationId: nanoid(), // This would be replaced with DB ID after persistence
      annotationType: this.data.annotationType,
      content: this.data.content,
      style: this.data.style,
      startMs: this.data.startMs,
      endMs: this.data.endMs,
      layer: 0,
    }

    this.createdItemId = this.timelineStore.addItem(this.data.trackId, annotationItem)
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
// Update Annotation Command
// ─────────────────────────────────────────────────────────────────────────────

export interface UpdateAnnotationData {
  annotationId: string
  updates: Partial<{
    content: string
    style: Partial<AnnotationStyle>
    startMs: number
    endMs: number
  }>
}

/**
 * Update an existing annotation
 */
export class UpdateAnnotationCommand extends BaseCommand {
  private previousState: Partial<AnnotationItem> | null = null

  constructor(
    private data: UpdateAnnotationData,
    private timelineStore: Pick<TimelineState, 'getItem' | 'updateItem'>
  ) {
    super('update-annotation', `Update annotation`)
  }

  execute(): void {
    const item = this.timelineStore.getItem(this.data.annotationId) as AnnotationItem | undefined
    if (!item) {
      throw new Error(`Annotation ${this.data.annotationId} not found`)
    }

    // Store previous state for undo
    this.previousState = {
      content: item.content,
      style: { ...item.style },
      startMs: item.startMs,
      endMs: item.endMs,
    }

    // Build update object
    const updates: Partial<AnnotationItem> = {}

    if (this.data.updates.content !== undefined) {
      updates.content = this.data.updates.content
    }

    if (this.data.updates.style) {
      updates.style = { ...item.style, ...this.data.updates.style }
    }

    if (this.data.updates.startMs !== undefined) {
      updates.startMs = this.data.updates.startMs
    }

    if (this.data.updates.endMs !== undefined) {
      updates.endMs = this.data.updates.endMs
    }

    this.timelineStore.updateItem(this.data.annotationId, updates)
  }

  undo(): void {
    if (!this.previousState) {
      throw new Error('Cannot undo: no previous state')
    }

    this.timelineStore.updateItem(this.data.annotationId, this.previousState)
  }

  canMergeWith(other: ICommand): boolean {
    if (other.type !== 'update-annotation') return false
    const otherUpdate = other as UpdateAnnotationCommand
    return otherUpdate.data.annotationId === this.data.annotationId
  }

  mergeWith(other: ICommand): ICommand {
    const otherUpdate = other as UpdateAnnotationCommand
    return new UpdateAnnotationCommand(
      {
        annotationId: this.data.annotationId,
        updates: {
          ...this.data.updates,
          ...otherUpdate.data.updates,
          style: {
            ...this.data.updates.style,
            ...otherUpdate.data.updates.style,
          },
        },
      },
      this.timelineStore
    )
  }

  protected getSerializationData(): Record<string, unknown> {
    return {
      ...this.data,
      previousState: this.previousState,
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Delete Annotation Command
// ─────────────────────────────────────────────────────────────────────────────

export interface DeleteAnnotationData {
  annotationId: string
  trackId: string
}

/**
 * Delete an annotation from the timeline
 */
export class DeleteAnnotationCommand extends BaseCommand {
  private deletedItem: AnnotationItem | null = null

  constructor(
    private data: DeleteAnnotationData,
    private timelineStore: Pick<TimelineState, 'getItem' | 'removeItem' | 'addItem'>
  ) {
    super('delete-annotation', `Delete annotation`)
  }

  execute(): void {
    const item = this.timelineStore.getItem(this.data.annotationId) as AnnotationItem | undefined
    if (!item) {
      throw new Error(`Annotation ${this.data.annotationId} not found`)
    }

    // Store for undo
    this.deletedItem = { ...item } as AnnotationItem

    // Remove the annotation
    this.timelineStore.removeItem(this.data.annotationId)
  }

  undo(): void {
    if (!this.deletedItem) {
      throw new Error('Cannot undo: no deleted item')
    }

    // Restore the annotation
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
// Move Annotation Command
// ─────────────────────────────────────────────────────────────────────────────

export interface MoveAnnotationData {
  annotationId: string
  newStartMs: number
  newEndMs?: number
  newX?: number
  newY?: number
}

/**
 * Move an annotation to a new position
 */
export class MoveAnnotationCommand extends BaseCommand {
  private previousPosition: { startMs: number; endMs: number; x: number; y: number } | null = null

  constructor(
    private data: MoveAnnotationData,
    private timelineStore: Pick<TimelineState, 'getItem' | 'updateItem'>
  ) {
    super('move-annotation', `Move annotation`)
  }

  execute(): void {
    const item = this.timelineStore.getItem(this.data.annotationId) as AnnotationItem | undefined
    if (!item) {
      throw new Error(`Annotation ${this.data.annotationId} not found`)
    }

    // Store previous position for undo
    this.previousPosition = {
      startMs: item.startMs,
      endMs: item.endMs,
      x: item.style.x,
      y: item.style.y,
    }

    // Calculate new end time (preserve duration) if not explicitly provided
    const duration = item.endMs - item.startMs
    const newEndMs = this.data.newEndMs ?? this.data.newStartMs + duration

    // Build update object
    const updates: Partial<AnnotationItem> = {
      startMs: this.data.newStartMs,
      endMs: newEndMs,
    }

    // Update position if provided
    if (this.data.newX !== undefined || this.data.newY !== undefined) {
      updates.style = {
        ...item.style,
        x: this.data.newX ?? item.style.x,
        y: this.data.newY ?? item.style.y,
      }
    }

    this.timelineStore.updateItem(this.data.annotationId, updates)
  }

  undo(): void {
    if (!this.previousPosition) {
      throw new Error('Cannot undo: no previous position')
    }

    const item = this.timelineStore.getItem(this.data.annotationId) as AnnotationItem | undefined
    if (!item) return

    this.timelineStore.updateItem(this.data.annotationId, {
      startMs: this.previousPosition.startMs,
      endMs: this.previousPosition.endMs,
      style: {
        ...item.style,
        x: this.previousPosition.x,
        y: this.previousPosition.y,
      },
    } as unknown as Partial<AnnotationItem>)
  }

  canMergeWith(other: ICommand): boolean {
    if (other.type !== 'move-annotation') return false
    const otherMove = other as MoveAnnotationCommand
    return otherMove.data.annotationId === this.data.annotationId
  }

  mergeWith(other: ICommand): ICommand {
    const otherMove = other as MoveAnnotationCommand
    return new MoveAnnotationCommand(
      {
        annotationId: this.data.annotationId,
        newStartMs: otherMove.data.newStartMs,
        newEndMs: otherMove.data.newEndMs,
        newX: otherMove.data.newX ?? this.data.newX,
        newY: otherMove.data.newY ?? this.data.newY,
      },
      this.timelineStore
    )
  }

  protected getSerializationData(): Record<string, unknown> {
    return {
      ...this.data,
      previousPosition: this.previousPosition,
    }
  }
}
