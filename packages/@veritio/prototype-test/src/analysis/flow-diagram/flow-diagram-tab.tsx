'use client'

import { useState, useMemo, useCallback, memo, useRef } from 'react'
import { cn } from '@veritio/ui'
import { Card, CardContent } from '@veritio/ui/components/card'
import { Skeleton } from '@veritio/ui/components/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@veritio/ui/components/select'
import { Workflow, TrendingUp, Users, Route } from 'lucide-react'
import { FlowVisualization } from './flow-visualization'
import { FlowControls } from './flow-controls'
import { FlowLegend } from './flow-legend'
import { FlowNodeDetail } from './flow-node-detail'
import { FlowErrorBoundary } from './flow-error-boundary'
import { buildFlowDiagramData } from './build-flow-data'
import { ImageExportButton } from '../export/export-button'
import type {
  FlowDiagramFilters,
  FlowDiagramData,
  NavigationEventInput,
  ComponentStateEventInput,
  TaskAttemptInput,
  FrameInput,
  TaskInput,
  ComponentInstanceInput,
  ComponentInstancePositionInput,
  ComponentVariantInput,
  FlowNode,
  FlowLink,
} from './types'
import { DEFAULT_FLOW_FILTERS } from './types'
import { usePrototypeTestTaskAttemptPaths } from '../../hooks/use-prototype-test-task-attempt-paths'
import { pathwayHasStateSteps } from '../../lib/utils/pathway-migration'
import type { SuccessPathway } from '../../lib/supabase/study-flow-types'

