'use client'

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Loader2, Send, X, Paperclip } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverAnchor } from '@/components/ui/popover'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { toast } from '@/components/ui/sonner'
import { MentionNode } from './mention-node'
import { extractMentions } from '@/lib/comments/mention-format'
import { EmojiPicker } from './EmojiPicker'
import { AttachmentList, type CommentAttachment } from './AttachmentList'
import { uploadStudyAttachment, MAX_FILE_SIZES } from '@/lib/supabase/storage'
import type { MemberWithUser } from './types'

/**
 * Comment composer.
 *
 * Replaces a hand-rolled contentEditable that did its own TreeWalker cursor
 * arithmetic, HTML serialization and caret restoration — roughly 200 lines
 * whose failure modes included corrupting the `@[Name](id)` wire format when a
 * mention was partially deleted, and showing raw markdown in edit mode.
 *
 * The keyboard contract is preserved exactly, because people have it in their
 * fingers: Enter sends, Shift+Enter makes a new line, and while the mention
 * list is open ↑/↓ move, Enter/Tab pick, Esc dismisses.
 */

const MAX_SUGGESTIONS = 5

interface CommentComposerProps {
  onSubmit: (content: string, attachments: CommentAttachment[]) => Promise<void>
  isSubmitting?: boolean
  placeholder?: string
  autoFocus?: boolean
  onCancel?: () => void
  defaultValue?: string
  members?: MemberWithUser[]
  /** Hide the keyboard hint (inline edit reuses the composer in a tight space). */
  compact?: boolean
  /** Enables the attachment button; uploads are scoped to this study. */
  studyId?: string
  defaultAttachments?: CommentAttachment[]
}

