'use client'

import { useCallback } from 'react'
import { ImagePickerDialog as SharedImagePickerDialog, type ImageData } from '@/components/builders/shared'
import { useFirstImpressionDesigns } from '@/stores/study-builder'
import { uploadFirstImpressionImage } from '@/lib/supabase/storage'

interface FirstImpressionImageData {
  image_url: string
  original_filename?: string | null
  width?: number | null
  height?: number | null
  source_type: 'upload' | 'figma'
  figma_file_key?: string | null
  figma_node_id?: string | null
}

interface ImagePickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  studyId: string
  designId: string
  currentImage: FirstImpressionImageData | null
  onImageSelected: (image: FirstImpressionImageData) => void
}

export function ImagePickerDialog({
  open,
  onOpenChange,
  studyId,
  designId,
  currentImage,
  onImageSelected,
}: ImagePickerDialogProps) {
  const designs = useFirstImpressionDesigns()

  // Get existing images from other designs
  const getExistingImages = useCallback((): ImageData[] => {
    return (designs || [])
      .filter((design) => design.image_url && design.id !== designId)
      .map((design) => ({
        image_url: design.image_url!,
        original_filename: design.original_filename,
        width: design.width,
        height: design.height,
        source_type: design.source_type,
        figma_file_key: design.figma_file_key,
        figma_node_id: design.figma_node_id,
      }))
  }, [designs, designId])

  // Upload function for First Impression
  const uploadImage = async (file: File) => {
    // Upload via server-signed URL (bypasses storage RLS)
    const result = await uploadFirstImpressionImage(studyId, designId, file)

    // Get image dimensions
    const img = new Image()
    img.src = result.url
    await new Promise((resolve) => {
      img.onload = resolve
    })

    return {
      url: result.url,
      filename: result.filename,
      width: img.naturalWidth,
      height: img.naturalHeight,
    }
  }

  return (
    <SharedImagePickerDialog
      open={open}
      onOpenChange={onOpenChange}
      studyId={studyId}
      entityId={designId}
      currentImage={currentImage}
      onImageSelected={onImageSelected}
      getExistingImages={getExistingImages}
      uploadImage={uploadImage}
    />
  )
}
