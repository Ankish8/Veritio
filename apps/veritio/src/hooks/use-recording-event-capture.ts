'use client'

import { useCallback, useRef, useEffect } from 'react'
import { submitRecordingEvents } from './use-recording-events'

/** Built-in event types for prototype testing */
export type PrototypeEventType = 'click' | 'scroll' | 'navigation' | 'task_start' | 'task_end' | 'frame_change'

/** Custom event types for other test types */
export type CustomEventType =
  | 'first_click' | 'aoi_hit' | 'task_skip'  // First Click Test
  | 'drag_start' | 'card_drop' | 'category_created'  // Card Sort
  | 'node_expand' | 'node_collapse' | 'node_select'  // Tree Test

/** All supported recording event types */
export type RecordingEventType = PrototypeEventType | CustomEventType | string

export interface RecordingEventData {
  x?: number
  y?: number
  frame_id?: string
  was_hotspot?: boolean
  triggered_transition?: boolean
  from_frame_id?: string | null
  to_frame_id?: string
  triggered_by?: string
  task_id?: string
  task_title?: string
  outcome?: string
  [key: string]: unknown
}

interface BufferedEvent {
  timestamp_ms: number
  event_type: RecordingEventType
  data: RecordingEventData
}

const FLUSH_INTERVAL_MS = 5000
const MAX_BUFFER_SIZE = 100

export interface UseRecordingEventCaptureOptions {
  recordingId: string | null
  recordingStartTime: number | null
  sessionToken: string | null
  isRecording: boolean
}

export interface UseRecordingEventCaptureReturn {
  captureClick: (frameId: string | null, x: number, y: number, wasHotspot: boolean, triggeredTransition: boolean) => void
  captureNavigation: (fromFrameId: string | null, toFrameId: string, triggeredBy?: string) => void
  captureFrameChange: (fromFrameId: string | null, toFrameId: string) => void
  captureTaskStart: (taskId: string, taskTitle: string) => void
  captureTaskEnd: (taskId: string, taskTitle: string, outcome: string) => void
  /** Capture any custom event type with arbitrary data */
  captureCustomEvent: (eventType: RecordingEventType, data: RecordingEventData) => void
  flush: () => Promise<void>
}

/** Hook for capturing and buffering recording events with periodic API submission */
export function useRecordingEventCapture(options: UseRecordingEventCaptureOptions): UseRecordingEventCaptureReturn {
  const { recordingId, recordingStartTime, sessionToken, isRecording } = options
  const bufferRef = useRef<BufferedEvent[]>([])
  const flushTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFlushingRef = useRef(false)

  const getRelativeTimestamp = useCallback((): number => {
    return recordingStartTime ? Date.now() - recordingStartTime : 0
  }, [recordingStartTime])

  const flush = useCallback(async () => {
    if (!recordingId || !sessionToken || bufferRef.current.length === 0 || isFlushingRef.current) return
    isFlushingRef.current = true
    const eventsToSubmit = [...bufferRef.current]
    bufferRef.current = []
    try {
      await submitRecordingEvents(recordingId, eventsToSubmit, sessionToken)
    } catch {
      bufferRef.current = [...eventsToSubmit, ...bufferRef.current]
    } finally {
      isFlushingRef.current = false
    }
  }, [recordingId, sessionToken])

  const scheduleFlush = useCallback(() => {
    if (flushTimeoutRef.current) return
    flushTimeoutRef.current = setTimeout(() => {
      flushTimeoutRef.current = null
      flush()
    }, FLUSH_INTERVAL_MS)
  }, [flush])

  const addEvent = useCallback((event: BufferedEvent) => {
    if (!isRecording || !recordingId) return
    bufferRef.current.push(event)
    if (bufferRef.current.length >= MAX_BUFFER_SIZE) flush()
    else scheduleFlush()
  }, [isRecording, recordingId, flush, scheduleFlush])

  const captureClick = useCallback((frameId: string | null, x: number, y: number, wasHotspot: boolean, triggeredTransition: boolean) => {
    addEvent({ timestamp_ms: getRelativeTimestamp(), event_type: 'click', data: { frame_id: frameId || undefined, x, y, was_hotspot: wasHotspot, triggered_transition: triggeredTransition } })
  }, [addEvent, getRelativeTimestamp])

  const captureNavigation = useCallback((fromFrameId: string | null, toFrameId: string, triggeredBy?: string) => {
    addEvent({ timestamp_ms: getRelativeTimestamp(), event_type: 'navigation', data: { from_frame_id: fromFrameId, to_frame_id: toFrameId, triggered_by: triggeredBy || 'hotspot_click' } })
  }, [addEvent, getRelativeTimestamp])

  const captureFrameChange = useCallback((fromFrameId: string | null, toFrameId: string) => {
    addEvent({ timestamp_ms: getRelativeTimestamp(), event_type: 'frame_change', data: { from_frame_id: fromFrameId, to_frame_id: toFrameId } })
  }, [addEvent, getRelativeTimestamp])

  const captureTaskStart = useCallback((taskId: string, taskTitle: string) => {
    addEvent({ timestamp_ms: getRelativeTimestamp(), event_type: 'task_start', data: { task_id: taskId, task_title: taskTitle } })
  }, [addEvent, getRelativeTimestamp])

  const captureTaskEnd = useCallback((taskId: string, taskTitle: string, outcome: string) => {
    addEvent({ timestamp_ms: getRelativeTimestamp(), event_type: 'task_end', data: { task_id: taskId, task_title: taskTitle, outcome } })
  }, [addEvent, getRelativeTimestamp])

  /** Capture any custom event type with arbitrary data */
  const captureCustomEvent = useCallback((eventType: RecordingEventType, data: RecordingEventData) => {
    addEvent({ timestamp_ms: getRelativeTimestamp(), event_type: eventType, data })
  }, [addEvent, getRelativeTimestamp])

  useEffect(() => {
    return () => {
      if (flushTimeoutRef.current) clearTimeout(flushTimeoutRef.current)
      if (bufferRef.current.length > 0 && recordingId && sessionToken) {
        submitRecordingEvents(recordingId, bufferRef.current, sessionToken).catch(() => {})
      }
    }
  }, [recordingId, sessionToken])

  useEffect(() => {
    if (!isRecording && bufferRef.current.length > 0) flush()
  }, [isRecording, flush])

  return { captureClick, captureNavigation, captureFrameChange, captureTaskStart, captureTaskEnd, captureCustomEvent, flush }
}
