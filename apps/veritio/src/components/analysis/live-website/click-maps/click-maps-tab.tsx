'use client'

import { useState, useMemo, memo, useRef, useCallback } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { HeatmapRenderer } from '@veritio/analysis-shared'
import { exportElementToPNG, generateHeatmapFilename } from '@/lib/analytics'
import { toast } from '@/components/ui/sonner'
import { normalizePageUrl } from '@/lib/utils/url-utils'
import { computeClickStats } from './click-stats'
import { SnapshotRenderer } from './snapshot-renderer'
import { ClickMapsSidebar } from './click-maps-sidebar'
import { ClickMapsPagesList } from './click-maps-pages-list'
import type { PageWithStats } from './click-maps-sidebar'
import type { HeatmapSettings, SelectionSettings } from '@/types/analytics'
import type {
  LiveWebsiteEvent,
  LiveWebsitePageScreenshot,
  LiveWebsiteTask,
} from '@/app/(dashboard)/projects/[projectId]/studies/[studyId]/results/types'

type DisplayMode = 'heatmap' | 'selection'
type DeviceType = 'all' | 'desktop' | 'tablet' | 'mobile'

function classifyDevice(viewportWidth: number): DeviceType {
  if (viewportWidth < 768) return 'mobile'
  if (viewportWidth < 1024) return 'tablet'
  return 'desktop'
}

interface ClickMapsTabProps {
  events: LiveWebsiteEvent[]
  screenshots: LiveWebsitePageScreenshot[]
  tasks: LiveWebsiteTask[]
  trackingMode: string
  filteredParticipantIds?: Set<string> | null
  displayMode: DisplayMode
  onDisplayModeChange: (mode: DisplayMode) => void
  heatmapSettings: HeatmapSettings
  onHeatmapSettingsChange: (updates: Partial<HeatmapSettings>) => void
  selectionSettings: SelectionSettings
  onSelectionSettingsChange: (updates: Partial<SelectionSettings>) => void
  variants?: Array<{ id: string; name: string; url: string }>
}

