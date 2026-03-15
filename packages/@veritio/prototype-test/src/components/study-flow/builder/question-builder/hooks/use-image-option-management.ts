'use client'

import { useCallback } from 'react'
import {
  uploadQuestionImage,
  deleteQuestionImage,
} from '../../../../../lib/supabase/storage'
import type { ImageChoiceOption } from '../../../../../lib/supabase/study-flow-types'

interface UseImageOptionManagementParams {
  options: ImageChoiceOption[]
  onChange: (updates: { options: ImageChoiceOption[] }) => void
  studyId: string
  questionId: string
  minOptions?: number
}
export function useImageOptionManagement({
  options,
  onChange,
  studyId,
  questionId,
  minOptions = 2,
}: UseImageOptionManagementParams) {
  const addOption = useCallback(() => {
    const newOption: ImageChoiceOption = {
      id: crypto.randomUUID(),
      label: '',
      imageUrl: null,
      imageFilename: null,
    }
    onChange({ options: [...options, newOption] })
  }, [options, onChange])
  const updateOption = useCallback(
    (id: string, updates: Partial<ImageChoiceOption>) => {
      onChange({
        options: options.map((o) => (o.id === id ? { ...o, ...updates } : o)),
      })
    },
    [options, onChange]
  )
  const removeOption = useCallback(
    async (id: string) => {
      if (options.length <= minOptions) return

      const option = options.find((o) => o.id === id)
      // Delete image from storage if exists
      if (option?.imageUrl) {
        try {
          await deleteQuestionImage(option.imageUrl)
        } catch {
          // Ignore delete errors - don't block option removal
        }
      }
      onChange({ options: options.filter((o) => o.id !== id) })
    },
    [options, onChange, minOptions]
  )
  const uploadImage = useCallback(
    async (id: string, file: File) => {
      const result = await uploadQuestionImage(studyId, questionId, file)
      updateOption(id, {
        imageUrl: result.url,
        imageFilename: result.filename,
      })
      return result
    },
    [studyId, questionId, updateOption]
  )
  const deleteImage = useCallback(
    async (id: string) => {
      const option = options.find((o) => o.id === id)
      if (option?.imageUrl) {
        try {
          await deleteQuestionImage(option.imageUrl)
        } catch {
          // Ignore delete errors
        }
      }
      updateOption(id, { imageUrl: null, imageFilename: null })
    },
    [options, updateOption]
  )

  const canRemove = options.length > minOptions

  return {
    addOption,
    updateOption,
    removeOption,
    uploadImage,
    deleteImage,
    canRemove,
  }
}
