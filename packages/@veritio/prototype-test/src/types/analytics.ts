export interface ClickEventData {
  id: string
  taskId: string
  frameId: string
  participantId: string
  sessionId: string
  x: number
  y: number
  normalizedX: number
  normalizedY: number
  timestamp: string
  wasHotspot: boolean
  triggeredTransition: boolean
  timeSinceFrameLoadMs?: number
  pageVisitNumber: number
  componentStates?: Record<string, string>
}

export interface HeatmapPoint {
  x: number
  y: number
  value: number
  wasHotspot?: boolean
}

export interface FrameClickStats {
  frameId: string
  frameName: string
  thumbnailUrl: string | null
  frameWidth: number | null
  frameHeight: number | null
  totalVisitors: number
  totalClicks: number
  hits: number
  misses: number
  hitRate: number
  avgTimeOnFrameMs: number
}

export interface FrameWithStats {
  id: string
  name: string
  thumbnailUrl: string | null
  frameWidth: number | null
  frameHeight: number | null
  pageVisits: number
  uniqueVisitors: number
  totalClicks: number
  misclickCount: number
  avgTimeMs: number
  isStartingScreen?: boolean
  isCorrectDestination?: boolean
}

export type PageVisitFilter = 'all' | 'first' | 'second' | 'third' | 'fourth_plus'

export type ClickDisplayMode = 'heatmap' | 'grid' | 'selection' | 'contour' | 'hexbin'

export type FrameSortOption = 'visits' | 'time' | 'misclicks'

export interface ClickEventFilters {
  taskId?: string
  frameId?: string
  participantId?: string
  pageVisit?: PageVisitFilter
}

export interface ClickEventsResponse {
  clicks: ClickEventData[]
  frames: FrameWithStats[]
  taskInfo: {
    taskId: string
    taskTitle: string
    startFrameId: string | null
    successFrameIds: string[]
  } | null
}

export interface FrameClickDataResponse {
  frameId: string
  frameName: string
  thumbnailUrl: string | null
  frameWidth: number
  frameHeight: number
  clicks: ClickEventData[]
  stats: FrameClickStats
}

export interface HeatmapRendererProps {
  clicks: ClickEventData[]
  frameUrl: string | null
  frameWidth: number
  frameHeight: number
  displayMode: ClickDisplayMode
  showPercentageLabels?: boolean
  className?: string
}

export interface ClickStatsSidebarProps {
  stats: FrameClickStats | null
  isLoading?: boolean
  onDownloadPNG?: () => void
}

export interface AllPagesGridProps {
  frames: FrameWithStats[]
  selectedFrameId?: string
  sortBy: FrameSortOption
  onFrameSelect: (frameId: string) => void
  onSortChange: (sort: FrameSortOption) => void
  isLoading?: boolean
}

export interface FirstClickEventData {
  id: string
  taskId: string
  imageId: string
  participantId: string
  x: number
  y: number
  normalizedX: number
  normalizedY: number
  timestamp: string
  wasCorrect: boolean
  matchedAoiId: string | null
  timeToClickMs: number | null
  isSkipped: boolean
}

export interface FirstClickStats {
  totalClicks: number
  successRate: number
  uniqueParticipants: number
  avgTimeMs: number | null
  medianTimeMs: number | null
  hits: number
  misses: number
  skipped: number
}

export type HeatmapPalette = 'classic' | 'high-contrast'

export interface HeatmapSettings {
  radius: number
  opacity: number
  blur: number
  palette: HeatmapPalette
  showFirstClickOnly: boolean
  showHitsOnly: boolean
  showMissesOnly: boolean
  grayscaleBackground: boolean
}

export const DEFAULT_HEATMAP_SETTINGS: HeatmapSettings = {
  radius: 25,
  opacity: 0.6,
  blur: 0.75,
  palette: 'classic',
  showFirstClickOnly: false,
  showHitsOnly: false,
  showMissesOnly: false,
  grayscaleBackground: false,
}

export interface ClickArea {
  id: string
  x: number
  y: number
  width: number
  height: number
  name: string
  clickCount: number
  percentage: number
}

export type SelectionPinStyle = 'pin' | 'dot' | 'response-time'

export type SelectionPinSize = 'small' | 'medium' | 'large'

export interface SelectionSettings {
  pinStyle: SelectionPinStyle
  pinSize: SelectionPinSize
  overlayOpacity: number
  showAnimation: boolean
  showLabels: boolean
  showFirstClickOnly: boolean
  showHitsOnly: boolean
  showMissesOnly: boolean
  grayscaleBackground: boolean
}

export const DEFAULT_SELECTION_SETTINGS: SelectionSettings = {
  pinStyle: 'pin',
  pinSize: 'medium',
  overlayOpacity: 0,
  showAnimation: true,
  showLabels: false,
  showFirstClickOnly: false,
  showHitsOnly: false,
  showMissesOnly: false,
  grayscaleBackground: false,
}

export type { TaskOutcome } from '../algorithms/prototype-test-analysis'

export type {
  LostnessResult,
  PathEfficiencyResult,
  ConfusionPoint,
  FrameDwellStats,
  DwellTimeAnalysis,
  AdvancedTaskMetrics,
  NavigationEventForMetrics,
  FrameMetadata,
} from '../algorithms/advanced-metrics'

export {
  LOSTNESS_THRESHOLDS,
  PATH_EFFICIENCY_WEIGHTS,
  CONFUSION_THRESHOLD_MULTIPLIER,
  computeLostness,
  computeAverageLostness,
  computePathEfficiency,
  computeAveragePathEfficiency,
  identifyConfusionPoints,
  computeDwellTimeAnalysis,
  computeAdvancedTaskMetrics,
  getLostnessColorClass,
  getPathEfficiencyColorClass,
  formatLostnessInterpretation,
  formatPathEfficiencyInterpretation,
  formatDwellTime,
} from '../algorithms/advanced-metrics'
