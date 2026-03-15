'use client'

import { memo, useState, useCallback } from 'react'
import type { Editor } from '@tiptap/react'
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Link as LinkIcon,
  Unlink,
  Undo,
  Redo,
  Table as TableIcon,
  Plus,
  Trash2,
} from 'lucide-react'
import { Button } from '@veritio/ui/components/button'
import { Toggle } from '@veritio/ui/components/toggle'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@veritio/ui/components/popover'
import { Input } from '@veritio/ui/components/input'
import { Label } from '@veritio/ui/components/label'
import { RichTextImageUpload } from './rich-text-editor-image-upload'
import { RichTextPipingInsert } from './rich-text-piping-insert'
import type { StudyFlowQuestion } from '@veritio/prototype-test/lib/supabase/study-flow-types'

export interface RichTextMenuBarProps {
  editor: Editor | null
  allowImageUpload?: boolean
  studyId?: string
  enablePiping?: boolean
  availableQuestions?: StudyFlowQuestion[]
  trailingSlot?: React.ReactNode | ((editor: Editor) => React.ReactNode)
}
export const RichTextMenuBar = memo(function RichTextMenuBar({
  editor,
  allowImageUpload,
  studyId,
  enablePiping,
  availableQuestions,
  trailingSlot,
}: RichTextMenuBarProps) {
  const [linkUrl, setLinkUrl] = useState('')
  const [linkOpen, setLinkOpen] = useState(false)
  const [tableOpen, setTableOpen] = useState(false)

  const handleLinkOpen = useCallback(
    (open: boolean) => {
      setLinkOpen(open)
      if (open && editor?.isActive('link')) {
        const attrs = editor.getAttributes('link')
        setLinkUrl(attrs.href || '')
      } else if (!open) {
        setLinkUrl('')
      }
    },
    [editor]
  )

  const setLink = useCallback(() => {
    if (!editor) return

    if (linkUrl === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }

    const url = linkUrl.match(/^https?:\/\//) ? linkUrl : `https://${linkUrl}`
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    setLinkUrl('')
    setLinkOpen(false)
  }, [editor, linkUrl])

  const removeLink = useCallback(() => {
    if (!editor) return
    editor.chain().focus().extendMarkRange('link').unsetLink().run()
  }, [editor])

  if (!editor) {
    return null
  }

  const isInTable = editor.isActive('table')

  return (
    <div className="flex flex-wrap items-center gap-1 p-1">
      {/* Text formatting */}
      <Toggle
        size="sm"
        pressed={editor.isActive('bold')}
        onPressedChange={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        aria-label="Toggle bold"
      >
        <Bold className="h-4 w-4" />
      </Toggle>

      <Toggle
        size="sm"
        pressed={editor.isActive('italic')}
        onPressedChange={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        aria-label="Toggle italic"
      >
        <Italic className="h-4 w-4" />
      </Toggle>

      <ToolbarDivider />

      {/* Lists */}
      <Toggle
        size="sm"
        pressed={editor.isActive('bulletList')}
        onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
        aria-label="Toggle bullet list"
      >
        <List className="h-4 w-4" />
      </Toggle>

      <Toggle
        size="sm"
        pressed={editor.isActive('orderedList')}
        onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
        aria-label="Toggle ordered list"
      >
        <ListOrdered className="h-4 w-4" />
      </Toggle>

      <ToolbarDivider />

      {/* Link Popover */}
      <LinkPopover
        editor={editor}
        linkUrl={linkUrl}
        linkOpen={linkOpen}
        onLinkOpen={handleLinkOpen}
        onLinkUrlChange={setLinkUrl}
        onSetLink={setLink}
      />

      {editor.isActive('link') && (
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          onClick={removeLink}
          aria-label="Remove link"
        >
          <Unlink className="h-4 w-4" />
        </Button>
      )}

      <ToolbarDivider />

      {/* Image Upload */}
      {allowImageUpload && studyId && (
        <>
          <RichTextImageUpload editor={editor} studyId={studyId} />
          <ToolbarDivider />
        </>
      )}

      {/* Table Popover */}
      <TablePopover
        editor={editor}
        isInTable={isInTable}
        tableOpen={tableOpen}
        onTableOpenChange={setTableOpen}
      />

      {/* Undo/Redo - only show if History extension is loaded (not in collaborative mode) */}
      {'undo' in editor.commands && (
        <>
          <ToolbarDivider />

          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().chain().focus().undo().run()}
            aria-label="Undo"
          >
            <Undo className="h-4 w-4" />
          </Button>

          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().chain().focus().redo().run()}
            aria-label="Redo"
          >
            <Redo className="h-4 w-4" />
          </Button>
        </>
      )}

      {/* Answer Piping */}
      {enablePiping && (
        <>
          <ToolbarDivider />
          <RichTextPipingInsert editor={editor} availableQuestions={availableQuestions || []} />
        </>
      )}

      {/* Trailing slot (e.g. AI refine button) */}
      {trailingSlot && (
        <>
          <ToolbarDivider />
          {typeof trailingSlot === 'function' ? trailingSlot(editor) : trailingSlot}
        </>
      )}
    </div>
  )
})

const ToolbarDivider = memo(function ToolbarDivider() {
  return <div className="mx-1 h-6 w-px bg-border" />
})

interface LinkPopoverProps {
  editor: Editor
  linkUrl: string
  linkOpen: boolean
  onLinkOpen: (open: boolean) => void
  onLinkUrlChange: (url: string) => void
  onSetLink: () => void
}

const LinkPopover = memo(function LinkPopover({
  editor,
  linkUrl,
  linkOpen,
  onLinkOpen,
  onLinkUrlChange,
  onSetLink,
}: LinkPopoverProps) {
  return (
    <Popover open={linkOpen} onOpenChange={onLinkOpen}>
      <PopoverTrigger asChild>
        <Toggle size="sm" pressed={editor.isActive('link')} aria-label="Insert link">
          <LinkIcon className="h-4 w-4" />
        </Toggle>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="link-url">URL</Label>
            <Input
              id="link-url"
              placeholder="https://example.com"
              value={linkUrl}
              onChange={(e) => onLinkUrlChange(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  onSetLink()
                }
                if (e.key === 'Escape') {
                  onLinkOpen(false)
                }
              }}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                onLinkUrlChange('')
                onLinkOpen(false)
              }}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={onSetLink}>
              {editor.isActive('link') ? 'Update Link' : 'Add Link'}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
})

