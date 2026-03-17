/**
 * Export Service Orchestrator
 *
 * Main service that orchestrates the entire export process:
 * 1. Fetch export job from database
 * 2. Create appropriate adapter (Google Sheets, CSV, etc.)
 * 3. Initialize export (create spreadsheet/file)
 * 4. Process batches using batch processor
 * 5. Finalize export (share, return URL)
 * 6. Update job status and emit events
 */

import { getMotiaSupabaseClient } from '../../lib/supabase/motia-client'
import { createExportAdapter } from './adapter-factory'
import { processBatchedExport, fetchBatchResponses } from './batch-processor'
import { formatExportBatch } from './data-formatter'
import type { ExportStatus } from './types'

/**
 * Logger interface for consistent logging
 */
interface Logger {
  info: (message: string, meta?: Record<string, unknown>) => void
  warn: (message: string, meta?: Record<string, unknown>) => void
  error: (message: string, meta?: Record<string, unknown>) => void
}

/**
 * Context for export execution (passed from event handler)
 */
export interface ExportExecutionContext {
  logger?: Logger
  emit?: (event: { topic: string; data: unknown }) => Promise<void>
}

/**
 * Result of export execution
 */
export interface ExportResult {
  success: boolean
  jobId: string
  resourceUrl?: string
  error?: string
  processedParticipants: number
  totalParticipants: number
}

/**
 * Execute an export job
 *
 * Main orchestration function called by the event handler.
 * Handles the entire export lifecycle from start to finish.
 *
 * @param jobId - Export job ID to execute
 * @param ctx - Execution context with logger and event emitter
 * @returns Export result
 */
