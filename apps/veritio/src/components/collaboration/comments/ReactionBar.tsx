'use client'

import { useState } from 'react'
import { SmilePlus } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { CommentReaction } from '@/hooks/use-study-comments'

/**
 * A fixed six-emoji reaction set.
 *
 * Deliberately not a full emoji picker: no picker library is in the dependency
 * tree, and a comment thread in a research tool needs acknowledgement
 * ("seen", "agreed", "done") far more than expressive range. Six covers that
 * and keeps the reactions column queryable.
 *
 * Must stay in sync with ALLOWED_REACTIONS in comments-service.ts, which
 * rejects anything else server-side.
 */
const REACTIONS = ['👍', '✅', '👀', '🎉', '❤️', '🤔'] as const

interface ReactionBarProps {
  reactions: CommentReaction[]
  currentUserId?: string
  onToggle: (emoji: string) => void
  disabled?: boolean
}

export function ReactionBar({
  reactions,
  currentUserId,
  onToggle,
  disabled = false,
}: ReactionBarProps) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const active = reactions.filter((r) => r.count > 0)

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {active.map((reaction) => {
        const mine = !!currentUserId && reaction.userIds.includes(currentUserId)
        return (
          <button
            key={reaction.emoji}
            type="button"
            disabled={disabled}
            onClick={() => onToggle(reaction.emoji)}
            aria-pressed={mine}
            aria-label={`${reaction.emoji} ${reaction.count}`}
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] transition-colors disabled:opacity-50',
              // Neutral, matching the mention chips: a row of reactions should
              // read as data, not as brand accents.
              mine
                ? 'border-foreground/25 bg-foreground/10 text-foreground'
                : 'border-border bg-muted/40 text-muted-foreground hover:bg-muted'
            )}
          >
            <span aria-hidden>{reaction.emoji}</span>
            <span className="tabular-nums">{reaction.count}</span>
          </button>
        )
      })}

      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button
                type="button"
                disabled={disabled}
                aria-label="Add reaction"
                /* Always visible. Hiding this until hover made reactions
                   effectively undiscoverable — and invisible on touch. */
                className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
              >
                <SmilePlus className="h-3.5 w-3.5" />
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="top">Add reaction</TooltipContent>
        </Tooltip>
        <PopoverContent className="w-auto p-1" align="start" side="top">
          <div className="flex items-center gap-0.5">
            {REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  onToggle(emoji)
                  setPickerOpen(false)
                }}
                className="rounded p-1 text-base transition-colors hover:bg-muted"
                aria-label={`React with ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
