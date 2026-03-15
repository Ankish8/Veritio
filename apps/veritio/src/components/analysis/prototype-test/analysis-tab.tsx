'use client'

import { useState, useMemo, useCallback, memo } from 'react'
import { useAuthFetch, usePrototypeTestFrames, useHeatmapSettings, useSelectionSettings, useClickMapsPanels } from '@/hooks'
import { usePrototypeTestNavigationEvents } from '@veritio/prototype-test/hooks'
import type { ClickDisplayMode } from '@/types/analytics'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
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
import { useFlowDiagramPanel } from '@/hooks/use-flow-diagram-panel'
import { CreateSegmentModal } from '../card-sort/participants/create-segment-modal'
import { TaskResultsTab } from './task-results'
import { ClickMapsTab } from './click-maps'
import { FlowDiagramTab } from '@veritio/prototype-test/analysis'
import { ParticipantPathsTab } from './paths/participant-paths-tab'
import { computePrototypeTestMetrics, parseTaskAttempt } from '@/lib/algorithms/prototype-test-analysis'
import { getPrimaryPathFrames } from '@veritio/prototype-test/lib/utils/pathway-migration'
import type { SuccessPathway } from '@veritio/prototype-test/lib/supabase/study-flow-types'
import type {
  PrototypeTestTask,
  PrototypeTestTaskAttempt,
  PrototypeTestFrame,
  Participant,
  SegmentConditionsV2,
  StudyFlowQuestionRow,
  StudyFlowResponseRow,
} from '@veritio/study-types'
import type { ParticipantDisplaySettings } from '@veritio/study-types/study-flow-types'
import type { PrototypeTestMetrics } from '@/lib/algorithms/prototype-test-analysis'
import { prefetchResultsTabBundle } from '@/lib/prefetch/results-tab-prefetch'

interface PrototypeTestAnalysisTabProps {
  studyId: string
  studyTitle?: string
  tasks: PrototypeTestTask[]
  frames: PrototypeTestFrame[]
  taskAttempts: PrototypeTestTaskAttempt[]
  participants: Participant[]
  metrics: PrototypeTestMetrics
  flowQuestions: StudyFlowQuestionRow[]
  flowResponses: StudyFlowResponseRow[]
  onNavigateToSegments?: () => void
  initialSubTab?: string
  onSubTabChange?: (tab: string) => void
  /** Participant display settings for showing names/emails instead of Participant N */
  displaySettings?: ParticipantDisplaySettings | null
}

type AnalysisSubTab = 'task-results' | 'paths' | 'click-maps' | 'flow-diagram'

