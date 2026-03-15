'use client'

/**
 * ExportMenu Component
 *
 * Dropdown menu for exporting recording data in various formats.
 * Supports transcript export (TXT, JSON) and clips export.
 */

import { useState, useCallback } from 'react'
import { Download, FileText, FileJson, Scissors, Package, Loader2, Video } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from '@/components/ui/sonner'

interface ExportMenuProps {
  /** Study ID */
  studyId: string
  /** Recording ID */
  recordingId: string
  /** Whether transcript is available */
  hasTranscript: boolean
  /** Number of clips available */
  clipsCount: number
  /** Playback URL for video download */
  playbackUrl?: string | null
  /** Callback to export transcript */
  onExportTranscript: (format: 'txt' | 'json') => Promise<Blob>
  /** Callback to export clips */
  onExportClips: () => Promise<Blob>
  /** Callback to export full bundle */
  onExportBundle: () => Promise<Blob>
}

export function ExportMenu({
  studyId: _studyId,
  recordingId,
  hasTranscript,
  clipsCount,
  playbackUrl,
  onExportTranscript,
  onExportClips,
  onExportBundle,
}: ExportMenuProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [exportType, setExportType] = useState<string | null>(null)

  const handleDownloadVideo = useCallback(() => {
    if (!playbackUrl) return
    const a = document.createElement('a')
    a.href = playbackUrl
    a.download = `recording-${recordingId.slice(0, 8)}.webm`
    a.target = '_blank'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    toast.success('Video download started')
  }, [playbackUrl, recordingId])

  const handleExport = useCallback(async (type: 'transcript-txt' | 'transcript-json' | 'clips' | 'bundle') => {
    setIsExporting(true)
    setExportType(type)

    try {
      let blob: Blob
      let filename: string

      switch (type) {
        case 'transcript-txt':
          blob = await onExportTranscript('txt')
          filename = `transcript-${recordingId.slice(0, 8)}.txt`
          break
        case 'transcript-json':
          blob = await onExportTranscript('json')
          filename = `transcript-${recordingId.slice(0, 8)}.json`
          break
        case 'clips':
          blob = await onExportClips()
          filename = `clips-${recordingId.slice(0, 8)}.json`
          break
        case 'bundle':
          blob = await onExportBundle()
          filename = `recording-bundle-${recordingId.slice(0, 8)}.json`
          break
        default:
          throw new Error('Unknown export type')
      }

      // Download the file
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success('Export downloaded', {
        description: filename,
      })
    } catch (error) {
      toast.error('Export failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setIsExporting(false)
      setExportType(null)
    }
  }, [recordingId, onExportTranscript, onExportClips, onExportBundle])

  const isDisabled = !hasTranscript && clipsCount === 0 && !playbackUrl

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={isDisabled || isExporting}>
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Export Recording Data</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Video download */}
        {playbackUrl && (
          <>
            <DropdownMenuItem onClick={handleDownloadVideo}>
              <Video className="h-4 w-4 mr-2" />
              <span>Download Video (.webm)</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Transcript exports */}
        {hasTranscript && (
          <>
            <DropdownMenuItem
              onClick={() => handleExport('transcript-txt')}
              disabled={isExporting}
            >
              <FileText className="h-4 w-4 mr-2" />
              <span>Transcript (.txt)</span>
              {exportType === 'transcript-txt' && (
                <Loader2 className="h-4 w-4 ml-auto animate-spin" />
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleExport('transcript-json')}
              disabled={isExporting}
            >
              <FileJson className="h-4 w-4 mr-2" />
              <span>Transcript (.json)</span>
              {exportType === 'transcript-json' && (
                <Loader2 className="h-4 w-4 ml-auto animate-spin" />
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Clips export */}
        {clipsCount > 0 && (
          <>
            <DropdownMenuItem
              onClick={() => handleExport('clips')}
              disabled={isExporting}
            >
              <Scissors className="h-4 w-4 mr-2" />
              <span>Clips ({clipsCount})</span>
              {exportType === 'clips' && (
                <Loader2 className="h-4 w-4 ml-auto animate-spin" />
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Full bundle */}
        <DropdownMenuItem
          onClick={() => handleExport('bundle')}
          disabled={isExporting}
        >
          <Package className="h-4 w-4 mr-2" />
          <span>Full Bundle (.json)</span>
          {exportType === 'bundle' && (
            <Loader2 className="h-4 w-4 ml-auto animate-spin" />
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
