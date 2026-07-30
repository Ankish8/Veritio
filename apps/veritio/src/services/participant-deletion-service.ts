import type { SupabaseClient } from '@supabase/supabase-js'
import {
  abortMultipartUpload as abortR2MultipartUpload,
  deleteRecording as deleteR2Recording,
} from './storage/r2-client'
import { cache, cacheKeys } from '../lib/cache/memory-cache'
import { throttledMapSettled } from '../lib/utils/async'

const MEDIA_DELETE_CONCURRENCY = 10

export interface ParticipantRecordingDeletionTarget {
  id: string
  participant_id: string
  storage_path: string
  upload_id: string | null
  status: string
}

interface RecordingCleanupDependencies {
  abortMultipartUpload: (storagePath: string, uploadId: string) => Promise<void>
  deleteRecording: (storagePath: string) => Promise<void>
}

interface ParticipantDeletionDependencies {
  cleanupRecording: (recording: ParticipantRecordingDeletionTarget) => Promise<void>
  deleteReportFiles: (supabase: SupabaseClient, paths: string[]) => Promise<void>
}

export interface ParticipantDeletionResult {
  success: boolean
  deletedParticipantIds: string[]
  deletedCount: number
  deletedRecordingCount: number
  error?: string
  errorCode?: 'not_found' | 'database' | 'media'
}

function isMissingMultipartUpload(error: unknown): boolean {
  const candidate = error as {
    name?: string
    $metadata?: { httpStatusCode?: number }
  }

  return (
    candidate?.name === 'NoSuchUpload' ||
    candidate?.$metadata?.httpStatusCode === 404
  )
}

/**
 * Permanently removes one recording's R2 object and any unfinished multipart
 * upload. Both operations are idempotent, which makes a failed database phase
 * safe to retry.
 */
export async function cleanupParticipantRecording(
  recording: ParticipantRecordingDeletionTarget,
  dependencies: RecordingCleanupDependencies = {
    abortMultipartUpload: abortR2MultipartUpload,
    deleteRecording: deleteR2Recording,
  },
): Promise<void> {
  const mayHaveActiveUpload =
    recording.upload_id &&
    recording.status !== 'ready' &&
    recording.status !== 'completed'

  if (mayHaveActiveUpload && recording.upload_id) {
    try {
      await dependencies.abortMultipartUpload(
        recording.storage_path,
        recording.upload_id,
      )
    } catch (error) {
      // Finalization can win the race between the DB read and the abort. The
      // object delete below is still required and remains idempotent.
      if (!isMissingMultipartUpload(error)) {
        throw error
      }
    }
  }

  await dependencies.deleteRecording(recording.storage_path)
}

async function deleteInsightsReportFiles(
  supabase: SupabaseClient,
  paths: string[],
): Promise<void> {
  if (paths.length === 0) return

  const { error } = await supabase.storage.from('reports').remove(paths)
  if (error) {
    throw new Error('Failed to delete generated insights reports')
  }
}

/**
 * Deletes participants only after all external media has been removed.
 * Relational data is deleted by one PostgreSQL function/transaction.
 */
