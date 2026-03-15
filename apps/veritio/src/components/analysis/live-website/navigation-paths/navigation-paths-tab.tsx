'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { Route } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { TaskSelector } from '../../prototype-test/task-results/task-selector'
import { useFloatingActionBar } from '../../shared/floating-action-bar'
import { PathsTable } from './paths-table'
import { PathDetailPanel } from './path-detail-panel'
import { ResultFiltersDropdown } from './result-filters-dropdown'
import { buildParticipantPaths, computeAggregatedPaths, computeIndividualPaths, filterAggregatedByResultTypes, filterIndividualByResultTypes } from './paths-data'
import {
  type LiveWebsiteResultType,
  type AggregatedPathData,
  type IndividualPathData,
  ALL_RESULT_TYPES,
  shortenUrl,
  normalizeUrlForComparison,
} from './paths-utils'
import { UrlBreadcrumb } from './url-breadcrumb'
import type {
  LiveWebsiteTask,
  LiveWebsiteEvent,
  LiveWebsiteResponse,
  LiveWebsitePageScreenshot,
} from '@/app/(dashboard)/projects/[projectId]/studies/[studyId]/results/types'
import type { Participant } from '@veritio/study-types'
import type { ParticipantDisplaySettings } from '@veritio/study-types/study-flow-types'
import { resolveParticipantDisplay, extractDemographicsFromMetadata } from '@/lib/utils/participant-display'

const PANEL_ID = 'nav-path-detail'

interface NavigationPathsTabProps {
  tasks: LiveWebsiteTask[]
  events: LiveWebsiteEvent[]
  responses: LiveWebsiteResponse[]
  participants: Participant[]
  screenshots: LiveWebsitePageScreenshot[]
  displaySettings?: ParticipantDisplaySettings | null
}

