'use client'

import { memo } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import type { PanelParticipantWithTags } from '@/lib/supabase/panel-types'

interface ParticipantRowProps {
  participant: PanelParticipantWithTags
  isSelected: boolean
  onToggle: (id: string, checked: boolean) => void
}

function getDisplayName(participant: PanelParticipantWithTags): string {
  if (participant.first_name || participant.last_name) {
    return [participant.first_name, participant.last_name].filter(Boolean).join(' ')
  }
  return 'No name'
}

export const ParticipantRow = memo(function ParticipantRow({
  participant,
  isSelected,
  onToggle,
}: ParticipantRowProps) {
  const displayName = getDisplayName(participant)
  const visibleTags = participant.tags.slice(0, 4)
  const overflowCount = participant.tags.length - 4

  return (
    <label className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors border border-transparent hover:border-border">
      <Checkbox
        checked={isSelected}
        onCheckedChange={(checked) => onToggle(participant.id, checked === true)}
      />

      {/* Name and Email */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">
            {displayName}
          </p>
          {/* Inline tag dots */}
          {visibleTags.length > 0 && (
            <div className="flex items-center gap-1 shrink-0">
              {visibleTags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center gap-1 text-[12px] px-1.5 py-0 rounded-full border"
                  style={{
                    backgroundColor: `${tag.color}15`,
                    color: tag.color,
                    borderColor: `${tag.color}30`,
                  }}
                  title={tag.name}
                >
                  {tag.name}
                </span>
              ))}
              {overflowCount > 0 && (
                <span className="text-[12px] text-muted-foreground">
                  +{overflowCount}
                </span>
              )}
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {participant.email}
        </p>
      </div>
    </label>
  )
})