interface TablePopoverProps {
  editor: Editor
  isInTable: boolean
  tableOpen: boolean
  onTableOpenChange: (open: boolean) => void
}

const TablePopover = memo(function TablePopover({
  editor,
  isInTable,
  tableOpen,
  onTableOpenChange,
}: TablePopoverProps) {
  const insertTable = useCallback(
    (rows: number, cols: number) => {
      editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run()
      onTableOpenChange(false)
    },
    [editor, onTableOpenChange]
  )

  return (
    <Popover open={tableOpen} onOpenChange={onTableOpenChange}>
      <PopoverTrigger asChild>
        <Toggle size="sm" pressed={isInTable} aria-label="Table options">
          <TableIcon className="h-4 w-4" />
        </Toggle>
      </PopoverTrigger>
      <PopoverContent className="w-56" align="start">
        <div className="flex flex-col gap-1">
          {!isInTable ? (
            <>
              <p className="text-xs font-medium text-muted-foreground px-2 py-1">Insert Table</p>
              <div className="grid grid-cols-2 gap-1">
                {[
                  { rows: 2, cols: 2 },
                  { rows: 3, cols: 3 },
                  { rows: 4, cols: 4 },
                  { rows: 5, cols: 5 },
                ].map(({ rows, cols }) => (
                  <Button
                    key={`${rows}x${cols}`}
                    size="sm"
                    variant="ghost"
                    className="justify-start gap-2 text-xs"
                    onClick={() => insertTable(rows, cols)}
                  >
                    {rows}×{cols} Table
                  </Button>
                ))}
              </div>
            </>
          ) : (
            <TableEditMenu editor={editor} onClose={() => onTableOpenChange(false)} />
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
})

interface TableEditMenuProps {
  editor: Editor
  onClose: () => void
}

const TableEditMenu = memo(function TableEditMenu({ editor, onClose }: TableEditMenuProps) {
  return (
    <>
      <p className="text-xs font-medium text-muted-foreground px-2 py-1">Add</p>
      <div className="grid grid-cols-2 gap-1">
        <Button
          size="sm"
          variant="ghost"
          className="justify-start gap-1.5 text-xs"
          onClick={() => editor.chain().focus().addRowBefore().run()}
        >
          <Plus className="h-3 w-3" />
          Row Above
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="justify-start gap-1.5 text-xs"
          onClick={() => editor.chain().focus().addRowAfter().run()}
        >
          <Plus className="h-3 w-3" />
          Row Below
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="justify-start gap-1.5 text-xs"
          onClick={() => editor.chain().focus().addColumnBefore().run()}
        >
          <Plus className="h-3 w-3" />
          Col Left
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="justify-start gap-1.5 text-xs"
          onClick={() => editor.chain().focus().addColumnAfter().run()}
        >
          <Plus className="h-3 w-3" />
          Col Right
        </Button>
      </div>
      <div className="my-1 h-px bg-border" />
      <p className="text-xs font-medium text-muted-foreground px-2 py-1">Remove</p>
      <div className="grid grid-cols-2 gap-1">
        <Button
          size="sm"
          variant="ghost"
          className="justify-start gap-1.5 text-xs text-destructive hover:text-destructive"
          onClick={() => editor.chain().focus().deleteRow().run()}
        >
          <Trash2 className="h-3 w-3" />
          Delete Row
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="justify-start gap-1.5 text-xs text-destructive hover:text-destructive"
          onClick={() => editor.chain().focus().deleteColumn().run()}
        >
          <Trash2 className="h-3 w-3" />
          Delete Col
        </Button>
      </div>
      <div className="my-1 h-px bg-border" />
      <Button
        size="sm"
        variant="ghost"
        className="justify-start gap-1.5 text-xs text-destructive hover:text-destructive w-full"
        onClick={() => {
          editor.chain().focus().deleteTable().run()
          onClose()
        }}
      >
        <Trash2 className="h-3 w-3" />
        Delete Entire Table
      </Button>
    </>
  )
})
