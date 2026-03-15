/**
 * Export System Types and Interfaces
 *
 * Shared types for the export infrastructure supporting CSV and PDF exports
 * with professional styling and segmentation filtering.
 */

/** All supported export formats including PDF */
export type ExportFormat = 'csv' | 'pdf'

/** Data export formats (CSV only, no Excel) */
export type DataExportFormat = 'csv'

/**
 * Common options passed to all export functions
 */
export interface ExportOptions {
  /** Export format: CSV only */
  format: DataExportFormat
  /** Filename without extension (extension added based on format) */
  filename: string
  /** Study title for metadata */
  studyTitle: string
  /** Optional set of participant IDs to filter by (for segmentation) */
  filteredParticipantIds?: Set<string> | null
  /** Include additional metadata in export */
  includeMetadata?: boolean
}

/**
 * Column configuration for structured exports
 */
export interface ColumnConfig {
  /** Column header text */
  header: string
  /** Column key (used for data mapping) */
  key: string
  /** Column width: number for fixed, 'auto' for content-based */
  width?: number | 'auto'
  /** Data type for formatting */
  type: 'string' | 'number' | 'date' | 'percent' | 'duration'
  /** Custom format string (e.g., '0.0%' for percent, 'yyyy-mm-dd' for date) */
  format?: string
}

/**
 * Sheet configuration for structured exports
 * @deprecated Excel exports have been removed. Use CSV exports instead.
 * @internal This type is not used anywhere in the codebase and kept for reference only.
 */
export interface SheetConfig {
  /** Sheet name */
  name: string
  /** 2D array of row data */
  data: unknown[][]
  /** Column configurations */
  columns: ColumnConfig[]
  /** Number of rows to freeze (typically 1 for header) */
  freezeRows?: number
  /** Number of columns to freeze (for ID columns) */
  freezeCols?: number
}

/**
 * Export result containing the generated file data
 */
export interface ExportResult {
  /** Blob containing file data */
  blob: Blob
  /** Filename with extension */
  filename: string
  /** MIME type for the file */
  mimeType: string
}

/**
 * Progress callback for large exports
 */
export type ExportProgressCallback = (progress: {
  current: number
  total: number
  stage: 'processing' | 'generating' | 'complete'
}) => void