function PrototypeTestAnalysisTabBase({
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

  const { openNodeDetail } = useFlowDiagramPanel()
  const [clickMapsDisplayMode, setClickMapsDisplayMode] = useState<Exclude<ClickDisplayMode, 'grid'>>('heatmap')

  const {
    settings: heatmapSettings,
    setSettings: setHeatmapSettings,
    resetSettings: resetHeatmapSettings,
  } = useHeatmapSettings()

  const {
    settings: selectionSettings,
    setSettings: setSelectionSettings,
    resetSettings: resetSelectionSettings,
  } = useSelectionSettings()

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

  // Lazy load frames when tab is first rendered (cached by SWR for instant subsequent loads)
  const { frames: lazyFrames, isLoading: framesLoading } = usePrototypeTestFrames(studyId)
  const frames = initialFrames?.length > 0 ? initialFrames : lazyFrames

  // Lazy load navigation events for flow diagram (only fetched when Flow Diagram tab is active)
  const {
    navigationEvents,
    componentStateEvents,
    componentInstances,
    componentVariants,
    isLoading: navEventsLoading,
    error: navEventsError,
  } = usePrototypeTestNavigationEvents(activeSubTab === 'flow-diagram' ? studyId : null)

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

  const handleSubTabChange = (tab: string) => {
    setActiveSubTab(tab as AnalysisSubTab)
    onSubTabChange?.(tab)
  }

  const filteredTaskAttempts = useMemo(() => {
    if (!filteredParticipantIds) return taskAttempts
    return taskAttempts.filter(a => filteredParticipantIds.has(a.participant_id))
  }, [taskAttempts, filteredParticipantIds])

  const displayMetrics = useMemo(() => {
    if (!filteredParticipantIds) return metrics

    const filteredParticipants = participants.filter(p =>
      filteredParticipantIds.has(p.id)
    )
    return computePrototypeTestMetrics(tasks, filteredTaskAttempts, filteredParticipants)
  }, [metrics, filteredParticipantIds, participants, tasks, filteredTaskAttempts])

  const getPostTaskResponses = useCallback((taskId: string) => {
    const attempts = filteredTaskAttempts.filter(a => a.task_id === taskId)
    const parsed = attempts.map(parseTaskAttempt)
    return parsed.flatMap(a => a.post_task_responses)
  }, [filteredTaskAttempts])

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

  if (framesLoading && (!frames || frames.length === 0)) {
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
        <div className="sticky top-[52px] z-10 bg-background -mx-4 sm:-mx-6 px-4 sm:px-6 py-2 flex items-center justify-between mb-4">
          <TabsList variant="underline">
            <TabsTrigger variant="underline" value="task-results" onMouseEnter={() => prefetchResultsTabBundle('prototype-task-results')}>
              Task Results
            </TabsTrigger>
            <TabsTrigger variant="underline" value="paths" onMouseEnter={() => prefetchResultsTabBundle('prototype-paths')}>
              Participant Paths
            </TabsTrigger>
            <TabsTrigger variant="underline" value="click-maps" onMouseEnter={() => prefetchResultsTabBundle('prototype-click-maps')}>
              Click Maps
            </TabsTrigger>
            <TabsTrigger variant="underline" value="flow-diagram">
              Flow Diagram
            </TabsTrigger>
          </TabsList>
          {segmentDropdown}
        </div>

        <TabsContent value="task-results" className="mt-0" data-slot="analysis-tab-content">
          <TaskResultsTab
            tasks={tasks}
            taskMetrics={displayMetrics.taskMetrics}
            getPostTaskResponses={getPostTaskResponses}
            studyTitle={studyTitle}
            onNavigateToTab={(tab) => {
              if (tab === 'click-maps') {
                handleSubTabChange(tab)
              }
            }}
          />
        </TabsContent>

        <TabsContent value="paths" className="mt-0" data-slot="analysis-tab-content">
          <ParticipantPathsTab
            studyId={studyId}
            tasks={tasks}
            frames={frames}
            taskAttempts={filteredTaskAttempts}
            participants={participants}
            flowQuestions={flowQuestions}
            flowResponses={flowResponses}
            displaySettings={displaySettings}
          />
        </TabsContent>

        <TabsContent value="click-maps" className="mt-4" data-slot="analysis-tab-content">
          <ClickMapsTab
            studyId={studyId}
            tasks={tasks}
            participants={participants}
            displayMode={clickMapsDisplayMode}
            onDisplayModeChange={setClickMapsDisplayMode}
            heatmapSettings={heatmapSettings}
            selectionSettings={selectionSettings}
            displaySettings={displaySettings}
          />
        </TabsContent>

        <TabsContent value="flow-diagram" className="mt-4" data-slot="analysis-tab-content">
          <FlowDiagramTab
            onNodeDetailOpen={openNodeDetail}
            studyId={studyId}
            tasks={tasks.map(t => ({
              id: t.id,
              title: t.title,
              start_frame_id: t.start_frame_id,
              success_frame_ids: t.success_frame_ids as string[] | null,
              success_criteria_type: t.success_criteria_type as 'destination' | 'pathway' | 'component_state' | null,
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
              width: f.width,
              height: f.height,
            }))}
            navigationEvents={navigationEvents}
            componentStateEvents={componentStateEvents}
            componentInstances={componentInstances}
            componentInstancePositions={componentInstances}
            componentVariants={componentVariants}
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

/**
 * Memoized Prototype Test Analysis Tab - prevents re-renders when switching between main tabs
 */
export const PrototypeTestAnalysisTab = memo(PrototypeTestAnalysisTabBase, (prev, next) => {
  return (
    prev.studyId === next.studyId &&
    prev.tasks === next.tasks &&
    prev.frames === next.frames &&
    prev.taskAttempts === next.taskAttempts &&
    prev.participants === next.participants &&
    prev.metrics === next.metrics &&
    prev.initialSubTab === next.initialSubTab
  )
})
