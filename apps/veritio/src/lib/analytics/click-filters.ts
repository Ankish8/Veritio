import type { FirstClickEventData } from '@/types/analytics'

export function filterValidClicks(clicks: FirstClickEventData[]): FirstClickEventData[] {
  return clicks.filter(c => !c.isSkipped && c.x != null && c.y != null)
}
