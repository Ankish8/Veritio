/**
 * Analytics types for click maps, heatmaps, and prototype test analysis.
 * These types are used across the service layer, hooks, and UI components.
 */

// ============================================================================
// Click Event Types
// ============================================================================

/**
 * Raw click event from database with normalized coordinates
 */
export interface ClickEventData {
  id: string
  taskId: string
  frameId: string
  participantId: string
  sessionId: string
  x: number                    // Original pixel X coordinate
  y: number                    // Original pixel Y coordinate
  normalizedX: number          // X as percentage (0-100) of frame width
  normalizedY: number          // Y as percentage (0-100) of frame height
  timestamp: string
  wasHotspot: boolean
  triggeredTransition: boolean
  timeSinceFrameLoadMs?: number
  pageVisitNumber: number      // 1 = first visit, 2 = second visit, etc.
  componentStates?: Record<string, string>
}

/**
 * Aggregated click point for heatmap rendering
 */
export interface HeatmapPoint {
  x: number                    // Percentage (0-100) of display width
  y: number                    // Percentage (0-100) of display height
  value: number                // Click count at this point
  wasHotspot?: boolean         // For color coding hits vs misses
}

// ============================================================================
// Frame Statistics Types
// ============================================================================

/**
 * Aggregated statistics for a single frame/screen
 */
export interface FrameClickStats {
  frameId: string
  frameName: string
  thumbnailUrl: string | null
  frameWidth: number | null
  frameHeight: number | null
  totalVisitors: number        // Distinct participants who visited
  totalClicks: number          // All clicks on this frame
  hits: number                 // Clicks on hotspots
  misses: number               // Clicks NOT on hotspots
  hitRate: number              // hits / totalClicks * 100 (percentage)
  avgTimeOnFrameMs: number     // Average time spent on frame
}

/**
 * Frame with stats for the All Pages grid
 */
export interface FrameWithStats {
  id: string
  name: string
  thumbnailUrl: string | null
  frameWidth: number | null    // Original Figma frame width in pixels
  frameHeight: number | null   // Original Figma frame height in pixels
  pageVisits: number           // Total number of visits to this frame
  uniqueVisitors: number       // Distinct participants
  totalClicks: number
  misclickCount: number
  avgTimeMs: number
  isStartingScreen?: boolean   // For a specific task
  isCorrectDestination?: boolean // For a specific task
}

// ============================================================================
// Filter Types
// ============================================================================

/**
 * Page visit filter options
 */
export type PageVisitFilter = 'all' | 'first' | 'second' | 'third' | 'fourth_plus'

/**
 * Display mode for click visualization
 */
export type ClickDisplayMode = 'heatmap' | 'grid' | 'selection' | 'contour'

/**
 * Sort options for All Pages grid
 */
export type FrameSortOption = 'visits' | 'time' | 'misclicks'

/**
 * Filters for click event queries
 */
