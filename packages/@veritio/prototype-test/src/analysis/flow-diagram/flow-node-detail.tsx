'use client'

import { memo, useMemo } from 'react'
import { X, ArrowRight, ArrowLeft, AlertTriangle } from 'lucide-react'
import { cn } from '@veritio/ui'
import { Button } from '@veritio/ui/components/button'
import { Badge } from '@veritio/ui/components/badge'
import { ScrollArea } from '@veritio/ui/components/scroll-area'
import {
  Sheet,
  SheetContent,
} from '@veritio/ui/components/sheet'
import type { FlowNode, FlowDiagramData } from './types'
import { CompositeThumbnail } from '../../builder/composite-thumbnail'
import type { OverlayData } from '../../builder/composite-thumbnail'

interface FlowNodeDetailProps {
  node: FlowNode | null
  open: boolean
  onOpenChange: (open: boolean) => void
  data: FlowDiagramData
  onNodeSelect?: (node: FlowNode) => void
}

export interface FlowNodeDetailContentProps {
  node: FlowNode
  data: FlowDiagramData
  onNodeSelect?: (node: FlowNode) => void
  onClose?: () => void
}
export const FlowNodeDetailContent = memo(function FlowNodeDetailContent({
  node,
  data,
  onNodeSelect,
  onClose,
}: FlowNodeDetailContentProps) {
  // Get incoming and outgoing links for this node
  const { incomingLinks, outgoingLinks } = useMemo(() => {
    const incoming = data.links.filter((l) => l.target === node.id)
    const outgoing = data.links.filter((l) => l.source === node.id)

    return {
      incomingLinks: incoming.sort((a, b) => b.value - a.value),
      outgoingLinks: outgoing.sort((a, b) => b.value - a.value),
    }
  }, [node, data.links])

  // Get node objects for links
  const nodeMap = useMemo(
    () => new Map(data.nodes.map((n) => [n.id, n])),
    [data.nodes]
  )

  const isState = node.type === 'state'
  const isDeadEnd = data.deadEndNodeIds.has(node.id)
  const totalOutcomes =
    node.outcomeBreakdown.success +
    node.outcomeBreakdown.failure +
    node.outcomeBreakdown.abandoned +
    node.outcomeBreakdown.skipped

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold truncate leading-tight">{node.name}</h3>
            <div className="flex items-center gap-1.5 mt-1.5">
              <Badge
                variant="outline"
                className={cn(
                  'text-xs font-normal px-1.5 py-0',
                  isState ? 'border-violet-300 text-violet-500' : 'text-muted-foreground'
                )}
              >
                {isState ? 'Component State' : 'Frame'}
              </Badge>
              {node.role === 'start' && (
                <Badge variant="outline" className="text-[12px] font-normal px-1.5 py-0 text-muted-foreground">
                  Start
                </Badge>
              )}
              {node.role === 'success' && (
                <Badge variant="outline" className="text-[12px] font-normal px-1.5 py-0 border-emerald-300 text-emerald-600">
                  Success
                </Badge>
              )}
              {(node.role === 'dead_end' || (isDeadEnd && node.role !== 'success')) && (
                <Badge variant="outline" className="text-[12px] font-normal px-1.5 py-0 border-amber-300 text-amber-500">
                  Dead-end
                </Badge>
              )}
            </div>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={onClose}>
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-5 py-4 space-y-5">
          {/* Thumbnail Preview */}
          {!isState && node.thumbnailUrl && (
            <div className="rounded-md border overflow-hidden bg-muted/20">
              <img
                src={node.thumbnailUrl}
                alt={node.name}
                className="w-full h-auto object-contain max-h-[180px]"
              />
            </div>
          )}
          {isState && data.supplementary && (() => {
            const { frames, componentInstancePositions, componentVariants } = data.supplementary!
            const parentFrame = frames.find(f => f.id === node.parentFrameId)
            if (!parentFrame?.thumbnail_url) return null
            const instance = componentInstancePositions.find(i => i.instance_id === node.sourceId)
            if (!instance) return null
            const variant = node.variantId
              ? componentVariants.find(v => v.variant_id === node.variantId)
              : instance.component_set_id
                ? componentVariants.find(v => v.component_set_id === instance.component_set_id)
                : undefined
            const frameW = instance.frame_width ?? parentFrame.width ?? 0
            const frameH = instance.frame_height ?? parentFrame.height ?? 0
            if (!frameW || !frameH) return null
            const overlay: OverlayData = {
              variantImageUrl: variant?.image_url,
              variantLabel: variant?.variant_name || instance.instance_name || node.name,
              relativeX: instance.relative_x,
              relativeY: instance.relative_y,
              componentWidth: variant?.image_width || instance.width,
              componentHeight: variant?.image_height || instance.height,
            }
            return (
              <div className="rounded-md border overflow-hidden bg-muted/20">
                <CompositeThumbnail
                  baseImageUrl={parentFrame.thumbnail_url}
                  overlays={[overlay]}
                  frameWidth={frameW}
                  frameHeight={frameH}
                  showOverlayLabel
                  className="w-full h-[180px]"
                />
              </div>
            )
          })()}

          {/* Inline Stats */}
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>
              <span className="font-medium text-foreground">{node.visitCount}</span> visit{node.visitCount !== 1 ? 's' : ''}
            </span>
            <span className="text-border">|</span>
            <span>
              <span className="font-medium text-foreground">{node.uniqueVisitors}</span> unique
            </span>
            {node.avgTimeMs > 0 && (
              <>
                <span className="text-border">|</span>
                <span>
                  <span className="font-medium text-foreground">{formatDuration(node.avgTimeMs)}</span> avg
                </span>
              </>
            )}
            {node.abandonedCount > 0 && (
              <>
                <span className="text-border">|</span>
                <span className="text-amber-500">
                  <span className="font-medium">{node.abandonedCount}</span> abandoned
                </span>
              </>
            )}
          </div>

          {/* --- divider --- */}
          <div className="border-t" />

          {/* Outcome Breakdown */}
          {totalOutcomes > 0 && (
            <div className="space-y-2.5">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Outcomes
              </h4>
              <div className="space-y-2">
                {node.outcomeBreakdown.success > 0 && (
                  <OutcomeRow
                    label="Success"
                    count={node.outcomeBreakdown.success}
                    total={totalOutcomes}
                    color="bg-emerald-500"
                  />
                )}
                {node.outcomeBreakdown.failure > 0 && (
                  <OutcomeRow
                    label="Failure"
                    count={node.outcomeBreakdown.failure}
                    total={totalOutcomes}
                    color="bg-neutral-400"
                  />
                )}
                {node.outcomeBreakdown.abandoned > 0 && (
                  <OutcomeRow
                    label="Abandoned"
                    count={node.outcomeBreakdown.abandoned}
                    total={totalOutcomes}
                    color="bg-amber-400"
                  />
                )}
                {node.outcomeBreakdown.skipped > 0 && (
                  <OutcomeRow
                    label="Skipped"
                    count={node.outcomeBreakdown.skipped}
                    total={totalOutcomes}
                    color="bg-neutral-300"
                  />
                )}
              </div>
            </div>
          )}

          {/* --- divider before transitions --- */}
          {(incomingLinks.length > 0 || outgoingLinks.length > 0) && (
            <div className="border-t" />
          )}

          {/* Incoming Transitions */}
          {incomingLinks.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <ArrowRight className="w-3.5 h-3.5" />
                Incoming ({incomingLinks.length})
              </h4>
              <div className="space-y-0.5">
                {incomingLinks.map((link) => {
                  const sourceNode = nodeMap.get(link.source)
                  if (!sourceNode) return null
                  return (
                    <TransitionRow
                      key={`${link.source}-${link.target}`}
                      node={sourceNode}
                      count={link.value}
                      percentage={link.percentage}
                      isBacktrack={link.isBacktrack}
                      onClick={() => onNodeSelect?.(sourceNode)}
                    />
                  )
                })}
              </div>
            </div>
          )}

          {/* --- divider between incoming/outgoing --- */}
          {incomingLinks.length > 0 && outgoingLinks.length > 0 && (
            <div className="border-t" />
          )}

          {/* Outgoing Transitions */}
          {outgoingLinks.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <ArrowLeft className="w-3.5 h-3.5" />
                Outgoing ({outgoingLinks.length})
              </h4>
              <div className="space-y-0.5">
                {outgoingLinks.map((link) => {
                  const targetNode = nodeMap.get(link.target)
                  if (!targetNode) return null
                  return (
                    <TransitionRow
                      key={`${link.source}-${link.target}`}
                      node={targetNode}
                      count={link.value}
                      percentage={link.percentage}
                      isBacktrack={link.isBacktrack}
                      onClick={() => onNodeSelect?.(targetNode)}
                    />
                  )
                })}
              </div>
            </div>
          )}

          {/* No outgoing transitions — subtle notice */}
          {outgoingLinks.length === 0 && node.role !== 'success' && (
            <div className="flex items-start gap-2.5 py-3 px-3 rounded-md bg-muted/40">
              <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground/70">
                  No outgoing transitions
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Participants who visited this frame either abandoned the task or the test here.
                </p>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
})
export const FlowNodeDetail = memo(function FlowNodeDetail({
  node,
  open,
  onOpenChange,
  data,
  onNodeSelect,
}: FlowNodeDetailProps) {
  if (!node) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[480px] p-0">
        <FlowNodeDetailContent
          node={node}
          data={data}
          onNodeSelect={onNodeSelect}
          onClose={() => onOpenChange(false)}
        />
      </SheetContent>
    </Sheet>
  )
})
// Helper Components

