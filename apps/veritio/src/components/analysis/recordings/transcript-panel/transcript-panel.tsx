'use client'

import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { Search, User, ChevronRight, Play, Scissors, X, Check, RefreshCw, MicOff, AlertCircle, FileText } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { TranscriptSegment } from '@/hooks/use-recording'
import { TaskCard } from './task-card'
import type { TaskEvent } from '../task-timeline/task-timeline'

/** Format milliseconds as MM:SS clock format. */
function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

interface EmptyStateMessage {
  title: string
  description: string
}

function getEmptyStateMessage(
  status: TranscriptPanelProps['status'],
  hasRegenerate: boolean
): EmptyStateMessage {
  switch (status) {
    case 'processing':
      return {
        title: 'Transcription in progress',
        description: 'This usually takes 1-2 minutes. The transcript will appear automatically when ready.',
      }
    case 'retrying':
      return {
        title: 'Retrying transcription',
        description: 'Temporary error occurred. Retrying automatically with exponential backoff.',
      }
    case 'no_speech_detected':
      return {
        title: 'No speech detected',
        description: hasRegenerate
          ? 'No spoken words were found. This can happen if the live transcription had connectivity issues. Try regenerating to re-process the full audio.'
          : 'The audio was processed successfully, but no spoken words were found. Check that your microphone was working and you spoke during the recording.',
      }
    case 'failed':
      return {
        title: 'Transcription failed',
        description: hasRegenerate
          ? 'Something went wrong during transcription. You can try regenerating it.'
          : 'Unable to transcribe this recording. Check the error message for details.',
      }
    case 'pending':
      return {
        title: 'Transcription queued',
        description: 'Waiting for transcription to start...',
      }
    default:
      return {
        title: 'No transcript available',
        description: 'Transcription may still be processing or no audio was captured.',
      }
  }
}

/** Selected segment range for clip creation */
export interface TranscriptClipSelection {
  /** Start time in ms (from first selected segment) */
  startMs: number
  /** End time in ms (from last selected segment) */
  endMs: number
  /** Selected segment indices */
  segmentIndices: number[]
  /** Combined text from selected segments */
  text: string
}

export interface TranscriptPanelProps {
  /** Transcript segments with timestamps */
  segments: TranscriptSegment[]
  /** Current playback time in milliseconds */
  currentTime: number
  /** Callback when segment is clicked */
  onSegmentClick: (startTime: number) => void
  /** Loading state */
  isLoading?: boolean
  /** Transcript status for better empty state messages */
  status?: 'pending' | 'processing' | 'retrying' | 'completed' | 'no_speech_detected' | 'failed'
  /** Callback to collapse the transcript panel */
  onCollapse?: () => void
  /** Detected/used language for transcription */
  language?: string
  /** Word count for display */
  wordCount?: number
  /** Enable segment selection mode for clip creation */
  selectionMode?: boolean
  /** Callback when selection mode is toggled */
  onSelectionModeChange?: (enabled: boolean) => void
  /** Callback when selection is confirmed for clip creation */
  onCreateClipFromSelection?: (selection: TranscriptClipSelection) => void
  /** Task events to display inline with transcript (optional) */
  taskEvents?: TaskEvent[]
  /** Callback to regenerate transcript (batch re-transcription) */
  onRegenerate?: () => Promise<void>
}

