// Overview components
export { ResultsOverview as PrototypeTestResultsOverview } from './results-overview'
export { TaskPerformanceChart } from './task-performance-chart'
export { TaskOverviewCard } from './task-overview-card'

// Participants components
export { PrototypeTestParticipantsList } from './participants/prototype-test-participants-list'
export { ParticipantDetailContent } from './participants/participant-detail-content'

// NOTE: the analysis tab and click-maps tab are owned by the app
// (apps/veritio/src/components/analysis/prototype-test) because they depend on
// app-local `@/` modules. Unused, drifted copies used to sit here too.

// Downloads components
export { PrototypeTestDownloadsTab } from './downloads-tab'

// Flow Diagram components
export { FlowDiagramTab, FlowNodeDetailContent } from './flow-diagram'
export type {
  FlowDiagramData,
  FlowDiagramFilters,
  FlowNode,
  FlowLink,
  OptimalPath,
} from './flow-diagram'
export type { FlowNodeDetailContentProps } from './flow-diagram'

// Task Results components
export {
  StatisticsCard,
  TaskSelector,
  PostTaskQuestions,
  TaskComparisonView,
  TaskResultsExport,
  AdvancedMetricsCard,
  DwellTimeVisualization,
} from './task-results'

// Export utilities (Phase 5)
export {
  ExportButton,
  PngExportButton,
  ImageExportButton,
  PDFReportTemplate,
  exportToPNG,
  exportToSVG,
  exportToCSV,
  exportTaskMetricsToCSV,
  exportAllTasksToCSV,
  generatePDFReport,
  exportHeatmapComposite,
  exportFlowDiagram,
  type ExportOptions,
  type PDFReportData,
  type CSVExportData,
  type PDFReportTemplateProps,
} from './export'

// Shared performance components (Phase 5)
export {
  VirtualParticipantList,
  IntersectionList,
  useLazyLoad,
  LazyThumbnail,
  ThumbnailBatchLoader,
  useImagePreloader,
  type VirtualParticipantListProps,
  type LazyThumbnailProps,
  type ThumbnailBatchLoaderProps,
} from './shared'
