/**
 * Shared Click Maps Components
 *
 * Reusable components for click map visualization across different study types
 * (first-click, prototype test, etc.)
 */

// Re-export consolidated components from @veritio/analysis-shared
export { HeatmapRenderer, GridRenderer } from '@veritio/analysis-shared'

// Local-only component (has @/ dependencies)
export { ClickStatsCard } from './click-stats-card'
