/**
 * First Click Image Library Store
 *
 * Persists loaded Figma frames across dialog instances so users can
 * access them from any task without re-loading.
 */

import { create } from 'zustand'

// Frame from Figma API (loaded but not yet imported)
export interface FigmaFramePreview {
  nodeId: string
  name: string
  thumbnailUrl: string | null
  pageName: string
  fileKey: string
}

// Imported image (full resolution, stored in Supabase)
export interface ImportedLibraryImage {
  nodeId: string
  id: string
  image_url: string
  original_filename: string
  width: number | null
  height: number | null
  source_type: 'figma'
  figma_file_key: string
  figma_node_id: string
}

interface FirstClickLibraryState {
  // Loaded frames (thumbnails, shown in Images tab)
  loadedFrames: FigmaFramePreview[]

  // Imported images (full resolution, stored)
  importedImages: ImportedLibraryImage[]

  // Track which frames are currently being imported
  importingNodeIds: Set<string>

  // Actions
  addLoadedFrames: (frames: FigmaFramePreview[]) => void
  removeLoadedFrame: (nodeId: string) => void
  clearLoadedFrames: () => void
  addImportedImage: (image: ImportedLibraryImage) => void
  setImporting: (nodeId: string, isImporting: boolean) => void
  getImportedImage: (nodeId: string) => ImportedLibraryImage | undefined
  isFrameImporting: (nodeId: string) => boolean
}

export const useFirstClickLibrary = create<FirstClickLibraryState>((set, get) => ({
  loadedFrames: [],
  importedImages: [],
  importingNodeIds: new Set(),

  addLoadedFrames: (frames) => {
    set((state) => {
      // Dedupe by nodeId to avoid duplicates from same file
      const existingIds = new Set(state.loadedFrames.map((f) => f.nodeId))
      const newFrames = frames.filter((f) => !existingIds.has(f.nodeId))
      return { loadedFrames: [...state.loadedFrames, ...newFrames] }
    })
  },

  removeLoadedFrame: (nodeId) => {
    set((state) => ({
      loadedFrames: state.loadedFrames.filter((f) => f.nodeId !== nodeId),
      importedImages: state.importedImages.filter((img) => img.figma_node_id !== nodeId),
    }))
  },

  clearLoadedFrames: () => {
    set({ loadedFrames: [], importedImages: [], importingNodeIds: new Set() })
  },

  addImportedImage: (image) => {
    set((state) => {
      // Check if already exists
      if (state.importedImages.some((img) => img.figma_node_id === image.figma_node_id)) {
        return state
      }
      return { importedImages: [...state.importedImages, image] }
    })
  },

  setImporting: (nodeId, isImporting) => {
    set((state) => {
      const next = new Set(state.importingNodeIds)
      if (isImporting) {
        next.add(nodeId)
      } else {
        next.delete(nodeId)
      }
      return { importingNodeIds: next }
    })
  },

  getImportedImage: (nodeId) => {
    return get().importedImages.find((img) => img.figma_node_id === nodeId)
  },

  isFrameImporting: (nodeId) => {
    return get().importingNodeIds.has(nodeId)
  },
}))
