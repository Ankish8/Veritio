import type { StepConfig } from 'motia'
import type { EventHandlerContext } from '../../lib/motia/types'
import { createMotiaSupabaseClient } from '../../lib/supabase/motia-client'
import { completeMultipartUpload, abortMultipartUpload, listUploadedParts, isR2PermanentError, prepareSortedParts } from '../../services/storage/r2-client'
import type { CompletedPart } from '../../services/storage/r2-client'
import { throttledMapSettled } from '../../lib/utils/async'

export const config = {
  name: 'CleanupStaleRecordings',
  description: 'Clean up recordings stuck in uploading status',
  triggers: [{ type: 'cron', expression: '0 */5 * * * * *' }],
  enqueues: ['recording-finalized'],
  flows: ['recording-management'],
} satisfies StepConfig

const STALE_THRESHOLD_MS = 15 * 60 * 1000
const FAILED_RETRY_WINDOW_MS = 5 * 24 * 60 * 60 * 1000 // 5 days — R2 multipart uploads expire after ~7 days
const R2_CONCURRENCY = 10

// Module-level singleton — recordings table is partitioned across 7 monthly partitions,
// so even indexed queries take 600-1000ms as PostgREST scans all partitions.
// Higher threshold avoids noisy warnings for expected background cron behavior.
const supabase = createMotiaSupabaseClient({ slowQueryThresholdMs: 2000 })

interface StaleRecording {
  id: string
  study_id: string
  participant_id: string
  storage_path: string
  upload_id: string
  chunk_etags: Array<{ PartNumber: number; ETag: string }> | null
  started_at: string
  status: string
  status_message: string | null
}

interface ClassifiedRecordings {
  toAbort: StaleRecording[]
  toComplete: StaleRecording[]
  failedPermanent: StaleRecording[]
  failedNoData: StaleRecording[]
}

