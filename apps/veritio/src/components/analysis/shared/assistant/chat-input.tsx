'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowUp, Square, Paperclip, X, Loader2, FileText, Image, FileSpreadsheet, File } from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import type { RateLimitInfo, FileAttachment, FileAttachmentType } from '@/services/assistant/types'
import { uploadFile, ALLOWED_ATTACHMENT_TYPES, MAX_FILE_SIZES } from '@/lib/supabase/storage'

const MAX_FILES = 10

// Helper to determine file type category
function getFileType(mimeType: string): FileAttachmentType {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType === 'application/pdf') return 'pdf'
  if (mimeType.includes('word') || mimeType.includes('document')) return 'document'
  if (mimeType.includes('sheet') || mimeType.includes('excel') || mimeType === 'text/csv') return 'spreadsheet'
  if (mimeType.startsWith('text/')) return 'text'
  return 'document' // default fallback
}

// File type icon mapper
function getFileIcon(type: FileAttachmentType) {
  switch (type) {
    case 'image': return Image
    case 'pdf': return FileText
    case 'document': return FileText
    case 'spreadsheet': return FileSpreadsheet
    case 'text': return File
    default: return File
  }
}

interface ChatInputProps {
  onSend: (text: string, files?: FileAttachment[]) => void
  onStop: () => void
  isStreaming: boolean
  rateLimitInfo: RateLimitInfo | null
  mode?: 'results' | 'builder'
  placeholderSuggestions?: string[]
  studyId?: string
}

