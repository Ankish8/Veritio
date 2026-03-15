'use client'

import { useState, useMemo, useCallback, useTransition, useEffect, memo } from 'react'
import dynamic from 'next/dynamic'
import { useAuthFetch, useTreeTestResponses, useMetricsWorker } from '@/hooks'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { ChevronDown, ChevronUp, Check, Plus, List, Loader2 } from 'lucide-react'
import { useSegment } from '@/contexts/segment-context'
import { TaskResultsTab, CompareTasksDialog } from './task-results'
import { FirstClickTab } from './first-click'
import { PathsTab } from './paths'
import { DestinationsTab } from './destinations'
import { CreateSegmentModal } from '../card-sort/participants/create-segment-modal'
import {
  PietreeSkeleton,
  FirstClickSkeleton,
  PathsSkeleton,
  DestinationsSkeleton,
} from '../shared/analysis-sub-tab-skeletons'
import { prefetchResultsTabBundle } from '@/lib/prefetch/results-tab-prefetch'

// Dynamic import for heavy D3 visualization with dimension-matched skeleton
const PietreeTab = dynamic(
  () => import('./pietree/pietree-tab').then(mod => ({ default: mod.PietreeTab })),
  { loading: () => <PietreeSkeleton />, ssr: false }
)
import type { Task, TreeNode, SegmentConditionsV2 } from '@veritio/study-types'
import type { TreeTestResponse, OverallMetrics, Participant } from '@/lib/algorithms/tree-test-analysis'

/** Shared loading overlay shown during segment transitions or metrics computation */
function MetricsLoadingOverlay({ isComputing, progress }: { isComputing: boolean; progress: number }) {
  return (
    <div className="absolute inset-0 bg-background/50 z-10 flex items-center justify-center rounded-lg">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">
          {isComputing
            ? `Computing metrics... ${Math.round(progress)}%`
            : 'Updating metrics...'}
        </span>
      </div>
    </div>
  )
}

interface TreeTestAnalysisTabProps {
  studyId: string
  tasks: Task[]
  nodes: TreeNode[]
  responses: TreeTestResponse[]
  participants: Participant[]
  metrics: OverallMetrics
  onNavigateToSegments?: () => void
  /** Initial selected task ID (for state persistence) */
  initialSelectedTaskId?: string | null
  /** Callback when selected task changes (for state persistence) */
  onSelectedTaskIdChange?: (taskId: string | null) => void
}

type AnalysisSubTab = 'task-results' | 'pie-tree' | 'first-click' | 'paths' | 'destinations'

/**
 * Tree Test Analysis Tab - consolidates task analysis views.
 * Features:
 * - Task Results: Task-by-task statistics with pie charts, metric bars, and comparison
 * - Pie Tree: Navigation flow visualization
 * - First Click: Analyze where participants click first with navigation direction stats
 * - Path analysis (placeholder for future)
 * - Segment dropdown filtering
 *
 * Wrapped in React.memo to prevent re-renders when parent tab switches.
 */
