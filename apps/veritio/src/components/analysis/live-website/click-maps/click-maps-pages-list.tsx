'use client'

import { useState, useMemo, useCallback, memo } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { SnapshotRenderer } from './snapshot-renderer'
import type { PageWithStats } from './click-maps-sidebar'

type SortOption = 'clicks' | 'visitors' | 'url'

interface ThumbnailClick {
  normalizedX: number
  normalizedY: number
}

interface ClickMapsPagesListProps {
  pages: PageWithStats[]
  activePage: string
  onSelectPage: (url: string) => void
  /** Pre-computed normalized click positions per page URL for thumbnail heatmap dots */
  clicksByPage?: Map<string, ThumbnailClick[]>
}

function ClickMapsPagesListBase({
  pages,
  activePage,
  onSelectPage,
  clicksByPage,
}: ClickMapsPagesListProps) {
  const [sortBy, setSortBy] = useState<SortOption>('clicks')
  const [open, setOpen] = useState(true)
  const [imgErrors, setImgErrors] = useState<Set<string>>(() => new Set())

  const handleImgError = useCallback((pageUrl: string) => {
    setImgErrors(prev => {
      if (prev.has(pageUrl)) return prev
      const next = new Set(prev)
      next.add(pageUrl)
      return next
    })
  }, [])

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
    <div className="w-56 shrink-0 sticky top-[120px] max-h-[calc(100vh-140px)] overflow-y-auto">
      <div className="border rounded-lg overflow-hidden">
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between p-3 text-sm font-medium hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            <span>Pages</span>
          </div>
          <Badge variant="secondary" className="text-xs">{pages.length}</Badge>
        </button>
        {open && (
          <div className="border-t p-2 space-y-2">
            <Select value={sortBy} onValueChange={v => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-full h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="clicks">Most clicks</SelectItem>
                <SelectItem value="visitors">Most visitors</SelectItem>
                <SelectItem value="url">URL (A-Z)</SelectItem>
              </SelectContent>
            </Select>

            <div className="max-h-[calc(100vh-300px)] overflow-y-auto space-y-1">
              {sortedPages.map(page => {
                const isSelected = page.pageUrl === activePage
                return (
                  <button
                    key={page.pageUrl}
                    type="button"
                    onClick={() => onSelectPage(page.pageUrl)}
                    className={`w-full text-left rounded-md border transition-all p-1.5 hover:border-muted-foreground/40 ${
                      isSelected ? 'bg-primary/5 border-primary/30' : 'border-transparent'
                    }`}
                  >
                    <div
                      className="relative bg-muted/50 rounded overflow-hidden mb-1"
                      style={{ aspectRatio: `${page.viewportWidth} / ${page.viewportHeight}` }}
                    >
                      {page.screenshotPath && !imgErrors.has(page.pageUrl) ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={page.screenshotPath}
                          alt={page.pageUrl}
                          className="w-full h-full object-fill"
                          onError={() => handleImgError(page.pageUrl)}
                        />
                      ) : page.snapshotPath ? (
                        <div className="w-full h-full overflow-hidden">
                          <SnapshotRenderer
                            snapshotUrl={page.snapshotPath}
                            viewportWidth={page.viewportWidth}
                            viewportHeight={page.viewportHeight}
                            clipToViewport={page.pageUrl.endsWith('#modal')}
                          />
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                          No preview
                        </div>
                      )}
                      {/* Mini heatmap dots overlay */}
                      <ThumbnailHeatmapDots clicks={clicksByPage?.get(page.pageUrl)} />
                    </div>
                    <div className="font-medium text-sm truncate" title={page.pageUrl}>
                      {truncateUrl(page.pageUrl, 28)}
                      {page.pageUrl.endsWith('#modal') && (
                        <span className="text-xs text-muted-foreground ml-1">(Dialog)</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <span>{page.totalClicks} click{page.totalClicks !== 1 ? 's' : ''} · {page.uniqueVisitors} visitor{page.uniqueVisitors !== 1 ? 's' : ''}</span>
                    </div>
                    {page.variantName && (
                      <Badge variant="outline" className="mt-0.5 text-xs px-1.5 py-0">{page.variantName}</Badge>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/** Renders small semi-transparent dots on the thumbnail to preview click distribution. */
const MAX_THUMBNAIL_DOTS = 200

function ThumbnailHeatmapDots({ clicks }: { clicks?: ThumbnailClick[] }) {
  if (!clicks || clicks.length === 0) return null
  const sample = clicks.length > MAX_THUMBNAIL_DOTS ? clicks.slice(0, MAX_THUMBNAIL_DOTS) : clicks
  return (
    <div className="absolute inset-0 pointer-events-none">
      {sample.map((c, i) => (
        <div
          key={i}
          className="absolute w-1.5 h-1.5 rounded-full bg-red-500/60 -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${c.normalizedX}%`, top: `${c.normalizedY}%` }}
        />
      ))}
    </div>
  )
}

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

export const ClickMapsPagesList = memo(ClickMapsPagesListBase)
