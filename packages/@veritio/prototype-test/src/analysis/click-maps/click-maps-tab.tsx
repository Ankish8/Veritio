'use client'

import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@veritio/ui/components/select'
import { SearchableSelect } from '@veritio/ui/components/searchable-select'
import { SegmentedControl, type SegmentedControlOption } from '@veritio/ui/components/segmented-control'
import { HelpCircle, Grid3X3, MousePointer2, Play, Image } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@veritio/ui/components/tooltip'
import {
  useClickEvents,
  filterClicksByFrame,
  calculateClickStats,
  sortFrames,
} from '@veritio/prototype-test/hooks'
import { exportElementToPNG, generateHeatmapFilename } from '@veritio/analysis-shared/lib/analytics/heatmap-export'
import { HeatmapRenderer } from '@veritio/analysis-shared/components/click-maps/heatmap-renderer'
import { ClickStatsSidebar } from './click-stats-sidebar'
import { AllPagesGrid } from './all-pages-grid'
import { InteractivePrototypeView } from './interactive'
import type { PrototypeTestPrototype, PrototypeTestFrame } from '@veritio/core/database/types'
import type { PrototypeTestTask, Participant } from '@veritio/prototype-test/lib/supabase/study-flow-types'
import type { ParticipantDisplaySettings } from '@veritio/prototype-test/lib/supabase/study-flow-types'
import type { PageVisitFilter, FrameSortOption, HeatmapSettings, SelectionSettings, ClickDisplayMode } from '@veritio/prototype-test/types/analytics'
import { resolveParticipantDisplay, extractDemographicsFromMetadata } from '@veritio/prototype-test/lib/utils/participant-display'
import type { ClickWithState } from './interactive/hooks/use-interactive-heatmap-state'

// Display modes for prototype test (excludes 'grid' which is only for first-click)
type PrototypeDisplayMode = Exclude<ClickDisplayMode, 'grid'>

// View modes for switching between static heatmap and interactive prototype
type ViewMode = 'static' | 'interactive'

interface ClickMapsTabProps {
  studyId: string
  tasks: PrototypeTestTask[]
  participants: Participant[]
  prototype?: PrototypeTestPrototype | null
  frames?: PrototypeTestFrame[]
  displayMode: PrototypeDisplayMode
  onDisplayModeChange: (mode: PrototypeDisplayMode) => void
  heatmapSettings: HeatmapSettings
  selectionSettings: SelectionSettings
  displaySettings?: ParticipantDisplaySettings | null
}

const PAGE_VISIT_OPTIONS: { value: PageVisitFilter; label: string }[] = [
  { value: 'all', label: 'All page visits' },
  { value: 'first', label: 'First page visit' },
  { value: 'second', label: 'Second page visit' },
  { value: 'third', label: 'Third page visit' },
  { value: 'fourth_plus', label: 'Fourth and subsequent' },
]

const VIEW_TOOLTIP = `"All Page Visits" shows all clicks made on this page.
"First Visit" shows clicks from the first time participants visited this page,
"Second Visit" from their second time, if they returned, and so on.`

const DISPLAY_MODE_TOOLTIP = `Heatmap shows click density using color gradients. Areas where clicks are clustered together appear warmer (red/yellow), while isolated clicks appear cooler (blue/green). The colors represent spatial concentration, not raw click counts.

Selection mode shows individual click points without density blending.`

const DISPLAY_MODE_OPTIONS: SegmentedControlOption<PrototypeDisplayMode>[] = [
  { value: 'heatmap', label: 'Heatmap', icon: Grid3X3 },
  { value: 'selection', label: 'Selection', icon: MousePointer2 },
]

const VIEW_MODE_OPTIONS: SegmentedControlOption<ViewMode>[] = [
  { value: 'static', label: 'Static', icon: Image },
  { value: 'interactive', label: 'Interactive', icon: Play },
]

const INTERACTIVE_VIEW_TOOLTIP = `Static view shows heatmaps on frame screenshots.
Interactive view lets you navigate the actual prototype while seeing real-time click data for each screen and component state.`

const MAX_STATE_LABELS = 3

function buildComponentStateKey(states?: Record<string, string> | null): string | null {
  if (!states || Object.keys(states).length === 0) return null
  const ordered = Object.keys(states)
    .sort()
    .reduce<Record<string, string>>((acc, key) => {
      acc[key] = states[key]
      return acc
    }, {})
  return JSON.stringify(ordered)
}