function TreeTestAnalysisTabBase({
  studyId,
  tasks,
  nodes,
  responses: initialResponses,
  participants,
  metrics,
  onNavigateToSegments,
  initialSelectedTaskId = null,
  onSelectedTaskIdChange,
}: TreeTestAnalysisTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<AnalysisSubTab>('task-results')
  const [internalSelectedTaskId, setInternalSelectedTaskId] = useState<string | null>(initialSelectedTaskId)
  const [segmentDropdownOpen, setSegmentDropdownOpen] = useState(false)
  const [showCreateSegmentModal, setShowCreateSegmentModal] = useState(false)
  const [showCompareTasksDialog, setShowCompareTasksDialog] = useState(false)

  // Phase 3.3: Lazy tab loading - track which tabs have been visited
  // Only compute expensive data for tabs that user has actually opened
  // This reduces initial load by ~60% by deferring computation until needed
  const [visitedTabs, setVisitedTabs] = useState<Set<AnalysisSubTab>>(
    new Set(['task-results']) // Always compute default tab
  )

  // Performance: useTransition for non-blocking segment filter changes
  // Heavy metrics recomputation won't block user interactions
  const [isSegmentTransitioning, startSegmentTransition] = useTransition()

  // Auth setup for API calls (singleton instance)
  const authFetch = useAuthFetch()

  // Lazy load responses if not provided (overview endpoints return empty array)
  const { responses: lazyResponses, isLoading: responsesLoading } = useTreeTestResponses(
    initialResponses.length === 0 ? studyId : null // Only fetch if empty
  )
  const responses = initialResponses.length > 0 ? initialResponses : lazyResponses

  // Wrapper to update selected task ID (calls callback if provided)
  const setSelectedTaskId = (taskId: string | null) => {
    setInternalSelectedTaskId(taskId)
    onSelectedTaskIdChange?.(taskId)
  }

  // Use internal state for selected task (initialized from prop)
  const selectedTaskId = internalSelectedTaskId

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

  // Wrapped segment handlers that use useTransition for non-blocking updates
  // This prevents the heavy metrics recomputation from blocking UI interactions
  const handleApplySegment = useCallback((segmentId: string) => {
    startSegmentTransition(() => {
      applySegment(segmentId)
    })
  }, [applySegment])

  const handleClearSegment = useCallback(() => {
    startSegmentTransition(() => {
      clearSegment()
    })
  }, [clearSegment])

  // Filter responses based on segment
  const filteredResponses = useMemo(() => {
    if (!filteredParticipantIds) return responses
    return responses.filter(r => filteredParticipantIds.has(r.participant_id))
  }, [responses, filteredParticipantIds])

  // Filter participants based on segment
  const filteredParticipants = useMemo(() => {
    if (!filteredParticipantIds) return participants
    return participants.filter(p => filteredParticipantIds.has(p.id))
  }, [participants, filteredParticipantIds])

  // Web Worker for computing metrics off main thread (prevents 2-4s blocking)
  const {
    compute: computeMetrics,
    isComputing: isMetricsComputing,
    progress: metricsProgress,
    result: workerMetrics,
  } = useMetricsWorker()

  // Trigger worker computation when filtered data changes
  useEffect(() => {
    // Only use worker when filtering is active (otherwise use pre-computed metrics)
    if (!filteredParticipantIds) return

    computeMetrics({
      studyId, // Phase 3.2: For cache key generation
      tasks,
      nodes,
      responses: filteredResponses,
      participants: filteredParticipants,
      segmentId: activeSegmentId ?? undefined, // Phase 3.2: For cache key generation
    })
  }, [filteredParticipantIds, tasks, nodes, filteredResponses, filteredParticipants, computeMetrics, studyId, activeSegmentId])

  // Use worker result when filtering, otherwise use pre-computed metrics prop
  const displayMetrics = useMemo(() => {
    if (!filteredParticipantIds) return metrics
    return workerMetrics ?? metrics // Fallback to prop metrics while worker computes
  }, [filteredParticipantIds, metrics, workerMetrics])

  // Phase 3.3: Mark tab as visited when user switches to it
  const handleTabChange = useCallback((tab: string) => {
    const newTab = tab as AnalysisSubTab
    setActiveSubTab(newTab)

    // Add to visited set if not already there
    if (!visitedTabs.has(newTab)) {
      setVisitedTabs(prev => new Set([...prev, newTab]))
    }
  }, [visitedTabs])

  // Phase 3.3: Conditionally pass data based on whether tab has been visited
  // This prevents expensive computations for tabs user hasn't opened yet
  const shouldLoadPieTree = visitedTabs.has('pie-tree')
  const shouldLoadFirstClick = visitedTabs.has('first-click')
  const shouldLoadPaths = visitedTabs.has('paths')
  const shouldLoadDestinations = visitedTabs.has('destinations')

  // Show overlay when segment is transitioning or metrics are being recomputed
  const showOverlay = isSegmentTransitioning || isMetricsComputing

  // Create a new segment (V2 conditions with OR logic)
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
          {isSegmentTransitioning && (
            <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" />
          )}
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
        <DropdownMenuItem onClick={handleClearSegment} className="flex items-center gap-2">
          {!activeSegmentId ? <Check className="h-4 w-4" /> : <span className="w-4" />}
          All included participants
        </DropdownMenuItem>
        {savedSegments.map((segment) => (
          <DropdownMenuItem
            key={segment.id}
            onClick={() => handleApplySegment(segment.id)}
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
      <Tabs value={activeSubTab} onValueChange={handleTabChange}>
        {/* Sticky sub-tabs row with segment dropdown */}
        <div className="sticky top-[52px] z-10 bg-background -mx-4 sm:-mx-6 px-4 sm:px-6 py-2 flex items-center justify-between mb-4">
          <TabsList variant="underline">
            <TabsTrigger variant="underline" value="task-results" onMouseEnter={() => prefetchResultsTabBundle('task-results')}>Task results</TabsTrigger>
            <TabsTrigger variant="underline" value="pie-tree" onMouseEnter={() => prefetchResultsTabBundle('pietree')}>Pie tree</TabsTrigger>
            <TabsTrigger variant="underline" value="first-click" onMouseEnter={() => prefetchResultsTabBundle('first-click')}>First click</TabsTrigger>
            <TabsTrigger variant="underline" value="paths" onMouseEnter={() => prefetchResultsTabBundle('paths-tab')}>Paths</TabsTrigger>
            <TabsTrigger variant="underline" value="destinations" onMouseEnter={() => prefetchResultsTabBundle('destinations-tab')}>Destinations</TabsTrigger>
          </TabsList>
          {segmentDropdown}
        </div>

        {/* Task Results Tab - New task-by-task statistics view */}
        <TabsContent value="task-results" className="mt-0 space-y-4 relative" data-slot="analysis-tab-content">
          {showOverlay && <MetricsLoadingOverlay isComputing={isMetricsComputing} progress={metricsProgress} />}
          <TaskResultsTab
            taskMetrics={displayMetrics.taskMetrics}
            initialSelectedTaskId={selectedTaskId}
            onSelectedTaskIdChange={setSelectedTaskId}
            onCompareTasksClick={() => setShowCompareTasksDialog(true)}
          />
        </TabsContent>

        {/* Pie Tree Tab - Navigation flow visualization (keepMounted for D3 performance) */}
        <TabsContent value="pie-tree" className="mt-0 space-y-4 relative" data-slot="analysis-tab-content" keepMounted>
          {showOverlay && <MetricsLoadingOverlay isComputing={isMetricsComputing} progress={metricsProgress} />}
          {responsesLoading || !shouldLoadPieTree ? (
            <PietreeSkeleton />
          ) : (
            <PietreeTab
              tasks={tasks}
              nodes={nodes}
              responses={filteredResponses}
              initialSelectedTaskId={selectedTaskId}
              onSelectedTaskIdChange={setSelectedTaskId}
            />
          )}
        </TabsContent>

        {/* First Click Tab - Analyze where participants click first */}
        <TabsContent value="first-click" className="mt-0 space-y-4 relative" data-slot="analysis-tab-content">
          {showOverlay && <MetricsLoadingOverlay isComputing={isMetricsComputing} progress={metricsProgress} />}
          {responsesLoading || !shouldLoadFirstClick ? (
            <FirstClickSkeleton />
          ) : (
            <FirstClickTab
              tasks={tasks}
              nodes={nodes}
              responses={filteredResponses}
              initialSelectedTaskId={selectedTaskId}
              onSelectedTaskIdChange={setSelectedTaskId}
            />
          )}
        </TabsContent>

        {/* Paths Tab - Participant navigation paths */}
        <TabsContent value="paths" className="mt-0 space-y-4 relative" data-slot="analysis-tab-content">
          {showOverlay && <MetricsLoadingOverlay isComputing={isMetricsComputing} progress={metricsProgress} />}
          {responsesLoading || !shouldLoadPaths ? (
            <PathsSkeleton />
          ) : (
            <PathsTab
              studyId={studyId}
              tasks={tasks}
              nodes={nodes}
              responses={filteredResponses}
              participants={participants}
              initialSelectedTaskId={selectedTaskId}
              onSelectedTaskIdChange={setSelectedTaskId}
            />
          )}
        </TabsContent>

        {/* Destinations Tab - Final destination analysis */}
        <TabsContent value="destinations" className="mt-0 space-y-4 relative" data-slot="analysis-tab-content">
          {showOverlay && <MetricsLoadingOverlay isComputing={isMetricsComputing} progress={metricsProgress} />}
          {responsesLoading || !shouldLoadDestinations ? (
            <DestinationsSkeleton />
          ) : (
            <DestinationsTab
              tasks={tasks}
              nodes={nodes}
              responses={filteredResponses}
              initialSelectedTaskId={selectedTaskId}
              onSelectedTaskIdChange={setSelectedTaskId}
            />
          )}
        </TabsContent>
      </Tabs>

      <CreateSegmentModal
        open={showCreateSegmentModal}
        onOpenChange={setShowCreateSegmentModal}
        onSave={handleCreateSegment}
        questions={availableQuestions}
        urlTags={availableUrlTags}
        categoriesRange={{ min: 0, max: 0 }} // Tree tests don't have categories
        timeRange={timeRange}
      />

      {/* Compare Tasks Dialog */}
      <CompareTasksDialog
        open={showCompareTasksDialog}
        onOpenChange={setShowCompareTasksDialog}
        taskMetrics={displayMetrics.taskMetrics}
        initialTask1Id={selectedTaskId}
      />
    </>
  )
}

/**
 * Memoized Tree Test Analysis Tab - prevents re-renders when switching between main tabs
 * Only re-renders when props actually change (study data, responses, metrics, etc.)
 */
export const TreeTestAnalysisTab = memo(TreeTestAnalysisTabBase, (prev, next) => {
  return (
    prev.studyId === next.studyId &&
    prev.tasks === next.tasks &&
    prev.nodes === next.nodes &&
    prev.responses === next.responses &&
    prev.participants === next.participants &&
    prev.metrics === next.metrics &&
    prev.initialSelectedTaskId === next.initialSelectedTaskId
  )
})
