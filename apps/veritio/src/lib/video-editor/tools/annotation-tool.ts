/**
 * Annotation Tool
 *
 * Tool for creating and editing annotations on the video.
 * Supports multiple annotation modes:
 * - Text: Click to add text labels
 * - Shape: Drag to draw shapes (rectangle, circle, arrow)
 * - Blur: Drag to create blur regions
 * - Highlight: Drag to create highlight regions
 */

import type { ITool, ToolContext, ToolType, AnnotationMode } from './tool-types'
import type { TimelineMouseEvent, CursorType } from '../types'
import type { ShapeType, AnnotationStyle } from '../tracks/track-types'
import { AddAnnotationCommand } from '../commands/annotation-commands'

interface DrawState {
  mode: AnnotationMode
  startX: number
  startY: number
  startTimeMs: number
  currentX: number
  currentY: number
  currentTimeMs: number
}

export class AnnotationTool implements ITool {
  readonly type: ToolType = 'annotation'
  readonly name = 'Annotation'
  readonly shortcut = 'A'

  private drawState: DrawState | null = null

  getCursor(): CursorType {
    return 'crosshair'
  }

  onMouseDown(event: TimelineMouseEvent, context: ToolContext): void {
    const { x, y, timeMs } = event
    const { annotationState } = context.toolStore

    // Start drawing
    this.drawState = {
      mode: annotationState.mode,
      startX: x,
      startY: y,
      startTimeMs: timeMs,
      currentX: x,
      currentY: y,
      currentTimeMs: timeMs,
    }

    context.toolStore.startAnnotationDraw(x, y, timeMs)
  }

  onMouseMove(event: TimelineMouseEvent, context: ToolContext): void {
    if (!this.drawState) return

    const { x, y, timeMs } = event

    this.drawState.currentX = x
    this.drawState.currentY = y
    this.drawState.currentTimeMs = timeMs

    context.toolStore.updateAnnotationDraw(x, y, timeMs)
  }

  onMouseUp(event: TimelineMouseEvent, context: ToolContext): void {
    if (!this.drawState) return

    const { annotationState } = context.toolStore
    const { mode } = annotationState

    // Create the annotation based on mode
    if (mode === 'text') {
      this.createTextAnnotation(context)
    } else if (mode === 'rectangle' || mode === 'circle' || mode === 'arrow') {
      this.createShapeAnnotation(mode, context)
    } else if (mode === 'blur') {
      this.createBlurAnnotation(context)
    } else if (mode === 'highlight') {
      this.createHighlightAnnotation(context)
    }

    // Reset draw state
    this.drawState = null
    context.toolStore.endAnnotationDraw()
  }

  onKeyDown(event: KeyboardEvent, context: ToolContext): boolean {
    // Number keys 1-5 to switch annotation mode
    if (event.key >= '1' && event.key <= '5') {
      const modes: AnnotationMode[] = ['text', 'rectangle', 'circle', 'blur', 'highlight']
      const index = parseInt(event.key) - 1
      if (index < modes.length) {
        context.toolStore.setAnnotationMode(modes[index])
        return true
      }
    }

    // Escape to switch back to select tool
    if (event.key === 'Escape') {
      if (this.drawState) {
        this.drawState = null
        context.toolStore.endAnnotationDraw()
      } else {
        context.toolStore.setActiveTool('select')
      }
      return true
    }

    return false
  }

  private createTextAnnotation(context: ToolContext): void {
    if (!this.drawState) return

    const annotationsTrack = context.timelineStore.getTrackByType('annotations')
    if (!annotationsTrack) return

    const { annotationState } = context.toolStore
    const { startX, startY, startTimeMs } = this.drawState

    // Default text annotation duration: 3 seconds
    const duration = 3000

    const style: AnnotationStyle = {
      x: startX,
      y: startY,
      color: annotationState.style.color,
      fontSize: annotationState.style.fontSize,
      fontFamily: annotationState.style.fontFamily,
      fontWeight: 'normal',
      opacity: annotationState.style.opacity,
    }

     
    const command = new AddAnnotationCommand(
      {
        trackId: annotationsTrack.id,
        startMs: startTimeMs,
        endMs: startTimeMs + duration,
        annotationType: 'text',
        content: 'Click to edit', // Default text - would open editor
        style,
      },
      context.timelineStore as any
    )

    context.historyStore.execute(command)
  }

