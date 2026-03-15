import { useState, useCallback } from 'react'
import { toast } from '@/components/ui/sonner'
import { useAuthFetch } from '@/hooks'
import { parseFigmaUrl } from '@/services/prototype-service'
import {
  useFirstClickLibrary,
  type FigmaFramePreview,
  type ImportedLibraryImage,
} from '@/stores/first-click-library'

// Re-export types for consumers
export type { FigmaFramePreview, ImportedLibraryImage }

interface UseFigmaImportOptions {
  studyId: string
  onLoadComplete?: () => void // Called when frames are loaded (to switch tabs)
}

export function useFigmaImport({ studyId, onLoadComplete }: UseFigmaImportOptions) {
  const authFetch = useAuthFetch()

  const [figmaUrl, setFigmaUrl] = useState('')
  const [isLoadingFrames, setIsLoadingFrames] = useState(false)

  const library = useFirstClickLibrary()

  const loadFrames = useCallback(async () => {
    const parsed = parseFigmaUrl(figmaUrl)
    if (!parsed.isValid) {
      toast.error(parsed.error || 'Invalid Figma URL')
      return
    }

    setIsLoadingFrames(true)

    try {
      const response = await authFetch(
        `/api/studies/${studyId}/first-click/figma-frames?fileKey=${parsed.fileKey}`
      )
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load frames')
      }

      if (result.frames?.length === 0) {
        toast.info('No frames found in this Figma file')
      } else {
        const framesWithKey: FigmaFramePreview[] = (result.frames || []).map(
          (frame: Omit<FigmaFramePreview, 'fileKey'>) => ({
            ...frame,
            fileKey: parsed.fileKey,
          })
        )

        library.addLoadedFrames(framesWithKey)
        setFigmaUrl('')
        toast.success(`Loaded ${result.frames.length} frames`)

        onLoadComplete?.()
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load frames')
    } finally {
      setIsLoadingFrames(false)
    }
  }, [figmaUrl, studyId, authFetch, onLoadComplete, library])

  const importFrame = useCallback(
    async (frame: FigmaFramePreview): Promise<ImportedLibraryImage | null> => {
      const existing = library.getImportedImage(frame.nodeId)
      if (existing) {
        return existing
      }

      if (library.isFrameImporting(frame.nodeId)) {
        return null
      }

      library.setImporting(frame.nodeId, true)

      try {
        const response = await authFetch(`/api/studies/${studyId}/first-click/figma-bulk-import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileKey: frame.fileKey,
            frames: [{ nodeId: frame.nodeId, name: frame.name }],
          }),
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Failed to import frame')
        }

        const importedImage = result.images?.[0] as ImportedLibraryImage | undefined
        if (importedImage) {
          library.addImportedImage(importedImage)
          return importedImage
        }

        return null
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to import frame')
        return null
      } finally {
        library.setImporting(frame.nodeId, false)
      }
    },
    [studyId, authFetch, library]
  )

  return {
    figmaUrl,
    setFigmaUrl,
    isLoadingFrames,
    loadedFrames: library.loadedFrames,
    importedImages: library.importedImages,
    importFrame,
    getImportedImage: library.getImportedImage,
    isFrameImporting: library.isFrameImporting,
    loadFrames,
    removeFrame: library.removeLoadedFrame,
    clearLibrary: library.clearLoadedFrames,
    libraryImages: library.importedImages,
  }
}