export async function executeExport(
  jobId: string,
  ctx: ExportExecutionContext = {}
): Promise<ExportResult> {
  const supabase = getMotiaSupabaseClient()
  const logger = ctx.logger ?? createDefaultLogger()
  const emit = ctx.emit ?? (async () => {})

  logger.info('Starting export execution', { jobId })

  try {
    // STEP 1: Fetch export job from database
    const { data: job, error: fetchError } = await (supabase as any)
      .from('export_jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (fetchError || !job) {
      throw new Error(`Failed to fetch export job: ${fetchError?.message || 'Job not found'}`)
    }

    logger.info('Export job fetched', {
      jobId,
      studyId: job.study_id,
      integration: job.integration,
      format: job.format,
    })

    // Validate job status
    if (job.status !== 'pending' && job.status !== 'processing') {
      throw new Error(`Cannot execute job with status: ${job.status}`)
    }

    // Update status to processing
    await updateJobStatus(supabase, jobId, 'processing', { started_at: new Date().toISOString() })

    // STEP 2: Create adapter for the integration
    const adapter = createExportAdapter(job.integration)
    logger.info('Adapter created', { integration: job.integration })

    // STEP 3: Initialize export (create spreadsheet, document, etc.)
    const initResult = await adapter.initialize({
      jobId,
      userId: job.user_id,
      studyId: job.study_id,
      integration: job.integration,
      format: job.format,
      options: (job.config as any) || {},
    })

    if (!initResult.success) {
      throw new Error(`Failed to initialize export: ${initResult.error}`)
    }

    logger.info('Export initialized', {
      resourceId: initResult.resourceId,
      resourceUrl: initResult.resourceUrl,
    })

    // STEP 4: Fetch study metadata (for formatting)
    const { data: study } = await supabase
      .from('studies')
      .select('study_type, title')
      .eq('id', job.study_id)
      .single()

    if (!study) {
      throw new Error('Study not found')
    }

    // Fetch additional metadata based on study type
    const metadata = await fetchStudyMetadata(supabase, job.study_id, study.study_type)

    // STEP 5: Process batches
    let _lastCursor: string | null = null
    let _totalProcessed = 0

    const result = await processBatchedExport(
      supabase,
      {
        studyId: job.study_id,
        batchSize: 100,
        resumeCursor: (job.progress as any)?.last_processed_cursor,
        logger,
        onProgress: (progress) => {
          _lastCursor = progress.lastProcessedCursor
          _totalProcessed = progress.processedParticipants

          // Update job progress in database
          updateJobProgress(supabase, jobId, {
            processed_participants: progress.processedParticipants,
            current_batch: progress.currentBatch,
            total_batches: progress.totalBatches,
            percentage: progress.percentage,
            last_processed_cursor: progress.lastProcessedCursor,
          }).catch((err) => logger.warn('Failed to update progress', { error: err.message }))

          // Emit progress event for real-time updates
          emit({
            topic: 'export-job-progress',
            data: {
              jobId,
              studyId: job.study_id,
              integration: job.integration,
              progress: {
                percentage: progress.percentage,
                processedParticipants: progress.processedParticipants,
                totalParticipants: progress.totalParticipants,
              },
            },
          }).catch(() => {})
        },
      },
      async (supabase, participantIds, studyId) => {
        // Fetch responses for this batch
        const responses = await fetchResponsesForStudyType(
          supabase,
          studyId,
          study.study_type,
          participantIds
        )

        // Format batch data
        const participants = participantIds.map((id) => ({ id }))
        return formatExportBatch(study.study_type, participants, responses, metadata)
      },
      async (formattedBatch, batchIndex) => {
        // Write batch via adapter
        const writeResult = await adapter.writeBatch(formattedBatch)

        if (!writeResult.success) {
          logger.error('Batch write failed', { batchIndex, error: writeResult.error })
        }

        return {
          success: writeResult.success,
          batchIndex,
          participantCount: formattedBatch.rows.length,
          rowsWritten: writeResult.rowsWritten,
          error: writeResult.error,
        }
      }
    )

    logger.info('Batch processing complete', {
      success: result.success,
      totalBatches: result.totalBatches,
      errors: result.errors.length,
    })

    // STEP 6: Finalize export (share permissions, return URL)
    const finalizeResult = await adapter.finalize()

    if (!finalizeResult.success) {
      throw new Error(`Failed to finalize export: ${finalizeResult.error}`)
    }

    logger.info('Export finalized', { resourceUrl: finalizeResult.resourceUrl })

    // STEP 7: Update job status to completed
    await updateJobStatus(supabase, jobId, 'completed', {
      destination_url: finalizeResult.resourceUrl,
      completed_at: new Date().toISOString(),
      progress: {
        percentage: 100,
        processedParticipants: result.totalParticipants,
        totalParticipants: result.totalParticipants,
      },
    })

    // Emit completion event
    await emit({
      topic: 'export-job-completed',
      data: {
        jobId,
        studyId: job.study_id,
        integration: job.integration,
        status: 'completed',
        destination_url: finalizeResult.resourceUrl,
      },
    })

    // Emit user notification
    await emit({
      topic: 'notification',
      data: {
        userId: job.user_id,
        type: 'export_completed',
        title: 'Export completed',
        message: `Your ${job.integration} export is ready`,
        data: {
          jobId,
          studyId: job.study_id,
          resourceUrl: finalizeResult.resourceUrl,
        },
      },
    })

    return {
      success: true,
      jobId,
      resourceUrl: finalizeResult.resourceUrl,
      processedParticipants: result.totalParticipants,
      totalParticipants: result.totalParticipants,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error('Export execution failed', { jobId, error: errorMessage })

    // Classify error
    const isRetryable = isRetryableError(error as Error)

    // Update job status to failed
    await updateJobStatus(supabase, jobId, 'failed', {
      error_message: errorMessage,
      error_code: isRetryable ? 'RETRYABLE_ERROR' : 'PERMANENT_ERROR',
    }).catch(() => {})

    // Emit failure event
    await emit({
      topic: 'export-job-failed',
      data: {
        jobId,
        error: errorMessage,
        retryable: isRetryable,
      },
    }).catch(() => {})

    // Emit user notification
    await emit({
      topic: 'notification',
      data: {
        userId: (await getJobUserId(supabase, jobId)) || 'unknown',
        type: 'export_failed',
        title: 'Export failed',
        message: `Failed to export: ${errorMessage}`,
        data: { jobId },
      },
    }).catch(() => {})

    return {
      success: false,
      jobId,
      error: errorMessage,
      processedParticipants: 0,
      totalParticipants: 0,
    }
  }
}

/**
 * Update export job status
 */
async function updateJobStatus(
  supabase: ReturnType<typeof getMotiaSupabaseClient>,
  jobId: string,
  status: ExportStatus,
  updates: Record<string, unknown> = {}
) {
  const { error } = await (supabase as any)
    .from('export_jobs')
    .update({ status, ...updates })
    .eq('id', jobId)

  if (error) {
    throw new Error(`Failed to update job status: ${error.message}`)
  }
}

/**
 * Update export job progress
 */
async function updateJobProgress(
  supabase: ReturnType<typeof getMotiaSupabaseClient>,
  jobId: string,
  progress: Record<string, unknown>
) {
  const { error } = await (supabase as any)
    .from('export_jobs')
    .update({
      progress: progress as any,
    })
    .eq('id', jobId)

  if (error) {
    throw new Error(`Failed to update job progress: ${error.message}`)
  }
}

/**
 * Get user ID for a job (for notifications)
 */
async function getJobUserId(
  supabase: ReturnType<typeof getMotiaSupabaseClient>,
  jobId: string
): Promise<string | null> {
  const { data } = await (supabase as any).from('export_jobs').select('user_id').eq('id', jobId).single()
  return data?.user_id || null
}

/**
 * Fetch study metadata needed for formatting
 */
async function fetchStudyMetadata(
  supabase: ReturnType<typeof getMotiaSupabaseClient>,
  studyId: string,
  studyType: string
): Promise<Record<string, unknown>> {
  const metadata: Record<string, unknown> = {}

  switch (studyType) {
    case 'survey':
    case 'study_flow':
      // Fetch questions
      const { data: questions } = await supabase
        .from('study_flow_questions')
        .select('*')
        .eq('study_id', studyId)
      metadata.flowQuestions = questions || []
      break

    case 'first_impression':
      // Fetch designs
      const { data: designs } = await supabase
        .from('first_impression_designs')
        .select('*')
        .eq('study_id', studyId)
      metadata.designs = designs || []
      break

    case 'card_sort':
      // Fetch cards
      const { data: cards } = await supabase.from('cards').select('*').eq('study_id', studyId)
      metadata.cards = cards || []
      break

    case 'tree_test': {
      // Fetch tasks and nodes in parallel
      const [{ data: tasks }, { data: nodes }] = await Promise.all([
        (supabase as any).from('tree_test_tasks').select('*').eq('study_id', studyId),
        supabase.from('tree_nodes').select('*').eq('study_id', studyId),
      ])
      metadata.tasks = tasks || []
      metadata.nodes = nodes || []
      break
    }

    case 'first_click':
      // Fetch tasks
      const { data: fcTasks } = await supabase
        .from('first_click_tasks')
        .select('*')
        .eq('study_id', studyId)
      metadata.tasks = fcTasks || []
      break

    case 'prototype_test':
      // Fetch tasks
      const { data: ptTasks } = await (supabase as any)
        .from('prototype_tasks')
        .select('*')
        .eq('study_id', studyId)
      metadata.tasks = ptTasks || []
      break
  }

  return metadata
}

/**
 * Fetch responses for specific study type
 */
async function fetchResponsesForStudyType(
  supabase: ReturnType<typeof getMotiaSupabaseClient>,
  studyId: string,
  studyType: string,
  participantIds: string[]
): Promise<any[]> {
  switch (studyType) {
    case 'survey':
    case 'study_flow':
      return await fetchBatchResponses(supabase, participantIds, 'study_flow_responses')

    case 'first_impression':
      return await fetchBatchResponses(supabase, participantIds, 'first_impression_responses')

    case 'card_sort':
      return await fetchBatchResponses(supabase, participantIds, 'card_sort_responses')

    case 'tree_test':
      return await fetchBatchResponses(supabase, participantIds, 'tree_test_responses')

    case 'first_click':
      return await fetchBatchResponses(supabase, participantIds, 'first_click_responses')

    case 'prototype_test':
      return await fetchBatchResponses(supabase, participantIds, 'prototype_task_attempts')

    default:
      return []
  }
}

/**
 * Classify if error is retryable
 */
function isRetryableError(error: Error): boolean {
  const retryablePatterns = [
    'timeout',
    'network',
    'rate limit',
    'econnreset',
    'enotfound',
    'socket hang',
    'too many requests',
    '429',
    '503',
    '504',
  ]

  const message = error.message.toLowerCase()
  return retryablePatterns.some((pattern) => message.includes(pattern))
}

/**
 * Create default logger (for when no logger is provided)
 */
function createDefaultLogger(): Logger {
  return {
    info: (_msg: string, _meta?: Record<string, unknown>) => {
      // silent in production; use logger from context instead
    },
    warn: (_msg: string, _meta?: Record<string, unknown>) => {
      // silent; use logger from context instead
    },
    error: (msg: string, meta?: Record<string, unknown>) => {
      console.error(`[ERROR] ${msg}`, meta || '')
    },
  }
}
