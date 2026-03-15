'use client'

import { useRef, useState } from 'react'
import { Editor } from '@tiptap/react'
import { ImagePlus, Loader2 } from 'lucide-react'
import { Toggle } from '@veritio/ui/components/toggle'
import { toast } from '@veritio/ui/components/sonner'
import {
  uploadFile,
  STORAGE_BUCKETS,
  MAX_FILE_SIZES,
  ALLOWED_IMAGE_TYPES,
} from '@veritio/prototype-test/lib/supabase/storage'

interface RichTextImageUploadProps {
  editor: Editor | null
  studyId: string
}

export function RichTextImageUpload({ editor, studyId }: RichTextImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !editor) return

    // Reset input so the same file can be selected again
    e.target.value = ''

    // Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
      toast.error('Invalid file type', {
        description: 'Please select a PNG, JPEG, GIF, WebP, or SVG image.',
      })
      return
    }

    // Validate file size (2MB limit)
    if (file.size > MAX_FILE_SIZES.logo) {
      const maxSizeMB = (MAX_FILE_SIZES.logo / 1024 / 1024).toFixed(0)
      toast.error('File too large', {
        description: `Please select an image under ${maxSizeMB}MB.`,
      })
      return
    }

    setIsUploading(true)

    try {
      const result = await uploadFile(file, {
        bucket: STORAGE_BUCKETS.studyAssets,
        path: `${studyId}/flow-images`,
        maxSize: MAX_FILE_SIZES.logo,
        allowedTypes: [...ALLOWED_IMAGE_TYPES],
      })

      // Insert image at cursor position
      editor
        .chain()
        .focus()
        .setImage({ src: result.url, alt: file.name })
        .run()

      toast.success('Image uploaded', {
        description: 'The image has been added to your content.',
      })
    } catch (error) {
      console.error('Image upload error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload image'

      // Check for common Supabase storage errors
      if (errorMessage.toLowerCase().includes('bucket not found')) {
        toast.error('Storage not configured', {
          description: 'The "study-assets" storage bucket needs to be created in Supabase. Please contact your administrator.',
        })
      } else if (errorMessage.toLowerCase().includes('permission') || errorMessage.toLowerCase().includes('policy')) {
        toast.error('Permission denied', {
          description: 'You don\'t have permission to upload images. Please check storage policies.',
        })
      } else {
        toast.error('Upload failed', {
          description: errorMessage,
        })
      }
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <>
      <Toggle
        size="sm"
        pressed={false}
        onPressedChange={handleClick}
        disabled={isUploading || !editor}
        aria-label="Insert image"
      >
        {isUploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ImagePlus className="h-4 w-4" />
        )}
      </Toggle>
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_IMAGE_TYPES.join(',')}
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
      />
    </>
  )
}
