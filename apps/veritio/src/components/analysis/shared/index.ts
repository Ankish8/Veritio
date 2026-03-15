// === Re-exported from @veritio/analysis-shared (source of truth) ===
export {
  // Display components
  CompletionDisplay,
  TimeDisplay,
  LocationDisplay,
  DeviceInfoDisplay,
  FindabilityBadge,
  FindabilityGauge,
  LostnessIndicator,
  LostnessBadge,

  // Participants list
  ParticipantsListBase,
  type ParticipantsListBaseProps,
  type RowHandlers,
  type DialogHandlers,

  // Grid components
  GridHeaderCell,
  GridCell,
  GridCheckboxCell,
  GridRow,
  ParticipantStatusBadge,

  // Downloads tab
  DownloadsTabBase,
  type DownloadsTabBaseProps,
  type ExportOption,

  // Participant detail dialog base
  ParticipantDetailDialogBase,
  StatCard,
  InfoRow,
  type ParticipantDetailDialogBaseProps,
  type StatCardProps,
  type InfoRowProps,

  // Participant detail panel
  ParticipantDetailPanel,
  QuestionResponseCard,
  type ParticipantDetailPanelProps,
  type ParticipantSummaryStats,

  // Analysis Table
  AnalysisTable,
  AnalysisTableRow,
  AnalysisTableCell,
  buildGridColumns,
  type AnalysisTableColumn,
  type AnalysisTableProps,
  type AnalysisTableRowProps,
  type AnalysisTableCellProps,

  // Status filter configs
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
  type StatusFilterOption,
  type StatusFilterConfig,
  type SegmentConfig,
  type ParticipantsListRenderProps,
  type SegmentsListRenderProps,
  type ParticipantsTabContainerBaseProps,

  // Click Maps
  HeatmapRenderer,
  GridRenderer,
} from '@veritio/analysis-shared'

// === Local-only (app-specific, not in package) ===
export { ResultsPageShell, type ResultsPageShellProps } from './results-page-shell'
export { PDFExportDialog } from './pdf-export-dialog'
export { ParticipantsTabContainerBase } from './participants-tab-container'

// AI Insights
export { AiInsightsCard, InsightsChartRenderer } from './insights'

// Floating Action Bar (local — app-specific context, panels, and wiring)
export {
  FloatingActionBar,
  FloatingActionBarProvider,
  useFloatingActionBar,
  FloatingActionBarIcons,
  FloatingActionBarPanel,
  PanelContainer,
  KeyboardShortcutsPanel,
  KnowledgeBasePanel,
  StudyInfoPanel,
  MobilePanelModal,
  MobilePanelToggle,
  type PanelType,
  type ActionButton,
  type DynamicPanelConfig,
  type StudyType,
  type PanelWidth,
} from './floating-action-bar'

