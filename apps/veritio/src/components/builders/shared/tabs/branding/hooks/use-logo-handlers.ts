'use client'

import { useCallback, useState } from 'react'
import { useStudyMetaStore } from '@/stores/study-meta-store'
import {
  uploadStudyLogo,
  deleteStudyLogo,
  ALLOWED_IMAGE_TYPES,
} from '@/lib/supabase/storage'

interface UseLogoHandlersOptions {
  studyId: string
  isReadOnly?: boolean
}

export function useLogoHandlers({ studyId, isReadOnly }: UseLogoHandlersOptions) {
  const { meta, setLogo, removeLogo } = useStudyMetaStore()
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoDragOver, setLogoDragOver] = useState(false)

  const handleLogoUpload = useCallback(
    async (file: File) => {
      setLogoUploading(true)
      try {
        const result = await uploadStudyLogo(studyId, file)
        setLogo({
          url: result.url,
          filename: result.filename,
          size: result.size,
        })
      } catch (error) {
        console.error('Logo upload failed:', error)
      } finally {
        setLogoUploading(false)
      }
    },
    [studyId, setLogo]
  )

  const handleLogoRemove = useCallback(async () => {
    if (meta.branding.logo?.url) {
      try {
        await deleteStudyLogo(studyId, meta.branding.logo.url)
      } catch (error) {
        console.error('Logo delete failed:', error)
      }
    }
    removeLogo()
  }, [studyId, meta.branding.logo?.url, removeLogo])

  const handleLogoDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      setLogoDragOver(false)
      if (isReadOnly || logoUploading) return

      const file = e.dataTransfer.files[0]
      if (file && ALLOWED_IMAGE_TYPES.includes(file.type as typeof ALLOWED_IMAGE_TYPES[number])) {
        await handleLogoUpload(file)
      }
    },
    [isReadOnly, logoUploading, handleLogoUpload]
  )

  const handleLogoFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        await handleLogoUpload(file)
        e.target.value = ''
      }
    },
    [handleLogoUpload]
  )

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      if (!isReadOnly && !logoUploading) setLogoDragOver(true)
    },
    [isReadOnly, logoUploading]
  )

  const handleDragLeave = useCallback(() => {
    setLogoDragOver(false)
  }, [])

  return {
    logoUploading,
    logoDragOver,
    handleLogoUpload,
    handleLogoRemove,
    handleLogoDrop,
    handleLogoFileSelect,
    handleDragOver,
    handleDragLeave,
  }
}
