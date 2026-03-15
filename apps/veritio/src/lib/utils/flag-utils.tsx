import { Users, AlertTriangle, Zap, Snail } from 'lucide-react'
import type { ParticipantFlag } from '@/lib/algorithms/participant-flagging'

/**
 * Get icon component for flag type
 */
export function getFlagIcon(type: ParticipantFlag['type']) {
  switch (type) {
    case 'all_one_group':
      return <Users className="h-3 w-3" />
    case 'each_own_group':
      return <Users className="h-3 w-3" />
    case 'no_movement':
      return <AlertTriangle className="h-3 w-3" />
    case 'too_fast':
      return <Zap className="h-3 w-3" />
    case 'too_slow':
      return <Snail className="h-3 w-3" />
  }
}

/**
 * Get human-readable label for flag type
 */
export function getFlagLabel(type: ParticipantFlag['type']): string {
  switch (type) {
    case 'all_one_group':
      return 'All in one'
    case 'each_own_group':
      return 'Each own group'
    case 'no_movement':
      return 'No activity'
    case 'too_fast':
      return 'Too fast'
    case 'too_slow':
      return 'Too slow'
    default:
      return type
  }
}
