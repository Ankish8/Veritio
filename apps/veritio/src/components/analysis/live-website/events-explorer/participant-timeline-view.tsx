'use client'

import { useState, useMemo, memo } from 'react'
import { Badge } from '@/components/ui/badge'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { buildParticipantTimeline, formatTimestamp, getClickLabel, parseElementLabel, truncateUrl } from './utils'
import {
  resolveParticipantDisplay,
  extractDemographicsFromMetadata,
} from '@/lib/utils/participant-display'
import { createParticipantNumberMap, sortParticipantsByDate } from '@/lib/utils/participant-utils'
import type { TimelineSegment, TimelineEvent } from './utils'
import type {
  LiveWebsiteEvent,
  LiveWebsiteTask,
  LiveWebsiteResponse,
} from '@/app/(dashboard)/projects/[projectId]/studies/[studyId]/results/types'
import type { Participant } from '@veritio/study-types'
import type { ParticipantDisplaySettings } from '@veritio/study-types/study-flow-types'
import type { SemanticLabelsData } from '@/hooks/use-live-website-semantic-labels'

const OUTCOME_CONFIG: Record<string, { label: string; color: string }> = {
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800 border-green-200' },
  abandoned: { label: 'Abandoned', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  timed_out: { label: 'Timed Out', color: 'bg-red-100 text-red-800 border-red-200' },
  skipped: { label: 'Skipped', color: 'bg-gray-100 text-gray-800 border-gray-200' },
}

interface ParticipantTimelineViewProps {
  events: LiveWebsiteEvent[]
  tasks: LiveWebsiteTask[]
  participants: Participant[]
  responses: LiveWebsiteResponse[]
  displaySettings?: ParticipantDisplaySettings | null
  semanticLabels?: SemanticLabelsData | null
  selectedParticipantId?: string
  onSelectedParticipantChange?: (id: string) => void
}

function ParticipantTimelineViewBase({
  events,
  tasks,
  participants,
  responses,
  displaySettings,
  semanticLabels,
  selectedParticipantId: controlledParticipantId,
  onSelectedParticipantChange,
}: ParticipantTimelineViewProps) {
  const eventLabels = semanticLabels?.status === 'completed' ? semanticLabels.event_labels : null
  const [internalParticipantId, setInternalParticipantId] = useState<string>('')
  const selectedParticipantId = controlledParticipantId || internalParticipantId
  const setSelectedParticipantId = onSelectedParticipantChange || setInternalParticipantId

  const participantNumberMap = useMemo(() => createParticipantNumberMap(participants), [participants])

  const participantsWithEvents = useMemo(() => {
    const ids = new Set<string>()
    for (const e of events) {
      if (e.participant_id) ids.add(e.participant_id)
    }
    // Sort by started_at descending (latest first)
    return sortParticipantsByDate(participants.filter(p => ids.has(p.id)))
  }, [events, participants])

  const participantOptions = useMemo(() =>
    participantsWithEvents.map(p => {
      const num = participantNumberMap.get(p.id) || 0
      const demographics = extractDemographicsFromMetadata(p.metadata)
      const display = resolveParticipantDisplay(displaySettings ?? null, { index: num, demographics })
      return { value: p.id, label: display.primary + (display.secondary ? ` (${display.secondary})` : '') }
    }),
  [participantsWithEvents, participantNumberMap, displaySettings])

  const effectiveId = selectedParticipantId || participantsWithEvents[0]?.id || ''

  const timeline = useMemo(() => {
    if (!effectiveId) return []
    return buildParticipantTimeline(effectiveId, events, tasks, responses)
  }, [effectiveId, events, tasks, responses])

  if (participantsWithEvents.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">No participant event data available.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium">Participant</label>
        <SearchableSelect
          value={effectiveId}
          onValueChange={setSelectedParticipantId}
          options={participantOptions}
          placeholder="Select participant..."
          searchPlaceholder="Search participants..."
          className="w-64"
        />
      </div>

      {timeline.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">No events for this participant.</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          {timeline.map((segment, si) => (
            <SegmentBlock
              key={segment.taskId || `between-${si}`}
              segment={segment}
              isLast={si === timeline.length - 1}
              eventLabels={eventLabels}
            />
          ))}
        </div>
      )}
    </div>
  )
}

