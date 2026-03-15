'use client'

import { memo } from 'react'
import {
  Circle,
  Square,
  ArrowRight,
  RotateCcw,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Layers,
} from 'lucide-react'
import { cn } from '@veritio/ui'
import { DEFAULT_FLOW_CONFIG } from './types'
import type { OptimalPathType } from './types'

interface FlowLegendProps {
  showComponentStates: boolean
  showBacktracks: boolean
  highlightPath: OptimalPathType | null
  className?: string
}
export const FlowLegend = memo(function FlowLegend({
  showComponentStates,
  showBacktracks,
  highlightPath,
  className,
}: FlowLegendProps) {
  const { outcomeColors, pathColors, roleColors } = DEFAULT_FLOW_CONFIG

  return (
    <div
      className={cn(
        'flex flex-wrap gap-x-6 gap-y-3 px-4 py-3 bg-muted/30 rounded-lg border text-xs',
        className
      )}
    >
      {/* Node Types Section */}
      <div className="flex flex-col gap-1.5">
        <span className="font-medium text-muted-foreground uppercase tracking-wider text-[12px]">
          Nodes
        </span>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <LegendItem
            icon={<Play className="w-3 h-3" style={{ color: roleColors.start }} />}
            label="Start screen"
          />
          <LegendItem
            icon={
              <CheckCircle2 className="w-3 h-3" style={{ color: roleColors.success }} />
            }
            label="Success screen"
          />
          <LegendItem
            icon={
              <XCircle className="w-3 h-3" style={{ color: roleColors.dead_end }} />
            }
            label="Dead-end"
          />
          {showComponentStates && (
            <LegendItem
              icon={
                <Layers
                  className="w-3 h-3"
                  style={{ color: '#8b5cf6' }}
                />
              }
              label="Component state"
              dotted
            />
          )}
        </div>
      </div>

      {/* Separator */}
      <div className="w-px h-10 bg-border self-center" />

      {/* Link Colors Section */}
      <div className="flex flex-col gap-1.5">
        <span className="font-medium text-muted-foreground uppercase tracking-wider text-[12px]">
          Links
        </span>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <LegendItem
            icon={
              <div
                className="w-4 h-1 rounded-full"
                style={{ backgroundColor: outcomeColors.success }}
              />
            }
            label="Success"
          />
          <LegendItem
            icon={
              <div
                className="w-4 h-1 rounded-full"
                style={{ backgroundColor: outcomeColors.failure }}
              />
            }
            label="Failure"
          />
          <LegendItem
            icon={
              <div
                className="w-4 h-1 rounded-full"
                style={{ backgroundColor: outcomeColors.abandoned }}
              />
            }
            label="Abandoned"
          />
          <LegendItem
            icon={
              <div
                className="w-4 h-1 rounded-full"
                style={{ backgroundColor: outcomeColors.mixed }}
              />
            }
            label="Mixed"
          />
          {showBacktracks && (
            <LegendItem
              icon={<RotateCcw className="w-3 h-3 text-amber-500" />}
              label="Backtrack"
            />
          )}
        </div>
      </div>

      {/* Optimal Path Section (only show if a path is highlighted) */}
      {highlightPath && (
        <>
          <div className="w-px h-10 bg-border self-center" />
          <div className="flex flex-col gap-1.5">
            <span className="font-medium text-muted-foreground uppercase tracking-wider text-[12px]">
              Highlighted Path
            </span>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {highlightPath === 'criteria' && (
                <LegendItem
                  icon={
                    <div
                      className="w-4 h-1.5 rounded-full"
                      style={{ backgroundColor: pathColors.criteria }}
                    />
                  }
                  label="Expected path"
                />
              )}
              {highlightPath === 'shortest' && (
                <LegendItem
                  icon={
                    <div
                      className="w-4 h-1.5 rounded-full border-b-2 border-dashed"
                      style={{ borderColor: pathColors.shortest }}
                    />
                  }
                  label="Shortest path"
                />
              )}
              {highlightPath === 'common' && (
                <LegendItem
                  icon={
                    <div
                      className="w-4 h-1.5 rounded-full"
                      style={{
                        backgroundColor: pathColors.common,
                        backgroundImage:
                          'linear-gradient(90deg, transparent 50%, rgba(255,255,255,0.5) 50%)',
                        backgroundSize: '4px 100%',
                      }}
                    />
                  }
                  label="Most common"
                />
              )}
            </div>
          </div>
        </>
      )}

      {/* Link Width Explanation */}
      <div className="w-px h-10 bg-border self-center" />
      <div className="flex flex-col gap-1.5">
        <span className="font-medium text-muted-foreground uppercase tracking-wider text-[12px]">
          Link Width
        </span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 bg-gray-400 rounded-full" />
            <span className="text-muted-foreground">Few</span>
          </div>
          <ArrowRight className="w-3 h-3 text-muted-foreground/50" />
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-2 bg-gray-400 rounded-full" />
            <span className="text-muted-foreground">Many</span>
          </div>
          <span className="text-muted-foreground">participants</span>
        </div>
      </div>
    </div>
  )
})
interface LegendItemProps {
  icon: React.ReactNode
  label: string
  dotted?: boolean
}

function LegendItem({ icon, label, dotted }: LegendItemProps) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={cn(dotted && 'border border-dashed border-purple-400 rounded p-0.5')}>
        {icon}
      </div>
      <span className="text-muted-foreground">{label}</span>
    </div>
  )
}

export default FlowLegend