export interface ClickEventFilters {
  taskId?: string
  frameId?: string
  participantId?: string
  pageVisit?: PageVisitFilter
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Response from GET /api/studies/:studyId/click-events
 */
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

/**
 * Response for frame-specific click data
 */
export interface FrameClickDataResponse {
  frameId: string
  frameName: string
  thumbnailUrl: string | null
  frameWidth: number
  frameHeight: number
  clicks: ClickEventData[]
  stats: FrameClickStats
}

// ============================================================================
// Component Props Types
// ============================================================================

/**
 * Props for the heatmap renderer component
 */
export interface HeatmapRendererProps {
  clicks: ClickEventData[]
  frameUrl: string | null
  frameWidth: number
  frameHeight: number
  displayMode: ClickDisplayMode
  showPercentageLabels?: boolean
  className?: string
}

/**
 * Props for click stats sidebar
 */
export interface ClickStatsSidebarProps {
  stats: FrameClickStats | null
  isLoading?: boolean
  onDownloadPNG?: () => void
}

/**
 * Props for all pages grid
 */
export interface AllPagesGridProps {
  frames: FrameWithStats[]
  selectedFrameId?: string
  sortBy: FrameSortOption
  onFrameSelect: (frameId: string) => void
  onSortChange: (sort: FrameSortOption) => void
  isLoading?: boolean
}

// ============================================================================
// First-Click Specific Types
// ============================================================================

/**
 * First-click click data (uses 0-1 normalized coordinates)
 */
export interface FirstClickEventData {
  id: string
  taskId: string
  imageId: string
  participantId: string
  x: number                    // Normalized X (0-1)
  y: number                    // Normalized Y (0-1)
  normalizedX: number          // X as percentage (0-100) for display
  normalizedY: number          // Y as percentage (0-100) for display
  timestamp: string
  wasCorrect: boolean          // Hit correct AOI
  matchedAoiId: string | null
  timeToClickMs: number | null
  isSkipped: boolean
}

/**
 * Enhanced click statistics for first-click analysis
 */
export interface FirstClickStats {
  totalClicks: number
  successRate: number          // Percentage of correct clicks (0-100)
  uniqueParticipants: number
  avgTimeMs: number | null
  medianTimeMs: number | null
  hits: number                 // Correct clicks
  misses: number               // Incorrect clicks
  skipped: number              // Skipped responses
}

// ============================================================================
// Heatmap Settings Types
// ============================================================================

/**
 * Available color palettes for heatmap visualization
 */
export type HeatmapPalette = 'classic' | 'high-contrast'

/**
 * User-configurable heatmap visualization settings
 * These persist to localStorage for user preference retention
 */
export interface HeatmapSettings {
  // Visualization parameters
  radius: number              // Heat point radius in pixels (10-50, default 25)
  opacity: number             // Max opacity of heatmap overlay (0.3-1.0, default 0.6)
  blur: number                // Blur amount for heat gradient (0.5-1.0, default 0.75)
  palette: HeatmapPalette     // Color gradient preset

  // Click filters
  showFirstClickOnly: boolean // Only show first click per participant per frame
  showHitsOnly: boolean       // Only show clicks on hotspots (interactive areas)
  showMissesOnly: boolean     // Only show clicks outside hotspots

  // Display options
  grayscaleBackground: boolean // Convert background image to grayscale
}

/**
 * Default heatmap settings
 */
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

/**
 * User-defined click area for analyzing specific regions
 * Used for calculating percentage of clicks within a drawn rectangle
 */
export interface ClickArea {
  id: string
  x: number                   // Top-left X as percentage (0-100) of frame width
  y: number                   // Top-left Y as percentage (0-100) of frame height
  width: number               // Width as percentage (0-100) of frame width
  height: number              // Height as percentage (0-100) of frame height
  name: string                // User-defined label (e.g., "CTA Button Area")
  clickCount: number          // Calculated: clicks within this area
  percentage: number          // Calculated: (clickCount / totalClicks) * 100
}

// ============================================================================
// Selection Settings Types
// ============================================================================

/**
 * Available pin styles for selection visualization
 * - pin: Teardrop marker pointing to click location
 * - dot: Simple circular marker
 * - response-time: Shows time elapsed since page load (e.g., "1.2s")
 */
export type SelectionPinStyle = 'pin' | 'dot' | 'response-time'

/**
 * Pin size presets
 */
export type SelectionPinSize = 'small' | 'medium' | 'large'

/**
 * User-configurable selection visualization settings
 * These persist to localStorage for user preference retention
 */
export interface SelectionSettings {
  // Pin appearance
  pinStyle: SelectionPinStyle       // Visual style of click markers
  pinSize: SelectionPinSize         // Size of click markers

  // Display options
  overlayOpacity: number            // Background overlay darkness (0-0.3, default 0 = no overlay)
  showAnimation: boolean            // Enable drop-in animation
  showLabels: boolean               // Show "Hit"/"Miss" labels on pins

  // Click filters (shared with heatmap for consistency)
  showFirstClickOnly: boolean       // Only show first click per participant per frame
  showHitsOnly: boolean             // Only show clicks on hotspots
  showMissesOnly: boolean           // Only show clicks outside hotspots

  // Background
  grayscaleBackground: boolean      // Convert background image to grayscale
}

/**
 * Default selection settings
 */
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
