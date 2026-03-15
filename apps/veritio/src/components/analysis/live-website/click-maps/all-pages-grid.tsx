'use client'

import { useState, useMemo, useCallback, memo } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type {
  LiveWebsiteEvent,
  LiveWebsitePageScreenshot,
} from '@/app/(dashboard)/projects/[projectId]/studies/[studyId]/results/types'
import { normalizePageUrl } from '@/lib/utils/url-utils'
import { SnapshotRenderer } from './snapshot-renderer'

type SortOption = 'clicks' | 'visitors' | 'url'

interface PageWithStats {
  pageUrl: string
  screenshotPath: string | null
  snapshotPath: string | null
  viewportWidth: number
  viewportHeight: number
  pageWidth: number
  totalClicks: number
  uniqueVisitors: number
}

interface LiveWebsiteAllPagesGridProps {
  screenshots: LiveWebsitePageScreenshot[]
  clickEvents: LiveWebsiteEvent[]
  allEvents: LiveWebsiteEvent[]
  filteredParticipantIds?: Set<string> | null
  activePage: string
  onSelectPage: (url: string) => void
}

export const LiveWebsiteAllPagesGrid = memo(function LiveWebsiteAllPagesGrid({
  screenshots,
  clickEvents,
  allEvents,
  filteredParticipantIds,
  activePage,
  onSelectPage,
}: LiveWebsiteAllPagesGridProps) {
  const [sortBy, setSortBy] = useState<SortOption>('clicks')
  const [imgErrors, setImgErrors] = useState<Set<string>>(() => new Set())

  const handleImgError = useCallback((pageUrl: string) => {
    setImgErrors(prev => {
      if (prev.has(pageUrl)) return prev
      const next = new Set(prev)
      next.add(pageUrl)
      return next
    })
  }, [])

  const pages: PageWithStats[] = useMemo(() => {
    const pageMap = new Map<string, PageWithStats>()

    for (const ss of screenshots) {
      const normalized = normalizePageUrl(ss.page_url)
      if (!pageMap.has(normalized)) {
        pageMap.set(normalized, {
          pageUrl: normalized,
          screenshotPath: ss.screenshot_path,
          snapshotPath: ss.snapshot_path ?? null,
          viewportWidth: ss.viewport_width || 1920,
          viewportHeight: ss.viewport_height || 1080,
          pageWidth: ss.page_width || ss.viewport_width || 1920,
          totalClicks: 0,
          uniqueVisitors: 0,
        })
      }
    }

    // Aggregate clicks per page (normalize URLs by stripping hash)
    const clicksByPage = new Map<string, { count: number; participants: Set<string> }>()
    for (const event of clickEvents) {
      const url = normalizePageUrl(event.page_url || '')
      if (!url) continue
      let entry = clicksByPage.get(url)
      if (!entry) {
        entry = { count: 0, participants: new Set() }
        clicksByPage.set(url, entry)
      }
      entry.count++
      if (event.participant_id) entry.participants.add(event.participant_id)
    }

    for (const [url, data] of clicksByPage) {
      const page = pageMap.get(url)
      if (page) {
        page.totalClicks = data.count
        page.uniqueVisitors = data.participants.size
      }
    }

    // Count unique visitors from ALL events (page_view, scroll, etc.) — not just clicks
    // This ensures pages that were visited but not clicked still show visitor count
    const visitorsByPage = new Map<string, Set<string>>()
    const filteredEvents = filteredParticipantIds
      ? allEvents.filter(e => e.participant_id && filteredParticipantIds.has(e.participant_id))
      : allEvents
    for (const event of filteredEvents) {
      const url = normalizePageUrl(event.page_url || '')
      if (!url || !event.participant_id) continue
      let visitors = visitorsByPage.get(url)
      if (!visitors) {
        visitors = new Set()
        visitorsByPage.set(url, visitors)
      }
      visitors.add(event.participant_id)
    }

    for (const [url, visitors] of visitorsByPage) {
      const page = pageMap.get(url)
      if (page) {
        // Use the larger visitor count (from all events vs just clicks)
        page.uniqueVisitors = Math.max(page.uniqueVisitors, visitors.size)
      }
    }

    // Filter out bogus entries: no clicks, no visitors, and no usable preview
    return Array.from(pageMap.values()).filter(page => {
      if (page.totalClicks > 0 || page.uniqueVisitors > 0) return true
      return page.screenshotPath || page.snapshotPath
    })
  }, [screenshots, clickEvents, allEvents, filteredParticipantIds])

  const sortedPages = useMemo(() => {
    const sorted = [...pages]
    switch (sortBy) {
      case 'clicks':
        sorted.sort((a, b) => b.totalClicks - a.totalClicks)
        break
      case 'visitors':
        sorted.sort((a, b) => b.uniqueVisitors - a.uniqueVisitors)
        break
      case 'url':
        sorted.sort((a, b) => a.pageUrl.localeCompare(b.pageUrl))
        break
    }
    return sorted
  }, [pages, sortBy])

  if (pages.length <= 1) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-medium">All Pages ({pages.length})</h3>
        <Select value={sortBy} onValueChange={v => setSortBy(v as SortOption)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="clicks">Most clicks</SelectItem>
            <SelectItem value="visitors">Most visitors</SelectItem>
            <SelectItem value="url">URL (A-Z)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {sortedPages.map(page => {
          const isSelected = page.pageUrl === activePage
          return (
            <button
              key={page.pageUrl}
              type="button"
              onClick={() => onSelectPage(page.pageUrl)}
              className={`text-left rounded-lg border transition-all hover:border-muted-foreground/40 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                isSelected ? 'ring-2 ring-primary border-primary' : ''
              }`}
            >
              <div className="relative aspect-video bg-muted/50 rounded-t-lg overflow-hidden">
                {page.screenshotPath && !imgErrors.has(page.pageUrl) ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={page.screenshotPath}
                    alt={page.pageUrl}
                    className="w-full h-full object-cover"
                    onError={() => handleImgError(page.pageUrl)}
                  />
                ) : page.snapshotPath ? (
                  <div className="w-full h-full overflow-hidden">
                    <SnapshotRenderer
                      snapshotUrl={page.snapshotPath}
                      viewportWidth={page.viewportWidth}
                      viewportHeight={page.viewportHeight}
                    />
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                    No preview
                  </div>
                )}
              </div>
              <div className="p-2 space-y-0.5">
                <div className="font-medium text-sm truncate" title={page.pageUrl}>
                  {truncateUrl(page.pageUrl, 40)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {page.totalClicks} click{page.totalClicks !== 1 ? 's' : ''} · {page.uniqueVisitors} visitor{page.uniqueVisitors !== 1 ? 's' : ''}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
})

function truncateUrl(url: string, maxLen: number): string {
  try {
    const parsed = new URL(url)
    const path = parsed.pathname + parsed.search
    if (path.length <= maxLen) return path || '/'
    return path.slice(0, maxLen - 3) + '...'
  } catch {
    if (url.length <= maxLen) return url
    return url.slice(0, maxLen - 3) + '...'
  }
}