export function NavigationPathsTab({
  tasks,
  events,
  responses,
  participants,
  screenshots,
  displaySettings,
}: NavigationPathsTabProps) {
  const { openDynamicPanel, closePanel, activePanel, addPageAction, removePageAction } = useFloatingActionBar()

  const selectorTasks = useMemo(
    () => tasks.map(t => ({ taskId: t.id, title: t.title })),
    [tasks],
  )

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(
    selectorTasks.length > 0 ? selectorTasks[0].taskId : null
  )
  const [selectedResultTypes, setSelectedResultTypes] = useState<Set<LiveWebsiteResultType>>(
    new Set(ALL_RESULT_TYPES)
  )
  const [showAllParticipants, setShowAllParticipants] = useState(false)

  // Refs for stable callbacks in openDynamicPanel (same pattern as use-path-detail-panel.tsx)
  const openPathKeyRef = useRef<string | null>(null)
  const activePanelRef = useRef(activePanel)
  // eslint-disable-next-line react-hooks/refs
  activePanelRef.current = activePanel
  const closePanelRef = useRef(closePanel)
  // eslint-disable-next-line react-hooks/refs
  closePanelRef.current = closePanel

  // Refs that hold the latest open functions (for prev/next navigation)
  const openAggRef = useRef<(path: AggregatedPathData, index: number) => void>(() => {})
  const openIndRef = useRef<(path: IndividualPathData, index: number) => void>(() => {})

  // Build participant index map
  const participantIndexMap = useMemo(() => {
    const map = new Map<string, number>()
    participants.forEach((p, i) => map.set(p.id, i + 1))
    return map
  }, [participants])

  // Build participant display map (id → { primary, secondary })
  const participantDisplayMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof resolveParticipantDisplay>>()
    participants.forEach((p, i) => {
      const demographics = extractDemographicsFromMetadata(p.metadata)
      const display = resolveParticipantDisplay(displaySettings ?? null, {
        index: i + 1,
        demographics,
      })
      map.set(p.id, display)
    })
    return map
  }, [participants, displaySettings])

  // Build screenshot map (normalizedUrl → screenshot)
  const screenshotMap = useMemo(() => {
    const map = new Map<string, LiveWebsitePageScreenshot>()
    for (const s of screenshots) {
      const key = normalizeUrlForComparison(s.page_url)
      const existing = map.get(key)
      if (!existing || s.captured_at > existing.captured_at) {
        map.set(key, s)
      }
    }
    return map
  }, [screenshots])

  // Get selected task
  const selectedTask = useMemo(
    () => tasks.find(t => t.id === selectedTaskId) ?? null,
    [tasks, selectedTaskId],
  )

  const targetUrl = selectedTask?.success_url || selectedTask?.target_url || null

  // Extract full path URLs from success_path (for exact_path criteria)
  const successPathUrls = useMemo(() => {
    const sp = selectedTask?.success_path as { steps?: { fullUrl?: string; pathname?: string }[] } | null
    if (!sp?.steps || sp.steps.length < 2) return []
    return sp.steps
      .filter((s): s is { fullUrl: string; pathname?: string } => !!s.fullUrl)
      .map(s => s.fullUrl)
  }, [selectedTask?.success_path])

  // Build paths data
  const participantPaths = useMemo(() => {
    if (!selectedTaskId) return []
    return buildParticipantPaths(selectedTaskId, events, responses, participantIndexMap, participantDisplayMap)
  }, [selectedTaskId, events, responses, participantIndexMap, participantDisplayMap])

  const totalParticipants = participantPaths.length

  const aggregatedPaths = useMemo(
    () => computeAggregatedPaths(participantPaths, totalParticipants),
    [participantPaths, totalParticipants],
  )

  const individualPaths = useMemo(
    () => computeIndividualPaths(participantPaths),
    [participantPaths],
  )

  // Filter by result types
  const filteredAggregated = useMemo(() => {
    if (selectedResultTypes.size === ALL_RESULT_TYPES.length) return aggregatedPaths
    return filterAggregatedByResultTypes(aggregatedPaths, selectedResultTypes)
  }, [aggregatedPaths, selectedResultTypes])

  const filteredIndividual = useMemo(() => {
    if (selectedResultTypes.size === ALL_RESULT_TYPES.length) return individualPaths
    return filterIndividualByResultTypes(individualPaths, selectedResultTypes)
  }, [individualPaths, selectedResultTypes])

  const uniquePathCount = useMemo(
    () => new Set(aggregatedPaths.map(p => p.urlSequence.map(shortenUrl).join('>'))).size,
    [aggregatedPaths],
  )

  // Store latest filtered data in refs for navigation callbacks
  const filteredAggregatedRef = useRef(filteredAggregated)
  // eslint-disable-next-line react-hooks/refs
  filteredAggregatedRef.current = filteredAggregated
  const filteredIndividualRef = useRef(filteredIndividual)
  // eslint-disable-next-line react-hooks/refs
  filteredIndividualRef.current = filteredIndividual
  const screenshotMapRef = useRef(screenshotMap)
  // eslint-disable-next-line react-hooks/refs
  screenshotMapRef.current = screenshotMap
  const targetUrlRef = useRef(targetUrl)
  // eslint-disable-next-line react-hooks/refs
  targetUrlRef.current = targetUrl

  // ── Panel open/close logic ──────────────────────────────────────────────

  const handleClose = useCallback(() => {
    openPathKeyRef.current = null
    closePanelRef.current()
  }, [])

  const openAggregatedPathDetail = useCallback((path: AggregatedPathData, index: number) => {
    const key = `agg:${path.pathKey}`
    // Toggle: click same row again to close
    if (openPathKeyRef.current === key && activePanelRef.current === PANEL_ID) {
      handleClose()
      return
    }
    openPathKeyRef.current = key

    const handleNavigate = (direction: 'prev' | 'next') => {
      const newIndex = direction === 'prev' ? index - 1 : index + 1
      const data = filteredAggregatedRef.current
      if (newIndex < 0 || newIndex >= data.length) return
      openAggRef.current(data[newIndex], newIndex)
    }

    openDynamicPanel(PANEL_ID, {
      content: (
        <PathDetailPanel
          mode="aggregated"
          aggregatedPath={path}
          targetUrl={targetUrlRef.current}
          screenshotMap={screenshotMapRef.current}
          currentIndex={index}
          totalCount={filteredAggregatedRef.current.length}
          onNavigate={handleNavigate}
          onClose={handleClose}
        />
      ),
      hideHeader: true,
      width: 'default',
    })
  }, [openDynamicPanel, handleClose])

  const openIndividualPathDetail = useCallback((path: IndividualPathData, index: number) => {
    const key = `ind:${path.participantId}-${index}`
    if (openPathKeyRef.current === key && activePanelRef.current === PANEL_ID) {
      handleClose()
      return
    }
    openPathKeyRef.current = key

    const handleNavigate = (direction: 'prev' | 'next') => {
      const newIndex = direction === 'prev' ? index - 1 : index + 1
      const data = filteredIndividualRef.current
      if (newIndex < 0 || newIndex >= data.length) return
      openIndRef.current(data[newIndex], newIndex)
    }

    openDynamicPanel(PANEL_ID, {
      content: (
        <PathDetailPanel
          mode="individual"
          individualPath={path}
          targetUrl={targetUrlRef.current}
          screenshotMap={screenshotMapRef.current}
          currentIndex={index}
          totalCount={filteredIndividualRef.current.length}
          onNavigate={handleNavigate}
          onClose={handleClose}
        />
      ),
      hideHeader: true,
      width: 'default',
    })
  }, [openDynamicPanel, handleClose])

  // Keep refs in sync for recursive navigation
  // eslint-disable-next-line react-hooks/refs
  openAggRef.current = openAggregatedPathDetail
  // eslint-disable-next-line react-hooks/refs
  openIndRef.current = openIndividualPathDetail

  // Close panel when switching modes or tasks
  const handleShowAllParticipantsChange = useCallback((checked: boolean) => {
    setShowAllParticipants(checked)
    handleClose()
  }, [handleClose])

  const handleTaskSelect = useCallback((taskId: string | null) => {
    setSelectedTaskId(taskId)
    handleClose()
  }, [handleClose])

  // ── Register icon in floating action bar ────────────────────────────────

  useEffect(() => {
    addPageAction({
      id: PANEL_ID,
      icon: Route,
      tooltip: 'Navigation Path Detail',
      hidden: true, // Only shown programmatically when a row is clicked
      order: 5,
    })
    return () => removePageAction(PANEL_ID)
  }, [addPageAction, removePageAction])

  // ── Render ──────────────────────────────────────────────────────────────

  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <h3 className="font-medium text-lg mb-2">No Tasks</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          This live website test has no tasks defined. Add tasks in the builder to see navigation paths.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Task selector */}
      <TaskSelector
        tasks={selectorTasks}
        selectedTaskId={selectedTaskId}
        onTaskSelect={handleTaskSelect}
        hideLabel
      />

      {/* Task context: expected path + summary stats */}
      {selectedTask && totalParticipants > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          {selectedTask.success_criteria_type === 'exact_path' && successPathUrls.length > 0 ? (
            <div className="flex items-center gap-1.5">
              <span className="text-sm text-muted-foreground">Expected path:</span>
              <UrlBreadcrumb urls={successPathUrls} targetUrl={successPathUrls[successPathUrls.length - 1]} />
            </div>
          ) : targetUrl ? (
            <div className="flex items-center gap-1.5">
              <span className="text-sm text-muted-foreground">Target:</span>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-muted text-green-700 dark:text-green-400">
                {shortenUrl(targetUrl)}
              </span>
            </div>
          ) : null}
          <span className="text-sm text-muted-foreground">
            {uniquePathCount} unique path{uniquePathCount !== 1 ? 's' : ''} · {totalParticipants} participant{totalParticipants !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Toolbar: Filters + Show all participants */}
      <div className="flex items-center gap-3">
        <ResultFiltersDropdown
          selectedTypes={selectedResultTypes}
          onSelectedTypesChange={setSelectedResultTypes}
        />
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox
            checked={showAllParticipants}
            onCheckedChange={(checked) => handleShowAllParticipantsChange(!!checked)}
          />
          <span className="text-sm">Show all participants</span>
        </label>
      </div>

      {/* Table */}
      {totalParticipants > 0 ? (
        <PathsTable
          aggregatedData={filteredAggregated}
          individualData={filteredIndividual}
          showAllParticipants={showAllParticipants}
          targetUrl={targetUrl}
          onAggregatedPathClick={openAggregatedPathDetail}
          onIndividualPathClick={openIndividualPathDetail}
        />
      ) : (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <h3 className="font-medium text-lg mb-2">No Navigation Data</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            No navigation events have been recorded for this task yet. Navigation path data is collected when participants browse the live website.
          </p>
        </div>
      )}
    </div>
  )
}
