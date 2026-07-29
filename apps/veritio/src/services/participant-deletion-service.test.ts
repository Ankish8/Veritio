import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  cleanupParticipantRecording,
  deleteStudyParticipants,
  type ParticipantRecordingDeletionTarget,
} from './participant-deletion-service'

const studyId = '11111111-1111-4111-8111-111111111111'
const participantId = '22222222-2222-4222-8222-222222222222'
const otherParticipantId = '33333333-3333-4333-8333-333333333333'

interface SupabaseFixture {
  participants?: Array<{ id: string }>
  participantError?: Error | null
  recordings?: ParticipantRecordingDeletionTarget[]
  recordingsError?: Error | null
  insights?: Array<{ file_path: string | null }>
  insightsError?: Error | null
  deletedRows?: Array<{ deleted_participant_id: string }>
  deleteError?: Error | null
}

function queryResult<T>(data: T, error: Error | null = null) {
  const result = { data, error }
  const builder: Record<string, unknown> = {}

  for (const method of ['select', 'eq', 'in']) {
    builder[method] = vi.fn(() => builder)
  }

  builder.then = (
    resolve: (value: typeof result) => unknown,
    reject: (reason: unknown) => unknown,
  ) => Promise.resolve(result).then(resolve, reject)

  return builder
}

function createSupabase(fixture: SupabaseFixture = {}) {
  const participantsQuery = queryResult(
    fixture.participants ?? [{ id: participantId }],
    fixture.participantError ?? null,
  )
  const recordingsQuery = queryResult(
    fixture.recordings ?? [],
    fixture.recordingsError ?? null,
  )
  const insightsQuery = queryResult(
    fixture.insights ?? [],
    fixture.insightsError ?? null,
  )
  const rpc = vi.fn().mockResolvedValue({
    data:
      fixture.deletedRows ??
      [{ deleted_participant_id: participantId }],
    error: fixture.deleteError ?? null,
  })
  const remove = vi.fn().mockResolvedValue({ data: [], error: null })

  const supabase = {
    from: vi.fn((table: string) => {
      if (table === 'participants') return participantsQuery
      if (table === 'recordings') return recordingsQuery
      if (table === 'ai_insights_reports') return insightsQuery
      throw new Error(`Unexpected table: ${table}`)
    }),
    rpc,
    storage: {
      from: vi.fn(() => ({ remove })),
    },
  } as unknown as SupabaseClient

  return { supabase, rpc, remove }
}

