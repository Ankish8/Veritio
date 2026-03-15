import type { StepConfig } from 'motia'
import { z } from 'zod'
import ffmpeg from 'fluent-ffmpeg'
import path from 'path'
import { promises as fs } from 'fs'
import { createHash } from 'crypto'
import type { EventHandlerContext } from '../../lib/motia/types'
import { getMotiaSupabaseClient } from '../../lib/supabase/motia-client'
import {
  downloadRecordingToFile,
  uploadRecordingFromFile,
  isR2Configured,
} from '../../services/storage/r2-client'

const inputSchema = z.object({
  resourceType: z.literal('recording'),
  resourceId: z.string().uuid(),
  action: z.literal('finalize'),
  studyId: z.string().uuid(),
  participantId: z.string().uuid(),
  storagePath: z.string(),
})

const COMPRESSION_ROLLOUT_PERCENT = Number(process.env.COMPRESSION_ROLLOUT_PERCENT ?? '0')
const MIN_SAVINGS_PERCENT = Number(process.env.COMPRESSION_MIN_SAVINGS_PERCENT ?? '20')
const TEMP_ROOT = process.env.RECORDING_COMPRESSION_TMP ?? '/tmp/recordings'

function shouldCompress(recordingId: string): boolean {
  if (!Number.isFinite(COMPRESSION_ROLLOUT_PERCENT) || COMPRESSION_ROLLOUT_PERCENT <= 0) {
    return false
  }

  if (COMPRESSION_ROLLOUT_PERCENT >= 100) {
    return true
  }

  const hash = createHash('sha256').update(recordingId).digest()
  const bucket = (hash[0] / 255) * 100
  return bucket < COMPRESSION_ROLLOUT_PERCENT
}

async function compressToWebm(inputPath: string, outputPath: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        '-map 0:v:0',
        '-map 0:a?',
        '-c:v libvpx-vp9',
        '-b:v 0',
        '-crf 35',
        '-c:a libopus',
        '-b:a 96k',
      ])
      .format('webm')
      .on('end', () => resolve())
      .on('error', (error) => reject(error))
      .save(outputPath)
  })
}

export const config = {
  name: 'CompressRecording',
  description: 'Compress finalized recordings to reduce storage usage',
  triggers: [{
    type: 'queue',
    topic: 'recording-finalized',
    input: inputSchema as any,
    infrastructure: {
      handler: { timeout: 600 },
      queue: { maxRetries: 2 },
    },
  }],
  enqueues: ['recording-compressed'],
  virtualEnqueues: [{ topic: 'R2 Storage', label: 'download/upload recording' }],
  flows: ['recording-management', 'storage-optimization'],
} satisfies StepConfig

export const handler = async (input: z.infer<typeof inputSchema>, { logger, enqueue }: EventHandlerContext) => {
  const data = inputSchema.parse(input)

  if (!isR2Configured()) {
    logger.warn('R2 not configured, skipping compression', { recordingId: data.resourceId })
    return
  }

  if (!shouldCompress(data.resourceId)) {
    logger.info('Compression rollout gate skipped recording', {
      recordingId: data.resourceId,
      rolloutPercent: COMPRESSION_ROLLOUT_PERCENT,
    })
    return
  }

  const supabase = getMotiaSupabaseClient()

  const { data: recording, error } = await supabase
    .from('recordings')
    .select('id, status, storage_path, file_size_bytes')
    .eq('id', data.resourceId)
    .single()

  if (error || !recording) {
    logger.error('Recording not found for compression', { error, recordingId: data.resourceId })
    return
  }

  if (recording.status === 'deleted') {
    logger.info('Skipping compression for deleted recording', { recordingId: data.resourceId })
    return
  }

  const tempDir = path.join(TEMP_ROOT, data.resourceId)
  const originalPath = path.join(tempDir, 'original.webm')
  const compressedPath = path.join(tempDir, 'compressed.webm')

  await fs.mkdir(tempDir, { recursive: true })

  try {
    logger.info('Downloading recording for compression', { recordingId: data.resourceId })
    await downloadRecordingToFile(data.storagePath, originalPath)

    const originalStats = await fs.stat(originalPath)
    const originalSize = originalStats.size

    logger.info('Compressing recording', { recordingId: data.resourceId, originalSize })
    await compressToWebm(originalPath, compressedPath)

    const compressedStats = await fs.stat(compressedPath)
    const compressedSize = compressedStats.size

    if (originalSize === 0) {
      logger.warn('Original recording size is zero, skipping compression', { recordingId: data.resourceId })
      return
    }

    const savingsPercent = ((originalSize - compressedSize) / originalSize) * 100

    if (savingsPercent < MIN_SAVINGS_PERCENT) {
      logger.info('Compression savings below threshold, keeping original', {
        recordingId: data.resourceId,
        savingsPercent: Number(savingsPercent.toFixed(2)),
      })
      return
    }

    logger.info('Uploading compressed recording', {
      recordingId: data.resourceId,
      compressedSize,
      savingsPercent: Number(savingsPercent.toFixed(2)),
    })

    await uploadRecordingFromFile(data.storagePath, compressedPath, 'video/webm')

    await supabase
      .from('recordings')
      .update({
        file_size_bytes: compressedSize,
        total_storage_bytes: compressedSize,
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', data.resourceId)

    enqueue({
      topic: 'recording-compressed',
      data: {
        resourceType: 'recording',
        resourceId: data.resourceId,
        action: 'compressed',
        studyId: data.studyId,
        metadata: {
          participantId: data.participantId,
          originalSize,
          compressedSize,
          savingsPercent: Number(savingsPercent.toFixed(2)),
        },
      },
    }).catch(() => {})
  } catch (compressionError) {
    logger.error('Compression failed', { recordingId: data.resourceId, error: compressionError })
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true })
  }
}
