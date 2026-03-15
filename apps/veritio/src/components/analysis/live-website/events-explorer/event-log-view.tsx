'use client'

import { useState, useMemo, memo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react'
import { EventFiltersBar, type EventFilters } from './event-filters'
import {
  formatTimestamp,
  truncateUrl,
  cleanUrl,
  getClickLabel,
  getScrollDepth,
} from './utils'
import {
  resolveParticipantDisplay,
  extractDemographicsFromMetadata,
} from '@/lib/utils/participant-display'
import type {
  LiveWebsiteEvent,
  LiveWebsiteTask,
} from '@/app/(dashboard)/projects/[projectId]/studies/[studyId]/results/types'
import type { Participant } from '@veritio/study-types'
import type { ParticipantDisplaySettings } from '@veritio/study-types/study-flow-types'
import type { SemanticLabelsData } from '@/hooks/use-live-website-semantic-labels'

const ITEMS_PER_PAGE = 50

const EVENT_TYPE_CONFIG: Record<string, { label: string; className?: string }> = {
  click: { label: 'Click' },
  navigation: { label: 'Navigation' },
  page_view: { label: 'Page View' },
  rage_click: { label: 'Rage Click', className: 'text-red-600 dark:text-red-400 font-medium' },
  scroll: { label: 'Scroll' },
  form_change: { label: 'Form Change' },
  task_complete: { label: 'Task Complete' },
  task_start: { label: 'Task Start' },
  path_success: { label: 'Path Success', className: 'text-green-600 dark:text-green-400 font-medium' },
  path_failure: { label: 'Path Failure', className: 'text-red-600 dark:text-red-400 font-medium' },
}

const METADATA_HIDDEN_KEYS = new Set([
  'task_id', 'taskId', 'participant_id', 'participantId',
  'event_type', 'eventType', 'elementText', 'elementTag', 'elementAriaLabel',
])

const METADATA_LABELS: Record<string, string> = {
  scrollPercentage: 'Scroll Depth',
  scroll_depth: 'Scroll Depth',
  scrollDepth: 'Scroll Depth',
  stepsTotal: 'Total Steps',
  steps_total: 'Total Steps',
  stepsMatched: 'Steps Matched',
  steps_matched: 'Steps Matched',
}

const SCROLL_KEYS = /scroll|depth|percentage/i

interface EventLogViewProps {
  events: LiveWebsiteEvent[]
  tasks: LiveWebsiteTask[]
  participants: Participant[]
  displaySettings?: ParticipantDisplaySettings | null
  semanticLabels?: SemanticLabelsData | null
  selectedParticipantId?: string
  onSelectedParticipantChange?: (id: string) => void
}

function EventLogViewBase({
  events,
  tasks,
  participants,
  displaySettings,
  semanticLabels,
  selectedParticipantId,
  onSelectedParticipantChange,
}: EventLogViewProps) {
  const eventLabels = semanticLabels?.status === 'completed' ? semanticLabels.event_labels : null
  const [page, setPage] = useState(0)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [filters, setFilters] = useState<EventFilters>({
    eventTypes: new Set(['click', 'navigation', 'rage_click', 'scroll', 'form_change']),
    taskId: 'all',
    pageUrlFilter: '',
  })

  const taskMap = useMemo(() => new Map(tasks.map(t => [t.id, t])), [tasks])

  const participantDisplayMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof resolveParticipantDisplay>>()
    participants.forEach((p, i) => {
      const demographics = extractDemographicsFromMetadata(p.metadata)
      map.set(p.id, resolveParticipantDisplay(displaySettings ?? null, { index: i + 1, demographics }))
    })
    return map
  }, [participants, displaySettings])

  const filteredEvents = useMemo(() => {
    let result = events

    if (filters.eventTypes.size > 0 && filters.eventTypes.size < 5) {
      result = result.filter(e => filters.eventTypes.has(e.event_type))
    }
    if (filters.taskId !== 'all') {
      result = result.filter(e => e.task_id === filters.taskId)
    }
    if (selectedParticipantId) {
      result = result.filter(e => e.participant_id === selectedParticipantId)
    }
    if (filters.pageUrlFilter.trim()) {
      const search = filters.pageUrlFilter.toLowerCase()
      result = result.filter(e => e.page_url?.toLowerCase().includes(search))
    }

    return [...result].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }, [events, filters, selectedParticipantId])

  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / ITEMS_PER_PAGE))
  const pageEvents = useMemo(
    () => filteredEvents.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE),
    [filteredEvents, page]
  )

  const handleFiltersChange = useCallback((next: EventFilters) => {
    setFilters(next)
    setPage(0)
    setExpandedIds(new Set())
  }, [])

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  return (
    <div className="space-y-3">
      <EventFiltersBar
        filters={filters}
        onFiltersChange={handleFiltersChange}
        tasks={tasks}
        participants={participants}
        displaySettings={displaySettings}
        selectedParticipantId={selectedParticipantId || ''}
        onSelectedParticipantChange={onSelectedParticipantChange}
      />

      <p className="text-sm text-muted-foreground">
        {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''} found
      </p>

      {filteredEvents.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">No events match the current filters.</p>
        </div>
      ) : (
        <div className="border rounded-lg flex flex-col" style={{ maxHeight: 'calc(100vh - 320px)' }}>
          <div className="overflow-auto flex-1 min-h-0">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-muted/95 backdrop-blur-sm">
                <tr className="border-b">
                  <th className="text-left px-4 py-2.5 font-medium whitespace-nowrap">Timestamp</th>
                  <th className="text-left px-4 py-2.5 font-medium whitespace-nowrap">Participant</th>
                  <th className="text-left px-4 py-2.5 font-medium whitespace-nowrap">Event</th>
                  <th className="text-left px-4 py-2.5 font-medium w-full">Description</th>
                </tr>
              </thead>
              <tbody>
                {pageEvents.map(event => (
                  <EventRow
                    key={event.id}
                    event={event}
                    taskMap={taskMap}
                    participantDisplayMap={participantDisplayMap}
                    isExpanded={expandedIds.has(event.id)}
                    onToggleExpand={toggleExpand}
                    aiLabel={eventLabels?.[event.id] ?? null}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t bg-background px-4 py-2.5 shrink-0">
              <p className="text-sm text-muted-foreground">
                Page {page + 1} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage(p => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface EventRowProps {
  event: LiveWebsiteEvent
  taskMap: Map<string, LiveWebsiteTask>
  participantDisplayMap: Map<string, { primary: string; secondary: string | null }>
  isExpanded: boolean
  onToggleExpand: (id: string) => void
  aiLabel?: string | null
}

const EventRow = memo(function EventRow({
  event,
  taskMap,
  participantDisplayMap,
  isExpanded,
  onToggleExpand,
  aiLabel,
}: EventRowProps) {
  const config = EVENT_TYPE_CONFIG[event.event_type]
  const eventLabel = config?.label
    || event.event_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  const eventClassName = config?.className || ''

  const task = event.task_id ? taskMap.get(event.task_id) : null
  const participantDisplay = event.participant_id ? participantDisplayMap.get(event.participant_id) : null
  const hasMetadata = event.metadata && Object.keys(event.metadata).length > 0

  // Build description — prefer AI label when available
  const descriptionParts: string[] = []
  if (task) descriptionParts.push(task.title)

  if (aiLabel) {
    // AI label replaces both the raw URL and the selector-based description
    descriptionParts.push(aiLabel)
  } else if (event.event_type === 'error') {
    if (event.page_url) descriptionParts.push(truncateUrl(event.page_url, 60))
    const msg = (event.metadata as Record<string, unknown>)?.message
    if (msg) descriptionParts.push(String(msg).slice(0, 80))
  } else {
    if (event.page_url) descriptionParts.push(truncateUrl(event.page_url, 60))
    if (event.event_type === 'scroll') {
      const depth = getScrollDepth(event.metadata)
      if (depth !== null) descriptionParts.push(`${Math.round(depth)}% depth`)
    } else if (event.element_selector || event.metadata) {
      const clickLabel = getClickLabel(event.metadata as Record<string, unknown> | null, event.element_selector)
      if (clickLabel !== 'element') descriptionParts.push(clickLabel)
    }
  }

  // Format metadata for expanded view
  const metadataEntries = useMemo(() => {
    if (!event.metadata) return []
    const meta = event.metadata as Record<string, unknown>
    const entries: { key: string; value: string }[] = []

    // Add resolved task name first if present in metadata
    const rawTaskId = meta.task_id ?? meta.taskId
    if (typeof rawTaskId === 'string') {
      const t = taskMap.get(rawTaskId)
      if (t) entries.push({ key: 'Task', value: t.title })
    }

    for (const [key, value] of Object.entries(meta)) {
      if (value === null || value === undefined) continue
      if (METADATA_HIDDEN_KEYS.has(key)) continue

      const displayKey = METADATA_LABELS[key] || key
        .replace(/([A-Z])/g, ' $1')
        .replace(/[_-]/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase())
        .trim()

      let displayValue: string
      if (key === 'history' && Array.isArray(value)) {
        displayValue = (value as string[]).map(u => cleanUrl(u)).join(' \u2192 ')
      } else if (Array.isArray(value)) {
        displayValue = (value as unknown[]).join(', ')
      } else if (typeof value === 'object') {
        displayValue = JSON.stringify(value)
      } else if (typeof value === 'number' && SCROLL_KEYS.test(key)) {
        displayValue = `${Math.round(value)}%`
      } else {
        const str = String(value)
        // Clean URL-like values (filenames, page URLs in metadata)
        displayValue = str.startsWith('http') || str.startsWith('/') ? cleanUrl(str) : str
      }

      entries.push({ key: displayKey, value: displayValue })
    }

    return entries
  }, [event.metadata, taskMap])

  return (
    <>
      <tr
        className={`border-b last:border-b-0 ${
          hasMetadata
            ? 'cursor-pointer hover:bg-muted/40 border-l-2 border-l-primary/30'
            : 'border-l-2 border-l-transparent'
        } ${isExpanded ? 'bg-muted/20' : ''}`}
        onClick={hasMetadata ? () => onToggleExpand(event.id) : undefined}
      >
        <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground tabular-nums">
          {formatTimestamp(event.timestamp)}
        </td>
        <td className="px-4 py-2.5 whitespace-nowrap">
          {participantDisplay ? participantDisplay.primary : '-'}
        </td>
        <td className={`px-4 py-2.5 whitespace-nowrap ${eventClassName || 'text-muted-foreground'}`}>
          {eventLabel}
        </td>
        <td className="px-4 py-2.5">
          <div className="flex items-center gap-1 min-w-0">
            <span className="truncate">
              {descriptionParts.map((part, i) => (
                <span key={i} className={i > 0 ? 'text-muted-foreground' : ''}>
                  {i > 0 && <span className="mx-1.5 text-muted-foreground/50">&middot;</span>}
                  {part}
                </span>
              ))}
            </span>
            {event.page_url && event.page_url.length > 60 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-muted-foreground/60 cursor-help text-xs shrink-0">...</span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-md break-all">
                    {event.page_url}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {hasMetadata && (
              <span className="ml-auto shrink-0 pl-2">
                {isExpanded
                  ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                  : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/40" />
                }
              </span>
            )}
          </div>
        </td>
      </tr>
      {isExpanded && hasMetadata && metadataEntries.length > 0 && (
        <tr className="bg-muted/20">
          <td colSpan={4} className="px-4 py-3">
            <div className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm p-3 rounded-md bg-muted/50">
              {metadataEntries.map(entry => (
                <div key={entry.key} className="contents">
                  <span className="text-muted-foreground text-xs font-medium whitespace-nowrap">{entry.key}</span>
                  <span className="text-sm break-all">{entry.value}</span>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  )
})

export const EventLogView = memo(EventLogViewBase)
