'use client'

/**
 * First-Click Click Maps Tab
 *
 * Main orchestrator component for first-click click maps visualization.
 * Supports four display modes: Heatmap, Grid, Selection, and Contour.
 */

import React, { useState, useCallback, useRef, useMemo, Suspense } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Card, CardContent } from '@/components/ui/card'
import { Grid3X3, MousePointer2, Flame, MousePointer, ThumbsUp, SkipForward, Clock, HelpCircle, Layers } from 'lucide-react'
import { useFirstClickEvents, calculateFirstClickStats } from '@/hooks/use-first-click-events'
import { useFirstClickSpatialStats } from '@/hooks/use-first-click-spatial-stats'
import { useFirstClickClusters } from '@/hooks/use-first-click-clusters'
import { exportElementToPNG, generateHeatmapFilename } from '@/lib/analytics'
import { HeatmapRenderer, GridRenderer, ClickStatsCard } from '../shared/click-maps'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { ClickDisplayMode, FirstClickStats, HeatmapSettings } from '@/types/analytics'
import { CLUSTER_COLORS, type ColorSchemeName } from '@/lib/d3/color-schemes'
import { STATUS_COLORS, SPATIAL_COLORS, OVERLAY_COLORS } from '@/lib/colors'

const ContourDensityPlot = React.lazy(() =>
  import('./visualizations/contour-density-plot').then(m => ({ default: m.ContourDensityPlot }))
)
const AoiOverlay = React.lazy(() =>
  import('./visualizations/aoi-overlay').then(m => ({ default: m.AoiOverlay }))
)
const SpatialOverlay = React.lazy(() =>
  import('./visualizations/spatial-overlay').then(m => ({ default: m.SpatialOverlay }))
)
const ClusterOverlay = React.lazy(() =>
  import('./visualizations/cluster-overlay').then(m => ({ default: m.ClusterOverlay }))
)

/** Default image dimensions used when task images have no explicit size. */
const DEFAULT_IMAGE_WIDTH = 1920
const DEFAULT_IMAGE_HEIGHT = 1080

const DISPLAY_MODE_TOOLTIP = `Heatmap: Click density as color gradients. Warmer = more concentrated.

Grid: Click counts per cell with heatmap colors (blue\u2192green\u2192red).

Selection: Individual click points. Green = correct, red = incorrect.

Contour: Topographic-style density rings. Inner rings = higher concentration.`

const MODE_DESCRIPTIONS: Record<ClickDisplayMode, string> = {
  heatmap: 'Gaussian density visualization. Warmer colors indicate more clicks concentrated in that area. Cooler colors indicate isolated clicks.',
  grid: 'Image divided into equal cells showing click counts. Colors range from blue (few clicks) through green to red (most clicks). Adjust grid size to explore different resolutions.',
  selection: 'Individual click points plotted on the image. Green dots = clicked within the correct area. Red dots = clicked outside.',
  contour: 'Topographic-style density contours around click clusters. Inner rings = higher click concentration. Increase bandwidth to smooth the contours, decrease to sharpen.',
}

