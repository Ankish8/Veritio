'use client'

import { useState, useMemo, useCallback } from 'react'
import { useAuthFetch, usePrototypeTestFrames, useHeatmapSettings, useSelectionSettings, useClickMapsPanels, usePrototypeTestNavigationEvents } from '../hooks'
import type { ClickDisplayMode } from '../types/analytics'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@veritio/ui/components/tabs'
import { Skeleton } from '@veritio/ui/components/skeleton'
import { Button } from '@veritio/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@veritio/ui/components/dropdown-menu'
import { Card, CardContent } from '@veritio/ui/components/card'
import { ChevronDown, ChevronUp, Check, Plus, List, Construction } from 'lucide-react'
import { useSegment } from '../contexts/segment-context'
import { CreateSegmentModal } from '../card-sort/participants/create-segment-modal'
import { TaskResultsTab } from './task-results'
import { ClickMapsTab } from './click-maps'
import { FlowDiagramTab } from './flow-diagram'
// Note: PathsTab functionality moved into TaskResultsTab as EmbeddedPathsSection
import { computePrototypeTestMetrics, parseTaskAttempt } from '../algorithms/prototype-test-analysis'
import { getPrimaryPathFrames } from '../lib/utils/pathway-migration'
import type { SuccessPathway } from '../lib/supabase/study-flow-types'
import type {
  PrototypeTestTask,
  PrototypeTestTaskAttempt,
  PrototypeTestFrame,
  Participant,
  SegmentConditionsV2,
  StudyFlowQuestion,
  StudyFlowResponse,
} from '@veritio/prototype-test/lib/supabase/study-flow-types'
import type { ParticipantDisplaySettings } from '@veritio/prototype-test/lib/supabase/study-flow-types'
import type { PrototypeTestMetrics } from '@veritio/prototype-test/algorithms/prototype-test-analysis'

interface PrototypeTestAnalysisTabProps {
  studyId: string
  studyTitle?: string
  tasks: PrototypeTestTask[]
  frames: PrototypeTestFrame[]
  taskAttempts: PrototypeTestTaskAttempt[]
  participants: Participant[]
  metrics: PrototypeTestMetrics
  flowQuestions: StudyFlowQuestion[]
  flowResponses: StudyFlowResponse[]
  onNavigateToSegments?: () => void
  initialSubTab?: string
  onSubTabChange?: (tab: string) => void
  displaySettings?: ParticipantDisplaySettings | null
}

function PlaceholderContent({ title }: { title: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16">
        <Construction className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground">
          {title} Coming Soon
        </h3>
        <p className="text-sm text-muted-foreground mt-2 text-center max-w-md">
          This analysis view is under development and will be available in a future update.
        </p>
      </CardContent>
    </Card>
  )
}

type AnalysisSubTab = 'task-results' | 'click-maps' | 'flow-diagram'

