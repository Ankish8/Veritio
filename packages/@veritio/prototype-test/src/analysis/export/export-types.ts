
import type { PrototypeTaskMetrics } from '@veritio/prototype-test/algorithms/prototype-test-analysis'
import type { AdvancedTaskMetrics } from '@veritio/prototype-test/algorithms/advanced-metrics'

export interface ExportOptions {
  filename: string
  backgroundColor?: string
  pixelRatio?: number
  includeMetadata?: boolean
}

export interface PDFReportData {
  studyTitle: string
  studyDescription?: string
  exportDate: Date
  taskMetrics: PrototypeTaskMetrics[]
  advancedMetrics?: Map<string, AdvancedTaskMetrics>
  participantCount: number
  overallSuccessRate: number
  overview: {
    totalResponses: number
    completionRate: number
    averageTimeMs: number
  }
}

export interface CSVExportData {
  headers: string[]
  rows: (string | number | boolean | null | undefined)[][]
}

export const PDF_COLORS = {
  primary: '#1f2937',      // gray-800
  secondary: '#6b7280',    // gray-500
  success: '#059669',      // emerald-600
  warning: '#d97706',      // amber-600
  danger: '#dc2626',       // red-600
  border: '#e5e7eb',       // gray-200
  background: '#f9fafb',   // gray-50
}

export const PDF_MARGINS = {
  top: 20,
  right: 20,
  bottom: 20,
  left: 20,
}