interface OutcomeRowProps {
  label: string
  count: number
  total: number
  color: string
}

function OutcomeRow({ label, count, total, color }: OutcomeRowProps) {
  const percentage = total > 0 ? (count / total) * 100 : 0

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground w-20 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', color)}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-sm tabular-nums text-muted-foreground w-[4.5rem] text-right flex-shrink-0">
        {count} <span className="text-muted-foreground/60">({percentage.toFixed(0)}%)</span>
      </span>
    </div>
  )
}

interface TransitionRowProps {
  node: FlowNode
  count: number
  percentage: number
  isBacktrack: boolean
  onClick?: () => void
}

function TransitionRow({
  node,
  count,
  percentage,
  isBacktrack,
  onClick,
}: TransitionRowProps) {
  const isState = node.type === 'state'

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-2 py-1.5 -mx-2 rounded-md hover:bg-muted/50 transition-colors text-left group"
    >
      {/* Thumbnail or state indicator */}
      {!isState && node.thumbnailUrl ? (
        <img
          src={node.thumbnailUrl}
          alt={node.name}
          className="w-10 h-7 object-cover rounded border flex-shrink-0"
        />
      ) : (
        <div
          className={cn(
            'w-10 h-7 rounded border flex items-center justify-center flex-shrink-0 text-[12px]',
            isState ? 'bg-violet-50 border-violet-200 text-violet-400' : 'bg-muted text-muted-foreground'
          )}
        >
          {isState ? 'S' : '—'}
        </div>
      )}

      {/* Name and stats */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate group-hover:text-foreground">{node.name}</p>
      </div>

      {/* Count + percentage */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {isBacktrack && (
          <span className="text-xs text-amber-400">↩</span>
        )}
        <span className="text-xs tabular-nums text-muted-foreground">
          {count}
        </span>
        <span className="text-[11px] tabular-nums text-muted-foreground/50">
          {percentage.toFixed(0)}%
        </span>
      </div>
    </button>
  )
}
function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`
  }
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`
  }
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.round((ms % 60000) / 1000)
  return `${minutes}m ${seconds}s`
}

export default FlowNodeDetail
