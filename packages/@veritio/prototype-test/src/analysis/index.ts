// Overview components
export { ResultsOverview as PrototypeTestResultsOverview } from './results-overview'
export { TaskPerformanceChart } from './task-performance-chart'
export { TaskOverviewCard } from './task-overview-card'

// Participants components
// TEMPORARILY DISABLED - depends on ParticipantsTabContainerBase from analysis-shared
// which has @/ imports that need to be refactored
// export { PrototypeTestParticipantsTabContainer } from './participants/prototype-test-participants-tab-container'
export { PrototypeTestParticipantsList } from './participants/prototype-test-participants-list'
export { ParticipantDetailContent } from './participants/participant-detail-content'

// Analysis components
// NOTE: PrototypeTestAnalysisTab is NOT exported as it has app-specific dependencies (@/ imports)
// Apps should create their own analysis-tab wrapper that imports FlowDiagramTab
// export { PrototypeTestAnalysisTab } from './analysis-tab'

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
