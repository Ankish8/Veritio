'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type { Editor } from '@tiptap/react'
import { Sparkles, Loader2, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useRefineText, type RefineAction } from '@/hooks/use-refine-text'
import { REFINE_OPTIONS } from './refine-options'

type Phase = 'idle' | 'loading' | 'preview' | 'error'

interface AiRefineMenuButtonProps {
  editor: Editor | null
  context?: string
}

/**
 * Veritio AI dropdown for rich text editor fields.
 * Inline UI: dropdown → loading spinner → Apply/Discard in the toolbar.
 */
export function AiRefineMenuButton({ editor, context }: AiRefineMenuButtonProps) {
  const { refine, error, reset } = useRefineText()
  const [phase, setPhase] = useState<Phase>('idle')
  const [refinedHtml, setRefinedHtml] = useState('')
  const originalContentRef = useRef('')
  const editorRef = useRef(editor)
  useEffect(() => { editorRef.current = editor }, [editor])

  const hasContent = !!editor?.getText()?.trim()

  const handleAction = useCallback(async (action: RefineAction) => {
    const ed = editorRef.current
    if (!ed || ed.isDestroyed) return

    originalContentRef.current = ed.getHTML()
    setRefinedHtml('')
    setPhase('loading')

    const res = await refine({ text: originalContentRef.current, action, format: 'html', context })
    if (res) {
      setRefinedHtml(res.refined)
      ed.commands.setContent(res.refined, { emitUpdate: false })
      setPhase('preview')
    } else {
      setPhase('error')
    }
  }, [refine, context])

  const handleApply = useCallback(() => {
    const ed = editorRef.current
    if (!ed || ed.isDestroyed) return
    ed.commands.setContent(refinedHtml, { emitUpdate: true })
    setPhase('idle')
  }, [refinedHtml])

  const handleDiscard = useCallback(() => {
    const ed = editorRef.current
    if (!ed || ed.isDestroyed) return
    ed.commands.setContent(originalContentRef.current, { emitUpdate: false })
    setPhase('idle')
    reset()
  }, [reset])

  if (!editor) return null

  if (phase === 'loading') {
    return (
      <div className="flex items-center gap-1.5">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Refining...</span>
      </div>
    )
  }

  if (phase === 'preview') {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground">Uses AI. Verify results.</span>
        <Button size="sm" className="h-7 px-2.5 text-xs gap-1" onClick={handleApply}>
          <Check className="h-3 w-3" />
          Apply
        </Button>
        <Button size="sm" variant="ghost" className="h-7 px-2.5 text-xs gap-1" onClick={handleDiscard}>
          <X className="h-3 w-3" />
          Discard
        </Button>
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-destructive truncate max-w-40">{error || 'Failed'}</span>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={handleDiscard}>
          Dismiss
        </Button>
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 gap-1 text-xs text-muted-foreground"
          disabled={!hasContent}
          aria-label="Veritio AI"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Veritio AI
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {REFINE_OPTIONS.map(({ action, label, icon: Icon }) => (
          <DropdownMenuItem
            key={action}
            onClick={() => handleAction(action)}
            className="gap-2 text-xs"
          >
            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
