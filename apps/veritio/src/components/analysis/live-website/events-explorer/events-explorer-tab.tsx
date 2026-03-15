'use client'

import { useState, useMemo, memo, useEffect } from 'react'
import { SegmentedControl, type SegmentedControlOption } from '@/components/ui/segmented-control'
import { ParticipantTimelineView } from './participant-timeline-view'
import { EventLogView } from './event-log-view'
import type {
  LiveWebsiteEvent,
  LiveWebsiteTask,
  LiveWebsiteResponse,
} from '@/app/(dashboard)/projects/[projectId]/studies/[studyId]/results/types'
import type { Participant } from '@veritio/study-types'
import type { ParticipantDisplaySettings } from '@veritio/study-types/study-flow-types'
import type { SemanticLabelsData } from '@/hooks/use-live-website-semantic-labels'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { RefreshCw, Loader2 } from 'lucide-react'
import { sortParticipantsByDate } from '@/lib/utils/participant-utils'

type ViewMode = 'timeline' | 'event-log'

const VIEW_OPTIONS: SegmentedControlOption<ViewMode>[] = [
  { value: 'timeline', label: 'Timeline' },
  { value: 'event-log', label: 'Event Log' },
]

interface EventsExplorerTabProps {
  events: LiveWebsiteEvent[]
  tasks: LiveWebsiteTask[]
  participants: Participant[]
  responses: LiveWebsiteResponse[]
  trackingMode: string
  filteredParticipantIds?: Set<string> | null
  displaySettings?: ParticipantDisplaySettings | null
  semanticLabels?: SemanticLabelsData | null
  onRegenerateLabels?: (participantId?: string) => void
}

function EventsExplorerTabBase({
  events,
  tasks,
  participants,
  responses,
  trackingMode,
  filteredParticipantIds,
  displaySettings,
  semanticLabels,
  onRegenerateLabels,
}: EventsExplorerTabProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('timeline')
  const [selectedParticipantId, setSelectedParticipantId] = useState<string>('')

  // Default to the latest participant by started_at
  useEffect(() => {
    if (selectedParticipantId || participants.length === 0) return
    const sorted = sortParticipantsByDate(participants)
    setSelectedParticipantId(sorted[0].id) // eslint-disable-line react-hooks/set-state-in-effect
  }, [selectedParticipantId, participants])

  const isProcessing = semanticLabels?.status === 'processing'

  // Pre-filter by participant segment
  const segmentFiltered = useMemo(() => {
    if (!filteredParticipantIds) return events
    return events.filter(e => e.participant_id && filteredParticipantIds.has(e.participant_id))
  }, [events, filteredParticipantIds])

  // Empty state for URL-only tracking
  if (trackingMode === 'url_only') {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <h3 className="font-medium text-lg mb-2">Events Explorer Unavailable</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Behavioral event data requires Snippet or Proxy tracking mode. URL-only tracking does not capture detailed events.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Events Explorer</h2>
        <div className="flex items-center gap-2">
          {onRegenerateLabels && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRegenerateLabels?.(selectedParticipantId || undefined)}
                    disabled={isProcessing}
                    className="h-8 w-8 p-0"
                  >
                    {isProcessing
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <RefreshCw className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Regenerate AI labels</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <SegmentedControl
            options={VIEW_OPTIONS}
            value={viewMode}
            onValueChange={v => setViewMode(v as ViewMode)}
            size="default"
          />
        </div>
      </div>

      {viewMode === 'timeline' && (
        <ParticipantTimelineView
          events={segmentFiltered}
          tasks={tasks}
          participants={participants}
          responses={responses}
          displaySettings={displaySettings}
          semanticLabels={semanticLabels}
          selectedParticipantId={selectedParticipantId}
          onSelectedParticipantChange={setSelectedParticipantId}
        />
      )}

      {viewMode === 'event-log' && (
        <EventLogView
          events={segmentFiltered}
          tasks={tasks}
          participants={participants}
          displaySettings={displaySettings}
          semanticLabels={semanticLabels}
          selectedParticipantId={selectedParticipantId}
          onSelectedParticipantChange={setSelectedParticipantId}
        />
      )}
    </div>
  )
}

export const EventsExplorerTab = memo(EventsExplorerTabBase)
