'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { Loader2, Send, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverAnchor } from '@/components/ui/popover'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { toast } from '@/components/ui/sonner'
import type { MemberWithUser } from './types'

interface CommentInputProps {
  onSubmit: (content: string) => Promise<void>
  isSubmitting: boolean
  placeholder?: string
  autoFocus?: boolean
  onCancel?: () => void
  defaultValue?: string
  members?: MemberWithUser[]
}

export function CommentInput({
  onSubmit,
  isSubmitting,
  placeholder = 'Add a comment...',
  autoFocus = false,
  onCancel,
  defaultValue = '',
  members = [],
}: CommentInputProps) {
  const [content, setContent] = useState(defaultValue)
  const [showMentions, setShowMentions] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionIndex, setMentionIndex] = useState(0)
  const editorRef = useRef<HTMLDivElement>(null)

  const filteredMembers = useMemo(() => {
    if (!mentionQuery) return members.slice(0, 5)
    const query = mentionQuery.toLowerCase()
    return members
      .filter(
        (m) =>
          m.user?.name?.toLowerCase().includes(query) ||
          m.user?.email?.toLowerCase().includes(query)
      )
      .slice(0, 5)
  }, [members, mentionQuery])

  const getPlainText = useCallback(() => {
    if (!editorRef.current) return ''
    return editorRef.current.innerText
  }, [])

  const getCursorPosition = useCallback(() => {
    const selection = window.getSelection()
    if (!selection || !editorRef.current) return 0

    const range = selection.getRangeAt(0)
    const preCaretRange = range.cloneRange()
    preCaretRange.selectNodeContents(editorRef.current)
    preCaretRange.setEnd(range.endContainer, range.endOffset)
    return preCaretRange.toString().length
  }, [])

  const setCursorPosition = useCallback((pos: number) => {
    if (!editorRef.current) return

    const selection = window.getSelection()
    const range = document.createRange()

    let currentPos = 0
    const walker = document.createTreeWalker(
      editorRef.current,
      NodeFilter.SHOW_TEXT,
      null
    )

    let node = walker.nextNode()
    while (node) {
      const nodeLength = node.textContent?.length || 0
      if (currentPos + nodeLength >= pos) {
        range.setStart(node, pos - currentPos)
        range.collapse(true)
        selection?.removeAllRanges()
        selection?.addRange(range)
        return
      }
      currentPos += nodeLength
      node = walker.nextNode()
    }
  }, [])

  const handleSubmit = async () => {
    const text = getPlainText().trim()
    if (!text || isSubmitting) return

    const editor = editorRef.current

    try {
      await onSubmit(content.trim())
      setContent('')
      if (editor) {
        editor.innerHTML = ''
        // Refocus immediately - no blocking with optimistic updates!
        editor.focus()
      }
      setShowMentions(false)
    } catch {
      toast.error('Failed to submit comment')
    }
  }

  const renderContent = useCallback((text: string) => {
    if (!editorRef.current) return

    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g
    const parts: (string | { type: 'mention'; name: string; id: string })[] = []
    let lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = mentionRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index))
      }
      parts.push({ type: 'mention', name: match[1], id: match[2] })
      lastIndex = match.index + match[0].length
    }

    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex))
    }

    // Build HTML
    const html = parts
      .map((part) => {
        if (typeof part === 'string') {
          return part.replace(/\n/g, '<br>')
        }
        return `<span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium" contenteditable="false" data-mention="${part.id}">@${part.name}</span>`
      })
      .join('')

    editorRef.current.innerHTML = html || ''
  }, [])

  const insertMention = useCallback(
    (member: MemberWithUser) => {
      if (!member.user || !editorRef.current) return

      const cursorPos = getCursorPosition()
      const textBeforeCursor = content.slice(0, cursorPos)
      const textAfterCursor = content.slice(cursorPos)
      const atIndex = textBeforeCursor.lastIndexOf('@')

      const mention = `@[${member.user.name}](${member.user.id})`
      const newContent =
        textBeforeCursor.slice(0, atIndex) + mention + ' ' + textAfterCursor

      setContent(newContent)
      setShowMentions(false)
      setMentionQuery('')
      setMentionIndex(0)

      // Update display
      setTimeout(() => {
        if (editorRef.current) {
          renderContent(newContent)
          editorRef.current.focus()
          setCursorPosition(atIndex + mention.length + 1)
        }
      }, 0)
    },
    [content, getCursorPosition, setCursorPosition, renderContent]
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showMentions && filteredMembers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setMentionIndex((i) => Math.min(i + 1, filteredMembers.length - 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setMentionIndex((i) => Math.max(i - 1, 0))
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        insertMention(filteredMembers[mentionIndex])
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setShowMentions(false)
        return
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
    if (e.key === 'Escape' && onCancel) {
      onCancel()
    }
  }

  const extractMarkdownContent = useCallback(() => {
    if (!editorRef.current) return ''

    let markdown = ''
    const childNodes = editorRef.current.childNodes

    for (let i = 0; i < childNodes.length; i++) {
      const node = childNodes[i]

      if (node.nodeType === Node.TEXT_NODE) {
        markdown += node.textContent || ''
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement

        // Check if it's a mention span
        if (element.hasAttribute('data-mention')) {
          const mentionId = element.getAttribute('data-mention')
          const mentionName = element.textContent?.replace('@', '') || ''
          markdown += `@[${mentionName}](${mentionId})`
        } else if (element.tagName === 'BR') {
          markdown += '\n'
        } else {
          markdown += element.textContent || ''
        }
      }
    }

    return markdown
  }, [])

  const handleInput = () => {
    if (!editorRef.current) return

    const markdown = extractMarkdownContent()
    const text = editorRef.current.innerText
    const cursorPos = getCursorPosition()

    setContent(markdown)

    const textBeforeCursor = text.slice(0, cursorPos)
    const atMatch = textBeforeCursor.match(/@(\w*)$/)

    if (atMatch && members.length > 0) {
      setMentionQuery(atMatch[1])
      setShowMentions(true)
      setMentionIndex(0)
    } else {
      setShowMentions(false)
    }
  }

  useEffect(() => {
    if (editorRef.current && content !== editorRef.current.innerText) {
      renderContent(content)
    }
  }, [content, renderContent])

  useEffect(() => {
    if (autoFocus && editorRef.current) {
      editorRef.current.focus()
    }
  }, [autoFocus])

  return (
    <div className="relative">
      <Popover open={showMentions && filteredMembers.length > 0}>
        <PopoverAnchor asChild>
          <div className="flex items-start gap-2 rounded-2xl border border-border bg-background px-3 py-2 focus-within:ring-1 focus-within:ring-ring">
            <div
              ref={editorRef}
              contentEditable={!isSubmitting}
              onInput={handleInput}
              onKeyDown={handleKeyDown}
              data-placeholder={placeholder}
              className="flex-1 min-h-[20px] max-h-[120px] overflow-y-auto text-sm focus:outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground"
              style={{ wordBreak: 'break-word' }}
            />
            <div className="flex items-center gap-1 shrink-0">
              {onCancel && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onCancel}
                  disabled={isSubmitting}
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={!content.trim() || isSubmitting}
                className="h-7 w-7 p-0 rounded-full"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </PopoverAnchor>
        <PopoverContent
          className="w-64 p-1"
          align="start"
          side="top"
          sideOffset={8}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="space-y-0.5">
            {filteredMembers.map((member, idx) => (
              <button
                key={member.user?.id}
                onClick={() => insertMention(member)}
                className={cn(
                  'w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-left transition-colors',
                  idx === mentionIndex ? 'bg-accent' : 'hover:bg-muted'
                )}
              >
                <Avatar className="h-6 w-6">
                  <AvatarImage src={member.user?.image || undefined} />
                  <AvatarFallback className="text-[12px]">
                    {member.user?.name?.slice(0, 2).toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate text-foreground">
                    {member.user?.name || 'Unknown'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {member.user?.email}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      <span className="text-[12px] text-muted-foreground mt-1 block px-1">
        Enter to send · Shift+Enter for new line · @ to mention
      </span>
    </div>
  )
}