function formatComponentStates(states: Record<string, string>): string {
  const entries = Object.entries(states)
  if (entries.length === 0) return 'No component states'
  const formatted = entries
    .slice(0, MAX_STATE_LABELS)
    .map(([nodeId, variantId]) => `${nodeId}: ${variantId}`)
  return entries.length > MAX_STATE_LABELS
    ? `${formatted.join(', ')} +${entries.length - MAX_STATE_LABELS} more`
    : formatted.join(', ')
}
export function ClickMapsTab({
  studyId,
  tasks,
  participants,
  prototype,
  frames: prototypeFrames,
  displayMode,
  onDisplayModeChange,
  heatmapSettings,
  selectionSettings,
  displaySettings,
}: ClickMapsTabProps) {
  // View mode state (static vs interactive)
  const [viewMode, setViewMode] = useState<ViewMode>('static')
  const [showTrails, setShowTrails] = useState(false)

  // Filter state
  const [selectedTaskId, setSelectedTaskId] = useState<string>(tasks[0]?.id || '')
  const [pageVisitFilter, setPageVisitFilter] = useState<PageVisitFilter>('all')
  const [selectedParticipantId, setSelectedParticipantId] = useState<string>('all')
  const [stateFilter, setStateFilter] = useState<string>('all')
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null)
  const [frameSortBy, setFrameSortBy] = useState<FrameSortOption>('visits')

  // Ref for PNG export
  const heatmapContainerRef = useRef<HTMLDivElement>(null)

  // Fetch click events with filters
  const { clicks, frames: frameStats, taskInfo, isLoading, error } = useClickEvents(studyId, {
    taskId: selectedTaskId || undefined,
    participantId: selectedParticipantId === 'all' ? undefined : selectedParticipantId,
    pageVisit: pageVisitFilter,
  })

  const stateOptions = useMemo(() => {
    const stateMap = new Map<string, Record<string, string>>()
    clicks.forEach((click) => {
      const key = buildComponentStateKey(click.componentStates)
      if (key && click.componentStates) {
        stateMap.set(key, click.componentStates)
      }
    })

    return Array.from(stateMap.entries()).map(([value, states]) => ({
      value,
      label: formatComponentStates(states),
    }))
  }, [clicks])

  const stateFilteredClicks = useMemo(() => {
    if (stateFilter === 'all') return clicks
    return clicks.filter(
      (click) => buildComponentStateKey(click.componentStates) === stateFilter
    )
  }, [clicks, stateFilter])

  // Get selected task info
  const selectedTask = useMemo(() => {
    return tasks.find(t => t.id === selectedTaskId)
  }, [tasks, selectedTaskId])

  // Auto-select first frame with clicks, or starting screen
  useEffect(() => {
    if (!selectedFrameId && frameStats.length > 0) {
      // Try to select starting screen first
      const startingFrame = frameStats.find(f => f.isStartingScreen)
      if (startingFrame) {
        setSelectedFrameId(startingFrame.id)
      } else {
        // Otherwise select frame with most visits
        const sorted = sortFrames(frameStats, 'visits')
        if (sorted[0]) setSelectedFrameId(sorted[0].id)
      }
    }
  }, [frameStats, selectedFrameId])

  // Get clicks for selected frame
  const frameClicks = useMemo(() => {
    if (!selectedFrameId) return []
    return filterClicksByFrame(stateFilteredClicks, selectedFrameId)
  }, [stateFilteredClicks, selectedFrameId])

  // Get current filter settings based on display mode
  const currentFilterSettings = useMemo(() => {
    return displayMode === 'heatmap' ? heatmapSettings : selectionSettings
  }, [displayMode, heatmapSettings, selectionSettings])

  // Apply same filters as heatmap to get filtered clicks for stats
  const filteredFrameClicks = useMemo(() => {
    let result = frameClicks

    // Filter to first click only per participant
    if (currentFilterSettings.showFirstClickOnly) {
      const seenParticipants = new Set<string>()
      result = result.filter((click) => {
        if (seenParticipants.has(click.participantId)) return false
        seenParticipants.add(click.participantId)
        return true
      })
    }

    // Filter to hits only
    if (currentFilterSettings.showHitsOnly) {
      result = result.filter((click) => click.wasHotspot === true)
    }

    // Filter to misses only
    if (currentFilterSettings.showMissesOnly) {
      result = result.filter((click) => click.wasHotspot === false)
    }

    return result
  }, [frameClicks, currentFilterSettings.showFirstClickOnly, currentFilterSettings.showHitsOnly, currentFilterSettings.showMissesOnly])

  // Determine which filters are active for the sidebar indicator
  const activeFilters = useMemo(() => {
    const filters: string[] = []
    if (currentFilterSettings.showFirstClickOnly) filters.push('First click only')
    if (currentFilterSettings.showHitsOnly) filters.push('Hits only')
    if (currentFilterSettings.showMissesOnly) filters.push('Misses only')
    return filters
  }, [currentFilterSettings.showFirstClickOnly, currentFilterSettings.showHitsOnly, currentFilterSettings.showMissesOnly])

  // Calculate stats for selected frame (using filtered clicks)
  const frameClickStats = useMemo(() => {
    return calculateClickStats(filteredFrameClicks)
  }, [filteredFrameClicks])

  // Transform clicks for interactive view (with state info)
  const interactiveClicks = useMemo((): ClickWithState[] => {
    // Only transform if we're in interactive mode or might switch to it
    return stateFilteredClicks.map((click) => ({
      id: click.id,
      frameId: click.frameId,
      normalizedX: click.normalizedX,
      normalizedY: click.normalizedY,
      wasHotspot: click.wasHotspot,
      timeSinceFrameLoadMs: click.timeSinceFrameLoadMs,
      participantId: click.participantId,
      componentStates: click.componentStates,
      timestamp: click.timestamp,
    }))
  }, [stateFilteredClicks])

  // Get starting frame ID for interactive view
  const startingFrameId = useMemo(() => {
    const task = tasks.find((t) => t.id === selectedTaskId)
    return task?.starting_frame_id || null
  }, [tasks, selectedTaskId])

  // Get selected frame data from frameStats
  const selectedFrame = useMemo(() => {
    const frameStat = frameStats.find(f => f.id === selectedFrameId)
    if (!frameStat) return null
    return {
      id: frameStat.id,
      name: frameStat.name,
      thumbnail_url: frameStat.thumbnailUrl,
      width: frameStat.frameWidth || 1920,
      height: frameStat.frameHeight || 1080,
    }
  }, [frameStats, selectedFrameId])

  // Build participant options for searchable select
  const participantOptions = useMemo(() => {
    const options: { value: string; label: string; secondaryLabel?: string }[] = [
      { value: 'all', label: 'All participants' },
    ]
    participants.forEach((p, index) => {
      const demographics = extractDemographicsFromMetadata(p.metadata)
      const display = resolveParticipantDisplay(displaySettings, {
        index: index + 1,
        demographics,
      })
      // Combine primary and secondary for the dropdown label
      const label = display.secondary
        ? `${display.primary} (${display.secondary})`
        : display.primary
      options.push({ value: p.id, label, secondaryLabel: display.secondary ?? undefined })
    })
    return options
  }, [participants, displaySettings])

  // Handle PNG download
  const handleDownloadPNG = useCallback(async () => {
    if (!heatmapContainerRef.current || !selectedFrame) return

    const filename = generateHeatmapFilename(
      selectedFrame.name,
      selectedTask?.title || undefined
    )

    try {
      await exportElementToPNG(heatmapContainerRef.current, filename)
    } catch {
      // Silent fail - export is a nice-to-have feature
    }
  }, [selectedFrame, selectedTask])

  // Handle frame selection from grid
  const handleFrameSelect = useCallback((frameId: string) => {
    setSelectedFrameId(frameId)
  }, [])

  // Empty state
  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <h3 className="font-medium text-lg mb-2">No Tasks</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          This prototype test has no tasks defined. Add tasks in the builder to see click maps here.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 min-w-0">
      {/* Title */}
      <h2 className="text-lg font-semibold">Clickmaps</h2>

      {/* Filter Controls */}
      <div className="flex flex-wrap items-end gap-4">
        {/* Task Selector */}
        <div className="space-y-1">
          <label className="text-sm font-medium">Select task</label>
          <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select a task" />
            </SelectTrigger>
            <SelectContent>
              {tasks.map((task, index) => (
                <SelectItem key={task.id} value={task.id}>
                  {index + 1}. {task.title || `Task ${index + 1}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Page Visit Filter */}
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <label className="text-sm font-medium">View</label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs whitespace-pre-line">
                  {VIEW_TOOLTIP}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Select value={pageVisitFilter} onValueChange={(v) => setPageVisitFilter(v as PageVisitFilter)}>
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_VISIT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Component State Filter */}
        <div className="space-y-1">
          <label className="text-sm font-medium">Component state</label>
          <Select value={stateFilter} onValueChange={setStateFilter}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="All states" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All states</SelectItem>
              {stateOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* View Mode Toggle (Static vs Interactive) */}
        {prototype && (
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <label className="text-sm font-medium">Experience</label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs whitespace-pre-line">
                    {INTERACTIVE_VIEW_TOOLTIP}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <SegmentedControl
              options={VIEW_MODE_OPTIONS}
              value={viewMode}
              onValueChange={(v) => setViewMode(v as ViewMode)}
            />
          </div>
        )}

        {/* Display Mode Toggle (only in static view) */}
        {viewMode === 'static' && (
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <label className="text-sm font-medium">View mode</label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs whitespace-pre-line">
                    {DISPLAY_MODE_TOOLTIP}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <SegmentedControl
              options={DISPLAY_MODE_OPTIONS}
              value={displayMode}
              onValueChange={(v) => onDisplayModeChange(v as PrototypeDisplayMode)}
            />
          </div>
        )}

        {/* Participant Filter */}
        <div className="space-y-1">
          <label className="text-sm font-medium">&nbsp;</label>
          <SearchableSelect
            value={selectedParticipantId}
            onValueChange={setSelectedParticipantId}
            options={participantOptions}
            placeholder="Select participant"
            searchPlaceholder="Search participants..."
            className="w-48"
          />
        </div>
      </div>

      {/* Task Title */}
      {selectedTask && (
        <div className="space-y-1">
          <h3 className="font-medium">
            {tasks.findIndex(t => t.id === selectedTaskId) + 1}. {selectedTask.title}
          </h3>
          {selectedTask.instruction && (
            <p className="text-sm text-muted-foreground">{selectedTask.instruction}</p>
          )}
        </div>
      )}

      {/* Main Content */}
      {viewMode === 'interactive' && prototype && prototypeFrames ? (
        /* Interactive View - Navigate prototype with real-time heatmap */
        <div className="rounded-lg border overflow-hidden" style={{ height: '600px' }}>
          <InteractivePrototypeView
            prototype={prototype}
            frames={prototypeFrames}
            clicks={interactiveClicks}
            startingFrameId={startingFrameId}
            showTrails={showTrails}
            onTrailsChange={setShowTrails}
          />
        </div>
      ) : (
        /* Static View - Heatmap on thumbnails */
        <>
          <div className="flex gap-4 min-w-0 overflow-hidden">
            {/* Heatmap Area */}
            <div ref={heatmapContainerRef} className="flex-1 min-w-0 overflow-hidden">
              {error ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
                  Failed to load click data: {error}
                </div>
              ) : (
                <HeatmapRenderer
                  clicks={frameClicks}
                  imageUrl={selectedFrame?.thumbnail_url || null}
                  imageWidth={selectedFrame?.width || 1920}
                  imageHeight={selectedFrame?.height || 1080}
                  displayMode={displayMode}
                  settings={heatmapSettings}
                  selectionSettings={selectionSettings}
                />
              )}
            </div>

            {/* Stats Sidebar */}
            <ClickStatsSidebar
              frameName={selectedFrame?.name || null}
              totalVisitors={frameClickStats.uniqueParticipants}
              totalClicks={frameClickStats.totalClicks}
              hits={frameClickStats.hits}
              misses={frameClickStats.misses}
              hitRate={frameClickStats.hitRate}
              avgTimeMs={frameClickStats.avgTimeMs}
              medianTimeMs={frameClickStats.medianTimeMs}
              activeFilters={activeFilters}
              isLoading={isLoading}
              onDownloadPNG={handleDownloadPNG}
            />
          </div>

          {/* All Pages Grid */}
          <AllPagesGrid
            frames={frameStats}
            selectedFrameId={selectedFrameId || undefined}
            sortBy={frameSortBy}
            onFrameSelect={handleFrameSelect}
            onSortChange={setFrameSortBy}
            isLoading={isLoading}
          />
        </>
      )}
    </div>
  )
}
