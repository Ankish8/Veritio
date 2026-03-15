'use client'

import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { X } from 'lucide-react'
import { cn } from '@veritio/ui'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@veritio/ui/components/tooltip'
export function PipingReferenceNodeView({
  node,
  deleteNode,
  selected,
}: NodeViewProps) {
  const { questionTitle } = node.attrs as { questionId: string; questionTitle: string }

  const displayTitle =
    questionTitle.length > 25 ? questionTitle.slice(0, 25) + '...' : questionTitle

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <NodeViewWrapper
            as="span"
            className={cn(
              'inline-flex items-center gap-1 align-baseline',
              'rounded-md px-1.5 py-0.5 mx-0.5',
              'text-sm',
              'cursor-default select-none',
              'bg-muted text-foreground border',
              'hover:bg-muted/80',
              selected && 'ring-2 ring-ring ring-offset-1'
            )}
            contentEditable={false}
          >
            <span className="text-muted-foreground">Answer:</span>
            <span className="truncate max-w-[180px]">{displayTitle || 'Previous question'}</span>

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                deleteNode()
              }}
              className="ml-0.5 rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-background"
              aria-label="Remove reference"
            >
              <X className="h-3 w-3" />
            </button>
          </NodeViewWrapper>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>Shows participant&apos;s answer to: &quot;{questionTitle}&quot;</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
