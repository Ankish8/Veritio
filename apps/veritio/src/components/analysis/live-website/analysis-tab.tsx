'use client'

import { useState, useMemo, useCallback, memo, useTransition } from 'react'
import { useAuthFetch, useHeatmapSettings, useSelectionSettings } from '@/hooks'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { ChevronDown, ChevronUp, Check, Plus, List } from 'lucide-react'
import { useSegment } from '@/contexts/segment-context'
import { CreateSegmentModal } from '../card-sort/participants/create-segment-modal'
import { useLiveWebsiteSemanticLabels } from '@/hooks/use-live-website-semantic-labels'
import { TaskResultsTab } from './task-results/task-results-tab'
import { NavigationPathsTab } from './navigation-paths/navigation-paths-tab'
import { ClickMapsTab } from './click-maps/click-maps-tab'
import { EventsExplorerTab } from './events-explorer/events-explorer-tab'
import { AttentionMapsTab } from './attention-maps/attention-maps-tab'
import { computeLiveWebsiteMetrics } from '@/services/results/live-website-overview'
import type {
  Participant,
  SegmentConditionsV2,
  StudyFlowQuestionRow,
  StudyFlowResponseRow,
} from '@veritio/study-types'
import type { ParticipantDisplaySettings } from '@veritio/study-types/study-flow-types'
import type { LiveWebsiteMetrics } from '@/services/results/live-website-overview'
import type {
  LiveWebsiteTask,
  LiveWebsiteResponse,
  LiveWebsitePostTaskResponse,
  LiveWebsiteEvent,
  LiveWebsitePageScreenshot,
} from '@/app/(dashboard)/projects/[projectId]/studies/[studyId]/results/types'

export interface AnalysisVariantComparison {
  primaryName: string
  compareName: string
  primaryMetrics: LiveWebsiteMetrics
  compareMetrics: LiveWebsiteMetrics
  primaryResponses: LiveWebsiteResponse[]
  compareResponses: LiveWebsiteResponse[]
  primaryEvents: LiveWebsiteEvent[]
  compareEvents: LiveWebsiteEvent[]
  primaryParticipants: Participant[]
  compareParticipants: Participant[]
  primaryPostTaskResponses: LiveWebsitePostTaskResponse[]
  comparePostTaskResponses: LiveWebsitePostTaskResponse[]
}

interface LiveWebsiteAnalysisTabProps {
  studyId: string
  tasks: LiveWebsiteTask[]
  responses: LiveWebsiteResponse[]
  postTaskResponses: LiveWebsitePostTaskResponse[]
  events: LiveWebsiteEvent[]
  screenshots: LiveWebsitePageScreenshot[]
  participants: Participant[]
  metrics: LiveWebsiteMetrics
  flowQuestions: StudyFlowQuestionRow[]
  flowResponses: StudyFlowResponseRow[]
  trackingMode: string
  onNavigateToSegments?: () => void
  initialSubTab?: string
  onSubTabChange?: (tab: string) => void
  displaySettings?: ParticipantDisplaySettings | null
  defaultTimeLimitSeconds?: number | null
  variantComparison?: AnalysisVariantComparison
  eyeTrackingEnabled?: boolean
  variants?: Array<{ id: string; name: string; url: string }>
  readOnly?: boolean
}

type AnalysisSubTab = 'task-results' | 'navigation-paths' | 'click-maps' | 'events-explorer' | 'attention-maps'

