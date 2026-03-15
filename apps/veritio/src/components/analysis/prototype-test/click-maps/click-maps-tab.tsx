'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { SegmentedControl, type SegmentedControlOption } from '@/components/ui/segmented-control'
import { HelpCircle, Grid3X3, MousePointer2 } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { HeatmapRenderer } from '@veritio/analysis-shared'
import { ClickStatsSidebar } from './click-stats-sidebar'
import { AllPagesGrid } from './all-pages-grid'
import { useClickMapsData } from './use-click-maps-data'
import type { PrototypeDisplayMode } from './use-click-maps-data'
import type { PrototypeTestTask, Participant } from '@veritio/study-types'
import type { ParticipantDisplaySettings } from '@veritio/study-types/study-flow-types'
import type { PageVisitFilter, HeatmapSettings, SelectionSettings } from '@/types/analytics'

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

interface ClickMapsTabProps {
  studyId: string
  tasks: PrototypeTestTask[]
  participants: Participant[]
  /** Current display mode - managed by parent for FloatingActionBar integration */
  displayMode: PrototypeDisplayMode
  /** Callback when display mode changes */
  onDisplayModeChange: (mode: PrototypeDisplayMode) => void
  /** Heatmap settings - managed by parent for FloatingActionBar integration */
  heatmapSettings: HeatmapSettings
  /** Selection settings - managed by parent for FloatingActionBar integration */
  selectionSettings: SelectionSettings
  /** Participant display settings for showing names/emails instead of Participant N */
  displaySettings?: ParticipantDisplaySettings | null
}

/**
 * Main Click Maps tab component for prototype test analysis.
 * Displays heatmaps and click statistics for prototype frames.
 *
 * Note: Settings and display mode are managed by the parent component and displayed
 * in the FloatingActionBar (right sidebar) via useClickMapsPanels hook.
 */
export function ClickMapsTab({
  studyId,
  tasks,
  participants,
  displayMode,
  onDisplayModeChange,
  heatmapSettings,
  selectionSettings,
  displaySettings,
}: ClickMapsTabProps) {
  const {
    selectedTaskId,
    setSelectedTaskId,
    pageVisitFilter,
    setPageVisitFilter,
    selectedParticipantId,
    setSelectedParticipantId,
    stateFilter,
    setStateFilter,
    selectedFrameId,
    setSelectedFrameId,
    frameSortBy,
    setFrameSortBy,
    heatmapContainerRef,
    selectedTask,
    stateOptions,
    frameClicks,
    activeFilters,
    frameClickStats,
    selectedFrame,
    participantOptions,
    frameStats,
    isLoading,
    error,
    handleDownloadPNG,
  } = useClickMapsData({
    studyId,
    tasks,
    participants,
    displayMode,
    heatmapSettings,
    selectionSettings,
    displaySettings,
  })

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

        {/* Display Mode Toggle */}
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

      {/* Main Content: Heatmap + Sidebar */}
      <div className="flex flex-col lg:flex-row gap-4 min-w-0 overflow-hidden">
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
        onFrameSelect={setSelectedFrameId}
        onSortChange={setFrameSortBy}
        isLoading={isLoading}
      />
    </div>
  )
}
