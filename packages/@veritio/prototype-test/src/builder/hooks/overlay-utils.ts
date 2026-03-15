import type { PrototypeTestFrame } from '@veritio/study-types'
import { isOverlayFrame } from '../composite-thumbnail'

export const overlayNameKeywords = [
  'overlay', 'modal', 'dialog', 'drawer', 'panel', 'popup', 'menu',
  'dropdown', 'popover', 'sheet', 'sidebar', 'detail', 'details',
  'contact', 'profile', 'settings', 'options', 'filter', 'search',
  'notification', 'alert', 'toast', 'tooltip', 'hover', 'expanded',
  'new chat', 'compose', 'create', 'add new',
]

export function isOverlayName(frameName?: string | null): boolean {
  if (!frameName) return false
  const nameLower = frameName.toLowerCase()
  return overlayNameKeywords.some((keyword) => nameLower.includes(keyword))
}

export function findBaseFrameIndex(pathFrameIds: string[], frames: PrototypeTestFrame[]): number {
  if (pathFrameIds.length === 0) return -1
  if (pathFrameIds.length === 1) return 0

  let baseIndex = pathFrameIds.length - 1
  while (baseIndex > 0) {
    const frame = frames.find(f => f.id === pathFrameIds[baseIndex])
    const prevFrame = frames.find(f => f.id === pathFrameIds[baseIndex - 1])
    if (!frame || !prevFrame) break

    if (isOverlayFrame(frame, prevFrame) || isOverlayName(frame.name)) {
      baseIndex -= 1
      continue
    }
    break
  }

  return baseIndex
}

export function findBaseFrameId(pathFrameIds: string[], frames: PrototypeTestFrame[]): string | null {
  const baseIndex = findBaseFrameIndex(pathFrameIds, frames)
  if (baseIndex < 0) return null
  return pathFrameIds[baseIndex] ?? null
}
