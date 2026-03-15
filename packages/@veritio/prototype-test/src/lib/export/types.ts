
export type ExportFormat = 'csv' | 'pdf'

export type DataExportFormat = 'csv'

export interface ExportOptions {
  format: DataExportFormat
  filename: string
  studyTitle: string
  filteredParticipantIds?: Set<string> | null
  includeMetadata?: boolean
}

export interface ColumnConfig {
  header: string
  key: string
  width?: number | 'auto'
  type: 'string' | 'number' | 'date' | 'percent' | 'duration'
  format?: string
}

/**
 * Sheet configuration for structured exports
 * @deprecated Excel exports have been removed. Use CSV exports instead.
 * @internal This type is not used anywhere in the codebase and kept for reference only.
 */
export interface SheetConfig {
  name: string
  data: unknown[][]
  columns: ColumnConfig[]
  freezeRows?: number
  freezeCols?: number
}

export interface ExportResult {
  blob: Blob
  filename: string
  mimeType: string
}

export type ExportProgressCallback = (progress: {
  current: number
  total: number
  stage: 'processing' | 'generating' | 'complete'
}) => void
