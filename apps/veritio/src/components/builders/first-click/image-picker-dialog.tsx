'use client'

import { useCallback } from 'react'
import type { FirstClickImage } from '@veritio/study-types'
import { ImagePickerDialog as SharedImagePickerDialog, type ImageData } from '@/components/builders/shared'
import { useFirstClickTasks } from '@/stores/study-builder'
import { uploadFirstClickImage } from '@/lib/supabase/storage'

interface ImagePickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  studyId: string
  taskId: string
  currentImage: FirstClickImage | null
  onImageSelected: (image: FirstClickImage) => void
}

export function ImagePickerDialog({
  open,
  onOpenChange,
  studyId,
  taskId,
  currentImage,
  onImageSelected,
}: ImagePickerDialogProps) {
  const tasks = useFirstClickTasks()

  const getExistingImages = useCallback((): ImageData[] => {
    return tasks
      .filter(task => task.image && task.id !== taskId)
      .map(task => ({
        image_url: task.image!.image_url,
        original_filename: task.image!.original_filename,
        width: task.image!.width,
        height: task.image!.height,
        source_type: task.image!.source_type as 'upload' | 'figma',
        figma_file_key: task.image!.figma_file_key,
        figma_node_id: task.image!.figma_node_id,
      }))
  }, [tasks, taskId])

  const uploadImage = useCallback(async (file: File) => {
    const result = await uploadFirstClickImage(studyId, taskId, file)

    const img = new Image()
    img.src = result.url
    await new Promise((resolve) => { img.onload = resolve })

    return {
      url: result.url,
      filename: result.filename,
      width: img.naturalWidth,
      height: img.naturalHeight,
    }
  }, [studyId, taskId])

  const handleImageSelected = useCallback((image: ImageData) => {
    const now = new Date().toISOString()
    onImageSelected({
      id: crypto.randomUUID(),
      task_id: taskId,
      study_id: studyId,
      image_url: image.image_url,
      original_filename: image.original_filename ?? null,
      width: image.width ?? null,
      height: image.height ?? null,
      source_type: image.source_type,
      figma_file_key: image.figma_file_key ?? null,
      figma_node_id: image.figma_node_id ?? null,
      created_at: now,
      updated_at: now,
    })
  }, [taskId, studyId, onImageSelected])

  const imageData: ImageData | null = currentImage ? {
    image_url: currentImage.image_url,
    original_filename: currentImage.original_filename,
    width: currentImage.width,
    height: currentImage.height,
    source_type: currentImage.source_type as 'upload' | 'figma',
    figma_file_key: currentImage.figma_file_key,
    figma_node_id: currentImage.figma_node_id,
  } : null

  return (
    <SharedImagePickerDialog
      open={open}
      onOpenChange={onOpenChange}
      studyId={studyId}
      entityId={taskId}
      currentImage={imageData}
      onImageSelected={handleImageSelected}
      getExistingImages={getExistingImages}
      uploadImage={uploadImage}
    />
  )
}