const SegmentBlock = memo(function SegmentBlock({
  segment,
  isLast,
  eventLabels,
}: {
  segment: TimelineSegment
  isLast: boolean
  eventLabels?: Record<string, string> | null
}) {
  const outcomeConfig = segment.outcome ? OUTCOME_CONFIG[segment.outcome] : null

  return (
    <div className={!isLast ? 'border-b' : ''}>
      {/* Segment header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-muted/30">
        <h4 className="text-sm font-semibold">{segment.taskTitle}</h4>
        {outcomeConfig && (
          <Badge variant="outline" className={outcomeConfig.color}>
            {outcomeConfig.label}
          </Badge>
        )}
      </div>

      {/* Events list */}
      <div className="px-4">
        {segment.events.map((event, ei) => (
          <TimelineEventRow
            key={event.id}
            event={event}
            isLast={ei === segment.events.length - 1}
            aiLabel={eventLabels?.[event.id] ?? null}
          />
        ))}
      </div>
    </div>
  )
})

const TimelineEventRow = memo(function TimelineEventRow({
  event,
  isLast,
  aiLabel,
}: {
  event: TimelineEvent
  isLast: boolean
  aiLabel?: string | null
}) {
  const isRageClick = event.eventType === 'rage_click'
  const isNavigation = event.eventType === 'navigation' || event.eventType === 'page_view'
  const hasAiLabel = !!aiLabel

  let description: string
  let descriptionClass = ''

  if (hasAiLabel) {
    // Use AI-generated semantic label
    description = aiLabel
    if (isRageClick) descriptionClass = 'text-red-700 dark:text-red-400 font-medium'
    else if (isNavigation) descriptionClass = 'text-green-700 dark:text-green-400 font-medium'
  } else if (isNavigation && event.pageUrl) {
    description = `Navigated to ${truncateUrl(event.pageUrl, 50)}`
    descriptionClass = 'text-green-700 dark:text-green-400 font-medium'
  } else if (event.eventType === 'scroll') {
    const depth = event.scrollDepth !== null ? ` to ${Math.round(event.scrollDepth)}%` : ''
    const count = event.count > 1 ? ` (${event.count} events)` : ''
    description = `Scrolled${depth}${count}`
  } else if (event.eventType === 'click' || isRageClick) {
    const label = getClickLabel(event.metadata, event.elementSelector)
    const isModalClick = (event.metadata as Record<string, unknown>)?.isModal === true
    const typeLabel = isRageClick ? 'Rage clicked' : 'Clicked'
    const modalSuffix = isModalClick ? ' (modal)' : ''
    description = event.count > 1 ? `${typeLabel} ${label}${modalSuffix} x${event.count}` : `${typeLabel} ${label}${modalSuffix}`
    if (isRageClick) descriptionClass = 'text-red-700 dark:text-red-400 font-medium'
  } else if (event.eventType === 'form_change') {
    const label = event.elementSelector ? parseElementLabel(event.elementSelector) : 'field'
    description = `Changed ${label}`
  } else if (event.eventType === 'error') {
    const msg = (event.metadata as Record<string, unknown>)?.message
    description = msg ? `JS Error: ${String(msg).slice(0, 80)}` : 'JS Error'
    descriptionClass = 'text-red-600 dark:text-red-400'
  } else {
    description = event.eventType
  }

  let dotColor = 'bg-muted-foreground/40'
  if (isNavigation) dotColor = 'bg-green-500'
  else if (isRageClick) dotColor = 'bg-red-500'

  return (
    <div
      className="grid items-start"
      style={{ gridTemplateColumns: '8px 1fr' }}
    >
      {/* Timeline rail: line + dot + line */}
      <div className="flex flex-col items-center justify-self-center h-full">
        <div className="w-px grow bg-border" />
        <div className={`w-2 h-2 rounded-full shrink-0 my-1 ${dotColor}`} />
        <div className={`w-px grow ${isLast ? 'bg-transparent' : 'bg-border'}`} />
      </div>

      {/* Content row */}
      <div className={`flex items-baseline gap-4 py-2.5 pl-3 ${isRageClick ? 'bg-red-50/50 dark:bg-red-950/10 rounded' : ''}`}>
        <span className="text-sm text-muted-foreground shrink-0 tabular-nums">
          {formatTimestamp(event.timestamp)}
        </span>
        <span className={`text-sm ${descriptionClass}`}>
          {description}
        </span>
      </div>
    </div>
  )
})

export const ParticipantTimelineView = memo(ParticipantTimelineViewBase)
