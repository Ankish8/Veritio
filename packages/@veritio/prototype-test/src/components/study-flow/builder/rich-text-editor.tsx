'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import { Image } from '@tiptap/extension-image'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableHeader } from '@tiptap/extension-table-header'
import { TableCell } from '@tiptap/extension-table-cell'
import { useEffect, useState, useMemo } from 'react'
import { createPipingReferenceExtension } from '@veritio/prototype-test/lib/tiptap/piping-reference'
import { PipingReferenceNodeView } from './piping-reference-node-view'
import { RichTextMenuBar } from './rich-text-menu-bar'
import type { StudyFlowQuestion } from '@veritio/prototype-test/lib/supabase/study-flow-types'
import { cn } from '@veritio/ui'

interface PlaceholderConfig {
  intro: string
  bullets?: string[]
}

interface RichTextEditorProps {
  content: string
  onChange: (html: string) => void
  placeholder?: string | PlaceholderConfig
  className?: string
  minHeight?: string
  disabled?: boolean
  'aria-labelledby'?: string
  'aria-label'?: string
  allowImageUpload?: boolean
  studyId?: string
  enablePiping?: boolean
  availableQuestions?: StudyFlowQuestion[]
  trailingSlot?: React.ReactNode | ((editor: import('@tiptap/react').Editor) => React.ReactNode)
  overlaySlot?: React.ReactNode | ((editor: import('@tiptap/react').Editor) => React.ReactNode)
  /** Called once when the TipTap editor instance is created */
  onEditorCreated?: (editor: import('@tiptap/react').Editor) => void
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = 'Enter your text here...',
  className,
  minHeight = '120px',
  disabled = false,
  'aria-labelledby': ariaLabelledby,
  'aria-label': ariaLabel,
  allowImageUpload = false,
  studyId,
  enablePiping = false,
  availableQuestions = [],
  trailingSlot,
  overlaySlot,
  onEditorCreated,
}: RichTextEditorProps) {
  const [localContent, setLocalContent] = useState(content)

  const PipingReferenceExtension = useMemo(
    () => createPipingReferenceExtension(PipingReferenceNodeView),
    []
  )

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        code: false,
        blockquote: false,
        horizontalRule: false,
        link: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline hover:text-primary/80',
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-lg max-w-full h-auto my-4',
        },
      }),
      Table.configure({
        resizable: false,
        HTMLAttributes: {
          class: 'border-collapse table-auto w-full my-4',
        },
      }),
      TableRow,
      TableHeader.configure({
        HTMLAttributes: {
          class:
            'border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 px-3 py-2 text-left font-medium',
        },
      }),
      TableCell.configure({
        HTMLAttributes: {
          class: 'border border-slate-300 dark:border-slate-600 px-3 py-2',
        },
      }),
      PipingReferenceExtension,
    ],
    content,
    editable: !disabled,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm dark:prose-invert max-w-none focus:outline-none px-3 py-2',
          'prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0',
          '[&_ul]:list-disc [&_ol]:list-decimal [&_li]:ml-4',
          '[&_table]:border-collapse [&_table]:w-full [&_table]:my-4',
          '[&_th]:border [&_th]:border-slate-300 [&_th]:bg-slate-100 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-medium',
          '[&_td]:border [&_td]:border-slate-300 [&_td]:px-3 [&_td]:py-2',
          '[&_img]:rounded-lg [&_img]:max-w-full [&_img]:h-auto [&_img]:my-4'
        ),
        style: `min-height: ${minHeight}`,
        role: 'textbox',
        'aria-multiline': 'true',
        ...(ariaLabelledby && { 'aria-labelledby': ariaLabelledby }),
        ...(ariaLabel && { 'aria-label': ariaLabel }),
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      setLocalContent(html)
      // Skip propagating when non-editable (e.g., during AI streaming) to prevent
      // store cascades that fight with incoming stream deltas.
      if (editor.isEditable) {
        onChange(html)
      }
    },
  })

  // Sync content prop to editor (skip when non-editable, e.g. AI streaming)
  useEffect(() => {
    if (editor && editor.isEditable && content !== editor.getHTML()) {
      queueMicrotask(() => {
        if (editor && !editor.isDestroyed && editor.isEditable) {
          editor.commands.setContent(content)
        }
      })
      setLocalContent(content)
    }
  }, [content, editor])

  useEffect(() => {
    if (editor && onEditorCreated) onEditorCreated(editor)
  }, [editor]) // eslint-disable-line react-hooks/exhaustive-deps -- only fire when editor changes

  useEffect(() => {
    if (editor) editor.setEditable(!disabled)
  }, [disabled, editor])

  const isEmpty = !localContent || localContent === '<p></p>' || localContent === ''

  function resolvePlaceholder(): PlaceholderConfig | null {
    if (!placeholder) return null
    if (typeof placeholder === 'string') return { intro: placeholder }
    return placeholder
  }
  const placeholderConfig = resolvePlaceholder()

  return (
    <div
      className={cn(
        'rounded-xl overflow-hidden relative',
        'transition-all duration-200',
        disabled && 'cursor-not-allowed opacity-60',
        className
      )}
      style={{
        backgroundColor: 'var(--style-input-bg, var(--muted))',
        border: '1px solid var(--style-input-border, var(--border))',
      }}
    >
      <div className="w-full">
        <div className="flex items-center px-2 py-1">
          <RichTextMenuBar
            editor={editor}
            allowImageUpload={allowImageUpload}
            studyId={studyId}
            enablePiping={enablePiping}
            availableQuestions={availableQuestions}
            trailingSlot={trailingSlot}
          />
        </div>

        <div className="h-px bg-border/50" />

        <div className="relative">
          <EditorContent
            editor={editor}
            className={cn('cursor-text', disabled && 'pointer-events-none')}
          />
          {isEmpty && placeholderConfig && (
            <div
              className="pointer-events-none absolute inset-0 px-3 py-2 text-muted-foreground/70"
              aria-hidden="true"
            >
              <p className="text-sm my-1">{placeholderConfig.intro}</p>
              {placeholderConfig.bullets && placeholderConfig.bullets.length > 0 && (
                <ul className="text-sm my-1 list-disc ml-4 space-y-0.5">
                  {placeholderConfig.bullets.map((bullet, index) => (
                    <li key={index}>{bullet}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {overlaySlot && (
          typeof overlaySlot === 'function'
            ? (editor ? overlaySlot(editor) : null)
            : overlaySlot
        )}
      </div>
    </div>
  )
}

export function stripHtml(html: string): string {
  if (typeof window === 'undefined') {
    return html.replace(/<[^>]*>/g, '').trim()
  }
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return doc.body.textContent || ''
}
