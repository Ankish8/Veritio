'use client'

import { useState } from 'react'
import { Smile } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

/**
 * Emoji picker for the composer — inserts into the message text.
 *
 * Distinct from ReactionBar, which attaches an emoji *to* an existing comment.
 * Both existed conceptually but only reactions were built, so there was no way
 * to simply put a 🎉 in a sentence.
 *
 * Still a curated set rather than a picker dependency: no emoji-picker library
 * is in the tree, and adding one (plus its data payload) to a side panel is a
 * poor trade. These are grouped by what people actually reach for in a research
 * discussion.
 */
const EMOJI_GROUPS: Array<{ label: string; emoji: string[] }> = [
  { label: 'Reactions', emoji: ['👍', '👎', '✅', '❌', '👀', '🙌', '🎉', '🔥'] },
  { label: 'Faces', emoji: ['🙂', '😄', '😅', '🤔', '😬', '😍', '🤯', '😴'] },
  { label: 'Work', emoji: ['📌', '📝', '📊', '🐛', '⚠️', '💡', '🚀', '⏰'] },
  { label: 'Hearts', emoji: ['❤️', '🧡', '💚', '💙', '💜', '🖤', '⭐', '✨'] },
]

interface EmojiPickerProps {
  onSelect: (emoji: string) => void
  disabled?: boolean
  className?: string
}

export function EmojiPicker({ onSelect, disabled = false, className }: EmojiPickerProps) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-label="Insert emoji"
          title="Insert emoji"
          className={cn(
            'rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50',
            className
          )}
        >
          <Smile className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-2" align="end" side="top">
        <div className="space-y-2">
          {EMOJI_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {group.label}
              </p>
              <div className="grid grid-cols-8 gap-0.5">
                {group.emoji.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      onSelect(emoji)
                      setOpen(false)
                    }}
                    aria-label={emoji}
                    className="rounded p-1 text-base leading-none transition-colors hover:bg-muted"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
