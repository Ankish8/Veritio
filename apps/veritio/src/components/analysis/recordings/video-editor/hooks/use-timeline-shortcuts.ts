'use client'

import { useEffect, useCallback } from 'react'
import { useToolStore } from '@/stores/tool-store'
import { useVideoEditorStore } from '@/stores/video-editor-store'
import { useHistoryStore } from '@/stores/history-store'

interface UseTimelineShortcutsProps {
  enabled?: boolean
  onSplitAtPlayhead?: () => void
  onDeleteSelected?: () => void
  onDuplicateSelected?: () => void
}

/** Check if target is an input element */
const isInputElement = (target: HTMLElement) =>
  target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

/**
 * Timeline keyboard shortcuts: V=Select, C=Razor, A=Annotation, N=Snap,
 * S=Split, \=Fit, +/-=Zoom, Cmd+Z=Undo, Cmd+D=Duplicate, Del=Delete, 1-5=Annotation modes
 */
export function useTimelineShortcuts({
  enabled = true,
  onSplitAtPlayhead,
  onDeleteSelected,
  onDuplicateSelected,
}: UseTimelineShortcutsProps) {
  const setActiveTool = useToolStore((s) => s.setActiveTool)
  const setAnnotationMode = useToolStore((s) => s.setAnnotationMode)
  const { toggleSnap, zoomIn, zoomOut, fitToView } = useVideoEditorStore()
  const { undo, redo } = useHistoryStore()

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled || isInputElement(e.target as HTMLElement)) return

      const isMeta = e.metaKey || e.ctrlKey
      const key = e.key.toLowerCase()

      // Tool shortcuts (no meta key)
      if (!isMeta) {
        const toolMap: Record<string, () => void> = {
          v: () => setActiveTool('select'),
          c: () => setActiveTool('razor'),
          a: () => setActiveTool('annotation'),
          n: toggleSnap,
          s: () => onSplitAtPlayhead?.(),
          '\\': fitToView,
          '=': zoomIn,
          '+': zoomIn,
          '-': zoomOut,
        }

        // Annotation mode shortcuts (1-5)
        const annotationModes = ['text', 'rectangle', 'circle', 'blur', 'highlight'] as const
        if (key >= '1' && key <= '5') {
          e.preventDefault()
          setAnnotationMode(annotationModes[parseInt(key) - 1])
          setActiveTool('annotation')
          return
        }

        if (toolMap[key]) {
          e.preventDefault()
          toolMap[key]()
          return
        }
      }

      // Undo/Redo (with meta key)
      if (isMeta && key === 'z') {
        e.preventDefault()
        if (e.shiftKey) { redo() } else { undo() }
        return
      }

      // Duplicate (Cmd+D)
      if (isMeta && key === 'd') {
        e.preventDefault()
        onDuplicateSelected?.()
        return
      }

      // Delete
      if (key === 'delete' || key === 'backspace') {
        e.preventDefault()
        onDeleteSelected?.()
      }
    },
    [enabled, setActiveTool, setAnnotationMode, toggleSnap, zoomIn, zoomOut, fitToView, undo, redo, onSplitAtPlayhead, onDeleteSelected, onDuplicateSelected]
  )

  useEffect(() => {
    if (!enabled) return
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [enabled, handleKeyDown])
}