interface FlowDiagramTabProps {
  studyId: string
  tasks: TaskInput[]
  frames: FrameInput[]
  navigationEvents: NavigationEventInput[]
  componentStateEvents: ComponentStateEventInput[]
  taskAttempts: TaskAttemptInput[]
  componentInstances?: ComponentInstanceInput[]
  componentInstancePositions?: ComponentInstancePositionInput[]
  componentVariants?: ComponentVariantInput[]
  isLoading?: boolean
  error?: string | null
  className?: string
  onNodeDetailOpen?: (node: FlowNode, data: FlowDiagramData) => void
}
export const FlowDiagramTab = memo(function FlowDiagramTab({
  studyId,
  tasks,
  frames,
  navigationEvents,
  componentStateEvents,
  taskAttempts,
  componentInstances,
  componentInstancePositions,
  componentVariants,
  isLoading = false,
  error = null,
  className,
  onNodeDetailOpen,
}: FlowDiagramTabProps) {
  // Default to empty array for backwards compatibility
  const instances = componentInstances || []

  // Lazy-load path_taken data — the SAME approach the Participant Paths breadcrumb uses.
  // path_taken is the authoritative record of the user's journey (submitted as part of
  // the task result). It captures ALL frame transitions including variant frames that
  // individual navigation events may miss. This is why the breadcrumb shows
  // "inbox > Tabs: Variant3 > New Chat > inbox > Info Menu: Edit" correctly.
  const { taskAttemptPaths } = usePrototypeTestTaskAttemptPaths(studyId)

  // Merge path_taken into task attempts (same merge the breadcrumb does)
  const enrichedTaskAttempts = useMemo((): TaskAttemptInput[] => {
    if (taskAttemptPaths.length === 0) return taskAttempts
    const pathMap = new Map(
      taskAttemptPaths.map(p => [p.id, p.path_taken])
    )
    return taskAttempts.map(a => {
      const rawPath = pathMap.get(a.id)
      // Handle both parsed arrays and JSON strings from Supabase
      const parsedPath = Array.isArray(rawPath)
        ? rawPath as string[]
        : rawPath != null
          ? (typeof rawPath === 'string' ? JSON.parse(rawPath) : null)
          : null
      return {
        ...a,
        path_taken: parsedPath ?? a.path_taken,
      }
    })
  }, [taskAttempts, taskAttemptPaths])

  // Selected task
  const [selectedTaskId, setSelectedTaskId] = useState<string>(
    tasks.length > 0 ? tasks[0].id : ''
  )

  // Filters state — default to frame-only view for clarity;
  // users can opt-in to component states via the toggle
  const [filters, setFilters] = useState<FlowDiagramFilters>(() => ({
    ...DEFAULT_FLOW_FILTERS,
  }))

  // Node detail panel state
  const [detailNode, setDetailNode] = useState<FlowNode | null>(null)
  const [detailPanelOpen, setDetailPanelOpen] = useState(false)

  // Ref for export capture
  const visualizationRef = useRef<HTMLDivElement>(null)

  // Get selected task
  const selectedTask = useMemo(
    () => tasks.find((t) => t.id === selectedTaskId) || null,
    [tasks, selectedTaskId]
  )

  // Filter data by selected task
  const taskNavigationEvents = useMemo(
    () => navigationEvents.filter((e) => e.task_id === selectedTaskId),
    [navigationEvents, selectedTaskId]
  )

  const taskComponentStateEvents = useMemo(
    () => componentStateEvents.filter((e) => e.task_id === selectedTaskId),
    [componentStateEvents, selectedTaskId]
  )

  const taskAttemptData = useMemo(
    () => enrichedTaskAttempts.filter((a) => a.task_id === selectedTaskId),
    [enrichedTaskAttempts, selectedTaskId]
  )

  // Compute max participants for slider
  const maxParticipants = useMemo(() => {
    const participantIds = new Set(taskAttemptData.map((a) => a.participant_id))
    return participantIds.size
  }, [taskAttemptData])

  // Check if any task attempts have path_taken data
  const hasPathTaken = useMemo(
    () => taskAttemptData.some(a => a.path_taken && a.path_taken.length > 0),
    [taskAttemptData]
  )

  // Check if the selected task has a V3 pathway with state steps.
  // When true AND States toggle is ON, backtracks are rendered inline as
  // return-visit nodes so the separate Backtracks toggle becomes meaningless.
  const hasV3PathwayStates = useMemo(
    () => selectedTask?.raw_pathway ? pathwayHasStateSteps(selectedTask.raw_pathway as SuccessPathway) : false,
    [selectedTask]
  )

  // Build flow diagram data
  const flowData: FlowDiagramData | null = useMemo(() => {
    // Render if we have path_taken OR navigation events
    if (!selectedTask || (taskNavigationEvents.length === 0 && !hasPathTaken)) {
      return null
    }

    const data = buildFlowDiagramData(
      taskNavigationEvents,
      taskComponentStateEvents,
      taskAttemptData,
      frames,
      selectedTask,
      filters,
      instances
    )

    // Attach supplementary data for state node thumbnail rendering
    if (componentInstancePositions?.length || componentVariants?.length) {
      data.supplementary = {
        frames,
        componentInstancePositions: componentInstancePositions || [],
        componentVariants: componentVariants || [],
      }
    }

    return data
  }, [
    selectedTask,
    taskNavigationEvents,
    taskComponentStateEvents,
    taskAttemptData,
    frames,
    filters,
    instances,
    hasPathTaken,
    componentInstancePositions,
    componentVariants,
  ])

  // Handle task change
  const handleTaskChange = useCallback((taskId: string) => {
    setSelectedTaskId(taskId)
    // Reset filters when changing tasks
    setFilters({
      ...DEFAULT_FLOW_FILTERS,
    })
  }, [])

  // Handle node click - open detail panel (external or built-in Sheet)
  const handleNodeClick = useCallback((node: FlowNode) => {
    if (onNodeDetailOpen && flowData) {
      onNodeDetailOpen(node, flowData)
    } else {
      setDetailNode(node)
      setDetailPanelOpen(true)
    }
  }, [onNodeDetailOpen, flowData])

  // Handle link click
  const handleLinkClick = useCallback((_link: FlowLink) => {
    // TODO: Filter to show only sessions that used this link
  }, [])

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-9 w-64" />
        </div>
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-[500px] w-full rounded-lg" />
        <Skeleton className="h-16 w-full" />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <Workflow className="w-6 h-6 text-red-600" />
          </div>
          <h3 className="text-lg font-medium text-foreground">
            Error Loading Flow Data
          </h3>
          <p className="text-sm text-muted-foreground mt-2 text-center max-w-md">
            {error}
          </p>
        </CardContent>
      </Card>
    )
  }

  // Empty state - no tasks
  if (tasks.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <Route className="w-6 h-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground">No Tasks Found</h3>
          <p className="text-sm text-muted-foreground mt-2 text-center max-w-md">
            This study doesn&apos;t have any prototype test tasks configured yet.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header Row */}
      <div className="flex items-center justify-between gap-4">
        {/* Task Selector */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-muted-foreground">
            Task:
          </label>
          <Select value={selectedTaskId} onValueChange={handleTaskChange}>
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Select a task" />
            </SelectTrigger>
            <SelectContent>
              {tasks.map((task, index) => (
                <SelectItem key={task.id} value={task.id}>
                  <span className="font-medium">Task {index + 1}:</span>{' '}
                  {task.title.length > 30
                    ? task.title.slice(0, 27) + '...'
                    : task.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Summary Stats + Export */}
        <div className="flex items-center gap-4">
          {flowData && (
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Users className="w-4 h-4" />
                <span>{flowData.stats.totalParticipants} participants</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Route className="w-4 h-4" />
                <span>{flowData.stats.uniquePaths} unique paths</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <TrendingUp className="w-4 h-4" />
                <span>Avg {flowData.stats.avgPathLength.toFixed(1)} screens</span>
              </div>
            </div>
          )}

          {/* Export Button */}
          {flowData && (
            <ImageExportButton
              captureRef={visualizationRef}
              filenamePrefix={`flow-diagram-${selectedTask?.title || 'task'}`}
            />
          )}
        </div>
      </div>

      {/* Controls Row */}
      <FlowControls
        filters={filters}
        onFiltersChange={setFilters}
        maxParticipants={maxParticipants}
        totalParticipants={flowData?.stats.totalParticipants || 0}
        backtrackDisabled={filters.showComponentStates && hasV3PathwayStates}
      />

      {/* Visualization */}
      <Card className="overflow-hidden">
        <CardContent className="p-0" ref={visualizationRef}>
          {flowData ? (
            <FlowErrorBoundary onReset={() => setFilters(DEFAULT_FLOW_FILTERS)}>
              <FlowVisualization
                data={flowData}
                highlightPath={filters.highlightPath}
                showBacktracks={filters.showBacktracks}
                className="h-[500px]"
                onNodeClick={handleNodeClick}
                onLinkClick={handleLinkClick}
              />
            </FlowErrorBoundary>
          ) : (
            <div className="h-[500px] flex flex-col items-center justify-center text-muted-foreground">
              <Workflow className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">No navigation data yet</p>
              <p className="text-sm mt-1">
                Participants haven&apos;t completed this task yet.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <FlowLegend
        showComponentStates={filters.showComponentStates}
        showBacktracks={filters.showBacktracks}
        highlightPath={filters.highlightPath}
      />

      {/* Optimal Paths Summary (when highlighting) */}
      {filters.highlightPath && flowData?.optimalPaths[filters.highlightPath] && (
        <Card className="bg-muted/30">
          <CardContent className="py-3">
            <div className="flex items-center gap-3">
              <div
                className="w-4 h-1.5 rounded-full"
                style={{
                  backgroundColor:
                    filters.highlightPath === 'criteria'
                      ? '#22c55e'
                      : filters.highlightPath === 'shortest'
                        ? '#3b82f6'
                        : '#a855f7',
                }}
              />
              <div>
                <p className="text-sm font-medium">
                  {flowData.optimalPaths[filters.highlightPath]!.description}
                </p>
                <p className="text-xs text-muted-foreground">
                  {flowData.optimalPaths[filters.highlightPath]!.participantCount || 0}{' '}
                  participant
                  {flowData.optimalPaths[filters.highlightPath]!.participantCount !== 1
                    ? 's'
                    : ''}{' '}
                  took this exact path
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Node Detail Panel — only render Sheet fallback when no external handler */}
      {flowData && !onNodeDetailOpen && (
        <FlowNodeDetail
          node={detailNode}
          open={detailPanelOpen}
          onOpenChange={setDetailPanelOpen}
          data={flowData}
          onNodeSelect={(node) => {
            setDetailNode(node)
          }}
        />
      )}
    </div>
  )
})

export default FlowDiagramTab