function LiveWebsiteAnalysisTabBase({
  studyId,
  tasks,
  responses,
  postTaskResponses,
  events,
  screenshots,
  participants,
  metrics,
  trackingMode,
  onNavigateToSegments,
  initialSubTab = 'task-results',
  onSubTabChange,
  displaySettings,
  defaultTimeLimitSeconds,
  variantComparison,
  eyeTrackingEnabled,
  variants,
  readOnly,
}: LiveWebsiteAnalysisTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<AnalysisSubTab>(initialSubTab as AnalysisSubTab)
  const [isPending, startTransition] = useTransition()
  const [segmentDropdownOpen, setSegmentDropdownOpen] = useState(false)
  const [showCreateSegmentModal, setShowCreateSegmentModal] = useState(false)

  // Skip auth-dependent hooks in readOnly/public mode
  const { labels: semanticLabels, regenerate: regenerateLabels } = useLiveWebsiteSemanticLabels(readOnly ? null : studyId)

  const authFetch = useAuthFetch()

  const {
    savedSegments,
    activeSegmentId,
    applySegment,
    clearSegment,
    filteredParticipantIds,
    availableQuestions,
    availableUrlTags,
    timeRange,
    setSavedSegments,
  } = useSegment()

  const activeSegment = savedSegments.find(s => s.id === activeSegmentId)

  const [clickMapsDisplayMode, setClickMapsDisplayMode] = useState<'heatmap' | 'selection'>('heatmap')
  const { settings: heatmapSettings, setSettings: setHeatmapSettings } = useHeatmapSettings()
  const { settings: selectionSettings, setSettings: setSelectionSettings } = useSelectionSettings()

  const handleSubTabChange = (tab: string) => {
    startTransition(() => {
      setActiveSubTab(tab as AnalysisSubTab)
    })
    onSubTabChange?.(tab)
  }

  const filteredResponses = useMemo(() => {
    if (!filteredParticipantIds) return responses
    return responses.filter(r => filteredParticipantIds.has(r.participant_id))
  }, [responses, filteredParticipantIds])

  const filteredEvents = useMemo(() => {
    if (!filteredParticipantIds) return events
    return events.filter(e => e.participant_id && filteredParticipantIds.has(e.participant_id))
  }, [events, filteredParticipantIds])

  const filteredPostTaskResponses = useMemo(() => {
    if (!filteredParticipantIds) return postTaskResponses
    return postTaskResponses.filter(r => filteredParticipantIds.has(r.participant_id))
  }, [postTaskResponses, filteredParticipantIds])

  const filteredParticipants = useMemo(() => {
    if (!filteredParticipantIds) return participants
    return participants.filter(p => filteredParticipantIds.has(p.id))
  }, [participants, filteredParticipantIds])

  const displayMetrics = useMemo(() => {
    if (!filteredParticipantIds) return metrics
    return computeLiveWebsiteMetrics(tasks, filteredResponses, filteredEvents, filteredParticipants)
  }, [metrics, filteredParticipantIds, tasks, filteredResponses, filteredEvents, filteredParticipants])

  // When comparing variants, compute segment-filtered metrics for each variant separately
  const taskResultsVariantComparison = useMemo(() => {
    if (!variantComparison) return undefined

    // Apply segment filter to each variant's data
    const primaryResponses = filteredParticipantIds
      ? variantComparison.primaryResponses.filter(r => filteredParticipantIds.has(r.participant_id))
      : variantComparison.primaryResponses
    const primaryEvents = filteredParticipantIds
      ? variantComparison.primaryEvents.filter(e => e.participant_id && filteredParticipantIds.has(e.participant_id))
      : variantComparison.primaryEvents
    const primaryParticipants = filteredParticipantIds
      ? variantComparison.primaryParticipants.filter(p => filteredParticipantIds.has(p.id))
      : variantComparison.primaryParticipants
    const primaryPostTaskResponses = filteredParticipantIds
      ? variantComparison.primaryPostTaskResponses.filter(r => filteredParticipantIds.has(r.participant_id))
      : variantComparison.primaryPostTaskResponses

    const compareResponses = filteredParticipantIds
      ? variantComparison.compareResponses.filter(r => filteredParticipantIds.has(r.participant_id))
      : variantComparison.compareResponses
    const compareEvents = filteredParticipantIds
      ? variantComparison.compareEvents.filter(e => e.participant_id && filteredParticipantIds.has(e.participant_id))
      : variantComparison.compareEvents
    const compareParticipants = filteredParticipantIds
      ? variantComparison.compareParticipants.filter(p => filteredParticipantIds.has(p.id))
      : variantComparison.compareParticipants
    const comparePostTaskResponses = filteredParticipantIds
      ? variantComparison.comparePostTaskResponses.filter(r => filteredParticipantIds.has(r.participant_id))
      : variantComparison.comparePostTaskResponses

    const primaryMetrics = filteredParticipantIds
      ? computeLiveWebsiteMetrics(tasks, primaryResponses, primaryEvents, primaryParticipants)
      : variantComparison.primaryMetrics
    const compareMetrics = filteredParticipantIds
      ? computeLiveWebsiteMetrics(tasks, compareResponses, compareEvents, compareParticipants)
      : variantComparison.compareMetrics

    return {
      primaryName: variantComparison.primaryName,
      compareName: variantComparison.compareName,
      primaryTaskMetrics: primaryMetrics.taskMetrics,
      compareTaskMetrics: compareMetrics.taskMetrics,
      primaryResponses,
      compareResponses,
      primaryEvents,
      compareEvents,
      primaryParticipants,
      compareParticipants,
      primaryPostTaskResponses,
      comparePostTaskResponses,
    }
  }, [variantComparison, filteredParticipantIds, tasks])

  const getPostTaskResponses = useCallback((taskId: string) => {
    return filteredPostTaskResponses.filter(r => r.task_id === taskId)
  }, [filteredPostTaskResponses])

  const hasAdvancedTracking = trackingMode !== 'url_only'
  const tabContentClass = `mt-0 transition-opacity duration-150 ${isPending ? 'opacity-80' : ''}`

  const handleCreateSegment = async (
    name: string,
    description: string | null,
    conditions: SegmentConditionsV2
  ) => {
    if (readOnly) return
    const response = await authFetch(`/api/studies/${studyId}/segments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, conditions }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to create segment')
    }

    const segment = await response.json()
    setSavedSegments([...savedSegments, segment])
    setShowCreateSegmentModal(false)
  }

  const segmentDropdown = (
    <DropdownMenu open={segmentDropdownOpen} onOpenChange={setSegmentDropdownOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="min-w-[180px] justify-between">
          <span className="truncate">
            {activeSegment ? activeSegment.name : 'All included participants'}
          </span>
          {segmentDropdownOpen
            ? <ChevronUp className="ml-2 h-4 w-4 shrink-0" />
            : <ChevronDown className="ml-2 h-4 w-4 shrink-0" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        <DropdownMenuItem onClick={clearSegment} className="flex items-center gap-2">
          {activeSegmentId ? <span className="w-4" /> : <Check className="h-4 w-4" />}
          All included participants
        </DropdownMenuItem>
        {savedSegments.map((segment) => (
          <DropdownMenuItem
            key={segment.id}
            onClick={() => applySegment(segment.id)}
            className="flex items-center gap-2"
          >
            {activeSegmentId === segment.id ? <Check className="h-4 w-4" /> : <span className="w-4" />}
            {segment.name}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            setSegmentDropdownOpen(false)
            setShowCreateSegmentModal(true)
          }}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Create segment
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            setSegmentDropdownOpen(false)
            onNavigateToSegments?.()
          }}
          className="flex items-center gap-2"
        >
          <List className="h-4 w-4" />
          View all segments
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  return (
    <>
      <Tabs value={activeSubTab} onValueChange={handleSubTabChange}>
        <div className="sticky top-[52px] z-10 bg-background -mx-4 sm:-mx-6 px-4 sm:px-6 py-2 flex items-center justify-between mb-4">
          <TabsList variant="underline">
            <TabsTrigger variant="underline" value="task-results">
              Task Results
            </TabsTrigger>
            {hasAdvancedTracking && (
              <>
                <TabsTrigger variant="underline" value="navigation-paths">
                  Navigation Paths
                </TabsTrigger>
                <TabsTrigger variant="underline" value="click-maps">
                  Click Maps
                </TabsTrigger>
                <TabsTrigger variant="underline" value="events-explorer">
                  Events Explorer
                </TabsTrigger>
              </>
            )}
            {eyeTrackingEnabled && (
              <TabsTrigger variant="underline" value="attention-maps">
                Attention Maps
              </TabsTrigger>
            )}
          </TabsList>
          {!readOnly && segmentDropdown}
        </div>

        <TabsContent value="task-results" className={tabContentClass} data-slot="analysis-tab-content">
          <TaskResultsTab
            tasks={tasks}
            taskMetrics={displayMetrics.taskMetrics}
            getPostTaskResponses={getPostTaskResponses}
            trackingMode={trackingMode}
            responses={filteredResponses}
            events={filteredEvents}
            participants={filteredParticipants}
            defaultTimeLimitSeconds={defaultTimeLimitSeconds}
            displaySettings={displaySettings}
            variantComparison={taskResultsVariantComparison}
          />
        </TabsContent>

        {hasAdvancedTracking && (
          <>
            <TabsContent value="navigation-paths" className={tabContentClass} data-slot="analysis-tab-content">
              {taskResultsVariantComparison ? (
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-muted-foreground border-b pb-2">
                      {taskResultsVariantComparison.primaryName} &middot; {taskResultsVariantComparison.primaryParticipants.length} participants
                    </h3>
                    <NavigationPathsTab
                      tasks={tasks}
                      events={taskResultsVariantComparison.primaryEvents}
                      responses={taskResultsVariantComparison.primaryResponses}
                      participants={taskResultsVariantComparison.primaryParticipants}
                      screenshots={screenshots}
                      displaySettings={displaySettings}
                    />
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-muted-foreground border-b pb-2">
                      {taskResultsVariantComparison.compareName} &middot; {taskResultsVariantComparison.compareParticipants.length} participants
                    </h3>
                    <NavigationPathsTab
                      tasks={tasks}
                      events={taskResultsVariantComparison.compareEvents}
                      responses={taskResultsVariantComparison.compareResponses}
                      participants={taskResultsVariantComparison.compareParticipants}
                      screenshots={screenshots}
                      displaySettings={displaySettings}
                    />
                  </div>
                </div>
              ) : (
                <NavigationPathsTab
                  tasks={tasks}
                  events={filteredEvents}
                  responses={filteredResponses}
                  participants={participants}
                  screenshots={screenshots}
                  displaySettings={displaySettings}
                />
              )}
            </TabsContent>

            <TabsContent value="click-maps" className={tabContentClass} data-slot="analysis-tab-content">
              <ClickMapsTab
                events={filteredEvents}
                screenshots={screenshots}
                tasks={tasks}
                trackingMode={trackingMode}
                filteredParticipantIds={filteredParticipantIds}
                displayMode={clickMapsDisplayMode}
                onDisplayModeChange={setClickMapsDisplayMode}
                heatmapSettings={heatmapSettings}
                onHeatmapSettingsChange={setHeatmapSettings}
                selectionSettings={selectionSettings}
                onSelectionSettingsChange={setSelectionSettings}
                variants={variants}
              />
            </TabsContent>

            <TabsContent value="events-explorer" className={tabContentClass} data-slot="analysis-tab-content">
              {taskResultsVariantComparison ? (
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-muted-foreground border-b pb-2">
                      {taskResultsVariantComparison.primaryName} &middot; {taskResultsVariantComparison.primaryParticipants.length} participants
                    </h3>
                    <EventsExplorerTab
                      events={taskResultsVariantComparison.primaryEvents}
                      tasks={tasks}
                      participants={taskResultsVariantComparison.primaryParticipants}
                      responses={taskResultsVariantComparison.primaryResponses}
                      trackingMode={trackingMode}
                      filteredParticipantIds={filteredParticipantIds}
                      displaySettings={displaySettings}
                      semanticLabels={semanticLabels}
                      onRegenerateLabels={regenerateLabels}
                    />
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-muted-foreground border-b pb-2">
                      {taskResultsVariantComparison.compareName} &middot; {taskResultsVariantComparison.compareParticipants.length} participants
                    </h3>
                    <EventsExplorerTab
                      events={taskResultsVariantComparison.compareEvents}
                      tasks={tasks}
                      participants={taskResultsVariantComparison.compareParticipants}
                      responses={taskResultsVariantComparison.compareResponses}
                      trackingMode={trackingMode}
                      filteredParticipantIds={filteredParticipantIds}
                      displaySettings={displaySettings}
                      semanticLabels={semanticLabels}
                      onRegenerateLabels={regenerateLabels}
                    />
                  </div>
                </div>
              ) : (
                <EventsExplorerTab
                  events={filteredEvents}
                  tasks={tasks}
                  participants={participants}
                  responses={filteredResponses}
                  trackingMode={trackingMode}
                  filteredParticipantIds={filteredParticipantIds}
                  displaySettings={displaySettings}
                  semanticLabels={semanticLabels}
                  onRegenerateLabels={regenerateLabels}
                />
              )}
            </TabsContent>
          </>
        )}

        {eyeTrackingEnabled && (
          <TabsContent value="attention-maps" className={tabContentClass} data-slot="analysis-tab-content">
            <AttentionMapsTab
              studyId={studyId}
              tasks={tasks}
              participants={filteredParticipants}
              readOnly={readOnly}
            />
          </TabsContent>
        )}

      </Tabs>

      {!readOnly && (
        <CreateSegmentModal
          open={showCreateSegmentModal}
          onOpenChange={setShowCreateSegmentModal}
          onSave={handleCreateSegment}
          questions={availableQuestions}
          urlTags={availableUrlTags}
          categoriesRange={{ min: 0, max: 0 }}
          timeRange={timeRange}
        />
      )}
    </>
  )
}

export const LiveWebsiteAnalysisTab = memo(LiveWebsiteAnalysisTabBase, (prev, next) => {
  return (
    prev.studyId === next.studyId &&
    prev.tasks === next.tasks &&
    prev.responses === next.responses &&
    prev.postTaskResponses === next.postTaskResponses &&
    prev.events === next.events &&
    prev.participants === next.participants &&
    prev.metrics === next.metrics &&
    prev.initialSubTab === next.initialSubTab &&
    prev.trackingMode === next.trackingMode &&
    prev.variantComparison === next.variantComparison &&
    prev.eyeTrackingEnabled === next.eyeTrackingEnabled &&
    prev.readOnly === next.readOnly
  )
})