/** Header bar shared between the empty-state and populated-state branches. */
function TranscriptHeader({
  onCollapse,
  wordCount,
  language,
  selectionMode,
  onSelectionModeChange,
  onCreateClipFromSelection,
}: {
  onCollapse: () => void
  wordCount?: number
  language?: string
  selectionMode?: boolean
  onSelectionModeChange?: (enabled: boolean) => void
  onCreateClipFromSelection?: (selection: TranscriptClipSelection) => void
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-medium">Transcript</h3>
        {wordCount !== undefined && wordCount > 0 && (
          <span className="text-xs text-muted-foreground">
            ({wordCount.toLocaleString()} words)
          </span>
        )}
        {language && language !== 'en' && (
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {language.toUpperCase()}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {onSelectionModeChange && onCreateClipFromSelection && (
          <Button
            variant={selectionMode ? 'default' : 'outline'}
            size="sm"
            onClick={() => onSelectionModeChange(!selectionMode)}
            className="h-7 text-xs"
          >
            <Scissors className="h-3 w-3 mr-1" />
            {selectionMode ? 'Selecting...' : 'Create Clip'}
          </Button>
        )}
        <button
          onClick={onCollapse}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-all border border-transparent hover:border-border group"
          aria-label="Collapse transcript"
          title="Collapse transcript panel"
        >
          <span>Collapse</span>
          <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  )
}

/** Single transcript segment row, used in both search results and main timeline. */
function TranscriptSegmentItem({
  segment,
  isActive,
  isSelected,
  selectionMode,
  hasMultipleSpeakers,
  segmentRef,
  searchQuery,
  onClick,
}: {
  segment: TranscriptSegment
  isActive: boolean
  isSelected: boolean
  selectionMode: boolean
  hasMultipleSpeakers: boolean
  segmentRef?: React.Ref<HTMLDivElement>
  searchQuery?: string
  onClick: (e: React.MouseEvent) => void
}) {
  return (
    <div
      ref={segmentRef}
      onClick={onClick}
      className={cn(
        'group relative p-3 rounded-lg cursor-pointer transition-all',
        selectionMode && isSelected
          ? 'bg-accent border border-foreground/20 shadow-sm'
          : selectionMode
          ? 'hover:bg-muted/50 border border-dashed border-muted-foreground/20'
          : isActive
          ? 'bg-accent shadow-sm'
          : 'hover:bg-muted/50'
      )}
      title={selectionMode ? 'Click to select this segment' : 'Click to jump to this moment in the video'}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className={cn(
          "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-mono font-medium transition-colors",
          isActive
            ? "bg-foreground/10 text-foreground"
            : "bg-muted text-muted-foreground group-hover:bg-foreground/5 group-hover:text-foreground"
        )}>
          <Play className="h-3 w-3" />
          {formatTime(segment.start)}
        </div>
        {segment.speaker && hasMultipleSpeakers && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            <span>{segment.speaker}</span>
          </div>
        )}
      </div>
      {searchQuery ? (
        <p className="text-sm leading-relaxed">
          {segment.text.split(new RegExp(`(${searchQuery})`, 'gi')).map((part, i) =>
            part.toLowerCase() === searchQuery.toLowerCase() ? (
              <mark key={i} className="bg-yellow-200 dark:bg-yellow-900">
                {part}
              </mark>
            ) : (
              <span key={i}>{part}</span>
            )
          )}
        </p>
      ) : (
        <p className="text-sm leading-relaxed">{segment.text}</p>
      )}
    </div>
  )
}

/**
 * Transcript panel with synchronized highlighting and click-to-seek.
 *
 * Features:
 * - Auto-scroll to current segment (pauses when user is manually scrolling)
 * - Click segment to jump to timestamp
 * - Search within transcript
 * - Speaker labels (if diarization enabled)
 */
export function TranscriptPanel({
  segments,
  currentTime,
  onSegmentClick,
  isLoading = false,
  status,
  onCollapse,
  language,
  wordCount,
  selectionMode = false,
  onSelectionModeChange,
  onCreateClipFromSelection,
  taskEvents = [],
  onRegenerate,
}: TranscriptPanelProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isRegenerating, setIsRegenerating] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const activeSegmentRef = useRef<HTMLDivElement>(null)
  const isUserScrollingRef = useRef(false)
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Segment selection state (for clip creation)
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set())

  // Merge transcript segments and task events chronologically
  type TimelineItem =
    | { type: 'segment'; data: TranscriptSegment; originalIndex: number }
    | { type: 'task'; data: TaskEvent }

  const mergedTimeline = useMemo((): TimelineItem[] => {
    const items: TimelineItem[] = []

    // Add all segments with their original indices
    segments.forEach((segment, index) => {
      items.push({ type: 'segment', data: segment, originalIndex: index })
    })

    // Add all task events
    taskEvents.forEach((task) => {
      items.push({ type: 'task', data: task })
    })

    // Sort by timestamp (segments use .start, tasks use .timestamp_ms)
    items.sort((a, b) => {
      const timeA = a.type === 'segment' ? a.data.start : a.data.timestamp_ms
      const timeB = b.type === 'segment' ? b.data.start : b.data.timestamp_ms
      return timeA - timeB
    })

    return items
  }, [segments, taskEvents])

  // Reset selection when selection mode changes
  useEffect(() => {
    if (!selectionMode) {
      setSelectedIndices(new Set())
    }
  }, [selectionMode])

  // Check if there are multiple speakers (only show labels if >1 speaker)
  const uniqueSpeakers = useMemo(() => {
    const speakers = new Set(segments.map(s => s.speaker).filter(Boolean))
    return speakers.size
  }, [segments])
  const hasMultipleSpeakers = uniqueSpeakers > 1

  // Find active segment based on current time
  const activeSegmentIndex = segments.findIndex(
    (seg, idx) => {
      const nextSeg = segments[idx + 1]
      return currentTime >= seg.start && (!nextSeg || currentTime < nextSeg.start)
    }
  )

  // Calculate selection summary
  const selectionSummary = useMemo((): TranscriptClipSelection | null => {
    if (selectedIndices.size === 0) return null

    const sortedIndices = Array.from(selectedIndices).sort((a, b) => a - b)
    const firstIdx = sortedIndices[0]
    const lastIdx = sortedIndices[sortedIndices.length - 1]

    const firstSegment = segments[firstIdx]
    const lastSegment = segments[lastIdx]

    if (!firstSegment || !lastSegment) return null

    // End time: use next segment's start or add estimate based on text length
    const nextSegment = segments[lastIdx + 1]
    const endMs = nextSegment
      ? nextSegment.start
      : lastSegment.start + Math.min(lastSegment.text.split(' ').length * 300, 10000)

    // Combine text from all selected segments
    const text = sortedIndices
      .map(idx => segments[idx]?.text || '')
      .join(' ')

    return {
      startMs: firstSegment.start,
      endMs,
      segmentIndices: sortedIndices,
      text,
    }
  }, [selectedIndices, segments])

  // Toggle segment selection
  const handleSegmentToggle = useCallback((index: number) => {
    setSelectedIndices(prev => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }, [])

  // Range select (shift+click)
  const handleRangeSelect = useCallback((index: number) => {
    setSelectedIndices(prev => {
      const sorted = Array.from(prev).sort((a, b) => a - b)
      if (sorted.length === 0) {
        return new Set([index])
      }

      // Extend from nearest selected to clicked
      const minIdx = Math.min(sorted[0], index)
      const maxIdx = Math.max(sorted[sorted.length - 1], index)

      const next = new Set<number>()
      for (let i = minIdx; i <= maxIdx; i++) {
        next.add(i)
      }
      return next
    })
  }, [])

  // Handle segment click in selection mode vs normal mode
  const handleSegmentClick = useCallback((index: number, e: React.MouseEvent) => {
    if (selectionMode) {
      if (e.shiftKey) {
        handleRangeSelect(index)
      } else {
        handleSegmentToggle(index)
      }
    } else {
      onSegmentClick(segments[index]?.start || 0)
    }
  }, [selectionMode, handleRangeSelect, handleSegmentToggle, onSegmentClick, segments])

  // Confirm selection for clip creation
  const handleConfirmSelection = useCallback(() => {
    if (selectionSummary && onCreateClipFromSelection) {
      onCreateClipFromSelection(selectionSummary)
      setSelectedIndices(new Set())
      onSelectionModeChange?.(false)
    }
  }, [selectionSummary, onCreateClipFromSelection, onSelectionModeChange])

  // Cancel selection
  const handleCancelSelection = useCallback(() => {
    setSelectedIndices(new Set())
    onSelectionModeChange?.(false)
  }, [onSelectionModeChange])

  const handleRegenerate = useCallback(async () => {
    if (!onRegenerate || isRegenerating) return
    setIsRegenerating(true)
    try {
      await onRegenerate()
    } finally {
      setIsRegenerating(false)
    }
  }, [onRegenerate, isRegenerating])

  // Track manual scrolling to avoid fighting the user
  useEffect(() => {
    const scrollEl = scrollAreaRef.current
    if (!scrollEl) return

    function handleScroll() {
      isUserScrollingRef.current = true
      clearTimeout(scrollTimeoutRef.current)
      scrollTimeoutRef.current = setTimeout(() => {
        isUserScrollingRef.current = false
      }, 3000)
    }

    scrollEl.addEventListener('wheel', handleScroll, { passive: true })
    scrollEl.addEventListener('touchmove', handleScroll, { passive: true })
    return () => {
      scrollEl.removeEventListener('wheel', handleScroll)
      scrollEl.removeEventListener('touchmove', handleScroll)
      clearTimeout(scrollTimeoutRef.current)
    }
  }, [])

  // Auto-scroll to active segment (only when user is not manually scrolling)
  useEffect(() => {
    if (isUserScrollingRef.current) return
    if (activeSegmentRef.current && scrollAreaRef.current) {
      activeSegmentRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }
  }, [activeSegmentIndex])

  // Filter segments by search query
  const filteredSegments = searchQuery
    ? segments.filter(seg =>
        seg.text.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : segments

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-muted-foreground">Loading transcript...</p>
      </div>
    )
  }

  if (segments.length === 0) {
    const emptyStateMessage = getEmptyStateMessage(status, !!onRegenerate)

    return (
      <div className="flex flex-col h-full">
        {onCollapse && (
          <TranscriptHeader
            onCollapse={onCollapse}
            wordCount={wordCount}
            language={language}
          />
        )}

        {/* Empty state content */}
        <div className="flex items-center justify-center flex-1 p-6">
          <div className="text-center space-y-3 max-w-xs">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              {(status === 'processing' || status === 'retrying' || status === 'pending') ? (
                <svg className="animate-spin h-5 w-5 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : status === 'no_speech_detected' ? (
                <MicOff className="h-5 w-5 text-muted-foreground" />
              ) : status === 'failed' ? (
                <AlertCircle className="h-5 w-5 text-muted-foreground" />
              ) : (
                <FileText className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">{emptyStateMessage.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {emptyStateMessage.description}
              </p>
            </div>
            {onRegenerate && (status === 'no_speech_detected' || status === 'failed') && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRegenerate}
                disabled={isRegenerating}
                className="mt-2"
              >
                <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", isRegenerating && "animate-spin")} />
                {isRegenerating ? 'Regenerating...' : 'Regenerate Transcript'}
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {onCollapse && (
        <TranscriptHeader
          onCollapse={onCollapse}
          wordCount={wordCount}
          language={language}
          selectionMode={selectionMode}
          onSelectionModeChange={onSelectionModeChange}
          onCreateClipFromSelection={onCreateClipFromSelection}
        />
      )}

      {/* Selection summary bar (when segments are selected) */}
      {selectionMode && selectionSummary && (
        <div className="px-4 py-2 border-b bg-primary/5 flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-primary">
              {selectedIndices.size} segment{selectedIndices.size !== 1 ? 's' : ''} selected
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {formatTime(selectionSummary.startMs)} - {formatTime(selectionSummary.endMs)}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancelSelection}
              className="h-7 text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleConfirmSelection}
              className="h-7 text-xs"
            >
              <Check className="h-3 w-3 mr-1" />
              Create Clip
            </Button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="p-4 border-b space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search transcript..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        {searchQuery ? (
          <p className="text-xs text-muted-foreground">
            {filteredSegments.length} of {segments.length} segments
          </p>
        ) : selectionMode ? (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Scissors className="h-3 w-3" />
            Click segments to select. Hold Shift to select a range.
          </p>
        ) : null}
      </div>

      {/* Segments & Tasks (merged timeline or filtered segments) */}
      <ScrollArea className="flex-1" ref={scrollAreaRef}>
        <div className="p-4 space-y-1">
          {searchQuery ? (
            filteredSegments.map((segment, idx) => {
              const realIndex = segments.indexOf(segment)
              const isActive = realIndex === activeSegmentIndex && !selectionMode

              return (
                <TranscriptSegmentItem
                  key={`search-${segment.start}-${idx}`}
                  segment={segment}
                  isActive={isActive}
                  isSelected={selectedIndices.has(realIndex)}
                  selectionMode={selectionMode}
                  hasMultipleSpeakers={hasMultipleSpeakers}
                  segmentRef={isActive ? activeSegmentRef : undefined}
                  searchQuery={searchQuery}
                  onClick={(e) => handleSegmentClick(realIndex, e)}
                />
              )
            })
          ) : (
            mergedTimeline.map((item, idx) => {
              if (item.type === 'task') {
                const task = item.data
                const isTaskActive = currentTime >= task.timestamp_ms &&
                  currentTime < task.timestamp_ms + 1000

                return (
                  <TaskCard
                    key={`task-${task.task_id}-${idx}`}
                    task={task}
                    onClick={() => onSegmentClick(task.timestamp_ms)}
                    isActive={isTaskActive}
                  />
                )
              }

              const segment = item.data
              const realIndex = item.originalIndex
              const isActive = realIndex === activeSegmentIndex && !selectionMode

              return (
                <TranscriptSegmentItem
                  key={`segment-${segment.start}-${idx}`}
                  segment={segment}
                  isActive={isActive}
                  isSelected={selectedIndices.has(realIndex)}
                  selectionMode={selectionMode}
                  hasMultipleSpeakers={hasMultipleSpeakers}
                  segmentRef={isActive ? activeSegmentRef : undefined}
                  onClick={(e) => handleSegmentClick(realIndex, e)}
                />
              )
            })
          )}
        </div>
      </ScrollArea>

      {/* Subtle regenerate option at the bottom when transcript exists */}
      {onRegenerate && segments.length > 0 && (
        <div className="px-4 py-2 border-t">
          <button
            onClick={handleRegenerate}
            disabled={isRegenerating}
            className="flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3 w-3", isRegenerating && "animate-spin")} />
            {isRegenerating ? 'Regenerating...' : 'Regenerate transcript'}
          </button>
        </div>
      )}
    </div>
  )
}
