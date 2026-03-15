'use client'

import { useMemo } from 'react'
import { ChevronLeft, ChevronRight, X, ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { CompositeThumbnail } from '@veritio/prototype-test/builder'
import type { OverlayData } from '@veritio/prototype-test/builder'
import type { PrototypeTestFrame } from '@veritio/study-types'
import type { AggregatedPathData, IndividualPathData, RichPathStep } from './paths-utils'
import { RESULT_TYPE_CONFIG } from './paths-utils'
import type { ComponentInstanceRow, ComponentVariantRow } from '@/hooks/use-prototype-test-attempt-events'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PathDetailPanelProps {
  mode: 'aggregated' | 'individual'
  /** Aggregated path data (when mode='aggregated') */
  aggregatedPath?: AggregatedPathData
  /** Individual path data (when mode='individual') */
  individualPath?: IndividualPathData
  /** Individual attempt metrics */
  attemptMetrics?: {
    totalTimeMs: number | null
    clickCount: number | null
    misclickCount: number | null
    backtrackCount: number | null
  }
  /** Participant display name (individual mode) */
  participantLabel?: string
  /** Frame lookup map */
  frameMap: Map<string, PrototypeTestFrame>
  /** Goal frame IDs for green ring */
  goalFrameIds: Set<string>
  /** Component instances for overlay computation */
  componentInstances: ComponentInstanceRow[]
  /** Component variants for overlay computation */
  componentVariants: ComponentVariantRow[]
  /** Current index in the sorted list */
  currentIndex: number
  /** Total number of items */
  totalCount: number
  /** Navigate to prev/next path */
  onNavigate: (direction: 'prev' | 'next') => void
  /** Close the panel */
  onClose: () => void
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

// TODO: This is intentionally different from ../task-results/format-time.ts:
// - formatDuration: accepts null, returns '-' for null/zero, uses Math.floor (whole seconds)
// - formatTime: non-null input, returns '0s' for zero, shows ms for <1s, uses toFixed(1)
function formatDuration(ms: number | null): string {
  if (ms == null || ms <= 0) return '-'
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}m ${remainingSeconds}s`
}

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

// ─── Overlay computation from rich steps ─────────────────────────────────────

/**
 * Compute overlays for a single state step in the rich path.
 * Returns OverlayData[] for that step's frame, or empty array if no match.
 */
function computeOverlayForStateStep(
  step: RichPathStep,
  frameMap: Map<string, PrototypeTestFrame>,
  componentInstances: ComponentInstanceRow[],
  componentVariants: ComponentVariantRow[],
): OverlayData[] {
  if (step.type !== 'state' || !step.frameId || !step.variantId) return []

  const frame = frameMap.get(step.frameId)
  if (!frame) return []

  const variant = componentVariants.find(v => v.variant_id === step.variantId)
  const instance = componentInstances.find(i =>
    i.frame_node_id === frame.figma_node_id && (
      i.instance_id === step.componentNodeId ||
      i.component_id === step.variantId ||
      (variant && i.component_set_id === variant.component_set_id)
    )
  ) || (step.componentNodeId
    ? componentInstances.find(i => i.instance_id === step.componentNodeId)
    : undefined
  )

  if (!instance) return []

  return [{
    variantImageUrl: variant?.image_url,
    variantLabel: step.label,
    relativeX: instance.relative_x,
    relativeY: instance.relative_y,
    componentWidth: variant?.image_width || instance.width,
    componentHeight: variant?.image_height || instance.height,
  }]
}

// ─── Step Thumbnail ──────────────────────────────────────────────────────────

function StepThumbnailImage({
  frame,
  step,
  isStateStep,
  isGoal,
  overlays,
  frameW,
  frameH,
  aspectPadding,
}: {
  frame: PrototypeTestFrame | null
  step: RichPathStep
  isStateStep: boolean
  isGoal: boolean
  overlays: OverlayData[]
  frameW: number
  frameH: number
  aspectPadding: string
}) {
  if (isStateStep && frame?.thumbnail_url && overlays.length > 0) {
    return (
      <div className="rounded-lg overflow-hidden border bg-muted ring-2 ring-blue-400 ring-offset-1">
        <div className="relative w-full" style={{ paddingBottom: aspectPadding }}>
          <div className="absolute inset-0">
            <CompositeThumbnail
              baseImageUrl={frame.thumbnail_url}
              overlays={overlays}
              frameWidth={frameW}
              frameHeight={frameH}
              showOverlayLabel={false}
              className="w-full h-full"
            />
          </div>
        </div>
      </div>
    )
  }

  if (frame?.thumbnail_url) {
    return (
      <div className={cn(
        'rounded-lg overflow-hidden border bg-muted',
        isGoal && 'ring-2 ring-green-500 ring-offset-1'
      )}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={frame.thumbnail_url}
          alt={step.label}
          className="w-full h-auto block"
          loading="lazy"
        />
      </div>
    )
  }

  return (
    <div className={cn(
      'w-full rounded-lg border bg-muted relative',
      isGoal && 'ring-2 ring-green-500 ring-offset-1',
      isStateStep && 'ring-2 ring-blue-400 ring-offset-1',
    )} style={{ paddingBottom: '60%' }}>
      <div className="absolute inset-0 flex items-center justify-center">
        <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
      </div>
    </div>
  )
}

interface StepThumbnailProps {
  step: RichPathStep
  stepIndex: number
  frameMap: Map<string, PrototypeTestFrame>
  goalFrameIds: Set<string>
  /** Accumulated overlays for state steps */
  overlays: OverlayData[]
}

function StepThumbnail({ step, stepIndex, frameMap, goalFrameIds, overlays }: StepThumbnailProps) {
  const frame = step.frameId ? frameMap.get(step.frameId) : null
  const isGoal = step.frameId ? goalFrameIds.has(step.frameId) : false
  const isStateStep = step.type === 'state'

  // Use the frame's actual aspect ratio for correct rendering
  const frameW = frame?.width || 375
  const frameH = frame?.height || 812
  const aspectPadding = `${(frameH / frameW) * 100}%`

  return (
    <div className="space-y-1.5">
      {/* Step label */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground tabular-nums w-5 text-right shrink-0">
          {stepIndex + 1}.
        </span>
        <span className={cn(
          'text-sm font-medium truncate',
          isGoal && 'text-green-600',
          isStateStep && 'text-indigo-600 italic',
        )}>
          {step.label}
        </span>
      </div>

      {/* Thumbnail */}
      <div className="ml-7">
        <StepThumbnailImage
          frame={frame ?? null}
          step={step}
          isStateStep={isStateStep}
          isGoal={isGoal}
          overlays={overlays}
          frameW={frameW}
          frameH={frameH}
          aspectPadding={aspectPadding}
        />
      </div>
    </div>
  )
}

// ─── Metric Pill ─────────────────────────────────────────────────────────────

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-sm font-semibold tabular-nums">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function PathDetailPanel({
  mode,
  aggregatedPath,
  individualPath,
  attemptMetrics,
  participantLabel,
  frameMap,
  goalFrameIds,
  componentInstances,
  componentVariants,
  currentIndex,
  totalCount,
  onNavigate,
  onClose,
}: PathDetailPanelProps) {
  const path = mode === 'aggregated' ? aggregatedPath : individualPath

  const richSteps = path?.richSteps
  const pathFrameIds = path?.pathTaken

  // Build display steps — either rich steps or frame-only fallback
  const displaySteps: RichPathStep[] = useMemo(() => {
    if (!pathFrameIds) return []
    if (richSteps && richSteps.length > 0) return richSteps

    // Fallback: build frame-only steps
    return pathFrameIds.map(frameId => ({
      type: 'frame' as const,
      label: frameMap.get(frameId)?.name || 'Unknown',
      frameId,
      isGoal: goalFrameIds.has(frameId),
    }))
  }, [richSteps, pathFrameIds, frameMap, goalFrameIds])

  // Compute cumulative overlays for state steps
  const stepOverlaysMap = useMemo(() => {
    const map = new Map<number, OverlayData[]>()
    let cumulativeOverlays: OverlayData[] = []
    let lastFrameId: string | null = null

    displaySteps.forEach((step, index) => {
      if (step.type === 'frame') {
        // Frame change resets accumulated overlays
        if (step.frameId !== lastFrameId) {
          cumulativeOverlays = []
          lastFrameId = step.frameId
        }
      } else if (step.type === 'state') {
        const overlays = computeOverlayForStateStep(step, frameMap, componentInstances, componentVariants)
        cumulativeOverlays = [...cumulativeOverlays, ...overlays]
        map.set(index, [...cumulativeOverlays])
      }
    })

    return map
  }, [displaySteps, frameMap, componentInstances, componentVariants])

  if (!path) return null

  const resultType = path.resultType

  const canPrev = currentIndex > 0
  const canNext = currentIndex < totalCount - 1

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
          <ResultBadge resultType={resultType} />
          {mode === 'aggregated' && aggregatedPath && (
            <span className="text-xs text-muted-foreground">
              {aggregatedPath.participantCount} participant{aggregatedPath.participantCount !== 1 ? 's' : ''} ({aggregatedPath.percentage}%)
            </span>
          )}
          {mode === 'individual' && participantLabel && (
            <span className="text-xs text-muted-foreground">
              {participantLabel}
            </span>
          )}
        </div>
      </div>

      {/* Metrics strip (individual mode only) */}
      {mode === 'individual' && attemptMetrics && (
        <div className="flex items-center justify-between px-3 py-2 border-b shrink-0">
          <MetricPill label="time" value={formatDuration(attemptMetrics.totalTimeMs)} />
          <div className="w-px h-3 bg-border" />
          <MetricPill label="clicks" value={String(attemptMetrics.clickCount ?? 0)} />
          <div className="w-px h-3 bg-border" />
          <MetricPill label="misclicks" value={String(attemptMetrics.misclickCount ?? 0)} />
          <div className="w-px h-3 bg-border" />
          <MetricPill label="backtracks" value={String(attemptMetrics.backtrackCount ?? 0)} />
        </div>
      )}

      {/* Path thumbnail trail */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {displaySteps.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No navigation recorded for this path.
            </div>
          ) : (
            displaySteps.map((step, index) => (
              <StepThumbnail
                key={`${step.type}-${index}-${step.frameId || step.variantId}`}
                step={step}
                stepIndex={index}
                frameMap={frameMap}
                goalFrameIds={goalFrameIds}
                overlays={stepOverlaysMap.get(index) || []}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
