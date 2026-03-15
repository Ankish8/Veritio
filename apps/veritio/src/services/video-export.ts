export interface ExportConfig {
  format: 'mp4' | 'webm' | 'gif'
  quality: 'high' | 'medium' | 'low'
  resolution: '1080p' | '720p' | '480p'
  includeAnnotations: boolean
  includeWebcam: boolean
  timeRange?: { startMs: number; endMs: number }
}

export interface ExportJob {
  id: string
  recordingId: string
  config: ExportConfig
  status: 'pending' | 'processing' | 'complete' | 'failed'
  progress: number
  resultUrl?: string
  error?: string
  createdAt: Date
  completedAt?: Date
}

const RESOLUTIONS = {
  '1080p': { width: 1920, height: 1080 },
  '720p': { width: 1280, height: 720 },
  '480p': { width: 854, height: 480 },
}

// Video bitrate in Mbps
const QUALITY_BITRATES = {
  high: 8,
  medium: 4,
  low: 2,
}

export async function createExportJob(
  recordingId: string,
  config: ExportConfig
): Promise<ExportJob> {
  const job: ExportJob = {
    id: crypto.randomUUID(),
    recordingId,
    config,
    status: 'pending',
    progress: 0,
    createdAt: new Date(),
  }

  // In a real implementation, this would:
  // 1. Send the job to a backend queue
  // 2. Return the job ID for status polling
  // 3. Backend would use FFmpeg to process the video

  return job
}

export async function clientSideExport(
  videoElement: HTMLVideoElement,
  config: ExportConfig,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  const { timeRange, format } = config
  const { width, height } = RESOLUTIONS[config.resolution]

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!

  const stream = canvas.captureStream(30)
  const mimeType = format === 'webm' ? 'video/webm;codecs=vp9' : 'video/webm'
  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: QUALITY_BITRATES[config.quality] * 1000000,
  })

  const chunks: Blob[] = []
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) {
      chunks.push(e.data)
    }
  }

  return new Promise((resolve, reject) => {
    recorder.onerror = reject

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType })
      resolve(blob)
    }

    if (timeRange) {
      videoElement.currentTime = timeRange.startMs / 1000
    }

    const startTime = timeRange?.startMs ?? 0
    const endTime = timeRange?.endMs ?? (videoElement.duration * 1000)
    const duration = endTime - startTime

    recorder.start()

    const renderFrame = () => {
      const currentTime = videoElement.currentTime * 1000

      if (currentTime >= endTime || videoElement.paused || videoElement.ended) {
        recorder.stop()
        return
      }

      ctx.drawImage(videoElement, 0, 0, width, height)
      const progress = ((currentTime - startTime) / duration) * 100
      onProgress?.(Math.min(progress, 100))

      requestAnimationFrame(renderFrame)
    }

    videoElement.play()
    renderFrame()
  })
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function generateExportFilename(
  recordingId: string,
  config: ExportConfig
): string {
  const timestamp = new Date().toISOString().slice(0, 10)
  const suffix = config.timeRange ? '_clip' : ''
  return `recording_${recordingId.slice(0, 8)}${suffix}_${timestamp}.${config.format}`
}

export function isClientExportSupported(format: string): boolean {
  if (typeof MediaRecorder === 'undefined') return false

  const mimeTypes: Record<string, string> = {
    webm: 'video/webm',
    mp4: 'video/mp4',
  }

  const mimeType = mimeTypes[format]
  if (!mimeType) return false

  return MediaRecorder.isTypeSupported(mimeType)
}

export function estimateFileSize(
  durationMs: number,
  config: ExportConfig
): string {
  const bitrate = QUALITY_BITRATES[config.quality]
  const durationSeconds = durationMs / 1000
  const sizeMB = (bitrate * durationSeconds) / 8

  if (sizeMB < 1) return `${Math.round(sizeMB * 1024)} KB`
  if (sizeMB < 1024) return `${Math.round(sizeMB)} MB`
  return `${(sizeMB / 1024).toFixed(1)} GB`
}
