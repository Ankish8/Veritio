/**
 * Participant Source Badge
 *
 * Subtle text indicator for how a participant joined the panel.
 */

import { cn } from '@/lib/utils'
import type { ParticipantSource } from '@/lib/supabase/panel-types'

interface ParticipantSourceBadgeProps {
  source: ParticipantSource
  className?: string
}

const sourceLabels: Record<ParticipantSource, string> = {
  widget: 'Widget',
  import: 'Import',
  manual: 'Manual',
  link: 'Link',
  email: 'Email',
  study: 'Study',
}

export function ParticipantSourceBadge({ source, className }: ParticipantSourceBadgeProps) {
  return (
    <span className={cn('text-sm text-muted-foreground', className)}>
      {sourceLabels[source]}
    </span>
  )
}
