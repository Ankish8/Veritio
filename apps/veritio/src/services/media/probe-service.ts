/**
 * Media Probing Service
 *
 * Uses ffprobe to extract metadata from video/audio files.
 * Requires ffmpeg/ffprobe to be installed on the system.
 */

import ffmpeg from 'fluent-ffmpeg'

export interface MediaMetadata {
  /** Duration in milliseconds */
  durationMs: number
  /** Duration in seconds */
  durationSec: number
  /** Video width (if video) */
  width?: number
  /** Video height (if video) */
  height?: number
  /** Video codec */
  videoCodec?: string
  /** Audio codec */
  audioCodec?: string
  /** File format */
  format?: string
  /** Bitrate in bits per second */
  bitrate?: number
}

/**
 * Probe a media file from a URL to get its metadata.
 *
 * @param url - URL to the media file (signed R2 URL, etc.)
 * @returns Media metadata including duration
 *
 * @example
 * ```ts
 * const metadata = await probeMediaUrl('https://r2.example.com/recording.webm')
 * // metadata.durationMs => 10500 (10.5 seconds)
 * ```
 */
export async function probeMediaUrl(url: string): Promise<MediaMetadata> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(url, (err, data) => {
      if (err) {
        reject(new Error(`FFprobe failed: ${err.message}`))
        return
      }

      if (!data || !data.format) {
        reject(new Error('No format data returned from ffprobe'))
        return
      }

      // Find video and audio streams
      const videoStream = data.streams?.find(s => s.codec_type === 'video')
      const audioStream = data.streams?.find(s => s.codec_type === 'audio')

      // Get duration - prefer stream-level duration over format duration
      // WebM files from browser MediaRecorder often have incorrect format.duration
      // but stream.duration can be more accurate (based on actual frame timestamps)
      const streamDuration = videoStream?.duration
        ? parseFloat(String(videoStream.duration))
        : audioStream?.duration
          ? parseFloat(String(audioStream.duration))
          : null

      const formatDuration = data.format.duration || 0

      // Use stream duration if available and valid, otherwise fall back to format duration
      // This handles WebM files where format duration is often inflated/incorrect
      let durationSec: number
      if (streamDuration && Number.isFinite(streamDuration) && streamDuration > 0) {
        durationSec = streamDuration
      } else {
        durationSec = formatDuration
      }

      const durationMs = Math.round(durationSec * 1000)

      resolve({
        durationMs,
        durationSec,
        width: videoStream?.width,
        height: videoStream?.height,
        videoCodec: videoStream?.codec_name,
        audioCodec: audioStream?.codec_name,
        format: data.format.format_name,
        bitrate: data.format.bit_rate ? parseInt(String(data.format.bit_rate), 10) : undefined,
      })
    })
  })
}

/**
 * Probe a media file from a local path to get its metadata.
 *
 * @param filePath - Local path to the media file
 * @returns Media metadata including duration
 */
export async function probeMediaFile(filePath: string): Promise<MediaMetadata> {
  return probeMediaUrl(filePath) // ffprobe handles both URLs and local paths
}

/**
 * Get just the duration of a media file from a URL.
 * Simpler version that only returns duration.
 *
 * @param url - URL to the media file
 * @returns Duration in milliseconds
 */
export async function getMediaDurationMs(url: string): Promise<number> {
  const metadata = await probeMediaUrl(url)
  return metadata.durationMs
}

/**
 * Get accurate duration by reading actual packet timestamps.
 * This is slower but more accurate for WebM files with bad metadata.
 *
 * Uses ffprobe to read all packet timestamps and finds the maximum,
 * which gives the true duration regardless of container metadata.
 *
 * @param url - URL to the media file
 * @returns Duration in milliseconds (accurate)
 */
export async function getAccurateMediaDurationMs(url: string): Promise<number> {
  const { spawn } = await import('child_process')

  return new Promise((resolve, reject) => {
    // Use ffprobe to read ALL packet timestamps from the video stream
    // This is slower but gives accurate duration for WebM files with bad metadata
    const ffprobe = spawn('ffprobe', [
      '-v', 'error',
      '-select_streams', 'v:0',
      '-show_entries', 'packet=pts_time',
      '-of', 'csv=p=0',
      url
    ])

    let output = ''
    let errorOutput = ''

    ffprobe.stdout.on('data', (data) => {
      output += data.toString()
    })

    ffprobe.stderr.on('data', (data) => {
      errorOutput += data.toString()
    })

    ffprobe.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`ffprobe exited with code ${code}: ${errorOutput}`))
        return
      }

      // Parse packet timestamps and find the maximum
      const timestamps = output
        .trim()
        .split('\n')
        .map(line => parseFloat(line))
        .filter(ts => Number.isFinite(ts) && ts > 0)

      if (timestamps.length === 0) {
        reject(new Error('No valid packet timestamps found'))
        return
      }

      const maxTimestamp = Math.max(...timestamps)
      const durationMs = Math.round(maxTimestamp * 1000)

      resolve(durationMs)
    })

    ffprobe.on('error', (err) => {
      reject(new Error(`Failed to spawn ffprobe: ${err.message}`))
    })
  })
}
