/**
 * Clips Tab Components
 *
 * Export all clip-related components for use in the recording detail dialog.
 */

export { ClipsTab } from './clips-tab'
export type { Clip } from './clips-tab'

export { ClipRangeSelector } from './clip-range-selector'
export type { ClipRangeSelectorProps } from './clip-range-selector'

export { TagSelector, DEFAULT_CLIP_TAGS } from './tag-selector'
export type { TagSelectorProps } from './tag-selector'

export { ClipPreviewDialog } from './clip-preview-dialog'
export type { ClipPreviewDialogProps } from './clip-preview-dialog'

export {
  useThumbnailGenerator,
  generateVideoThumbnail,
} from './use-thumbnail-generator'
export type {
  ThumbnailOptions,
  UseThumbnailGeneratorReturn,
} from './use-thumbnail-generator'

export { ClipExportDialog } from './clip-export-dialog'
export type { ClipExportDialogProps } from './clip-export-dialog'

export { useFFmpegClipExport } from './use-ffmpeg-clip-export'
export type {
  ClipExportOptions,
  ClipExportProgress,
  ExportFormat,
  UseFFmpegClipExportReturn,
} from './use-ffmpeg-clip-export'