  private createShapeAnnotation(shapeMode: AnnotationMode, context: ToolContext): void {
    if (!this.drawState) return

    const annotationsTrack = context.timelineStore.getTrackByType('annotations')
    if (!annotationsTrack) return

    const { annotationState } = context.toolStore
    const { startX, startY, startTimeMs, currentX, currentY, currentTimeMs } = this.drawState

    // Calculate bounding box
    const x = Math.min(startX, currentX)
    const y = Math.min(startY, currentY)
    const width = Math.abs(currentX - startX)
    const height = Math.abs(currentY - startY)

    // Minimum size check
    if (width < 10 && height < 10) return

    // Map mode to shape type
    const shapeTypeMap: Record<string, ShapeType> = {
      rectangle: 'rectangle',
      circle: 'circle',
      arrow: 'arrow',
      line: 'line',
    }

    // Calculate time range
    const minTime = Math.min(startTimeMs, currentTimeMs)
    const maxTime = Math.max(startTimeMs, currentTimeMs)
    const duration = Math.max(maxTime - minTime, 3000) // Minimum 3 seconds

    const style: AnnotationStyle = {
      x,
      y,
      width,
      height,
      color: annotationState.style.color,
      borderWidth: 2,
      borderColor: annotationState.style.color,
      opacity: annotationState.style.opacity,
      shapeType: shapeTypeMap[shapeMode] || 'rectangle',
    }

     
    const command = new AddAnnotationCommand(
      {
        trackId: annotationsTrack.id,
        startMs: minTime,
        endMs: minTime + duration,
        annotationType: 'shape',
        content: '',
        style,
      },
      context.timelineStore as any
    )

    context.historyStore.execute(command)
  }

  private createBlurAnnotation(context: ToolContext): void {
    if (!this.drawState) return

    const annotationsTrack = context.timelineStore.getTrackByType('annotations')
    if (!annotationsTrack) return

    const { annotationState } = context.toolStore
    const { startX, startY, startTimeMs, currentX, currentY, currentTimeMs } = this.drawState

    // Calculate bounding box
    const x = Math.min(startX, currentX)
    const y = Math.min(startY, currentY)
    const width = Math.abs(currentX - startX)
    const height = Math.abs(currentY - startY)

    // Minimum size check
    if (width < 20 && height < 20) return

    // Calculate time range
    const minTime = Math.min(startTimeMs, currentTimeMs)
    const maxTime = Math.max(startTimeMs, currentTimeMs)
    const duration = Math.max(maxTime - minTime, 3000) // Minimum 3 seconds

    const style: AnnotationStyle = {
      x,
      y,
      width,
      height,
      blurRadius: annotationState.style.blurRadius || 20,
      opacity: 1,
    }

     
    const command = new AddAnnotationCommand(
      {
        trackId: annotationsTrack.id,
        startMs: minTime,
        endMs: minTime + duration,
        annotationType: 'blur',
        content: '',
        style,
      },
      context.timelineStore as any
    )

    context.historyStore.execute(command)
  }

  private createHighlightAnnotation(context: ToolContext): void {
    if (!this.drawState) return

    const annotationsTrack = context.timelineStore.getTrackByType('annotations')
    if (!annotationsTrack) return

    const { annotationState } = context.toolStore
    const { startX, startY, startTimeMs, currentX, currentY, currentTimeMs } = this.drawState

    // Calculate bounding box
    const x = Math.min(startX, currentX)
    const y = Math.min(startY, currentY)
    const width = Math.abs(currentX - startX)
    const height = Math.abs(currentY - startY)

    // Minimum size check
    if (width < 10 && height < 10) return

    // Calculate time range
    const minTime = Math.min(startTimeMs, currentTimeMs)
    const maxTime = Math.max(startTimeMs, currentTimeMs)
    const duration = Math.max(maxTime - minTime, 3000) // Minimum 3 seconds

    const style: AnnotationStyle = {
      x,
      y,
      width,
      height,
      backgroundColor: annotationState.style.color || '#ffff00',
      opacity: 0.3,
    }

     
    const command = new AddAnnotationCommand(
      {
        trackId: annotationsTrack.id,
        startMs: minTime,
        endMs: minTime + duration,
        annotationType: 'highlight',
        content: '',
        style,
      },
      context.timelineStore as any
    )

    context.historyStore.execute(command)
  }
}