function ClickMapsTabBase({
  events,
  screenshots,
  tasks,
  trackingMode,
  filteredParticipantIds,
  displayMode,
  onDisplayModeChange,
  heatmapSettings,
  onHeatmapSettingsChange,
  selectionSettings,
  onSelectionSettingsChange,
  variants,
}: ClickMapsTabProps) {
  const [selectedPageUrl, setSelectedPageUrl] = useState<string>('')
  const [selectedTaskId, setSelectedTaskId] = useState<string>('all')
  const [selectedDevice, setSelectedDevice] = useState<DeviceType>('all')
  const [measuredDims, setMeasuredDims] = useState<{ width: number; height: number } | null>(null)
  const heatmapContainerRef = useRef<HTMLDivElement>(null)

  // Get unique page URLs that have screenshots (normalized to strip tracking params)
  const pageOptions = useMemo(() => {
    const seen = new Set<string>()
    for (const s of screenshots) {
      seen.add(normalizePageUrl(s.page_url))
    }
    return Array.from(seen).sort()
  }, [screenshots])

  // Auto-select first page if none selected
  const activePage = selectedPageUrl || pageOptions[0] || ''

  // Get the screenshot for the selected page (match by normalized URL)
  const activeScreenshot = useMemo(
    () => screenshots.find(s => normalizePageUrl(s.page_url) === activePage) ?? null,
    [screenshots, activePage]
  )

  // Detect which device types have click events (to conditionally show the device filter)
  const availableDeviceTypes = useMemo(() => {
    const types = new Set<DeviceType>()
    for (const e of events) {
      if ((e.event_type === 'click' || e.event_type === 'rage_click') && e.viewport_size?.width) {
        types.add(classifyDevice(e.viewport_size.width))
      }
    }
    return types
  }, [events])

  const showDeviceFilter = availableDeviceTypes.size >= 1

  // Shared filter: participant + task + device
  const applyFilters = useCallback((list: LiveWebsiteEvent[]) => {
    let filtered = list
    if (filteredParticipantIds) {
      filtered = filtered.filter(e => e.participant_id && filteredParticipantIds.has(e.participant_id))
    }
    if (selectedTaskId !== 'all') {
      filtered = filtered.filter(e => e.task_id === selectedTaskId)
    }
    if (selectedDevice !== 'all') {
      filtered = filtered.filter(e => {
        if (!e.viewport_size?.width) return true // include events without viewport data
        return classifyDevice(e.viewport_size.width) === selectedDevice
      })
    }
    return filtered
  }, [filteredParticipantIds, selectedTaskId, selectedDevice])

  // All click events (filtered by participant/task/device, not page — for the grid)
  const allClickEvents = useMemo(() => {
    const clicks = events.filter(e => e.event_type === 'click' || e.event_type === 'rage_click')
    return applyFilters(clicks)
  }, [events, applyFilters])

  // All events filtered by participant/task/device — for visitor counting
  const filteredAllEvents = useMemo(
    () => applyFilters(events),
    [events, applyFilters]
  )

  // Pre-compute normalized click positions per page URL for thumbnail heatmap dots
  const clicksByPage = useMemo(() => {
    const map = new Map<string, Array<{ normalizedX: number; normalizedY: number }>>()
    // Build a lookup: normalized page URL → screenshot dimensions.
    // Modal pages use clientY (viewport-relative), so use viewport_height.
    // Base pages use pageY (document-relative), so use page_height.
    const screenshotDims = new Map<string, { w: number; h: number }>()
    for (const ss of screenshots) {
      const url = normalizePageUrl(ss.page_url)
      if (!screenshotDims.has(url)) {
        const isModal = url.endsWith('#modal')
        screenshotDims.set(url, {
          w: ss.viewport_width || 1920,
          h: isModal
            ? (ss.viewport_height || 1080)
            : (ss.page_height || ss.viewport_height || 1080),
        })
      }
    }

    for (const e of allClickEvents) {
      if (!e.coordinates) continue
      const url = normalizePageUrl(e.page_url || '')
      const dims = screenshotDims.get(url)
      if (!dims) continue
      // For modal pages, skip non-modal clicks; for base pages, skip modal clicks
      const isModal = url.endsWith('#modal')
      if (isModal && !e.metadata?.isModal) continue
      if (!isModal && e.metadata?.isModal) continue
      // Skip backdrop clicks (dimmed overlay area outside the dialog).
      // For older data without isBackdropClick, fall back to wasInteractive.
      if (isModal) {
        if (e.metadata?.isBackdropClick) continue
        if (!('isBackdropClick' in (e.metadata || {})) && !e.metadata?.wasInteractive) continue
      }

      const nx = (e.coordinates.x / dims.w) * 100
      const ny = (e.coordinates.y / dims.h) * 100
      if (nx < 0 || nx > 100 || ny < 0 || ny > 100) continue

      let arr = map.get(url)
      if (!arr) { arr = []; map.set(url, arr) }
      arr.push({ normalizedX: nx, normalizedY: ny })
    }
    return map
  }, [allClickEvents, screenshots])

  // Click events for the selected page (normalize URLs by stripping hash for matching)
  const pageClickEvents = useMemo(() => {
    if (!activePage) return []
    const normalizedActive = normalizePageUrl(activePage)
    return allClickEvents.filter(e => normalizePageUrl(e.page_url || '') === normalizedActive)
  }, [allClickEvents, activePage])

  // Determine the dominant viewport width from click events for the active page.
  const clickViewport = useMemo(() => {
    const widthCounts = new Map<number, { count: number; height: number }>()
    for (const e of pageClickEvents) {
      const w = e.viewport_size?.width
      const h = e.viewport_size?.height
      if (!w || !h) continue
      const existing = widthCounts.get(w)
      if (existing) existing.count++
      else widthCounts.set(w, { count: 1, height: h })
    }

    let dominant: { width: number; height: number } | null = null
    let maxCount = 0
    for (const [w, data] of widthCounts) {
      if (data.count > maxCount) {
        maxCount = data.count
        dominant = { width: w, height: data.height }
      }
    }
    return dominant
  }, [pageClickEvents])

  // Compute stats for the selected page
  const pageStats = useMemo(() => computeClickStats(pageClickEvents), [pageClickEvents])

  // Count modal clicks excluded from heatmap (only relevant on non-modal pages)
  const modalClickCount = useMemo(
    () => activePage.endsWith('#modal') ? 0 : pageClickEvents.filter(e => e.metadata?.isModal).length,
    [pageClickEvents, activePage]
  )

  // Build a map of the earliest event timestamp per session (across all pages).
  // This approximates the task/session start time and is used as a fallback
  // reference point for computing response time on older events that lack
  // explicit timeSinceTaskStartMs metadata.
  const sessionStartTimes = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of events) {
      // When filtered to a specific task, only consider events from that task
      if (selectedTaskId !== 'all' && e.task_id !== selectedTaskId) continue
      const ts = new Date(e.timestamp).getTime()
      if (isNaN(ts)) continue
      const existing = map.get(e.session_id)
      if (existing === undefined || ts < existing) {
        map.set(e.session_id, ts)
      }
    }
    return map
  }, [events, selectedTaskId])

  // Convert events to HeatmapRenderer click format
  const heatmapClicks = useMemo(() => {
    if (!activeScreenshot) return []

    // Use the snapshot's actual rendered dimensions for normalization.
    // pageX/pageY are absolute positions — the snapshot renders the same DOM
    // at the same viewport width, so absolute positions map directly.
    // Using per-event scrollHeight would cause progressive Y-offset because
    // scrollHeight varies between sessions (e.g., 4647 vs 4699 vs 4722).
    const snapshotWidth = measuredDims?.width || activeScreenshot.viewport_width || 1920
    const snapshotHeight = measuredDims?.height || activeScreenshot.page_height || activeScreenshot.viewport_height || 1080

    // Only include clicks whose viewport category matches the snapshot viewport.
    // A mobile click at x=187 (50% of 375px) would map to 9.7% of a 1920px
    // desktop snapshot — completely wrong. Y is also wrong due to CSS reflow.
    const snapshotDeviceType = clickViewport ? classifyDevice(clickViewport.width) : null

    // If viewing a modal page (URL ends with #modal), show modal clicks.
    // Otherwise filter them out since their coords don't map to the base snapshot.
    const isModalPage = activePage.endsWith('#modal')

    return pageClickEvents
      .filter(e => e.coordinates)
      .filter(e => {
        // On base pages, skip modal clicks (wrong coordinates for the snapshot).
        if (!isModalPage && e.metadata?.isModal) return false
        // On modal pages, only show clicks that were actually modal interactions.
        // Exclude non-modal clicks that may have been recorded with the #modal URL.
        if (isModalPage && !e.metadata?.isModal) return false
        // Skip backdrop clicks (dimmed overlay outside the dialog content).
        // For older data without isBackdropClick, fall back to wasInteractive.
        if (isModalPage) {
          if (e.metadata?.isBackdropClick) return false
          if (!('isBackdropClick' in (e.metadata || {})) && !e.metadata?.wasInteractive) return false
        }
        // When there's no viewport info, include the click (best effort)
        if (!snapshotDeviceType || !e.viewport_size?.width) return true
        // Only map clicks from the same device category as the snapshot
        return classifyDevice(e.viewport_size.width) === snapshotDeviceType
      })
      .map(e => {
        const normalizedX = (e.coordinates!.x / snapshotWidth) * 100
        const normalizedY = (e.coordinates!.y / snapshotHeight) * 100

        // Skip clicks that fall outside the snapshot bounds (e.g., page was
        // taller at click time due to dynamic content)
        if (normalizedX > 100 || normalizedY > 100 || normalizedX < 0 || normalizedY < 0) {
          return null
        }

        // Determine hit/miss status
        const wasInteractive = e.metadata?.wasInteractive
        let wasHotspot: boolean | undefined
        if (wasInteractive === true) wasHotspot = true
        else if (wasInteractive === false) wasHotspot = false

        // Response time: prefer explicit metadata, fall back to timestamp delta
        const timeSinceFrameLoadMs = resolveResponseTime(e, sessionStartTimes)

        return {
          id: e.id,
          normalizedX,
          normalizedY,
          wasHotspot,
          timeSinceFrameLoadMs,
        }
      })
      .filter((c): c is NonNullable<typeof c> => c !== null)
  }, [pageClickEvents, activeScreenshot, measuredDims, sessionStartTimes, clickViewport, activePage])

  // Match a page URL to a variant name by checking which variant's base URL matches
  const matchVariant = useCallback((pageUrl: string): string | undefined => {
    if (!variants || variants.length === 0) return undefined
    for (const v of variants) {
      try {
        const variantOrigin = new URL(v.url).origin
        if (pageUrl.startsWith(variantOrigin)) return v.name
      } catch {
        // Invalid variant URL — skip
      }
    }
    return undefined
  }, [variants])

  // Compute pages with stats for sidebar
  const pagesWithStats: PageWithStats[] = useMemo(() => {
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
          variantName: matchVariant(ss.page_url),
        })
      }
    }

    // Aggregate clicks per page
    for (const event of allClickEvents) {
      const url = normalizePageUrl(event.page_url || '')
      const page = pageMap.get(url)
      if (!page) continue
      page.totalClicks++
    }

    // Count unique visitors from ALL events (page_view, scroll, click, etc.)
    const visitorsByPage = new Map<string, Set<string>>()
    for (const event of filteredAllEvents) {
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
      if (page) page.uniqueVisitors = visitors.size
    }

    // Only show pages that have at least one click — pages with 0 clicks aren't useful in click maps
    return Array.from(pageMap.values()).filter(page => page.totalClicks > 0)
  }, [screenshots, allClickEvents, filteredAllEvents, matchVariant])

  const handleDownloadPNG = useCallback(async () => {
    if (!heatmapContainerRef.current) return
    try {
      const pagePath = truncateUrl(activePage, 30)
      const taskTitle = selectedTaskId !== 'all'
        ? tasks.find(t => t.id === selectedTaskId)?.title
        : undefined
      const filename = generateHeatmapFilename(pagePath, taskTitle)
      await exportElementToPNG(heatmapContainerRef.current, filename)
      toast.success('Click map downloaded')
    } catch {
      toast.error('Failed to download click map')
    }
  }, [activePage, selectedTaskId, tasks])

  // Empty state: tracking mode doesn't support click maps
  if (trackingMode === 'url_only') {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <h3 className="font-medium text-lg mb-2">Click Maps Unavailable</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Click map data requires Snippet or Proxy tracking mode. URL-only tracking does not capture click coordinates.
        </p>
      </div>
    )
  }

  // Empty state: no screenshots
  if (screenshots.length === 0) {
    const totalClicks = events.filter(e => e.event_type === 'click' || e.event_type === 'rage_click').length
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <h3 className="font-medium text-lg mb-2">No Page Screenshots Yet</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          {totalClicks > 0
            ? `${totalClicks} click${totalClicks !== 1 ? 's' : ''} recorded, but no page screenshots have been captured yet. Screenshots are captured automatically when new participants navigate your website. Run a new session to generate click map visuals.`
            : 'No page screenshots captured yet. Screenshots are captured automatically when participants navigate your website.'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2 min-w-0">
      {/* Top bar: heading + task filter */}
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold">Click Maps</h2>
        {tasks.length > 0 && (
          <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tasks</SelectItem>
              {tasks.map((task, index) => (
                <SelectItem key={task.id} value={task.id}>
                  {index + 1}. {task.title || `Task ${index + 1}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Main area: pages left, heatmap center, controls right */}
      <div className="flex flex-col lg:flex-row gap-4 items-start">
        {/* Left: Pages list */}
        <ClickMapsPagesList
          pages={pagesWithStats}
          activePage={activePage}
          onSelectPage={setSelectedPageUrl}
          clicksByPage={clicksByPage}
        />

        {/* Center: Heatmap — capped height with internal scroll so the outer page doesn't grow unbounded */}
        <div className="flex-1 min-w-0">
          <div ref={heatmapContainerRef} className="w-full overflow-auto max-h-[80vh] rounded-lg border">
            {activeScreenshot?.snapshot_path ? (
              <div className="relative">
                <SnapshotRenderer
                  snapshotUrl={activeScreenshot.snapshot_path}
                  viewportWidth={clickViewport?.width || activeScreenshot.viewport_width || 1920}
                  viewportHeight={clickViewport?.height || activeScreenshot.viewport_height}
                  clipToViewport={activePage.endsWith('#modal')}
                  onDimensionsMeasured={setMeasuredDims}
                />
                <div className="absolute inset-0 [&_.bg-stone-100]:bg-transparent [&_.bg-stone-100>div.flex]:hidden">
                  <HeatmapRenderer
                    clicks={heatmapClicks}
                    imageUrl={null}
                    imageWidth={measuredDims?.width || clickViewport?.width || activeScreenshot.viewport_width || 1920}
                    imageHeight={measuredDims?.height || clickViewport?.height || activeScreenshot.page_height || activeScreenshot.viewport_height || 1080}
                    displayMode={displayMode}
                    settings={heatmapSettings}
                    selectionSettings={selectionSettings}
                  />
                </div>
              </div>
            ) : (
              <HeatmapRenderer
                clicks={heatmapClicks}
                imageUrl={activeScreenshot?.screenshot_path || null}
                imageWidth={activeScreenshot?.viewport_width || 1920}
                imageHeight={activeScreenshot?.page_height || activeScreenshot?.viewport_height || 1080}
                displayMode={displayMode}
                settings={heatmapSettings}
                selectionSettings={selectionSettings}
              />
            )}
          </div>
        </div>

        {/* Right: Controls + download */}
        <ClickMapsSidebar
          displayMode={displayMode}
          onDisplayModeChange={onDisplayModeChange}
          selectedDevice={selectedDevice}
          onDeviceChange={setSelectedDevice}
          showDeviceFilter={showDeviceFilter}
          totalClicks={pageStats.totalClicks}
          uniqueParticipants={pageStats.uniqueParticipants}
          modalClicks={modalClickCount}
          onDownloadPNG={handleDownloadPNG}
          heatmapSettings={heatmapSettings}
          onHeatmapSettingsChange={onHeatmapSettingsChange}
          selectionSettings={selectionSettings}
          onSelectionSettingsChange={onSelectionSettingsChange}
        />
      </div>
    </div>
  )
}

function resolveResponseTime(
  e: LiveWebsiteEvent,
  sessionStartTimes: Map<string, number>
): number | undefined {
  const metaTime = e.metadata?.timeSinceTaskStartMs as number | undefined
  if (typeof metaTime === 'number' && metaTime >= 0) return metaTime

  const sessionStart = sessionStartTimes.get(e.session_id)
  if (sessionStart === undefined) return undefined

  const clickTs = new Date(e.timestamp).getTime()
  if (isNaN(clickTs)) return undefined

  const delta = clickTs - sessionStart
  return delta > 0 ? delta : undefined
}

/** Strip hash fragments AND tracking query params (__sess, __variant, __api, __veritio_*)
 *  so that URLs from different participants consolidate to the same page.
 *  Preserves #modal suffix (used for modal/dialog snapshots). */
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

export const ClickMapsTab = memo(ClickMapsTabBase)