export const handler = async (_input: unknown, { logger, enqueue }: EventHandlerContext) => {

  logger.info('Running cleanup stale recordings cron job')

  try {
    const staleUploadingCutoff = new Date(Date.now() - STALE_THRESHOLD_MS).toISOString()
    const failedRetryCutoff = new Date(Date.now() - FAILED_RETRY_WINDOW_MS).toISOString()

    // Fetch data directly instead of count-then-fetch — the count queries are equally slow
    // on the partitioned table and provide no benefit (if 0 rows, data fetch also returns empty)
    const { data: uploadingRecordings, error: uploadingError } = await supabase
      .from('recordings')
      .select('id, study_id, participant_id, storage_path, upload_id, chunk_etags, started_at, status, status_message')
      .eq('status', 'uploading')
      .lt('started_at', staleUploadingCutoff) as any

    if (uploadingError) {
      logger.error('Failed to fetch uploading recordings', { error: uploadingError })
      return
    }

    const { data: failedRecordings, error: failedError } = await supabase
      .from('recordings')
      .select('id, study_id, participant_id, storage_path, upload_id, chunk_etags, started_at, status, status_message')
      .eq('status', 'failed')
      .gt('started_at', failedRetryCutoff)
      .ilike('status_message', '%recoverable%') as any

    if (failedError) {
      logger.error('Failed to fetch failed recordings', { error: failedError })
      return
    }

    const staleRecordings: StaleRecording[] = [
      ...(uploadingRecordings || []),
      ...(failedRecordings || []),
    ]

    if (staleRecordings.length === 0) {
      logger.info('No stale recordings found')
      return
    }

    logger.info(`Found ${staleRecordings.length} stale recordings to process`, {
      uploading: uploadingRecordings?.length || 0,
      failed: failedRecordings?.length || 0,
    })

    // Batch-fetch participant statuses for recordings with no chunks
    // so we can distinguish "abandoned" from "completed but no recording data"
    const noChunkParticipantIds = [
      ...new Set(
        staleRecordings
          .filter((r) => !(r.chunk_etags && r.chunk_etags.length > 0))
          .map((r) => r.participant_id)
      ),
    ]
    const participantStatuses = new Map<string, string>()
    if (noChunkParticipantIds.length > 0) {
      const { data: participantRows } = await supabase
        .from('participants')
        .select('id, status')
        .in('id', noChunkParticipantIds)
      for (const p of participantRows || []) {
        if (p.status) participantStatuses.set(p.id, p.status)
      }
    }

    // For recordings with 0 etags in DB, check R2 directly — ETags may exist
    // if confirm-chunk calls failed (e.g. CORS blocking ETag header, network errors)
    const noEtagRecordings = staleRecordings.filter(
      (r) => !(r.chunk_etags && r.chunk_etags.length > 0) && r.upload_id
    )

    if (noEtagRecordings.length > 0) {
      logger.info(`Checking R2 for ${noEtagRecordings.length} recordings with missing ETags`)

      const r2CheckResults = await throttledMapSettled(
        noEtagRecordings,
        async (recording) => {
          const parts = await listUploadedParts(recording.storage_path, recording.upload_id)
          return { recording, parts }
        },
        R2_CONCURRENCY
      )

      // Patch chunk_etags on recordings where R2 has parts the DB doesn't know about
      for (const { result } of r2CheckResults.successes) {
        if (result.parts.length > 0) {
          logger.info('Recovered ETags from R2 for recording', {
            recordingId: result.recording.id,
            partCount: result.parts.length,
          })
          // Patch the in-memory object so classification sees the chunks
          result.recording.chunk_etags = result.parts.map((p) => ({
            PartNumber: p.PartNumber,
            ETag: p.ETag,
          }))
          // Also persist recovered ETags to DB so future runs don't need to re-check R2
          await supabase
            .from('recordings')
            .update({
              chunk_etags: result.recording.chunk_etags as any,
              chunks_uploaded: result.parts.length,
              updated_at: new Date().toISOString(),
            })
            .eq('id', result.recording.id)
        }
      }

      for (const failure of r2CheckResults.failures) {
        logger.warn('Failed to check R2 for recording parts', {
          recordingId: failure.item.id,
          error: failure.error.message,
        })
      }
    }

    const classified = classifyRecordings(staleRecordings, participantStatuses)

    logger.info('Classified recordings', {
      toAbort: classified.toAbort.length,
      toComplete: classified.toComplete.length,
      failedPermanent: classified.failedPermanent.length,
      failedNoData: classified.failedNoData.length,
    })

    const abortResults = await throttledMapSettled(
      classified.toAbort,
      async (recording) => {
        await abortMultipartUpload(recording.storage_path, recording.upload_id)
        return recording.id
      },
      R2_CONCURRENCY
    )

    for (const failure of abortResults.failures) {
      logger.warn('Failed to abort multipart upload', {
        recordingId: failure.item.id,
        error: failure.error.message,
      })
    }

    // Validate ETags and pre-compute sorted parts in a single pass
    const invalidEtagRecordings: StaleRecording[] = []
    const toCompleteWithParts: Array<{ recording: StaleRecording; sortedParts: CompletedPart[] }> = []

    for (const recording of classified.toComplete) {
      const sortedParts = prepareSortedParts(recording.chunk_etags || [], logger)
      if (sortedParts.length === 0) {
        logger.warn('Recording has chunks but all ETags are invalid', {
          recordingId: recording.id,
          totalChunks: (recording.chunk_etags || []).length,
        })
        invalidEtagRecordings.push(recording)
      } else {
        toCompleteWithParts.push({ recording, sortedParts })
      }
    }

    const completeResults = await throttledMapSettled(
      toCompleteWithParts,
      async ({ recording, sortedParts }) => {
        await completeMultipartUpload(recording.storage_path, recording.upload_id, sortedParts, logger)
        return recording
      },
      R2_CONCURRENCY
    )

    // Separate permanent R2 failures (expired uploads) from transient ones
    const permanentR2Failures: StaleRecording[] = []
    const transientR2Failures: StaleRecording[] = []

    for (const failure of completeResults.failures) {
      if (isR2PermanentError(failure.error)) {
        logger.warn('Permanent R2 error for recording - not retryable', {
          recordingId: failure.item.recording.id,
          errorName: (failure.error as any)?.name,
          error: failure.error.message,
        })
        permanentR2Failures.push(failure.item.recording)
      } else {
        logger.warn('Transient R2 error for recording - will retry', {
          recordingId: failure.item.recording.id,
          errorName: (failure.error as any)?.name,
          error: failure.error.message,
        })
        transientR2Failures.push(failure.item.recording)
      }
    }

    const now = new Date().toISOString()

    const abandonedIds = classified.toAbort.map((r) => r.id)
    if (abandonedIds.length > 0) {
      const { error: abandonError } = await supabase
        .from('recordings')
        .update({
          status: 'abandoned',
          status_message: 'No data uploaded - session abandoned',
          updated_at: now,
        })
        .in('id', abandonedIds)

      if (abandonError) {
        logger.error('Failed to batch update abandoned recordings', { error: abandonError })
      }
    }

    const failedPermanentIds = classified.failedPermanent.map((r) => r.id)
    if (failedPermanentIds.length > 0) {
      const { error: failedError } = await supabase
        .from('recordings')
        .update({
          status: 'failed',
          status_message: 'Failed with no chunks - not recoverable',
          updated_at: now,
        })
        .in('id', failedPermanentIds)

      if (failedError) {
        logger.error('Failed to batch update permanently failed recordings', { error: failedError })
      }
    }

    // Recordings with chunks but all ETags are corrupt
    const invalidEtagIds = invalidEtagRecordings.map((r) => r.id)
    if (invalidEtagIds.length > 0) {
      const { error: invalidError } = await supabase
        .from('recordings')
        .update({
          status: 'failed',
          status_message: 'All chunk ETags are invalid - not recoverable',
          updated_at: now,
        })
        .in('id', invalidEtagIds)

      if (invalidError) {
        logger.error('Failed to batch update invalid-etag recordings', { error: invalidError })
      }
    }

    // Completed participants with no recording data — mark as failed (not abandoned)
    const failedNoDataIds = classified.failedNoData.map((r) => r.id)
    if (failedNoDataIds.length > 0) {
      const { error: noDataError } = await supabase
        .from('recordings')
        .update({
          status: 'failed',
          status_message: 'No recording data captured',
          updated_at: now,
        })
        .in('id', failedNoDataIds)

      if (noDataError) {
        logger.error('Failed to batch update no-data recordings', { error: noDataError })
      }
    }

    const readyRecordings: StaleRecording[] = completeResults.successes.map((s) => s.result)
    const readyIds = readyRecordings.map((r) => r.id)
    if (readyIds.length > 0) {
      await Promise.all(
        readyRecordings.map(async (recording) => {
          const startedAt = new Date(recording.started_at)
          const completedAt = new Date()
          const durationMs = completedAt.getTime() - startedAt.getTime()
          const isRetry = recording.status === 'failed'
          const statusMessage = isRetry
            ? 'Recovered by cleanup job (retry from failed)'
            : 'Recovered by cleanup job (stale upload)'

          await supabase
            .from('recordings')
            .update({
              status: 'ready',
              completed_at: completedAt.toISOString(),
              duration_ms: durationMs,
              status_message: statusMessage,
              updated_at: completedAt.toISOString(),
            })
            .eq('id', recording.id)
        })
      )
    }

    // Permanent R2 failures — mark as permanently failed (upload expired or corrupted)
    const permanentR2FailureIds = permanentR2Failures.map((r) => r.id)
    if (permanentR2FailureIds.length > 0) {
      const { error: permFailError } = await supabase
        .from('recordings')
        .update({
          status: 'failed',
          status_message: 'R2 multipart upload expired or corrupted - data lost',
          updated_at: now,
        })
        .in('id', permanentR2FailureIds)

      if (permFailError) {
        logger.error('Failed to batch update permanently failed R2 recordings', { error: permFailError })
      }
    }

    // Transient R2 failures — mark as failed but recoverable for next retry
    const transientR2FailureIds = transientR2Failures.map((r) => r.id)
    if (transientR2FailureIds.length > 0) {
      const { error: transientFailError } = await supabase
        .from('recordings')
        .update({
          status: 'failed',
          status_message: 'Cleanup job failed to finalize - will retry',
          updated_at: now,
        })
        .in('id', transientR2FailureIds)

      if (transientFailError) {
        logger.error('Failed to batch update transient-failed recordings', { error: transientFailError })
      }
    }

    if (readyRecordings.length > 0) {
      await Promise.all(
        readyRecordings.map((recording) =>
          enqueue({
            topic: 'recording-finalized',
            data: {
              resourceType: 'recording',
              resourceId: recording.id,
              action: 'finalize',
              studyId: recording.study_id,
              participantId: recording.participant_id,
              storagePath: recording.storage_path,
            },
          }).catch(() => {}) // Fire and forget
        )
      )
    }

    logger.info('Cleanup completed', {
      total: staleRecordings.length,
      finalized: completeResults.successes.length,
      abandoned: abandonedIds.length,
      failedPermanent: failedPermanentIds.length,
      failedInvalidEtags: invalidEtagIds.length,
      failedNoData: failedNoDataIds.length,
      failedR2Permanent: permanentR2FailureIds.length,
      failedR2Transient: transientR2FailureIds.length,
    })
  } catch (error) {
    logger.error('Error in cleanup stale recordings cron', { error })
  }
}

function classifyRecordings(
  recordings: StaleRecording[],
  participantStatuses: Map<string, string>
): ClassifiedRecordings {
  const classified: ClassifiedRecordings = {
    toAbort: [],
    toComplete: [],
    failedPermanent: [],
    failedNoData: [],
  }

  for (const recording of recordings) {
    const chunkEtags = recording.chunk_etags || []
    const hasChunks = chunkEtags.length > 0
    const isFailedRecording = recording.status === 'failed'

    if (!hasChunks && !isFailedRecording) {
      // No chunks — check if participant completed the study
      const participantStatus = participantStatuses.get(recording.participant_id)
      if (participantStatus === 'completed') {
        // Participant finished the study; recording just failed to capture data
        classified.failedNoData.push(recording)
      } else {
        // Actual abandonment
        classified.toAbort.push(recording)
      }
    } else if (!hasChunks && isFailedRecording) {
      // Failed recording with no chunks - mark as permanently failed
      classified.failedPermanent.push(recording)
    } else {
      // Has chunks - attempt to finalize
      classified.toComplete.push(recording)
    }
  }

  return classified
}