export async function deleteStudyParticipants(
  supabase: SupabaseClient,
  studyId: string,
  participantIds: string[],
  dependencies: ParticipantDeletionDependencies = {
    cleanupRecording: cleanupParticipantRecording,
    deleteReportFiles: deleteInsightsReportFiles,
  },
): Promise<ParticipantDeletionResult> {
  const requestedIds = [...new Set(participantIds)]

  if (requestedIds.length === 0) {
    return {
      success: false,
      deletedParticipantIds: [],
      deletedCount: 0,
      deletedRecordingCount: 0,
      error: 'No participant IDs provided',
      errorCode: 'not_found',
    }
  }

  const { data: participants, error: participantError } = await supabase
    .from('participants')
    .select('id')
    .eq('study_id', studyId)
    .in('id', requestedIds)

  if (participantError) {
    return {
      success: false,
      deletedParticipantIds: [],
      deletedCount: 0,
      deletedRecordingCount: 0,
      error: 'Failed to verify participants',
      errorCode: 'database',
    }
  }

  const validIds = (participants ?? []).map(
    (participant: { id: string }) => participant.id,
  )

  if (validIds.length === 0) {
    return {
      success: false,
      deletedParticipantIds: [],
      deletedCount: 0,
      deletedRecordingCount: 0,
      error: 'No valid participants found for this study',
      errorCode: 'not_found',
    }
  }

  const [recordingsResult, insightsResult] = await Promise.all([
    supabase
      .from('recordings')
      .select('id, participant_id, storage_path, upload_id, status')
      .eq('study_id', studyId)
      .in('participant_id', validIds),
    supabase
      .from('ai_insights_reports')
      .select('file_path')
      .eq('study_id', studyId),
  ])

  if (recordingsResult.error || insightsResult.error) {
    return {
      success: false,
      deletedParticipantIds: [],
      deletedCount: 0,
      deletedRecordingCount: 0,
      error: 'Failed to prepare participant deletion',
      errorCode: 'database',
    }
  }

  const recordings =
    (recordingsResult.data as ParticipantRecordingDeletionTarget[] | null) ?? []
  const cleanupResults = await throttledMapSettled(
    recordings,
    // throttledMapSettled passes the item index as a second argument. Keep the
    // cleanup callback unary because cleanupParticipantRecording reserves its
    // second parameter for dependency injection.
    (recording) => dependencies.cleanupRecording(recording),
    MEDIA_DELETE_CONCURRENCY,
  )

  if (cleanupResults.failures.length > 0) {
    return {
      success: false,
      deletedParticipantIds: [],
      deletedCount: 0,
      deletedRecordingCount: cleanupResults.successes.length,
      error: 'Failed to delete participant recordings. Please retry.',
      errorCode: 'media',
    }
  }

  const reportPaths = [
    ...new Set(
      (insightsResult.data ?? [])
        .map((report: { file_path: string | null }) => report.file_path)
        .filter((path: string | null): path is string => Boolean(path)),
    ),
  ]

  try {
    await dependencies.deleteReportFiles(supabase, reportPaths)
  } catch {
    return {
      success: false,
      deletedParticipantIds: [],
      deletedCount: 0,
      deletedRecordingCount: recordings.length,
      error: 'Failed to delete generated analysis reports. Please retry.',
      errorCode: 'media',
    }
  }

  const { data: deletedRows, error: deleteError } = await supabase.rpc(
    'delete_study_participants' as never,
    {
      p_study_id: studyId,
      p_participant_ids: validIds,
    } as never,
  )

  if (deleteError) {
    return {
      success: false,
      deletedParticipantIds: [],
      deletedCount: 0,
      deletedRecordingCount: recordings.length,
      error: 'Failed to delete participant data. Please retry.',
      errorCode: 'database',
    }
  }

  const deletedParticipantIds = (
    (deletedRows as Array<{ deleted_participant_id: string }> | null) ?? []
  ).map((row) => row.deleted_participant_id)

  return {
    success: true,
    deletedParticipantIds,
    deletedCount: deletedParticipantIds.length,
    deletedRecordingCount: recordings.length,
  }
}

/** Drop every derived result that can contain the deleted participants. */
export function invalidateParticipantResultsCache(studyId: string): void {
  const keys = [
    cacheKeys.resultsAnalytics(studyId),
    cacheKeys.resultsOverview(studyId),
    cacheKeys.cardSortAnalytics(studyId),
    cacheKeys.treeTestAnalytics(studyId),
    cacheKeys.prototypeTestAnalytics(studyId),
    cacheKeys.firstClickAnalytics(studyId),
    cacheKeys.surveyAnalytics(studyId),
    cacheKeys.firstImpressionAnalytics(studyId),
  ]

  for (const key of keys) {
    cache.delete(key)
  }
}
