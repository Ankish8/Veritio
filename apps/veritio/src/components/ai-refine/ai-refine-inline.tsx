'use client'

import type { Editor } from '@tiptap/react'
import { Sparkles, Square, Check, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useRefineTextStream, type RefineStreamPhase } from '@/hooks/use-refine-text-stream'
import type { RefineAction } from '@/hooks/use-refine-text'
import { REFINE_OPTIONS } from './refine-options'

interface AiRefineInlineProps {
  editor: Editor | null
  context?: string
}

/**
 * Inline AI refine for rich text editors.
 * Returns both a toolbar button and an overlay — render them in the
 * editor's `trailingSlot` and `overlaySlot` respectively.
 */
export function useAiRefineInline({ editor, context }: AiRefineInlineProps) {
  const { phase, errorMessage, startRefine, cancel, apply, discard } =
    useRefineTextStream({ editor, context })

  const toolbarButton = (
    <AiRefineToolbarDropdown
      editor={editor}
      phase={phase}
      onAction={startRefine}
      onCancel={cancel}
    />
  )

  const overlay = (
    <AiRefineOverlay
      phase={phase}
      errorMessage={errorMessage}
      onApply={apply}
      onDiscard={discard}
      onCancel={cancel}
    />
  )

  return { toolbarButton, overlay, phase }
}

// ---------------------------------------------------------------------------
// Toolbar Dropdown
// ---------------------------------------------------------------------------

function AiRefineToolbarDropdown({
  editor,
  phase,
  onAction,
  onCancel,
}: {
  editor: Editor | null
  phase: RefineStreamPhase
  onAction: (action: RefineAction) => void
  onCancel: () => void
}) {
  const hasContent = !!editor?.getText()?.trim()

  if (phase === 'streaming') {
    return (
      <Button
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
        onClick={onCancel}
        aria-label="Stop refining"
      >
        <Square className="h-3.5 w-3.5 fill-current" />
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 gap-1 text-xs text-muted-foreground"
          disabled={!hasContent || phase === 'complete'}
          aria-label="Veritio AI"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Veritio AI
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {REFINE_OPTIONS.map(({ action, label, icon: Icon }) => (
          <DropdownMenuItem
            key={action}
            onClick={() => onAction(action)}
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

// ---------------------------------------------------------------------------
// Overlay Bar (rendered inside the editor via overlaySlot)
// ---------------------------------------------------------------------------

function AiRefineOverlay({
  phase,
  errorMessage,
  onApply,
  onDiscard,
  onCancel,
}: {
  phase: RefineStreamPhase
  errorMessage: string | null
  onApply: () => void
  onDiscard: () => void
  onCancel: () => void
}) {
  if (phase === 'idle') return null

  if (phase === 'streaming') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 border-t border-border/50 bg-muted/50">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground">Veritio AI is refining...</span>
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto h-6 px-2 text-xs"
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 border-t border-destructive/30 bg-destructive/5">
        <span className="text-xs text-destructive">{errorMessage || 'Something went wrong'}</span>
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto h-6 px-2 text-xs"
          onClick={onDiscard}
        >
          Dismiss
        </Button>
      </div>
    )
  }

  // Complete phase
  return (
    <div className="flex items-center gap-2 px-3 py-2 border-t border-border/50 bg-muted/50">
      <span className="text-xs text-muted-foreground">Uses AI. Verify results.</span>
      <div className="ml-auto flex items-center gap-1.5">
        <Button
          size="sm"
          className="h-7 px-3.5 text-xs gap-1.5"
          onClick={onApply}
        >
          <Check className="h-3.5 w-3.5" />
          Apply
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-3.5 text-xs gap-1.5"
          onClick={onDiscard}
        >
          <X className="h-3.5 w-3.5" />
          Discard
        </Button>
      </div>
    </div>
  )
}
