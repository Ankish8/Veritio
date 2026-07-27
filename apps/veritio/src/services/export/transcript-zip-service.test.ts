// @vitest-environment node

import { describe, expect, it } from 'vitest'
import { strFromU8, unzipSync } from 'fflate'
import { buildTranscriptArchive } from './transcript-zip-service'

const recording = {
  id: 'recording-1',
  participant_id: 'participant-1',
  created_at: '2026-07-27T00:00:00.000Z',
  capture_mode: 'screen_audio',
  duration_ms: 10_000,
}

const completedTranscript = {
  id: 'transcript-1',
  recording_id: recording.id,
  status: 'completed',
  full_text: 'Hello world',
  segments: [
    {
      start: 1_000,
      end: 2_000,
      text: 'Hello world',
      speaker: 'Participant',
      confidence: 0.98,
    },
  ],
  language: 'en',
  provider: 'test',
  model: 'test-model',
  confidence_avg: 0.98,
  word_count: 2,
  processing_time_ms: 100,
  error_message: null,
  created_at: '2026-07-27T00:01:00.000Z',
}

describe('bulk transcript archive', () => {
  it('builds TXT and JSON files plus a complete manifest', () => {
    const archive = buildTranscriptArchive({
      studyId: 'study-1',
      recordings: [recording],
      transcripts: [completedTranscript],
      requestedRecordingIds: [recording.id, 'missing-recording'],
      generatedAt: '2026-07-27T12:00:00.000Z',
      options: {
        formats: ['txt', 'json'],
        includeTimestamps: true,
        includeSpeakers: true,
      },
    })
    const files = unzipSync(archive.bytes)

    expect(Object.keys(files).sort()).toEqual([
      'manifest.json',
      'transcripts/recording-recording-1.json',
      'transcripts/recording-recording-1.txt',
    ])
    expect(
      strFromU8(files['transcripts/recording-recording-1.txt'])
    ).toBe('[0:01] Participant: Hello world')
    expect(
      JSON.parse(strFromU8(files['manifest.json']))
    ).toMatchObject({
      studyId: 'study-1',
      exported: [{ recordingId: recording.id }],
      skipped: [
        {
          recordingId: 'missing-recording',
          reason: 'Recording was not found in this study',
        },
      ],
      failed: [],
    })
  })

  it('lists missing, incomplete, and failed transcripts without failing the job', () => {
    const archive = buildTranscriptArchive({
      studyId: 'study-1',
      recordings: [
        recording,
        { ...recording, id: 'recording-2' },
        { ...recording, id: 'recording-3' },
      ],
      transcripts: [
        { ...completedTranscript, recording_id: recording.id, status: 'processing' },
        {
          ...completedTranscript,
          recording_id: 'recording-2',
          status: 'failed',
          error_message: 'Provider timeout',
        },
      ],
      options: {
        formats: ['txt'],
        includeTimestamps: false,
        includeSpeakers: false,
      },
    })

    expect(archive.manifest.exported).toEqual([])
    expect(archive.manifest.skipped).toHaveLength(2)
    expect(archive.manifest.failed).toEqual([
      { recordingId: 'recording-2', error: 'Provider timeout' },
    ])
  })
})
