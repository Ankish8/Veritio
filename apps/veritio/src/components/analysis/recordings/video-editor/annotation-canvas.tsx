'use client'

/**
 * Annotation Canvas Component
 *
 * Fabric.js-based canvas overlay for video annotations.
 * Supports text labels, shapes, blur regions, and highlights.
 * Annotations are time-synced with video playback.
 */

import { useEffect, useRef, useState } from 'react'
import { Canvas, Rect, Ellipse, FabricText, Shadow, Point, FabricObject } from 'fabric'
import type { TPointerEventInfo, TPointerEvent } from 'fabric'
import { cn } from '@/lib/utils'
import { useToolStore } from '@/stores/tool-store'
import { useTimelineStore } from '@/stores/timeline-store'
import { useVideoEditorStore } from '@/stores/video-editor-store'
import type { AnnotationItem, AnnotationStyle } from '@/lib/video-editor/tracks/track-types'

export interface AnnotationCanvasProps {
  /** Width of the video container */
  width: number
  /** Height of the video container */
  height: number
  /** Current playback time in milliseconds */
  currentTimeMs: number
  /** Whether the canvas is in edit mode */
  isEditMode: boolean
  /** Callback when annotation is created */
  onAnnotationCreate?: (annotation: Omit<AnnotationItem, 'id' | 'trackId' | 'annotationId'>) => void
  /** Callback when annotation is updated */
  onAnnotationUpdate?: (annotationId: string, updates: Partial<AnnotationStyle>) => void
}

export function AnnotationCanvas({
  width,
  height,
  currentTimeMs,
  isEditMode,
  onAnnotationCreate,
  onAnnotationUpdate: _onAnnotationUpdate,
}: AnnotationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<Canvas | null>(null)
  const [isReady, setIsReady] = useState(false)

  // Tool store
  const activeTool = useToolStore((s) => s.activeTool)
  const annotationState = useToolStore((s) => s.annotationState)

  // Timeline store - get annotations
  const tracks = useTimelineStore((s) => s.tracks)
  const getTrackByType = useTimelineStore((s) => s.getTrackByType)

  // Get current time from video editor store
  const _currentTime = useVideoEditorStore((s) => s.currentTime)

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = new Canvas(canvasRef.current, {
      width,
      height,
      selection: isEditMode,
      preserveObjectStacking: true,
    })

    fabricRef.current = canvas
     
    setIsReady(true)

    return () => {
      canvas.dispose()
      fabricRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height])

  // Update canvas size
  useEffect(() => {
    if (!fabricRef.current) return
    fabricRef.current.setDimensions({ width, height })
  }, [width, height])

  // Update selection mode
  useEffect(() => {
    if (!fabricRef.current) return
    fabricRef.current.selection = isEditMode && activeTool === 'select'
  }, [isEditMode, activeTool])

  // Render annotations for current time
  useEffect(() => {
    if (!fabricRef.current || !isReady) return

    const canvas = fabricRef.current
    const annotationsTrack = getTrackByType('annotations')

    if (!annotationsTrack) {
      canvas.clear()
      return
    }

    // Get annotations visible at current time
    const visibleAnnotations = annotationsTrack.items.filter(
      (item) => currentTimeMs >= item.startMs && currentTimeMs <= item.endMs
    ) as AnnotationItem[]

    // Clear and re-render
    canvas.clear()

    visibleAnnotations.forEach((annotation) => {
      const obj = createFabricObject(annotation, width, height)
      if (obj) {
        canvas.add(obj)
      }
    })

    canvas.renderAll()
  }, [currentTimeMs, tracks, width, height, isReady, getTrackByType])

  // Handle mouse events for annotation creation
  useEffect(() => {
    if (!fabricRef.current || !isEditMode || activeTool !== 'annotation') return

    const canvas = fabricRef.current
    let isDrawing = false
    let startPoint: Point | null = null
    let currentShape: FabricObject | null = null

    const handleMouseDown = (e: TPointerEventInfo<TPointerEvent>) => {
      const pointer = e.viewportPoint || e.scenePoint
      if (!pointer) return

      isDrawing = true
      startPoint = new Point(pointer.x, pointer.y)

      // Create initial shape based on mode
      const { mode, style } = annotationState

      if (mode === 'text') {
        // Text is created on mouse up
        return
      }

      if (mode === 'rectangle' || mode === 'blur' || mode === 'highlight') {
        currentShape = new Rect({
          left: startPoint.x,
          top: startPoint.y,
          width: 0,
          height: 0,
          fill: mode === 'blur' ? 'rgba(0,0,0,0.1)' : mode === 'highlight' ? `${style.color}40` : 'transparent',
          stroke: mode === 'rectangle' ? style.color : 'transparent',
          strokeWidth: 2,
          selectable: false,
        })
      } else if (mode === 'circle') {
        currentShape = new Ellipse({
          left: startPoint.x,
          top: startPoint.y,
          rx: 0,
          ry: 0,
          fill: 'transparent',
          stroke: style.color,
          strokeWidth: 2,
          selectable: false,
        })
      }

      if (currentShape) {
        canvas.add(currentShape)
      }
    }

    const handleMouseMove = (e: TPointerEventInfo<TPointerEvent>) => {
      const pointer = e.viewportPoint || e.scenePoint
      if (!isDrawing || !startPoint || !currentShape || !pointer) return

      if (currentShape instanceof Rect) {
        const width = Math.abs(pointer.x - startPoint.x)
        const height = Math.abs(pointer.y - startPoint.y)
        const left = Math.min(startPoint.x, pointer.x)
        const top = Math.min(startPoint.y, pointer.y)

        currentShape.set({ left, top, width, height })
      } else if (currentShape instanceof Ellipse) {
        const rx = Math.abs(pointer.x - startPoint.x) / 2
        const ry = Math.abs(pointer.y - startPoint.y) / 2
        const left = Math.min(startPoint.x, pointer.x)
        const top = Math.min(startPoint.y, pointer.y)

        currentShape.set({ left, top, rx, ry })
      }

      canvas.renderAll()
    }

    const handleMouseUp = (e: TPointerEventInfo<TPointerEvent>) => {
      const pointer = e.viewportPoint || e.scenePoint
      if (!isDrawing || !startPoint || !pointer) return

      const { mode, style } = annotationState

      if (mode === 'text') {
        // Create text annotation
        onAnnotationCreate?.({
          type: 'annotation',
          annotationType: 'text',
          content: 'Click to edit',
          startMs: currentTimeMs,
          endMs: currentTimeMs + 3000,
          layer: 0,
          style: {
            x: (pointer.x / width) * 100,
            y: (pointer.y / height) * 100,
            color: style.color,
            fontSize: style.fontSize,
            fontFamily: style.fontFamily,
            opacity: style.opacity,
          },
        })
      } else if (currentShape) {
        // Create shape/blur/highlight annotation
        const bounds = currentShape.getBoundingRect()
        const minSize = 20

        if (bounds.width >= minSize || bounds.height >= minSize) {
          onAnnotationCreate?.({
            type: 'annotation',
            annotationType: mode === 'blur' ? 'blur' : mode === 'highlight' ? 'highlight' : 'shape',
            content: '',
            startMs: currentTimeMs,
            endMs: currentTimeMs + 3000,
            layer: 0,
            style: {
              x: (bounds.left / width) * 100,
              y: (bounds.top / height) * 100,
              width: (bounds.width / width) * 100,
              height: (bounds.height / height) * 100,
              color: style.color,
              shapeType: mode === 'circle' ? 'circle' : 'rectangle',
              blurRadius: mode === 'blur' ? style.blurRadius : undefined,
              opacity: mode === 'highlight' ? 0.3 : style.opacity,
            },
          })
        }

        canvas.remove(currentShape)
      }

      isDrawing = false
      startPoint = null
      currentShape = null
      canvas.renderAll()
    }

    canvas.on('mouse:down', handleMouseDown)
    canvas.on('mouse:move', handleMouseMove)
    canvas.on('mouse:up', handleMouseUp)

    return () => {
      canvas.off('mouse:down', handleMouseDown)
      canvas.off('mouse:move', handleMouseMove)
      canvas.off('mouse:up', handleMouseUp)
    }
  }, [isEditMode, activeTool, annotationState, width, height, currentTimeMs, onAnnotationCreate])

  return (
    <canvas
      ref={canvasRef}
      className={cn(
        'absolute inset-0 pointer-events-none',
        isEditMode && activeTool === 'annotation' && 'pointer-events-auto cursor-crosshair'
      )}
    />
  )
}

