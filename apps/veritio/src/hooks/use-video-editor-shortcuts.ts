'use client'

import { useEffect, useCallback } from 'react'
import { useToolStore } from '@/stores/tool-store'
import { useHistoryStore } from '@/stores/history-store'
import { useTimelineStore } from '@/stores/timeline-store'
import { useVideoEditorStore } from '@/stores/video-editor-store'
import { useShuttleControl } from './use-shuttle-control'
import type { ToolType } from '@/lib/video-editor/tools/tool-types'

/** Frame step amount in milliseconds (~1 frame at 30fps) */
const FRAME_STEP_MS = 33

export interface UseVideoEditorShortcutsOptions {
  onSeek: (timeMs: number) => void
  onTogglePlay: () => void
  onSetPlaybackRate: (rate: number) => void
  isPlaying: boolean
  playbackRate: number
  duration: number
  enabled?: boolean
}

export function useVideoEditorShortcuts({
  onSeek,
  onTogglePlay,
  onSetPlaybackRate,
  isPlaying,
  playbackRate,
  duration,
  enabled = true,
}: UseVideoEditorShortcutsOptions) {
  // Stores
  const setActiveTool = useToolStore((s) => s.setActiveTool)
  const setAnnotationMode = useToolStore((s) => s.setAnnotationMode)
  const { undo, redo } = useHistoryStore()
  const { selectedItemIds, removeItem, clearSelection, duplicateItems, selectItems } = useTimelineStore()
  const currentTime = useVideoEditorStore((s) => s.currentTime)
  const setInPointAtPlayhead = useVideoEditorStore((s) => s.setInPointAtPlayhead)
  const setOutPointAtPlayhead = useVideoEditorStore((s) => s.setOutPointAtPlayhead)
  const clearClipCreation = useVideoEditorStore((s) => s.clearClipCreation)
  const toggleSnap = useVideoEditorStore((s) => s.toggleSnap)
  const { fitToView, zoomIn, zoomOut } = useVideoEditorStore()

  // Shuttle control
  const { handleShuttle } = useShuttleControl({
    onTogglePlay,
    onSetPlaybackRate,
    isPlaying,
    playbackRate,
  })

  const handleToolShortcut = useCallback((tool: ToolType) => setActiveTool(tool), [setActiveTool])

  const handleDeleteSelected = useCallback(() => {
    Array.from(selectedItemIds).forEach((id) => removeItem(id))
    clearSelection()
  }, [selectedItemIds, removeItem, clearSelection])

  const handleDuplicate = useCallback(() => {
    const ids = Array.from(selectedItemIds)
    if (ids.length > 0) {
      const newIds = duplicateItems(ids, 1000)
      selectItems(newIds)
    }
  }, [selectedItemIds, duplicateItems, selectItems])

  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return

      const isCmd = e.metaKey || e.ctrlKey
      const isShift = e.shiftKey
      const key = e.key.toLowerCase()

      // Tool shortcuts (V, C, A)
      if (!isCmd && ['v', 'c', 'a'].includes(key)) {
        e.preventDefault()
        const toolMap: Record<string, ToolType> = { v: 'select', c: 'razor', a: 'annotation' }
        handleToolShortcut(toolMap[key])
        return
      }

      // Shuttle control (J, K, L)
      if (['j', 'k'].includes(key) || (key === 'l' && !isCmd)) {
        e.preventDefault()
        const shuttleMap: Record<string, 'backward' | 'stop' | 'forward'> = { j: 'backward', k: 'stop', l: 'forward' }
        handleShuttle(shuttleMap[key])
        return
      }

      // In/Out points (I, O)
      if (key === 'i') { e.preventDefault(); setInPointAtPlayhead(); return }
      if (key === 'o' && !isCmd) { e.preventDefault(); setOutPointAtPlayhead(); return }

      // Play/Pause (Space)
      if (key === ' ') { e.preventDefault(); onTogglePlay(); return }

      // Frame stepping (Arrow keys)
      if (key === 'arrowleft') {
        e.preventDefault()
        onSeek(Math.max(0, currentTime - (isShift ? 5000 : FRAME_STEP_MS)))
        return
      }
      if (key === 'arrowright') {
        e.preventDefault()
        onSeek(Math.min(duration, currentTime + (isShift ? 5000 : FRAME_STEP_MS)))
        return
      }

      // Home/End
      if (key === 'home') { e.preventDefault(); onSeek(0); return }
      if (key === 'end') { e.preventDefault(); onSeek(duration); return }

      // Snap toggle (N), Fit to view (\), Zoom (+/-)
      if (key === 'n' && !isCmd) { e.preventDefault(); toggleSnap(); return }
      if (key === '\\') { e.preventDefault(); fitToView(); return }
      if (isCmd && (key === '=' || key === '+')) { e.preventDefault(); zoomIn(); return }
      if (isCmd && key === '-') { e.preventDefault(); zoomOut(); return }

      // Delete, Escape, Undo/Redo, Duplicate
      if (key === 'delete' || key === 'backspace') { e.preventDefault(); handleDeleteSelected(); return }
      if (key === 'escape') { e.preventDefault(); clearClipCreation(); clearSelection(); return }
      if (isCmd && key === 'z') { e.preventDefault(); if (isShift) { redo() } else { undo() }; return }
      if (isCmd && key === 'd') { e.preventDefault(); handleDuplicate(); return }

      // Annotation mode (1-5)
      const modeMap: Record<string, 'text' | 'rectangle' | 'circle' | 'blur' | 'highlight'> = {
        '1': 'text', '2': 'rectangle', '3': 'circle', '4': 'blur', '5': 'highlight'
      }
      if (!isCmd && modeMap[key]) {
        e.preventDefault()
        setAnnotationMode(modeMap[key])
        handleToolShortcut('annotation')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    enabled, handleToolShortcut, handleShuttle, handleDeleteSelected, handleDuplicate,
    setInPointAtPlayhead, setOutPointAtPlayhead, onTogglePlay, onSeek, currentTime,
    duration, toggleSnap, fitToView, zoomIn, zoomOut, clearClipCreation, clearSelection,
    undo, redo, setAnnotationMode,
  ])
}