describe('deleteStudyParticipants', () => {
  const cleanupRecording = vi.fn()
  const deleteReportFiles = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    cleanupRecording.mockResolvedValue(undefined)
    deleteReportFiles.mockResolvedValue(undefined)
  })

  it('deletes media first and then invokes the scoped database transaction', async () => {
    const recording = {
      id: 'recording-1',
      participant_id: participantId,
      storage_path: `${studyId}/recordings/${participantId}/recording-1`,
      upload_id: null,
      status: 'ready',
    }
    const { supabase, rpc } = createSupabase({
      recordings: [recording],
      insights: [
        { file_path: `studies/${studyId}/insights/report-1.pdf` },
        { file_path: `studies/${studyId}/insights/report-1.pdf` },
        { file_path: null },
      ],
    })

    const result = await deleteStudyParticipants(
      supabase,
      studyId,
      [participantId, participantId, otherParticipantId],
      { cleanupRecording, deleteReportFiles },
    )

    expect(result).toEqual({
      success: true,
      deletedParticipantIds: [participantId],
      deletedCount: 1,
      deletedRecordingCount: 1,
    })
    expect(cleanupRecording).toHaveBeenCalledWith(recording)
    expect(deleteReportFiles).toHaveBeenCalledWith(
      supabase,
      [`studies/${studyId}/insights/report-1.pdf`],
    )
    expect(rpc).toHaveBeenCalledWith('delete_study_participants', {
      p_study_id: studyId,
      p_participant_ids: [participantId],
    })
    expect(cleanupRecording.mock.invocationCallOrder[0]).toBeLessThan(
      rpc.mock.invocationCallOrder[0],
    )
  })

  it('does not pass the mapper index into a cleanup callback dependency parameter', async () => {
    const recording = {
      id: 'recording-1',
      participant_id: participantId,
      storage_path: `${studyId}/recordings/${participantId}/recording-1`,
      upload_id: null,
      status: 'completed',
    }
    const { supabase, rpc } = createSupabase({ recordings: [recording] })
    const deleteRecording = vi.fn().mockResolvedValue(undefined)
    const cleanupWithDefaultDependencies = vi.fn(
      async (
        target: ParticipantRecordingDeletionTarget,
        dependencies = { deleteRecording },
      ) => {
        await dependencies.deleteRecording(target.storage_path)
      },
    )

    const result = await deleteStudyParticipants(
      supabase,
      studyId,
      [participantId],
      {
        cleanupRecording: cleanupWithDefaultDependencies,
        deleteReportFiles,
      },
    )

    expect(result.success).toBe(true)
    expect(cleanupWithDefaultDependencies).toHaveBeenCalledWith(recording)
    expect(deleteRecording).toHaveBeenCalledWith(recording.storage_path)
    expect(rpc).toHaveBeenCalledOnce()
  })

  it('does not touch media or the database when no IDs belong to the study', async () => {
    const { supabase, rpc } = createSupabase({ participants: [] })

    const result = await deleteStudyParticipants(
      supabase,
      studyId,
      [otherParticipantId],
      { cleanupRecording, deleteReportFiles },
    )

    expect(result.errorCode).toBe('not_found')
    expect(cleanupRecording).not.toHaveBeenCalled()
    expect(deleteReportFiles).not.toHaveBeenCalled()
    expect(rpc).not.toHaveBeenCalled()
  })

  it('leaves relational data intact when any recording cannot be deleted', async () => {
    const recording = {
      id: 'recording-1',
      participant_id: participantId,
      storage_path: `${studyId}/recordings/${participantId}/recording-1`,
      upload_id: null,
      status: 'ready',
    }
    const { supabase, rpc } = createSupabase({ recordings: [recording] })
    cleanupRecording.mockRejectedValue(new Error('R2 unavailable'))

    const result = await deleteStudyParticipants(
      supabase,
      studyId,
      [participantId],
      { cleanupRecording, deleteReportFiles },
    )

    expect(result.errorCode).toBe('media')
    expect(result.deletedCount).toBe(0)
    expect(deleteReportFiles).not.toHaveBeenCalled()
    expect(rpc).not.toHaveBeenCalled()
  })

  it('leaves relational data intact when a generated report file cannot be deleted', async () => {
    const { supabase, rpc } = createSupabase({
      insights: [{ file_path: `studies/${studyId}/insights/report-1.pdf` }],
    })
    deleteReportFiles.mockRejectedValue(new Error('Storage unavailable'))

    const result = await deleteStudyParticipants(
      supabase,
      studyId,
      [participantId],
      { cleanupRecording, deleteReportFiles },
    )

    expect(result.errorCode).toBe('media')
    expect(rpc).not.toHaveBeenCalled()
  })

  it('reports a retryable database failure after external media cleanup', async () => {
    const { supabase } = createSupabase({
      deleteError: new Error('database unavailable'),
    })

    const result = await deleteStudyParticipants(
      supabase,
      studyId,
      [participantId],
      { cleanupRecording, deleteReportFiles },
    )

    expect(result.errorCode).toBe('database')
    expect(result.deletedCount).toBe(0)
    expect(result.error).toContain('retry')
  })
})

describe('cleanupParticipantRecording', () => {
  const recording: ParticipantRecordingDeletionTarget = {
    id: 'recording-1',
    participant_id: participantId,
    storage_path: `${studyId}/recordings/${participantId}/recording-1`,
    upload_id: 'upload-1',
    status: 'uploading',
  }

  it('treats an already finalized multipart upload as an idempotent retry', async () => {
    const abortMultipartUpload = vi.fn().mockRejectedValue(
      Object.assign(new Error('missing'), { name: 'NoSuchUpload' }),
    )
    const deleteRecording = vi.fn().mockResolvedValue(undefined)

    await cleanupParticipantRecording(recording, {
      abortMultipartUpload,
      deleteRecording,
    })

    expect(abortMultipartUpload).toHaveBeenCalledWith(
      recording.storage_path,
      recording.upload_id,
    )
    expect(deleteRecording).toHaveBeenCalledWith(recording.storage_path)
  })

  it('does not swallow a real multipart cleanup failure', async () => {
    const abortMultipartUpload = vi
      .fn()
      .mockRejectedValue(new Error('access denied'))
    const deleteRecording = vi.fn()

    await expect(
      cleanupParticipantRecording(recording, {
        abortMultipartUpload,
        deleteRecording,
      }),
    ).rejects.toThrow('access denied')
    expect(deleteRecording).not.toHaveBeenCalled()
  })
})