export function PrototypeTestAnalysisTab({
  studyId,
  studyTitle = 'Prototype Test',
  tasks,
  frames: initialFrames,
  taskAttempts,
  participants,
  metrics,
  flowQuestions,
  flowResponses,
  onNavigateToSegments,
  initialSubTab = 'task-results',
  onSubTabChange,
  displaySettings,
}: PrototypeTestAnalysisTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<AnalysisSubTab>(initialSubTab as AnalysisSubTab)
  const [segmentDropdownOpen, setSegmentDropdownOpen] = useState(false)
  const [showCreateSegmentModal, setShowCreateSegmentModal] = useState(false)

  // Click maps display mode (heatmap vs selection)
  const [clickMapsDisplayMode, setClickMapsDisplayMode] = useState<Exclude<ClickDisplayMode, 'grid'>>('heatmap')

  // Heatmap settings with localStorage persistence
  const {
    settings: heatmapSettings,
    setSettings: setHeatmapSettings,
    resetSettings: resetHeatmapSettings,
  } = useHeatmapSettings()

  // Selection settings with localStorage persistence
  const {
    settings: selectionSettings,
    setSettings: setSelectionSettings,
    resetSettings: resetSelectionSettings,
  } = useSelectionSettings()

  // Register settings panel in FloatingActionBar when Click Maps tab is active
  // Panel switches between Heatmap Settings and Selection Settings based on displayMode
  useClickMapsPanels({
    isActive: activeSubTab === 'click-maps',
    displayMode: clickMapsDisplayMode,
    heatmapSettings,
    onHeatmapSettingsChange: setHeatmapSettings,
    onResetHeatmapSettings: resetHeatmapSettings,
    selectionSettings,
    onSelectionSettingsChange: setSelectionSettings,
    onResetSelectionSettings: resetSelectionSettings,
    hasHitMissData: true,
  })

  // Handle display mode changes
  const handleDisplayModeChange = useCallback((mode: Exclude<ClickDisplayMode, 'grid'>) => {
    setClickMapsDisplayMode(mode)
  }, [])

  // Lazy load frames when tab is first rendered (cached by SWR for instant subsequent loads)
  const { frames: lazyFrames, isLoading: framesLoading } = usePrototypeTestFrames(studyId)
  const frames = initialFrames.length > 0 ? initialFrames : lazyFrames

  // Lazy load navigation events for flow diagram (only fetched when Flow Diagram tab is active)
  const {
    navigationEvents,
    componentStateEvents,
    componentInstances,
    isLoading: navEventsLoading,
    error: navEventsError,
  } = usePrototypeTestNavigationEvents(activeSubTab === 'flow-diagram' ? studyId : null)

  // Auth setup for API calls
  const authFetch = useAuthFetch()

  // Segment filtering
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

  // Handle sub-tab changes
  const handleSubTabChange = (tab: string) => {
    setActiveSubTab(tab as AnalysisSubTab)
    onSubTabChange?.(tab)
  }

  // Filter task attempts based on segment
  const filteredTaskAttempts = useMemo(() => {
    if (!filteredParticipantIds) return taskAttempts
    return taskAttempts.filter(a => filteredParticipantIds.has(a.participant_id))
  }, [taskAttempts, filteredParticipantIds])

  // Recompute metrics for filtered data
  const displayMetrics = useMemo(() => {
    if (!filteredParticipantIds) return metrics

    // Filter participants based on segment
    const filteredParticipants = participants.filter(p =>
      filteredParticipantIds.has(p.id)
    )

    // Recompute metrics with filtered data
    return computePrototypeTestMetrics(tasks, filteredTaskAttempts, filteredParticipants)
  }, [metrics, filteredParticipantIds, participants, tasks, filteredTaskAttempts])

  // Get post-task responses for a specific task
  const getPostTaskResponses = useMemo(() => {
    return (taskId: string) => {
      const attempts = filteredTaskAttempts.filter(a => a.task_id === taskId)
      const parsed = attempts.map(parseTaskAttempt)
      return parsed.flatMap(a => a.post_task_responses)
    }
  }, [filteredTaskAttempts])

  // Create a new segment
  const handleCreateSegment = async (
    name: string,
    description: string | null,
    conditions: SegmentConditionsV2
  ) => {
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

  // Segment dropdown component
  const segmentDropdown = (
    <DropdownMenu open={segmentDropdownOpen} onOpenChange={setSegmentDropdownOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="min-w-[180px] justify-between">
          <span className="truncate">
            {activeSegment ? activeSegment.name : 'All included participants'}
          </span>
          {segmentDropdownOpen ? (
            <ChevronUp className="ml-2 h-4 w-4 shrink-0" />
          ) : (
            <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        <DropdownMenuItem onClick={clearSegment} className="flex items-center gap-2">
          {!activeSegmentId && <Check className="h-4 w-4" />}
          {activeSegmentId && <span className="w-4" />}
          All included participants
        </DropdownMenuItem>
        {savedSegments.map((segment) => (
          <DropdownMenuItem
            key={segment.id}
            onClick={() => applySegment(segment.id)}
            className="flex items-center gap-2"
          >
            {activeSegmentId === segment.id && <Check className="h-4 w-4" />}
            {activeSegmentId !== segment.id && <span className="w-4" />}
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

  // Show loading state only on first load (framesLoading && no frames cached)
  // On subsequent visits, SWR cache provides instant data
  if (framesLoading && frames.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  return (
    <>
      <Tabs value={activeSubTab} onValueChange={handleSubTabChange}>
        {/* Sticky sub-tabs row with segment dropdown */}
        <div className="sticky top-[52px] z-10 bg-background -mx-4 sm:-mx-6 px-4 sm:px-6 py-2 flex items-center justify-between mb-4">
          <TabsList variant="underline">
            <TabsTrigger variant="underline" value="task-results">
              Task Results
            </TabsTrigger>
            <TabsTrigger variant="underline" value="click-maps">
              Click Maps
            </TabsTrigger>
            <TabsTrigger variant="underline" value="flow-diagram">
              Flow Diagram
            </TabsTrigger>
          </TabsList>
          {segmentDropdown}
        </div>

        <TabsContent value="task-results" className="mt-0">
          <TaskResultsTab
            studyId={studyId}
            tasks={tasks}
            taskMetrics={displayMetrics.taskMetrics}
            taskAttempts={filteredTaskAttempts}
            frames={frames}
            participants={participants}
            flowQuestions={flowQuestions}
            flowResponses={flowResponses}
            getPostTaskResponses={getPostTaskResponses}
            studyTitle={studyTitle}
            displaySettings={displaySettings}
            onNavigateToTab={(tab) => {
              // Navigate to the specified tab
              if (tab === 'click-maps') {
                handleSubTabChange(tab)
              }
              // 'participants' would navigate to the main Participants tab
              // which requires parent-level navigation
            }}
          />
        </TabsContent>

        <TabsContent value="click-maps" className="mt-4">
          <ClickMapsTab
            studyId={studyId}
            tasks={tasks}
            participants={participants}
            displayMode={clickMapsDisplayMode}
            onDisplayModeChange={handleDisplayModeChange}
            heatmapSettings={heatmapSettings}
            selectionSettings={selectionSettings}
            displaySettings={displaySettings}
          />
        </TabsContent>

        <TabsContent value="flow-diagram" className="mt-4">
          <FlowDiagramTab
            studyId={studyId}
            tasks={tasks.map(t => ({
              id: t.id,
              title: t.title,
              start_frame_id: t.start_frame_id,
              success_frame_ids: t.success_frame_ids as string[] | null,
              success_criteria_type: t.success_criteria_type,
              success_pathway: (() => {
                const pw = t.success_pathway as SuccessPathway
                if (!pw) return null
                const frames = getPrimaryPathFrames(pw)
                return frames.length > 0 ? { frames, strict: true } : null
              })(),
              raw_pathway: t.success_pathway,
            }))}
            frames={frames.map(f => ({
              id: f.id,
              name: f.name,
              figma_node_id: f.figma_node_id,
              thumbnail_url: f.thumbnail_url,
            }))}
            navigationEvents={navigationEvents}
            componentStateEvents={componentStateEvents}
            componentInstances={componentInstances}
            taskAttempts={filteredTaskAttempts.map(a => ({
              id: a.id,
              session_id: a.session_id,
              task_id: a.task_id,
              participant_id: a.participant_id,
              outcome: a.outcome,
              is_direct: a.is_direct,
              path_taken: a.path_taken as string[] | null,
            }))}
            isLoading={navEventsLoading}
            error={navEventsError}
          />
        </TabsContent>

      </Tabs>

      <CreateSegmentModal
        open={showCreateSegmentModal}
        onOpenChange={setShowCreateSegmentModal}
        onSave={handleCreateSegment}
        questions={availableQuestions}
        urlTags={availableUrlTags}
        categoriesRange={{ min: 0, max: 0 }} // Prototype tests don't have categories
        timeRange={timeRange}
      />
    </>
  )
}