/** Reusable overlay toggle: Switch + Label + optional Tooltip. */
function OverlayToggle({
  id,
  label,
  tooltipText,
  checked,
  onChange,
}: {
  id: string
  label: string
  tooltipText?: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
      <Label htmlFor={id} className="text-sm font-normal">
        {label}
      </Label>
      {tooltipText && (
        <Tooltip>
          <TooltipTrigger asChild>
            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="text-xs">{tooltipText}</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}

/**
 * Simple SVG overlay rendering colored click dots on the image.
 */
function ClickDotsOverlay({ clicks, width, height }: {
  clicks: Array<{ x: number; y: number; wasCorrect?: boolean; isSkipped?: boolean }>
  width: number
  height: number
}) {
  const validClicks = clicks.filter(c => !c.isSkipped)
  if (validClicks.length === 0 || width <= 0 || height <= 0) return null

  const dotRadius = Math.max(width, height) * 0.006
  const strokeW = Math.max(width, height) * 0.0015

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      className="absolute inset-0 w-full h-full pointer-events-none"
    >
      {validClicks.map((c, i) => (
        <circle
          key={i}
          cx={c.x * width}
          cy={c.y * height}
          r={dotRadius}
          fill={c.wasCorrect ? STATUS_COLORS.success : STATUS_COLORS.failureLight}
          stroke={OVERLAY_COLORS.white}
          strokeWidth={strokeW}
          opacity={0.9}
        />
      ))}
    </svg>
  )
}

interface FirstClickClickMapsTabProps {
  studyId: string
  /** Heatmap settings - managed by parent for FloatingActionBar integration */
  settings: HeatmapSettings
}

/**
 * First-Click Click Maps Tab Component
 *
 * Features:
 * - Task selector dropdown
 * - Four display modes: Heatmap, Grid, Selection, Contour
 * - Mode-specific controls (grid size, bandwidth, hex radius, color scheme)
 * - Spatial statistics and cluster overlays (composable on any mode)
 * - Enhanced stats display
 * - PNG export
 *
 * Note: Heatmap settings are managed by the parent component and displayed
 * in the FloatingActionBar (right sidebar) via useClickMapsPanels hook.
 */
export function FirstClickClickMapsTab({ studyId, settings }: FirstClickClickMapsTabProps) {
  // State
  const [selectedTaskId, setSelectedTaskId] = useState<string>('')
  const [displayMode, setDisplayMode] = useState<ClickDisplayMode>('heatmap')
  const [gridSize, setGridSize] = useState(5)
  const [showClickDots, setShowClickDots] = useState(true)
  const [showSpatialOverlay, setShowSpatialOverlay] = useState(false)
  const [showClusterOverlay, setShowClusterOverlay] = useState(false)
  const [showAoiOverlay, setShowAoiOverlay] = useState(false)
  const [highlightAoiId, setHighlightAoiId] = useState<string | null>(null)
  const [contourBandwidth, setContourBandwidth] = useState(20)
  const [colorScheme, setColorScheme] = useState<ColorSchemeName>('viridis')
  const [weightByTime, setWeightByTime] = useState(false)

  // Ref for PNG export
  const visualizationRef = useRef<HTMLDivElement>(null)

  // Fetch data
  const { clicks, tasks, stats, taskInfo, isLoading, error } = useFirstClickEvents(
    studyId,
    { taskId: selectedTaskId || undefined }
  )

  // Default to first task when none selected (avoids set-state-in-effect)
  const effectiveTaskId = selectedTaskId || (tasks.length > 0 ? tasks[0].id : '')

  const filteredClicks = useMemo(() => {
    return effectiveTaskId ? clicks.filter(c => c.taskId === effectiveTaskId) : clicks
  }, [clicks, effectiveTaskId])

  const filteredStats: FirstClickStats | null = useMemo(() => {
    return filteredClicks.length === 0 ? stats : calculateFirstClickStats(filteredClicks)
  }, [filteredClicks, stats])

  // Spatial statistics and clustering overlays
  const spatialStats = useFirstClickSpatialStats(filteredClicks)
  const clusterData = useFirstClickClusters(filteredClicks, { epsilon: 0.06, minPoints: 2 })

  const currentTask = tasks.find(t => t.id === effectiveTaskId)
  const currentTaskIndex = tasks.findIndex(t => t.id === effectiveTaskId)

  const imageUrl = taskInfo?.imageUrl || currentTask?.image?.image_url || null
  const imageWidth = taskInfo?.imageWidth || currentTask?.image?.width || DEFAULT_IMAGE_WIDTH
  const imageHeight = taskInfo?.imageHeight || currentTask?.image?.height || DEFAULT_IMAGE_HEIGHT

  // AOIs for the selected task
  const currentAois = currentTask?.aois ?? []
  const hasAois = currentAois.length > 0

  // Handle PNG download
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const handleDownloadPNG = useCallback(async () => {
    if (!visualizationRef.current || !currentTask) return

    const filename = generateHeatmapFilename(
      currentTask.instruction || 'click-map',
      `task-${currentTaskIndex + 1}`
    )

    try {
      await exportElementToPNG(visualizationRef.current, filename)
    } catch {
      // Silent fail
    }
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  }, [currentTask, currentTaskIndex])

  // Empty state - no tasks
  if (!isLoading && tasks.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <MousePointer className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No Tasks</h3>
          <p className="text-sm text-muted-foreground mt-2 text-center max-w-md">
            Add tasks to your first-click test to see click maps.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <h2 className="text-lg font-semibold">Clickmaps</h2>

      {/* Controls Row — single TooltipProvider wraps all toggles */}
      <TooltipProvider>
        <div className="flex flex-wrap items-end gap-4">
          {/* Task Selector */}
          <div className="space-y-1.5">
            <Label>Select task</Label>
            <Select value={effectiveTaskId} onValueChange={setSelectedTaskId}>
              <SelectTrigger className="w-full sm:w-72">
                <SelectValue placeholder="Select a task" />
              </SelectTrigger>
              <SelectContent>
                {tasks.map((task, index) => (
                  <SelectItem key={task.id} value={task.id}>
                    {index + 1}. {task.instruction?.slice(0, 50) || `Task ${index + 1}`}
                    {task.instruction && task.instruction.length > 50 && '...'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Display Mode Toggle */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1">
              <Label>Display mode</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs whitespace-pre-line">
                  {DISPLAY_MODE_TOOLTIP}
                </TooltipContent>
              </Tooltip>
            </div>
            <Select value={displayMode} onValueChange={(v) => setDisplayMode(v as ClickDisplayMode)}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="heatmap">
                  <div className="flex items-center gap-2">
                    <Flame className="h-4 w-4" />
                    Heatmap
                  </div>
                </SelectItem>
                <SelectItem value="grid">
                  <div className="flex items-center gap-2">
                    <Grid3X3 className="h-4 w-4" />
                    Grid
                  </div>
                </SelectItem>
                <SelectItem value="selection">
                  <div className="flex items-center gap-2">
                    <MousePointer2 className="h-4 w-4" />
                    Selection
                  </div>
                </SelectItem>
                <SelectItem value="contour">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    Contour
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Show clicks toggle — visible for grid, selection, and contour modes */}
          {displayMode !== 'heatmap' && (
            <OverlayToggle
              id="show-clicks-toggle"
              label="Show clicks"
              checked={showClickDots}
              onChange={setShowClickDots}
            />
          )}

          {/* Grid-specific controls */}
          {displayMode === 'grid' && (
            <div className="space-y-1.5 w-40">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-normal">Grid size</Label>
                <span className="text-xs text-muted-foreground">{gridSize}x{gridSize}</span>
              </div>
              <Slider
                min={3}
                max={10}
                step={1}
                value={[gridSize]}
                onValueChange={([val]) => setGridSize(val)}
              />
            </div>
          )}

          {/* Contour-specific controls */}
          {displayMode === 'contour' && (
            <>
              <div className="space-y-1.5 w-40">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-normal">Bandwidth</Label>
                  <span className="text-xs text-muted-foreground">{contourBandwidth}px</span>
                </div>
                <Slider
                  min={5}
                  max={50}
                  step={1}
                  value={[contourBandwidth]}
                  onValueChange={([val]) => setContourBandwidth(val)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-normal">Color scheme</Label>
                <Select value={colorScheme} onValueChange={(v) => setColorScheme(v as ColorSchemeName)}>
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viridis">Viridis</SelectItem>
                    <SelectItem value="turbo">Turbo</SelectItem>
                    <SelectItem value="magma">Magma</SelectItem>
                    <SelectItem value="plasma">Plasma</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <OverlayToggle
                id="weight-by-time"
                label="Weight by time"
                checked={weightByTime}
                onChange={setWeightByTime}
              />
            </>
          )}

          {/* Overlay toggles - available for all modes */}
          <div className="flex items-center gap-4 ml-auto">
            {hasAois && (
              <div className="flex items-center gap-2">
                <OverlayToggle
                  id="aoi-overlay-toggle"
                  label="Show areas"
                  tooltipText="Shows the Areas of Interest (AOIs) defined in the builder. These are the target regions participants should click within. Helps you compare actual clicks against expected targets."
                  checked={showAoiOverlay}
                  onChange={setShowAoiOverlay}
                />
                {showAoiOverlay && currentAois.length > 1 && (
                  <Select
                    value={highlightAoiId ?? 'all'}
                    onValueChange={(v) => setHighlightAoiId(v === 'all' ? null : v)}
                  >
                    <SelectTrigger className="w-32 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All areas</SelectItem>
                      {currentAois.map((aoi) => (
                        <SelectItem key={aoi.id} value={aoi.id}>{aoi.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
            <OverlayToggle
              id="spatial-overlay-toggle"
              label="Statistics overlay"
              tooltipText="Shows the mean center (crosshair), standard distance deviation circle (68% of clicks fall within), and deviational ellipse (directional spread). Helps identify whether clicks are focused or scattered."
              checked={showSpatialOverlay}
              onChange={setShowSpatialOverlay}
            />
            <OverlayToggle
              id="cluster-overlay-toggle"
              label="Cluster overlay"
              tooltipText="DBSCAN clustering detects groups of nearby clicks. Each colored boundary marks a distinct click cluster. Useful for identifying confusion zones where multiple participants clicked in the wrong area."
              checked={showClusterOverlay}
              onChange={setShowClusterOverlay}
            />
          </div>
        </div>
      </TooltipProvider>

      {/* Mode Description */}
      <p className="text-sm text-muted-foreground -mt-2">
        {MODE_DESCRIPTIONS[displayMode]}
      </p>

      {/* Task Info Header */}
      {currentTask && (
        <Card className="bg-stone-50 border-stone-200">
          <CardContent className="py-3 px-4">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <h3 className="font-medium">
                {currentTaskIndex + 1}. {currentTask.instruction}
              </h3>
              {filteredStats && (
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MousePointer className="h-3.5 w-3.5" />
                    {filteredStats.totalClicks} clicks
                  </span>
                  <span className="flex items-center gap-1">
                    <ThumbsUp className="h-3.5 w-3.5" />
                    {filteredStats.hits} successful
                  </span>
                  <span className="flex items-center gap-1">
                    <SkipForward className="h-3.5 w-3.5" />
                    {filteredStats.skipped} skips
                  </span>
                  {filteredStats.avgTimeMs !== null && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {(filteredStats.avgTimeMs / 1000).toFixed(1)} avg (secs)
                    </span>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
        {/* Visualization */}
        <div ref={visualizationRef} className="flex-1 min-w-0">
          {error ? (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4 text-red-800">
                Failed to load click data: {error}
              </CardContent>
            </Card>
          ) : isLoading ? (
            <Card>
              <CardContent className="p-8 flex items-center justify-center">
                <div className="animate-pulse text-muted-foreground">Loading click data...</div>
              </CardContent>
            </Card>
          ) : (
            <div className="relative">
              {displayMode === 'grid' ? (
                <GridRenderer
                  clicks={filteredClicks}
                  imageUrl={imageUrl}
                  imageWidth={imageWidth}
                  imageHeight={imageHeight}
                  gridSize={gridSize}
                  showClickDots={showClickDots}
                />
              ) : displayMode === 'contour' ? (
                <div className="relative">
                  {imageUrl && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={imageUrl} alt="" className="w-full" style={{ aspectRatio: `${imageWidth}/${imageHeight}` }} />
                  )}
                  <div className="absolute inset-0">
                    <Suspense fallback={<div className="flex items-center justify-center h-full text-muted-foreground">Loading contour plot...</div>}>
                      <ContourDensityPlot
                        clicks={filteredClicks}
                        width={imageWidth}
                        height={imageHeight}
                        bandwidth={contourBandwidth}
                        colorScheme={colorScheme}
                        weightByTime={weightByTime}
                      />
                    </Suspense>
                  </div>
                  {showClickDots && (
                    <ClickDotsOverlay clicks={filteredClicks} width={imageWidth} height={imageHeight} />
                  )}
                </div>
              ) : (
                <HeatmapRenderer
                  clicks={filteredClicks}
                  imageUrl={imageUrl}
                  imageWidth={imageWidth}
                  imageHeight={imageHeight}
                  displayMode={displayMode === 'selection' ? 'selection' : 'heatmap'}
                  settings={settings}
                />
              )}

              {/* Spatial statistics overlay */}
              {showSpatialOverlay && spatialStats && (
                <div className="absolute inset-0 pointer-events-none">
                  <Suspense fallback={null}>
                    <SpatialOverlay
                      sdd={spatialStats.sdd}
                      meanCenter={spatialStats.meanCenter}
                      ellipse={spatialStats.ellipse ?? undefined}
                      width={imageWidth}
                      height={imageHeight}
                    />
                  </Suspense>
                </div>
              )}

              {/* Cluster overlay */}
              {showClusterOverlay && clusterData && (
                <div className="absolute inset-0 pointer-events-none">
                  <Suspense fallback={null}>
                    <ClusterOverlay
                      clusters={clusterData.confusionZones}
                      width={imageWidth}
                      height={imageHeight}
                    />
                  </Suspense>
                </div>
              )}

              {/* AOI overlay */}
              {showAoiOverlay && hasAois && (
                <div className="absolute inset-0 pointer-events-none">
                  <Suspense fallback={null}>
                    <AoiOverlay
                      aois={currentAois}
                      width={imageWidth}
                      height={imageHeight}
                      highlightAoiId={highlightAoiId}
                    />
                  </Suspense>
                </div>
              )}
            </div>
          )}

          {/* Overlay Legends */}
          {(showSpatialOverlay || showClusterOverlay) && (
            <div className="flex flex-wrap gap-4 mt-3">
              {showSpatialOverlay && spatialStats && (
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-muted-foreground border rounded-lg px-3 py-2 bg-muted/30">
                  <span className="font-medium text-foreground">Statistics</span>
                  <span className="flex items-center gap-1.5">
                    <svg width="12" height="12" viewBox="0 0 12 12"><line x1="0" y1="6" x2="12" y2="6" stroke={SPATIAL_COLORS.meanCenterStroke} strokeWidth="2" /><line x1="6" y1="0" x2="6" y2="12" stroke={SPATIAL_COLORS.meanCenterStroke} strokeWidth="2" /></svg>
                    Mean center ({(spatialStats.meanCenter.x * 100).toFixed(0)}%, {(spatialStats.meanCenter.y * 100).toFixed(0)}%)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <svg width="12" height="12" viewBox="0 0 12 12"><circle cx="6" cy="6" r="5" fill="none" stroke={SPATIAL_COLORS.sddStroke} strokeWidth="1.5" strokeDasharray="3 2" /></svg>
                    SDD circle (r={( spatialStats.sdd.radius * 100).toFixed(1)}%)
                  </span>
                  {spatialStats.ellipse && (
                    <span className="flex items-center gap-1.5">
                      <svg width="12" height="12" viewBox="0 0 12 12"><ellipse cx="6" cy="6" rx="5" ry="3" fill="none" stroke={SPATIAL_COLORS.ellipseStroke} strokeWidth="1.5" strokeDasharray="3 2" /></svg>
                      Deviational ellipse ({(spatialStats.ellipse.rotation * 180 / Math.PI).toFixed(0)}\u00b0)
                    </span>
                  )}
                  {spatialStats.nni && (
                    <span>NNI: {spatialStats.nni.ratio.toFixed(2)} ({spatialStats.nni.pattern})</span>
                  )}
                </div>
              )}
              {showClusterOverlay && clusterData && (
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-muted-foreground border rounded-lg px-3 py-2 bg-muted/30">
                  <span className="font-medium text-foreground">Clusters</span>
                  {clusterData.confusionZones.length === 0 ? (
                    <span>No distinct clusters detected</span>
                  ) : (
                    <>
                      <span>{clusterData.confusionZones.length} cluster{clusterData.confusionZones.length > 1 ? 's' : ''} found</span>
                      {clusterData.confusionZones.map((zone, i) => {
                        const color = CLUSTER_COLORS[i % CLUSTER_COLORS.length]
                        return (
                          <span key={i} className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full border-2" style={{ borderColor: color, backgroundColor: `${color}26` }} />
                            Cluster {i + 1}: {zone.points.length} clicks
                          </span>
                        )
                      })}
                      {clusterData.noiseCount > 0 && (
                        <span className="text-muted-foreground/70">{clusterData.noiseCount} unclustered</span>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stats Sidebar */}
        <ClickStatsCard
          title="Click Statistics"
          stats={filteredStats}
          isLoading={isLoading}
          onDownloadPNG={handleDownloadPNG}
        />
      </div>
    </div>
  )
}
