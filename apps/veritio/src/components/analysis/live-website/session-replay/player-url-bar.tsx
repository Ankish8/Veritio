'use client'

import { useMemo } from 'react'
import { Globe } from 'lucide-react'
import type { RrwebPage } from './utils'

interface PlayerUrlBarProps {
  pages: RrwebPage[]
  currentTimeMs: number
  sessionStartTimestamp: number
}

export function PlayerUrlBar({ pages, currentTimeMs, sessionStartTimestamp }: PlayerUrlBarProps) {
  const currentUrl = useMemo(() => {
    if (pages.length === 0) return null
    const currentAbsoluteTime = sessionStartTimestamp + currentTimeMs
    let matchedUrl: string | null = null
    for (const page of pages) {
      if (page.timestamp <= currentAbsoluteTime) {
        matchedUrl = page.url
      } else {
        break
      }
    }
    return matchedUrl ?? pages[0]?.url ?? null
  }, [pages, currentTimeMs, sessionStartTimestamp])

  if (!currentUrl) return null

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-t-lg border border-b-0 bg-muted/20 text-sm">
      <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span className="text-muted-foreground truncate font-mono text-xs">{currentUrl}</span>
    </div>
  )
}
