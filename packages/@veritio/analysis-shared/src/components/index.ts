// Display components (standalone, no app dependencies)
export { CompletionDisplay } from './completion-display'
export { TimeDisplay } from './time-display'
export { LocationDisplay } from './location-display'
export { DeviceInfoDisplay } from './device-info-display'
export { FindabilityBadge } from './findability-badge'
export { FindabilityGauge } from './findability-gauge'
export { LostnessIndicator, LostnessBadge } from './lostness-indicator'

// Shared panel components (standalone)
export {
  StudyInfoPanel,
  type StudyInfoPanelProps,
  type CardSortDisplaySettings,
  type TreeTestDisplaySettings,
  type FirstClickDisplaySettings,
  type FirstImpressionDisplaySettings,
  type PrototypeTestDisplaySettings,
  type SurveyDisplaySettings,
  type TestDisplaySettings,
} from './shared/study-info-panel'

// Participants list components (standalone)
export {
  ParticipantsListBase,
  type ParticipantsListBaseProps,
  type RowHandlers,
  type DialogHandlers,
} from './participants-list-base'

// Grid components for participant tables (CSS Grid based)
export {
  GridHeaderCell,
  GridCell,
  GridCheckboxCell,
  GridRow,
  ParticipantStatusBadge,
} from './participants-grid'

// Downloads tab (standalone)
export {
  DownloadsTabBase,
  type DownloadsTabBaseProps,
  type ExportOption,
  type ExportFormat,
} from './downloads-tab-base'

// Participant detail dialog base (standalone)
export {
  ParticipantDetailDialogBase,
  StatCard,
  InfoRow,
  type ParticipantDetailDialogBaseProps,
  type StatCardProps,
  type InfoRowProps,
} from './participant-detail-dialog-base'

// Participant detail panel (standalone)
export {
  ParticipantDetailPanel,
  QuestionResponseCard,
  type ParticipantDetailPanelProps,
  type ParticipantSummaryStats,
} from './participant-detail-panel'

// Analysis Table (CSS Grid based, clean header styling)
export {
  AnalysisTable,
  AnalysisTableRow,
  AnalysisTableCell,
  buildGridColumns,
  type AnalysisTableColumn,
  type AnalysisTableProps,
  type AnalysisTableRowProps,
  type AnalysisTableCellProps,
} from './analysis-table'

// Status filter configs (pure data, no dependencies)
export {
  standardStatusFilterConfig,
  treeTestStatusFilterConfig,
  prototypeTestStatusFilterConfig,
  firstImpressionStatusFilterConfig,
  liveWebsiteStatusFilterConfig,
  type StandardStatusFilter,
  type TreeTestStatusFilter,
  type PrototypeTestStatusFilter,
  type FirstImpressionStatusFilter,
  type LiveWebsiteStatusFilter,
} from './participants-tab-container/status-filter-configs'

// Participants tab container types (pure types, no dependencies)
export type {
  StatusFilterOption,
  StatusFilterConfig,
  SegmentConfig,
  ParticipantsListRenderProps,
  SegmentsListRenderProps,
  ParticipantsTabContainerBaseProps,
} from './participants-tab-container/types'

// Click Maps components (standalone, no app dependencies)
export { HeatmapRenderer } from './click-maps/heatmap-renderer'
export { GridRenderer } from './click-maps/grid-renderer'