/**
 * Create a Fabric.js object from an annotation
 */
function createFabricObject(
  annotation: AnnotationItem,
  canvasWidth: number,
  canvasHeight: number
): FabricObject | null {
  const { annotationType, content, style } = annotation

  // Convert percentage positions to pixels
  const x = (style.x / 100) * canvasWidth
  const y = (style.y / 100) * canvasHeight
  const width = style.width ? (style.width / 100) * canvasWidth : undefined
  const height = style.height ? (style.height / 100) * canvasHeight : undefined

  switch (annotationType) {
    case 'text':
      return new FabricText(content, {
        left: x,
        top: y,
        fontSize: style.fontSize || 24,
        fontFamily: style.fontFamily || 'Inter, sans-serif',
        fontWeight: style.fontWeight || 'normal',
        fill: style.color || '#ffffff',
        opacity: style.opacity || 1,
        selectable: false,
        shadow: new Shadow({
          color: 'rgba(0,0,0,0.5)',
          blur: 4,
          offsetX: 1,
          offsetY: 1,
        }),
      })

    case 'shape':
      if (style.shapeType === 'circle' && width && height) {
        return new Ellipse({
          left: x,
          top: y,
          rx: width / 2,
          ry: height / 2,
          fill: style.backgroundColor || 'transparent',
          stroke: style.borderColor || style.color || '#ffffff',
          strokeWidth: style.borderWidth || 2,
          opacity: style.opacity || 1,
          selectable: false,
        })
      }
      return new Rect({
        left: x,
        top: y,
        width: width || 100,
        height: height || 50,
        fill: style.backgroundColor || 'transparent',
        stroke: style.borderColor || style.color || '#ffffff',
        strokeWidth: style.borderWidth || 2,
        opacity: style.opacity || 1,
        selectable: false,
      })

    case 'blur':
      // Blur effect using a semi-transparent overlay
      // Note: True blur requires WebGL/custom filter
      return new Rect({
        left: x,
        top: y,
        width: width || 100,
        height: height || 50,
        fill: 'rgba(128,128,128,0.8)',
        stroke: 'transparent',
        selectable: false,
      })

    case 'highlight':
      return new Rect({
        left: x,
        top: y,
        width: width || 100,
        height: height || 50,
        fill: (style.backgroundColor || '#ffff00') + '4d', // 30% opacity
        stroke: 'transparent',
        selectable: false,
      })

    default:
      return null
  }
}
