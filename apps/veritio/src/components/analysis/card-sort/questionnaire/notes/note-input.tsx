'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface NoteInputProps {
  onSubmit: (content: string) => Promise<void>
  isSubmitting?: boolean
  placeholder?: string
}

export function NoteInput({
  onSubmit,
  isSubmitting = false,
  placeholder = 'Add a note...',
}: NoteInputProps) {
  const [content, setContent] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = async () => {
    const trimmedContent = content.trim()
    if (!trimmedContent || isSubmitting) return

    try {
      await onSubmit(trimmedContent)
      setContent('')
    } catch {
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
    }
  }, [content])

  const canSubmit = content.trim().length > 0 && !isSubmitting

  return (
    <div className="space-y-2">
      <Textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="min-h-[60px] max-h-[120px] resize-none text-sm"
        disabled={isSubmitting}
      />
      <div className="flex justify-between items-center">
        <span className="text-[12px] text-muted-foreground">
          {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+Enter to save
        </span>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="h-7 px-2.5 text-xs"
        >
          {isSubmitting ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <>
              <Send className="h-3 w-3 mr-1" />
              Save
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
