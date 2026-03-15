/**
 * Export System Types
 *
 * Types for managing study data exports across multiple integrations
 * (Google Sheets, Google Docs, Notion, Airtable, CSV downloads).
 */

// ---------------------------------------------------------------------------
// Export job types
// ---------------------------------------------------------------------------

/** Export status — represents the current state of an export job */
export type ExportStatus =
  | 'pending'      // Queued, waiting to start
  | 'processing'   // Currently running
  | 'completed'    // Successfully finished
  | 'failed'       // Encountered an error
  | 'cancelled'    // User-cancelled

/** Supported export integrations */
export type ExportIntegration =
  | 'googlesheets'
  | 'googledocs'
  | 'notion'
  | 'airtable'
  | 'csv_download'

/** Export data format options */
export type ExportFormat =
  | 'raw'       // Individual responses only
  | 'summary'   // Aggregated metrics only
  | 'both'      // Both raw responses and summary metrics

/** Main export job record (matches export_jobs table) */
export interface ExportJob {
  id: string
  study_id: string
  user_id: string
  integration: ExportIntegration
  format: ExportFormat
  status: ExportStatus
  config: ExportConfig
  progress: ExportProgress
  destination_url: string | null
  error_message: string | null
  error_code: string | null
  batch_id: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
}

/** Insert type for creating new export jobs */
export interface ExportJobInsert {
  study_id: string
  user_id: string
  integration: ExportIntegration
  format: ExportFormat
  config: ExportConfig
  batch_id?: string | null
}

/** Update type for modifying export jobs */
export interface ExportJobUpdate {
  status?: ExportStatus
  progress?: ExportProgress
  destination_url?: string | null
  error_message?: string | null
  error_code?: string | null
  completed_at?: string | null
}

// ---------------------------------------------------------------------------
// Export configuration
// ---------------------------------------------------------------------------

/** Per-integration configuration options */
export interface ExportConfig {
  /** Google Sheets specific options */
  googlesheets?: {
    spreadsheet_id?: string        // Existing spreadsheet to append to
    sheet_name?: string             // Sheet name within spreadsheet
    create_new_spreadsheet?: boolean
    include_charts?: boolean        // Generate visualizations
    share_with_emails?: string[]    // Auto-share with these emails
  }

  /** Google Docs specific options */
  googledocs?: {
    document_id?: string            // Existing doc to append to
    create_new_document?: boolean
    include_charts?: boolean
    template_style?: 'plain' | 'formatted' | 'report'
  }

  /** Notion specific options */
  notion?: {
    page_id?: string                // Parent page to create under
    database_id?: string            // Existing database to populate
    create_new_page?: boolean
  }

  /** Airtable specific options */
  airtable?: {
    base_id?: string
    table_name?: string
    create_new_table?: boolean
  }

  /** CSV download specific options */
  csv_download?: {
    compression?: 'none' | 'zip' | 'gzip'
    encoding?: 'utf8' | 'utf16' | 'ascii'
    delimiter?: ',' | ';' | '\t' | '|'
  }

  /** Common filtering options (applies to all integrations) */
  filters?: {
    date_range?: {
      start: string
      end: string
    }
    participant_ids?: string[]      // Specific participants to include
    completed_only?: boolean         // Exclude in-progress/abandoned responses
    include_metadata?: boolean       // Location, device, browser info
    include_recordings?: boolean     // Session recording URLs (if applicable)
  }
}

// ---------------------------------------------------------------------------
// Export progress tracking
// ---------------------------------------------------------------------------

/** Progress tracking for long-running exports */
export interface ExportProgress {
  /** Current step (e.g., "Fetching responses", "Formatting data", "Uploading to Google Sheets") */
  current_step: string

  /** Total items to process (responses, questions, tasks, etc.) */
  total_items: number

  /** Items processed so far */
  processed_items: number

  /** Percentage complete (0-100) */
  percentage: number

  /** Estimated time remaining in seconds (null if unknown) */
  estimated_seconds_remaining: number | null

  /** Timestamp of last update */
  last_updated: string
}

// ---------------------------------------------------------------------------
// Batch export
// ---------------------------------------------------------------------------

/**
 * Batch export record — groups multiple export jobs together
 * (e.g., exporting to both Google Sheets AND Google Docs in one operation)
 */
export interface ExportBatch {
  id: string
  user_id: string
  study_id: string
  name: string | null
  status: ExportStatus
  job_ids: string[]                 // Array of export_job IDs in this batch
  created_at: string
  completed_at: string | null
}

// ---------------------------------------------------------------------------
// Adapter-level types (used by adapter classes, not DB records)
// ---------------------------------------------------------------------------

/** Config passed to adapter.initialize() */
export interface AdapterConfig {
  jobId: string
  userId: string
  studyId: string
  integration: ExportIntegration
  format: ExportFormat
  options: ExportConfig | Record<string, unknown>
}

/** A formatted batch of data passed to adapter.writeBatch() */
export interface ExportDataBatch {
  sheetName: string
  headers: string[]
  rows: (string | number | null)[][]
}

/** Result returned by adapter.writeBatch() */
export interface BatchWriteResult {
  success: boolean
  rowsWritten: number
  error?: string
}