export function ChatInput({ onSend, onStop, isStreaming, rateLimitInfo, mode = 'results', placeholderSuggestions, studyId }: ChatInputProps) {
  const [value, setValue] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [attachedFiles, setAttachedFiles] = useState<FileAttachment[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSend = useCallback(() => {
    const trimmed = value.trim()
    if ((!trimmed && attachedFiles.length === 0) || isStreaming || isUploading) return
    const defaultMessage = attachedFiles.some(f => f.type === 'image')
      ? 'What do you see in these files?'
      : 'Please analyze these files.'
    onSend(trimmed || defaultMessage, attachedFiles.length > 0 ? attachedFiles : undefined)
    setValue('')
    setAttachedFiles([])
  }, [value, attachedFiles, isStreaming, isUploading, onSend])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  const uploadFiles = useCallback(async (files: File[]) => {
    // Filter for allowed file types
    const allowedFiles = files.filter((f) => ALLOWED_ATTACHMENT_TYPES.includes(f.type as any))
    if (allowedFiles.length === 0) {
      toast.error('Unsupported file type. Allowed: images, PDFs, Word, Excel, CSV, and text files.')
      return
    }

    const remaining = MAX_FILES - attachedFiles.length
    if (remaining <= 0) {
      toast.error(`Maximum ${MAX_FILES} files per message`)
      return
    }

    const toUpload = allowedFiles.slice(0, remaining)
    if (toUpload.length < allowedFiles.length) {
      toast.info(`Only attaching ${toUpload.length} of ${allowedFiles.length} files (max ${MAX_FILES})`)
    }

    setIsUploading(true)
    try {
      const results = await Promise.all(
        toUpload.map(async (file) => {
          try {
            const result = await uploadFile(file, {
              bucket: 'study-assets',
              path: '',
              assetType: 'attachment',
              studyId,
              maxSize: MAX_FILE_SIZES.attachment,
              allowedTypes: [...ALLOWED_ATTACHMENT_TYPES],
            })
            return {
              url: result.url,
              filename: result.filename,
              size: result.size,
              type: getFileType(file.type),
              mimeType: file.type,
            } as FileAttachment
          } catch {
            toast.error(`Failed to upload ${file.name}`)
            return null
          }
        })
      )
      const successful = results.filter((r): r is FileAttachment => r !== null)
      if (successful.length > 0) {
        setAttachedFiles((prev) => [...prev, ...successful])
      }
    } finally {
      setIsUploading(false)
    }
  }, [attachedFiles.length, studyId])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) uploadFiles(files)
    // Reset input so same file can be re-selected
    e.target.value = ''
  }, [uploadFiles])

  const removeFile = useCallback((index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index))
  }, [])

  // Drag-and-drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) uploadFiles(files)
  }, [uploadFiles])

  // Paste handler for clipboard files (images only via clipboard)
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items)
    const pastedFiles = items
      .filter((item) => item.type.startsWith('image/'))
      .map((item) => item.getAsFile())
      .filter((f): f is File => f !== null)
    if (pastedFiles.length > 0) {
      e.preventDefault()
      uploadFiles(pastedFiles)
    }
  }, [uploadFiles])

  const isRateLimited = rateLimitInfo !== null && rateLimitInfo.remaining <= 0
  const hasContent = value.trim().length > 0 || attachedFiles.length > 0

  // Rotating placeholder
  const suggestions = placeholderSuggestions && placeholderSuggestions.length > 0 ? placeholderSuggestions : null
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    if (!suggestions || suggestions.length <= 1) return

    const interval = setInterval(() => {
      // Fade out
      setIsVisible(false)
      // After fade out, switch text and fade in
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % suggestions.length)
        setIsVisible(true)
      }, 200)
    }, 3500)

    return () => clearInterval(interval)
  }, [suggestions])

  // Reset index when suggestions change (e.g. tab switch)
  useEffect(() => {
    setCurrentIndex(0)
    setIsVisible(true)
  }, [placeholderSuggestions])

  const showAnimatedPlaceholder = suggestions && !hasContent && !isRateLimited && !isFocused && attachedFiles.length === 0
  const staticPlaceholder = isRateLimited
    ? 'Rate limit reached'
    : !suggestions
      ? (mode === 'builder' ? 'Ask about your study...' : 'Ask about your results...')
      : ''

  return (
    <div className="flex-shrink-0 border-t border-border p-3">
      {/* File attachments */}
      {attachedFiles.length > 0 && (
        <div className="flex gap-1.5 flex-wrap mb-2">
          {attachedFiles.map((file, i) => {
            const IconComponent = getFileIcon(file.type)
            return (
              <div key={`${file.url}-${i}`} className="relative group">
                {file.type === 'image' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={file.url}
                    alt={file.filename}
                    className="h-14 w-14 object-cover rounded-lg border border-border"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-lg border border-border flex flex-col items-center justify-center bg-muted/30 p-1">
                    <IconComponent className="h-5 w-5 text-muted-foreground mb-0.5" />
                    <span className="text-[8px] text-muted-foreground truncate w-full text-center px-0.5">
                      {file.filename.split('.').pop()?.toUpperCase()}
                    </span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-foreground text-background flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            )
          })}
          {isUploading && (
            <div className="h-14 w-14 rounded-lg border border-dashed border-border flex items-center justify-center">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      )}

      <div
        className={`relative flex items-center rounded-xl border bg-background focus-within:ring-1 focus-within:ring-ring transition-all cursor-text ${
          isDragOver ? 'border-primary ring-1 ring-primary bg-primary/5' : 'border-border'
        }`}
        onClick={() => inputRef.current?.focus()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Paperclip button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation()
            fileInputRef.current?.click()
          }}
          disabled={isRateLimited || isUploading}
          className="h-7 w-7 ml-1 flex-shrink-0 text-muted-foreground hover:text-foreground"
        >
          {isUploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Paperclip className="h-3.5 w-3.5" />
          )}
        </Button>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onPaste={handlePaste}
          placeholder={staticPlaceholder}
          disabled={isRateLimited}
          className="flex-1 bg-transparent px-2 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        />
        {/* Animated rotating placeholder overlay */}
        {showAnimatedPlaceholder && (
          <span
            className="absolute left-10 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none transition-opacity duration-200 truncate pr-10"
            style={{ opacity: isVisible ? 1 : 0 }}
          >
            {suggestions[currentIndex]}
          </span>
        )}

        {/* Drag overlay hint */}
        {isDragOver && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-primary/5 pointer-events-none">
            <span className="text-xs font-medium text-primary">Drop files here</span>
          </div>
        )}

        <div className="absolute right-1.5">
          {isStreaming ? (
            <Button
              variant="outline"
              size="icon"
              onClick={onStop}
              className="h-7 w-7 rounded-lg"
            >
              <Square className="h-3 w-3" />
            </Button>
          ) : (
            <Button
              variant="default"
              size="icon"
              onClick={handleSend}
              disabled={!hasContent || isRateLimited || isUploading}
              className="h-7 w-7 rounded-lg transition-transform duration-100 active:scale-90"
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
      {rateLimitInfo && (
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          {rateLimitInfo.remaining <= 0
            ? 'Daily limit reached. Resets tomorrow.'
            : `${rateLimitInfo.remaining} / ${rateLimitInfo.limit} messages remaining today`}
        </p>
      )}
    </div>
  )
}
