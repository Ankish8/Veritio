import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Participant } from '@veritio/study-types'
import { fetchAllRows } from '../results/pagination'
import { throttledMap } from '../../lib/utils/async'

type SupabaseClientType = SupabaseClient<Database>

export interface BatchProcessConfig {
  studyId: string
  batchSize?: number
  onBatchWrite?: (result: BatchWriteResult) => Promise<void>
  onBatchComplete?: (progress: BatchProgress) => Promise<void>
  onProgress?: (progress: BatchProgress) => void
  resumeCursor?: string | null
  maxConcurrency?: number
  logger?: {
    info: (msg: string, data?: Record<string, unknown>) => void
    warn: (msg: string, data?: Record<string, unknown>) => void
    error: (msg: string, data?: Record<string, unknown>) => void
  }
}

export type BatchProcessorFn<T> = (
  supabase: SupabaseClientType,
  participantIds: string[],
  studyId: string,
  logger?: BatchProcessConfig['logger']
) => Promise<T>

export interface BatchWriteResult {
  success: boolean
  batchIndex: number
  participantCount: number
  rowsWritten?: number
  error?: string
}

export interface BatchProgress {
  totalParticipants: number
  processedParticipants: number
  currentBatch: number
  totalBatches: number
  percentage: number
  lastProcessedCursor: string | null
}

export async function processBatchedExport<T>(
  supabase: SupabaseClientType,
  config: BatchProcessConfig,
  processBatch: BatchProcessorFn<T>,
  writeBatch: (data: T, batchIndex: number, participantIds: string[]) => Promise<BatchWriteResult>
): Promise<{
  success: boolean
  totalParticipants: number
  totalBatches: number
  processedBatches: number
  errors: Array<{ batchIndex: number; error: string }>
}> {
  const {
    studyId,
    batchSize = 100,
    onBatchWrite,
    onBatchComplete,
    onProgress,
    resumeCursor = null,
    maxConcurrency: _maxConcurrency = 3,
    logger,
  } = config

  const errors: Array<{ batchIndex: number; error: string }> = []

  try {
    logger?.info('Starting batched export', { studyId, batchSize })

    logger?.info('Fetching participant IDs', { studyId })
    const participants = await fetchAllRows<Participant>(
      supabase,
      'participants',
      studyId,
      {
        columns: 'id, started_at, status',
        cursorColumn: 'started_at',
      },
      logger
    )

    const completedParticipants = participants.filter((p) => p.status === 'completed')

    if (completedParticipants.length === 0) {
      logger?.warn('No completed participants found', { studyId })
      return {
        success: true,
        totalParticipants: 0,
        totalBatches: 0,
        processedBatches: 0,
        errors: [],
      }
    }

    logger?.info('Participants fetched', {
      total: participants.length,
      completed: completedParticipants.length,
    })

    let participantsToProcess = completedParticipants
    let startBatchIndex = 0

    if (resumeCursor) {
      const cursorIndex = completedParticipants.findIndex((p) => p.started_at === resumeCursor)
      if (cursorIndex !== -1) {
        participantsToProcess = completedParticipants.slice(cursorIndex + 1)
        startBatchIndex = Math.floor(cursorIndex / batchSize) + 1
        logger?.info('Resuming from cursor', {
          cursor: resumeCursor,
          remainingParticipants: participantsToProcess.length,
          startBatchIndex,
        })
      } else {
        logger?.warn('Resume cursor not found, processing all participants', { resumeCursor })
      }
    }

    const totalParticipants = completedParticipants.length
    const totalBatches = Math.ceil(participantsToProcess.length / batchSize)

    logger?.info('Starting batch processing', {
      totalParticipants,
      participantsToProcess: participantsToProcess.length,
      totalBatches,
      batchSize,
    })

    let processedBatches = 0

    for (let i = 0; i < participantsToProcess.length; i += batchSize) {
      const batchIndex = startBatchIndex + Math.floor(i / batchSize)
      const batch = participantsToProcess.slice(i, i + batchSize)
      const participantIds = batch.map((p) => p.id)

      try {
        logger?.info('Processing batch', {
          batchIndex,
          participantCount: participantIds.length,
        })

        let formattedData = await processBatch(supabase, participantIds, studyId, logger)
        const writeResult = await writeBatch(formattedData, batchIndex, participantIds)

        if (!writeResult.success) {
          errors.push({
            batchIndex,
            error: writeResult.error || 'Write failed',
          })
          logger?.error('Batch write failed', { batchIndex, error: writeResult.error })
        } else {
          logger?.info('Batch written successfully', {
            batchIndex,
            rowsWritten: writeResult.rowsWritten,
          })
        }

        if (onBatchWrite) {
          await onBatchWrite(writeResult)
        }

        processedBatches++

        const processedParticipants = Math.min(
          (startBatchIndex * batchSize) + i + batch.length,
          totalParticipants
        )
        const lastProcessedCursor = batch[batch.length - 1]?.started_at || null

        const progress: BatchProgress = {
          totalParticipants,
          processedParticipants,
          currentBatch: batchIndex + 1,
          totalBatches: Math.ceil(totalParticipants / batchSize),
          percentage: Math.round((processedParticipants / totalParticipants) * 100),
          lastProcessedCursor,
        }

        if (onProgress) {
          onProgress(progress)
        }

        if (onBatchComplete) {
          await onBatchComplete(progress)
        }

        logger?.info('Batch progress', progress as unknown as Record<string, unknown>)

        // @ts-expect-error - Intentionally clearing for memory management
        formattedData = null
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        errors.push({ batchIndex, error: errorMessage })
        logger?.error('Batch processing failed', { batchIndex, error: errorMessage })

      }
    }

    const success = errors.length === 0

    logger?.info('Batched export complete', {
      success,
      totalParticipants,
      totalBatches,
      processedBatches,
      errorCount: errors.length,
    })

    return {
      success,
      totalParticipants,
      totalBatches: Math.ceil(totalParticipants / batchSize),
      processedBatches,
      errors,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger?.error('Batched export failed', { error: errorMessage })

    throw new Error(`Batched export failed: ${errorMessage}`)
  }
}

export async function fetchBatchResponses<T extends Record<string, unknown>>(
  supabase: SupabaseClientType,
  participantIds: string[],
  table: string,
  participantIdColumn: string = 'participant_id',
  maxConcurrency: number = 3
): Promise<T[]> {
  const chunkSize = Math.max(1, Math.ceil(participantIds.length / maxConcurrency))
  const chunks: string[][] = []

  for (let i = 0; i < participantIds.length; i += chunkSize) {
    chunks.push(participantIds.slice(i, i + chunkSize))
  }

  const results = await throttledMap(
    chunks,
    async (chunk) => {
      const { data, error } = await (supabase as any)
        .from(table)
        .select('*')
        .in(participantIdColumn, chunk)

      if (error) {
        throw new Error(`Failed to fetch ${table}: ${error.message}`)
      }

      return (data || []) as unknown as T[]
    },
    maxConcurrency
  )

  return results.flat()
}