export function CommentComposer({
  onSubmit,
  isSubmitting = false,
  placeholder = 'Add a comment...',
  autoFocus = false,
  onCancel,
  defaultValue = '',
  members = [],
  compact = false,
  studyId,
  defaultAttachments = [],
}: CommentComposerProps) {
  const [showMentions, setShowMentions] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionIndex, setMentionIndex] = useState(0)
  const [isEmpty, setIsEmpty] = useState(true)
  const [attachments, setAttachments] = useState<CommentAttachment[]>(defaultAttachments)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const filteredMembers = useMemo(() => {
    if (!mentionQuery) return members.slice(0, MAX_SUGGESTIONS)
    const query = mentionQuery.toLowerCase()
    return members
      .filter(
        (m) =>
          m.user?.name?.toLowerCase().includes(query) ||
          m.user?.email?.toLowerCase().includes(query)
      )
      .slice(0, MAX_SUGGESTIONS)
  }, [members, mentionQuery])

  /**
   * Refs mirror the mention state so the editor's keydown handler — which
   * Tiptap binds once — always sees current values instead of a stale closure.
   */
  const showMentionsRef = useRef(showMentions)
  const filteredRef = useRef(filteredMembers)
  const indexRef = useRef(mentionIndex)
  showMentionsRef.current = showMentions
  filteredRef.current = filteredMembers
  indexRef.current = mentionIndex

  const submitRef = useRef<() => void>(() => {})
  const insertRef = useRef<(m: MemberWithUser) => void>(() => {})

  const editor = useEditor({
    extensions: [
      // Only the declared `@tiptap/starter-kit` is used — the individual
      // extension packages are present in node_modules only as its transitive
      // deps, and importing those directly would break the moment hoisting
      // changed. Block-level nodes and marks are switched off: comments
      // serialize through getText(), so any formatting applied here would be
      // silently discarded on send, which is worse than not offering it.
      StarterKit.configure({
        heading: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        listKeymap: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
        code: false,
        bold: false,
        italic: false,
        strike: false,
        underline: false,
        link: false,
      }),
      MentionNode,
    ],
    // Parsed from the wire format below, once the editor exists.
    content: '',
    editable: !isSubmitting,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          'flex-1 min-h-[20px] max-h-[120px] overflow-y-auto text-sm focus:outline-none',
      },
      handleKeyDown: (_view, event) => {
        if (showMentionsRef.current && filteredRef.current.length > 0) {
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            setMentionIndex((i) => (i + 1) % filteredRef.current.length)
            return true
          }
          if (event.key === 'ArrowUp') {
            event.preventDefault()
            setMentionIndex(
              (i) => (i - 1 + filteredRef.current.length) % filteredRef.current.length
            )
            return true
          }
          if (event.key === 'Enter' || event.key === 'Tab') {
            event.preventDefault()
            const member = filteredRef.current[indexRef.current]
            if (member) insertRef.current(member)
            return true
          }
          if (event.key === 'Escape') {
            event.preventDefault()
            setShowMentions(false)
            return true
          }
        }

        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault()
          submitRef.current()
          return true
        }

        if (event.key === 'Escape' && onCancel) {
          event.preventDefault()
          onCancel()
          return true
        }

        return false
      },
    },
    onUpdate: ({ editor: e }) => {
      setIsEmpty(e.isEmpty)

      // Detect an in-progress `@word` immediately before the caret. Reading
      // from ProseMirror's own document beats measuring DOM text offsets.
      const { from } = e.state.selection
      const textBefore = e.state.doc.textBetween(Math.max(0, from - 60), from, '\n', ' ')
      const atMatch = textBefore.match(/@(\w*)$/)

      if (atMatch && members.length > 0) {
        setMentionQuery(atMatch[1])
        setShowMentions(true)
        setMentionIndex(0)
      } else {
        setShowMentions(false)
      }
    },
  })

  /** Rebuild editor content from the `@[Name](id)` wire format. */
  useEffect(() => {
    if (!editor || !defaultValue) return

    const nodes: Array<Record<string, unknown>> = []
    let cursor = 0
    for (const mention of extractMentions(defaultValue)) {
      if (mention.index > cursor) {
        nodes.push({ type: 'text', text: defaultValue.slice(cursor, mention.index) })
      }
      nodes.push({ type: 'mention', attrs: { id: mention.userId, label: mention.name } })
      cursor = mention.index + mention.raw.length
    }
    if (cursor < defaultValue.length) {
      nodes.push({ type: 'text', text: defaultValue.slice(cursor) })
    }

    editor.commands.setContent({
      type: 'doc',
      content: [{ type: 'paragraph', content: nodes }],
    })
    setIsEmpty(false)
    // Only seeds the editor; later keystrokes must not be clobbered.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor])

  useEffect(() => {
    if (autoFocus && editor) editor.commands.focus('end')
  }, [autoFocus, editor])

  useEffect(() => {
    editor?.setEditable(!isSubmitting)
  }, [editor, isSubmitting])

  /**
   * Replace the partial `@query` before the caret with a mention node.
   * `getText` on the node emits the wire format, so nothing here builds it.
   */
  const insertMention = useCallback(
    (member: MemberWithUser) => {
      if (!editor || !member.user?.id) return

      const { from } = editor.state.selection
      const textBefore = editor.state.doc.textBetween(Math.max(0, from - 60), from, '\n', ' ')
      const atMatch = textBefore.match(/@(\w*)$/)
      const deleteFrom = atMatch ? from - atMatch[0].length : from

      editor
        .chain()
        .focus()
        .deleteRange({ from: deleteFrom, to: from })
        .insertContent([
          {
            type: 'mention',
            attrs: { id: member.user.id, label: member.user.name || member.user.email },
          },
          { type: 'text', text: ' ' },
        ])
        .run()

      setShowMentions(false)
    },
    [editor]
  )
  insertRef.current = insertMention

  /** Insert an emoji at the caret, keeping focus in the editor. */
  const insertEmoji = useCallback(
    (emoji: string) => {
      editor?.chain().focus().insertContent(emoji).run()
    },
    [editor]
  )

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.length || !studyId) return
      setIsUploading(true)

      try {
        for (const file of Array.from(files)) {
          if (file.size > MAX_FILE_SIZES.attachment) {
            toast.error(`${file.name} is too large`, { description: 'Maximum size is 10MB.' })
            continue
          }
          try {
            const result = await uploadStudyAttachment(studyId, file)
            setAttachments((prev) => [...prev, result])
          } catch (err) {
            toast.error(`Could not attach ${file.name}`, {
              description: err instanceof Error ? err.message : 'Upload failed',
            })
          }
        }
      } finally {
        setIsUploading(false)
        // Allow re-selecting the same file after a removal.
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    },
    [studyId]
  )

  const removeAttachment = useCallback((path: string) => {
    setAttachments((prev) => prev.filter((a) => a.path !== path))
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!editor || isSubmitting || isUploading) return

    // Mention nodes serialize themselves via renderText, so this one call
    // produces the exact `@[Name](id)` format the API and DB expect.
    const content = editor.getText({ blockSeparator: '\n' }).trim()
    // An attachment on its own is a legitimate comment.
    if (!content && attachments.length === 0) return

    try {
      await onSubmit(content, attachments)
      editor.commands.clearContent()
      setIsEmpty(true)
      setAttachments([])
      editor.commands.focus()
      setShowMentions(false)
    } catch {
      toast.error('Failed to submit comment')
    }
  }, [editor, isSubmitting, isUploading, onSubmit, attachments])
  submitRef.current = handleSubmit

  return (
    <div className="relative">
      <Popover open={showMentions && filteredMembers.length > 0}>
        <PopoverAnchor asChild>
          <div className="rounded-2xl border border-border bg-background px-3 py-2 focus-within:ring-1 focus-within:ring-ring">
            <div className="relative min-w-0">
              {isEmpty && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute left-0 top-0 text-sm text-muted-foreground"
                >
                  {placeholder}
                </span>
              )}
              <EditorContent editor={editor} />
            </div>

            {attachments.length > 0 && (
              <AttachmentList
                attachments={attachments}
                onRemove={removeAttachment}
                className="mt-2"
              />
            )}

            {/* Toolbar sits under the text so emoji and attach are always
                visible — as trailing icons they were easy to miss entirely. */}
            <div className="mt-1 flex items-center gap-0.5">
              <EmojiPicker onSelect={insertEmoji} disabled={isSubmitting} />

              {studyId && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    hidden
                    onChange={(e) => void handleFiles(e.target.files)}
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSubmitting || isUploading}
                    aria-label="Attach a file"
                    title="Attach a file"
                    className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                  >
                    {isUploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Paperclip className="h-4 w-4" />
                    )}
                  </button>
                </>
              )}

              <div className="ml-auto flex items-center gap-1">
                {onCancel && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onCancel}
                    disabled={isSubmitting}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                    aria-label="Cancel"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={(isEmpty && attachments.length === 0) || isSubmitting || isUploading}
                  className="h-7 w-7 rounded-full p-0"
                  aria-label="Send comment"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
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
                  <p className="text-xs text-muted-foreground truncate">{member.user?.email}</p>
                </div>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      {!compact && (
        <span className="text-[12px] text-muted-foreground mt-1 block px-1">
          Enter to send · Shift+Enter for new line · @ to mention
        </span>
      )}
    </div>
  )
}
