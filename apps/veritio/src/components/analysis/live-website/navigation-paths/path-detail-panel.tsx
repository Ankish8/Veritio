'use client'

import { useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, X, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { LiveWebsitePageScreenshot } from '@/app/(dashboard)/projects/[projectId]/studies/[studyId]/results/types'
import { SnapshotRenderer } from '../click-maps/snapshot-renderer'
import {
  type AggregatedPathData,
  type IndividualPathData,
  RESULT_TYPE_CONFIG,
  shortenUrl,
  normalizeUrlForComparison,
  formatTime,
  formatTimeDelta,
} from './paths-utils'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PathDetailPanelProps {
  mode: 'aggregated' | 'individual'
  aggregatedPath?: AggregatedPathData
  individualPath?: IndividualPathData
  targetUrl?: string | null
  screenshotMap: Map<string, LiveWebsitePageScreenshot>
  currentIndex: number
  totalCount: number
  onNavigate: (direction: 'prev' | 'next') => void
  onClose: () => void
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function ResultBadge({ resultType }: { resultType: string }) {
  const config = RESULT_TYPE_CONFIG[resultType as keyof typeof RESULT_TYPE_CONFIG]
  if (!config) return null

  return (
    <div className="flex items-center gap-1.5">
      <div
        className="w-2.5 h-2.5 rounded-full shrink-0"
        style={{ backgroundColor: config.dotColor }}
      />
      <span className="text-sm font-medium">{config.label}</span>
    </div>
  )
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-sm font-semibold tabular-nums">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}

function CollapsibleThumbnail({
  isGoal,
  children,
}: {
  isGoal: boolean
  children: React.ReactNode
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="ml-7">
      <div
        className={cn(
          'rounded-md overflow-hidden border bg-muted relative',
          isGoal && 'ring-1 ring-border ring-offset-1',
          !expanded && 'max-h-[200px]'
        )}
      >
        {children}
        {!expanded && (
          <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-background to-transparent flex items-end justify-center pb-2">
            <Button
              variant="secondary"
              size="sm"
              className="h-6 text-xs gap-1 shadow-sm"
              onClick={() => setExpanded(true)}
            >
              <ChevronDown className="h-3 w-3" />
              Show full page
            </Button>
          </div>
        )}
      </div>
      {expanded && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs gap-1 mt-1 w-full"
          onClick={() => setExpanded(false)}
        >
          <ChevronUp className="h-3 w-3" />
          Collapse
        </Button>
      )}
    </div>
  )
}

function TimeDeltaIndicator({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 py-1.5 pl-8">
      <div className="w-px h-4 bg-border" />
      <span className="text-xs text-muted-foreground tabular-nums">{text}</span>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function PathDetailPanel({
  mode,
  aggregatedPath,
  individualPath,
  targetUrl,
  screenshotMap,
  currentIndex,
  totalCount,
  onNavigate,
  onClose,
}: PathDetailPanelProps) {
  const isAggregated = mode === 'aggregated'
  const path = isAggregated ? aggregatedPath : individualPath
  if (!path) return null

  const urls = isAggregated ? (aggregatedPath?.urlSequence ?? []) : (individualPath?.urls ?? [])
  const timestamps = isAggregated ? [] : (individualPath?.timestamps ?? [])
  const durationMs = isAggregated ? (aggregatedPath?.avgDurationMs ?? 0) : (individualPath?.durationMs ?? 0)
  const normalizedTarget = targetUrl ? normalizeUrlForComparison(targetUrl) : null
  const canPrev = currentIndex > 0
  const canNext = currentIndex < totalCount - 1

  // Compute time on first/last page for individual paths
  let timeOnFirstPage = ''
  let timeOnLastPage = ''
  const startedAt = individualPath?.startedAt
  if (!isAggregated && startedAt && timestamps.length > 0 && durationMs > 0) {
    const taskStartMs = new Date(startedAt).getTime()
    const firstPageMs = new Date(timestamps[0]).getTime() - taskStartMs
    const lastPageMs = taskStartMs + durationMs - new Date(timestamps[timestamps.length - 1]).getTime()
    if (firstPageMs > 500) timeOnFirstPage = formatTime(firstPageMs)
    if (lastPageMs > 500) timeOnLastPage = formatTime(lastPageMs)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2.5 border-b shrink-0 space-y-1.5">
        {/* Row 1: Nav arrows + close */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              disabled={!canPrev}
              onClick={() => onNavigate('prev')}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs text-muted-foreground tabular-nums min-w-[3ch] text-center">
              {currentIndex + 1}/{totalCount}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              disabled={!canNext}
              onClick={() => onNavigate('next')}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={onClose}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Row 2: Result badge + context info */}
        <div className="flex items-center gap-2">
          <ResultBadge resultType={path.resultType} />
          {isAggregated && aggregatedPath && (
            <span className="text-xs text-muted-foreground">
              {aggregatedPath.participantCount} participant{aggregatedPath.participantCount !== 1 ? 's' : ''} ({aggregatedPath.percentage}%)
            </span>
          )}
          {!isAggregated && individualPath && (
            <span className="text-xs text-muted-foreground truncate">
              {individualPath.displayLabel}
              {individualPath.displaySecondary && (
                <span className="ml-1 opacity-75">{individualPath.displaySecondary}</span>
              )}
            </span>
          )}
        </div>
      </div>

      {/* Metrics strip */}
      <div className="flex items-center gap-4 px-3 py-2 border-b shrink-0">
        <MetricPill
          label={isAggregated ? 'avg time' : 'time'}
          value={formatTime(durationMs)}
        />
        <div className="w-px h-3 bg-border" />
        <MetricPill label="pages" value={String(urls.length)} />
        {mode === 'aggregated' && aggregatedPath && (
          <>
            <div className="w-px h-3 bg-border" />
            <MetricPill label="participants" value={String(aggregatedPath.participantCount)} />
          </>
        )}
      </div>

      {/* Target URL indicator */}
      {targetUrl && (
        <div className="px-3 py-2 border-b shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Target:</span>
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-muted text-green-700 dark:text-green-400 truncate">
              {shortenUrl(targetUrl)}
            </span>
          </div>
        </div>
      )}

      {/* Step-by-step URL list */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-1">
          {urls.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No navigation recorded for this path.
            </div>
          ) : (
            urls.map((url, index) => {
              const isGoal = normalizedTarget
                ? normalizeUrlForComparison(url) === normalizedTarget
                : false
              const screenshot = screenshotMap.get(normalizeUrlForComparison(url))

              // Time delta from previous step
              let timeDelta = ''
              if (!isAggregated && timestamps.length > index && index > 0) {
                const prevMs = new Date(timestamps[index - 1]).getTime()
                const currMs = new Date(timestamps[index]).getTime()
                timeDelta = formatTimeDelta(prevMs, currMs)
              }

              const isFirst = index === 0
              const isLast = index === urls.length - 1

              return (
                <div key={index}>
                  {/* Time on first page (from task start to first navigation) */}
                  {isFirst && timeOnFirstPage && (
                    <TimeDeltaIndicator text={`${timeOnFirstPage} before first nav`} />
                  )}

                  {/* Time delta between steps */}
                  {timeDelta && <TimeDeltaIndicator text={timeDelta} />}

                  <div
                    className={cn(
                      'rounded-lg p-3 space-y-2',
                      isGoal ? 'bg-muted/50' : 'bg-muted/30'
                    )}
                  >
                    {/* Step header */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground tabular-nums w-5 text-right shrink-0">
                        {index + 1}.
                      </span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            className={cn(
                              'font-mono text-sm truncate',
                              isGoal && 'text-green-700 dark:text-green-400 font-medium'
                            )}
                          >
                            {shortenUrl(url)}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-md break-all">
                          <p className="text-xs font-mono">{url}</p>
                        </TooltipContent>
                      </Tooltip>
                      {isGoal && (
                        <span className="text-[12px] font-medium text-green-600 dark:text-green-400 shrink-0 uppercase">
                          Target
                        </span>
                      )}
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-auto shrink-0 text-muted-foreground hover:text-foreground"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>

                    {/* Screenshot / snapshot thumbnail */}
                    {screenshot && (screenshot.screenshot_path || screenshot.snapshot_path) && (
                      <CollapsibleThumbnail isGoal={isGoal}>
                        {screenshot.screenshot_path ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={screenshot.screenshot_path}
                            alt={shortenUrl(url)}
                            className="w-full h-auto block"
                            loading="lazy"
                          />
                        ) : (
                          <SnapshotRenderer
                            snapshotUrl={screenshot.snapshot_path!}
                            viewportWidth={screenshot.viewport_width}
                            viewportHeight={screenshot.viewport_height}
                          />
                        )}
                      </CollapsibleThumbnail>
                    )}
                  </div>

                  {/* Time on last page (from last navigation to task end) */}
                  {isLast && timeOnLastPage && (
                    <div className="mt-1">
                      <TimeDeltaIndicator text={`${timeOnLastPage} on this page`} />
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
