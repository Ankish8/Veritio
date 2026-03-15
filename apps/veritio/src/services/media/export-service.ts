/**
 * Video Export Service
 *
 * Handles video clip extraction and export with optional annotations.
 * Uses fluent-ffmpeg for video processing.
 */

import ffmpeg from 'fluent-ffmpeg'
import type { ExportConfig } from '../../components/analysis/recordings/video-editor/export-dialog'

export interface ExportOptions {
  /** Source video URL */
  sourceUrl: string
  /** Optional webcam video URL for PiP */
  webcamUrl?: string | null
  /** Time range to export (in ms) */
  timeRange?: { startMs: number; endMs: number }
  /** Export configuration */
  config: ExportConfig
  /** Annotations to burn in (if includeAnnotations is true) */
  annotations?: Array<{
    startMs: number
    endMs: number
    type: 'text' | 'shape' | 'blur' | 'highlight'
    content?: string
    style: Record<string, unknown>
  }>
}

export interface ExportProgress {
  percent: number
  timemark: string
  currentKbps?: number
  targetSize?: number
}

export interface ExportResult {
  success: boolean
  outputPath?: string
  error?: string
  durationMs?: number
  fileSize?: number
}

/** Resolution presets */
const RESOLUTIONS: Record<string, { width: number; height: number }> = {
  '1080p': { width: 1920, height: 1080 },
  '720p': { width: 1280, height: 720 },
  '480p': { width: 854, height: 480 },
}

/** Quality presets (CRF values for h264, lower = better) */
const QUALITY_CRF: Record<string, number> = {
  high: 18,
  medium: 23,
  low: 28,
}

/**
 * Export a video clip with optional processing.
 *
 * @param options - Export options
 * @param onProgress - Progress callback
 * @returns Export result with output path or error
 */
export async function exportVideo(
  options: ExportOptions,
  onProgress?: (progress: ExportProgress) => void
): Promise<ExportResult> {
  const { sourceUrl, webcamUrl, timeRange, config } = options
  const { format, quality, resolution, includeWebcam } = config

  const res = RESOLUTIONS[resolution]
  const crf = QUALITY_CRF[quality]

  return new Promise((resolve) => {
    try {
      let command = ffmpeg(sourceUrl)

      // Time range extraction
      if (timeRange) {
        const startSec = timeRange.startMs / 1000
        const durationSec = (timeRange.endMs - timeRange.startMs) / 1000
        command = command.setStartTime(startSec).setDuration(durationSec)
      }

      // Add webcam overlay if requested and available
      if (includeWebcam && webcamUrl) {
        command = command
          .input(webcamUrl)
          .complexFilter([
            // Scale main video to target resolution
            `[0:v]scale=${res.width}:${res.height}[main]`,
            // Scale webcam to PiP size (1/4 of main, bottom-right)
            `[1:v]scale=${Math.floor(res.width / 4)}:-1[pip]`,
            // Overlay PiP on main
            `[main][pip]overlay=W-w-20:H-h-20[out]`,
          ])
          .outputOptions(['-map', '[out]', '-map', '0:a?'])
      } else {
        // Just scale to target resolution
        command = command.videoFilters([`scale=${res.width}:${res.height}`])
      }

      // Video codec settings
      if (format === 'mp4') {
        command = command
          .videoCodec('libx264')
          .audioCodec('aac')
          .outputOptions([
            `-crf ${crf}`,
            '-preset medium',
            '-movflags +faststart',
          ])
      } else if (format === 'webm') {
        command = command
          .videoCodec('libvpx-vp9')
          .audioCodec('libopus')
          .outputOptions([`-crf ${crf}`, '-b:v 0'])
      } else if (format === 'gif') {
        command = command
          .noAudio()
          .videoFilters([
            `fps=15,scale=${Math.min(res.width, 640)}:-1:flags=lanczos`,
            'split[s0][s1]',
            '[s0]palettegen[p]',
            '[s1][p]paletteuse',
          ])
      }

      // Set output format
      command = command.format(format === 'gif' ? 'gif' : format)

      // Generate output filename
      const timestamp = Date.now()
      const outputPath = `/tmp/export-${timestamp}.${format}`

      // Progress tracking
      command.on('progress', (progress) => {
        onProgress?.({
          percent: progress.percent || 0,
          timemark: progress.timemark || '00:00:00',
          currentKbps: progress.currentKbps,
          targetSize: progress.targetSize,
        })
      })

      // Completion
      command.on('end', () => {
        resolve({
          success: true,
          outputPath,
          durationMs: timeRange
            ? timeRange.endMs - timeRange.startMs
            : undefined,
        })
      })

      // Error handling
      command.on('error', (err) => {
        resolve({
          success: false,
          error: err.message,
        })
      })

      // Run export
      command.save(outputPath)
    } catch (err) {
      resolve({
        success: false,
        error: err instanceof Error ? err.message : 'Export failed',
      })
    }
  })
}

/**
 * Generate a thumbnail from a video at a specific time.
 *
 * @param videoUrl - Video source URL
 * @param timeMs - Time in milliseconds
 * @param size - Output size { width, height }
 * @returns Thumbnail as base64 data URL
 */
export async function generateThumbnail(
  videoUrl: string,
  timeMs: number,
  size: { width: number; height: number } = { width: 320, height: 180 }
): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []

    ffmpeg(videoUrl)
      .setStartTime(timeMs / 1000)
      .frames(1)
      .size(`${size.width}x${size.height}`)
      .format('image2pipe')
      .outputOptions(['-vcodec', 'mjpeg'])
      .on('error', reject)
      .pipe()
      .on('data', (chunk: Buffer) => chunks.push(chunk))
      .on('end', () => {
        const buffer = Buffer.concat(chunks)
        const base64 = buffer.toString('base64')
        resolve(`data:image/jpeg;base64,${base64}`)
      })
      .on('error', reject)
  })
}

/**
 * Get estimated file size for an export.
 *
 * @param durationMs - Duration in milliseconds
 * @param config - Export configuration
 * @returns Estimated file size in bytes
 */
export function estimateExportSize(durationMs: number, config: ExportConfig): number {
  const durationSec = durationMs / 1000

  // Rough bitrate estimates (kbps)
  const bitrateEstimates: Record<string, Record<string, number>> = {
    '1080p': { high: 8000, medium: 5000, low: 2500 },
    '720p': { high: 5000, medium: 2500, low: 1500 },
    '480p': { high: 2500, medium: 1500, low: 800 },
  }

  const bitrate = bitrateEstimates[config.resolution]?.[config.quality] || 2500

  // GIF is much larger
  if (config.format === 'gif') {
    return Math.round(durationSec * bitrate * 3 * 125) // ~3x video size
  }

  return Math.round(durationSec * bitrate * 125) // kbps to bytes
}