/** Rate limit config returned by adapter.getRateLimits() */
export interface RateLimitConfig {
  requestsPerSecond: number
  maxBatchSize: number
  maxConcurrentWrites: number
}

/** Options specific to CSV download exports */
export interface CSVDownloadOptions {
  filename?: string
  expirationHours?: number
  compression?: 'none' | 'zip' | 'gzip'
  encoding?: 'utf8' | 'utf16' | 'ascii'
  delimiter?: ',' | ';' | '\t' | '|'
}

// ---------------------------------------------------------------------------
// Export service interfaces
// ---------------------------------------------------------------------------

/**
 * Base adapter interface — all export integrations implement this
 */
export interface ExportAdapter {
  /** Unique identifier for this adapter (matches ExportIntegration) */
  readonly type: ExportIntegration

  /** Check if user has connected this integration */
  isConnected(userId: string): Promise<boolean>

  /** Execute the export and return destination URL */
  export(job: ExportJob, data: ExportData): Promise<string>

  /** Check export health (for periodic monitoring) */
  healthCheck?(userId: string): Promise<{ healthy: boolean; message?: string }>
}

/**
 * Structured data passed to adapters for export
 */
export interface ExportData {
  study: ExportStudyMetadata
  responses: ExportResponse[]
  summary?: ExportSummary
}

/** Study metadata included in all exports */
export interface ExportStudyMetadata {
  id: string
  title: string
  description: string | null
  study_type: string
  created_at: string
  participant_count: number
  completion_rate: number
}

/** Generic response structure (adapter transforms to integration-specific format) */
export interface ExportResponse {
  participant_id: string
  started_at: string
  completed_at: string | null
  status: string
  duration_seconds: number | null
  metadata?: Record<string, unknown>
  answers: ExportAnswer[]
}

/** Individual answer/response */
export interface ExportAnswer {
  question_id: string
  question_text: string
  question_type: string
  answer_value: unknown             // Varies by question type
  answer_text: string | null        // Human-readable representation
}

/** Summary metrics (only included if format is 'summary' or 'both') */
export interface ExportSummary {
  total_participants: number
  completed_participants: number
  average_duration_seconds: number | null
  metrics: Record<string, unknown>  // Study-type-specific aggregations
}

// ---------------------------------------------------------------------------
// Event types (for background processing)
// ---------------------------------------------------------------------------

/** Event emitted when export job is created */
export interface ExportJobCreatedEvent {
  job_id: string
  study_id: string
  integration: ExportIntegration
  user_id: string
}

/** Event emitted when export job completes */
export interface ExportJobCompletedEvent {
  job_id: string
  study_id: string
  integration: ExportIntegration
  status: ExportStatus
  destination_url: string | null
  error_message: string | null
}

/** Event emitted when export batch completes */
export interface ExportBatchCompletedEvent {
  batch_id: string
  study_id: string
  status: ExportStatus
  job_ids: string[]
}

// ---------------------------------------------------------------------------
// API request / response contracts
// ---------------------------------------------------------------------------

/** Request to create a new export */
export interface CreateExportRequest {
  study_id: string
  integration: ExportIntegration
  format: ExportFormat
  config?: ExportConfig
}

/** Response from create export endpoint */
export interface CreateExportResponse {
  job: ExportJob
}

/** Request to create a batch export (multiple integrations at once) */
export interface CreateBatchExportRequest {
  study_id: string
  exports: Array<{
    integration: ExportIntegration
    format: ExportFormat
    config?: ExportConfig
  }>
  batch_name?: string
}

/** Response from create batch export endpoint */
export interface CreateBatchExportResponse {
  batch: ExportBatch
  jobs: ExportJob[]
}

/** Response from list exports endpoint */
export interface ListExportsResponse {
  jobs: ExportJob[]
  total: number
}

/** Response from get export status endpoint */
export interface GetExportStatusResponse {
  job: ExportJob
}

/** Request to cancel an export */
export interface CancelExportRequest {
  job_id: string
}

/** Response from cancel export endpoint */
export interface CancelExportResponse {
  success: boolean
  job: ExportJob
}

// ---------------------------------------------------------------------------
// Error codes
// ---------------------------------------------------------------------------

/** Standard error codes for export failures */
export const ExportErrorCodes = {
  /** Integration not connected (OAuth required) */
  NOT_CONNECTED: 'NOT_CONNECTED',

  /** Integration API rate limit exceeded */
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  /** Invalid configuration (missing required fields) */
  INVALID_CONFIG: 'INVALID_CONFIG',

  /** Insufficient permissions on target resource */
  PERMISSION_DENIED: 'PERMISSION_DENIED',

  /** Target resource not found (e.g., spreadsheet_id doesn't exist) */
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',

  /** Integration API returned an error */
  INTEGRATION_ERROR: 'INTEGRATION_ERROR',

  /** Export data too large for integration */
  DATA_TOO_LARGE: 'DATA_TOO_LARGE',

  /** User cancelled the export */
  CANCELLED: 'CANCELLED',

  /** Unknown error */
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const

export type ExportErrorCode = typeof ExportErrorCodes[keyof typeof ExportErrorCodes]
