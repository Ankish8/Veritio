/**
 * Interactive Heatmap Module
 *
 * Provides dynamic heatmap visualization overlaid on navigable Figma prototypes.
 * Implements Phase 2 of the Market Leader Plan with component state filtering.
 */

// Main container component
export { InteractivePrototypeView } from './interactive-prototype-view'

// Overlay components
export { HeatmapOverlay } from './heatmap-overlay'
export type { HeatmapClick } from './heatmap-overlay'

export { ClickTrailRenderer } from './click-trail-renderer'
export type { TrailClick } from './click-trail-renderer'

// State UI components
export { StateIndicator } from './state-indicator'
export { StateHistoryPanel } from './state-history-panel'

// State management hook
export {
  useInteractiveHeatmapState,
  type ClickWithState,
  type StateMatchingMode,
  type RecordedState,
} from './hooks/use-interactive-heatmap-state'
