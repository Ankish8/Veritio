'use client'

import { memo } from 'react'
import { Clock, Users, MousePointerClick, AlertTriangle, ArrowRight } from 'lucide-react'
import { cn } from '@veritio/ui'
import type { FlowNode, FlowLink } from './types'
// Node Tooltip

interface FlowNodeTooltipProps {
  node: FlowNode
  className?: string
}
export const FlowNodeTooltip = memo(function FlowNodeTooltip({
  node,
  className,
}: FlowNodeTooltipProps) {
  const isState = node.type === 'state'
  const hasOutcomes =
    node.outcomeBreakdown.success +
      node.outcomeBreakdown.failure +
      node.outcomeBreakdown.abandoned +
      node.outcomeBreakdown.skipped >
    0

  return (
    <div className={cn('p-3 max-w-[280px]', className)}>
      {/* Header */}
      <div className="flex items-start gap-2 mb-3">
        {node.thumbnailUrl && !isState && (
          <img
            src={node.thumbnailUrl}
            alt={node.name}
            className="w-12 h-9 object-cover rounded border"
          />
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{node.name}</p>
          <p className="text-xs text-muted-foreground">
            {isState ? 'Component state' : 'Frame'}
            {node.role !== 'regular' && (
              <span
                className={cn(
                  'ml-1.5 px-1.5 py-0.5 rounded text-[12px] font-medium',
                  node.role === 'start' && 'bg-blue-100 text-blue-700',
                  node.role === 'success' && 'bg-green-100 text-green-700',
                  node.role === 'dead_end' && 'bg-red-100 text-red-700'
                )}
              >
                {node.role === 'start' && 'Start'}
                {node.role === 'success' && 'Success'}
                {node.role === 'dead_end' && 'Dead-end'}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <StatRow
          icon={<MousePointerClick className="w-3.5 h-3.5" />}
          label="Visits"
          value={node.visitCount.toLocaleString()}
        />
        <StatRow
          icon={<Users className="w-3.5 h-3.5" />}
          label="Unique"
          value={node.uniqueVisitors.toLocaleString()}
        />
        {node.avgTimeMs > 0 && (
          <StatRow
            icon={<Clock className="w-3.5 h-3.5" />}
            label="Avg time"
            value={formatDuration(node.avgTimeMs)}
          />
        )}
        {node.abandonedCount > 0 && (
          <StatRow
            icon={<AlertTriangle className="w-3.5 h-3.5 text-orange-500" />}
            label="Abandoned"
            value={node.abandonedCount.toLocaleString()}
          />
        )}
      </div>

      {/* Outcome Breakdown */}
      {hasOutcomes && (
        <div className="mt-3 pt-3 border-t">
          <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Outcomes
          </p>
          <div className="flex gap-3 text-xs">
            {node.outcomeBreakdown.success > 0 && (
              <OutcomeBadge
                color="bg-green-500"
                label="Success"
                count={node.outcomeBreakdown.success}
              />
            )}
            {node.outcomeBreakdown.failure > 0 && (
              <OutcomeBadge
                color="bg-red-500"
                label="Failure"
                count={node.outcomeBreakdown.failure}
              />
            )}
            {node.outcomeBreakdown.abandoned > 0 && (
              <OutcomeBadge
                color="bg-orange-500"
                label="Abandoned"
                count={node.outcomeBreakdown.abandoned}
              />
            )}
            {node.outcomeBreakdown.skipped > 0 && (
              <OutcomeBadge
                color="bg-gray-400"
                label="Skipped"
                count={node.outcomeBreakdown.skipped}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
})
// Link Tooltip

interface FlowLinkTooltipProps {
  link: FlowLink
  sourceNode: FlowNode | null
  targetNode: FlowNode | null
  className?: string
}
export const FlowLinkTooltip = memo(function FlowLinkTooltip({
  link,
  sourceNode,
  targetNode,
  className,
}: FlowLinkTooltipProps) {
  const sourceName = sourceNode?.name || 'Unknown'
  const targetName = targetNode?.name || 'Unknown'

  return (
    <div className={cn('p-3 max-w-[300px]', className)}>
      {/* Transition header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-medium truncate max-w-[140px]" title={sourceName}>
          {sourceName}
        </span>
        <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <span className="text-sm font-medium truncate max-w-[140px]" title={targetName}>
          {targetName}
        </span>
        {link.isBacktrack && (
          <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[12px] font-medium">
            Backtrack
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
        <StatRow
          icon={<MousePointerClick className="w-3.5 h-3.5" />}
          label="Transitions"
          value={link.value.toLocaleString()}
        />
        <StatRow
          icon={<Users className="w-3.5 h-3.5" />}
          label="Participants"
          value={link.uniqueParticipants.toLocaleString()}
        />
      </div>

      {/* Percentage */}
      <div className="text-xs text-muted-foreground mb-3">
        {link.percentage.toFixed(1)}% of all transitions
      </div>

      {/* Outcome Breakdown */}
      <div className="pt-3 border-t">
        <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
          Session outcomes
        </p>
        <div className="flex flex-wrap gap-2 text-xs">
          {link.outcomeBreakdown.success > 0 && (
            <OutcomeBadge
              color="bg-green-500"
              label="Success"
              count={link.outcomeBreakdown.success}
            />
          )}
          {link.outcomeBreakdown.failure > 0 && (
            <OutcomeBadge
              color="bg-red-500"
              label="Failure"
              count={link.outcomeBreakdown.failure}
            />
          )}
          {link.outcomeBreakdown.abandoned > 0 && (
            <OutcomeBadge
              color="bg-orange-500"
              label="Abandoned"
              count={link.outcomeBreakdown.abandoned}
            />
          )}
          {link.outcomeBreakdown.skipped > 0 && (
            <OutcomeBadge
              color="bg-gray-400"
              label="Skipped"
              count={link.outcomeBreakdown.skipped}
            />
          )}
        </div>
      </div>
    </div>
  )
})
// Helper Components

interface StatRowProps {
  icon: React.ReactNode
  label: string
  value: string
}

function StatRow({ icon, label, value }: StatRowProps) {
  return (
    <div className="flex items-center gap-1.5 text-muted-foreground">
      {icon}
      <span>{label}:</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  )
}

interface OutcomeBadgeProps {
  color: string
  label: string
  count: number
}

function OutcomeBadge({ color, label, count }: OutcomeBadgeProps) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={cn('w-2 h-2 rounded-full', color)} />
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium">{count}</span>
    </div>
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

// Combined export for convenience
export const FlowTooltip = {
  Node: FlowNodeTooltip,
  Link: FlowLinkTooltip,
}

export default FlowTooltip
