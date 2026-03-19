/**
 * Export utilities for Prototype Test Analysis
 *
 * Provides comprehensive export functionality:
 * - PNG: High-resolution image exports
 * - SVG: Vector graphics for diagrams
 * - CSV: Tabular data exports
 * - PDF: Full report generation
 */

// Types
export type { ExportOptions, PDFReportData, CSVExportData } from './export-types'

// PNG/SVG exports
export { exportToPNG, exportToPNGDataUrl, exportToSVG, exportSVGElement } from './png-svg-export'

// CSV exports
export { exportToCSV, exportTaskMetricsToCSV, exportAllTasksToCSV } from './csv-export'

// PDF report
export { generatePDFReport } from './pdf-report'

// Composite exports
export { exportHeatmapComposite, exportFlowDiagram } from './composite-exports'

// Utilities
export {
  triggerDownload,
  sanitizeFilename,
  formatTime,
  truncateText,
  escapeCsvValue,
  getRateColor,
  getHtmlToImageOptions,
  createTimestampedFilename,
} from './export-utils'

// Export button components
export {
  ExportButton,
  PngExportButton,
  ImageExportButton,
} from './export-button'

// PDF report template
export {
  PDFReportTemplate,
  type PDFReportTemplateProps,
} from './pdf-report-template'
