'use client'

import { useState, useMemo, lazy, Suspense } from 'react'
import { HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { useFirstClickEvents } from '@/hooks/use-first-click-events'
import { TimeBoxPlot } from '@/components/analysis/prototype-test/task-results/time-box-plot'
import { calculateBoxPlotStats } from '@/lib/algorithms/statistics'

const BeeswarmPlot = lazy(() =>
  import('../visualizations/beeswarm-plot').then(m => ({ default: m.BeeswarmPlot }))
)

interface BeeswarmSectionProps {
  taskId: string
  studyId: string
  className?: string
}

type ViewMode = 'box-plot' | 'beeswarm'

export function BeeswarmSection({ taskId, studyId, className }: BeeswarmSectionProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('box-plot')

  const { clicks, isLoading } = useFirstClickEvents(studyId, { taskId })

  const beeswarmData = useMemo(() => {
    return clicks
      .filter(c => !c.isSkipped && c.timeToClickMs != null && c.timeToClickMs > 0)
      .map(c => ({
        timeMs: c.timeToClickMs!,
        wasCorrect: c.wasCorrect,
        participantId: c.participantId,
      }))
  }, [clicks])

  const boxPlotStats = useMemo(() => {
    const times = beeswarmData.map(d => d.timeMs).sort((a, b) => a - b)
    return calculateBoxPlotStats(times)
  }, [beeswarmData])

  if (isLoading) {
    return (
      <div className={cn('space-y-3', className)}>
        <div className="flex items-center gap-1.5">
          <h4 className="text-sm font-medium">Time Distribution</h4>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/60 cursor-help shrink-0" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="text-xs">Distribution of time-to-click across all participants. Box plot shows quartiles (25th, 50th, 75th percentile) and outliers. Beeswarm shows each participant as a dot — green for correct clicks, red for incorrect.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="h-32 rounded-lg border border-dashed flex items-center justify-center text-sm text-muted-foreground animate-pulse">
          Loading click data...
        </div>
      </div>
    )
  }

  if (beeswarmData.length < 2) {
    return null
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <h4 className="text-sm font-medium">Time Distribution</h4>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/60 cursor-help shrink-0" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="text-xs">Distribution of time-to-click across all participants. Box plot shows quartiles (25th, 50th, 75th percentile) and outliers. Beeswarm shows each participant as a dot — green for correct clicks, red for incorrect.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="flex items-center rounded-lg border bg-muted/50 p-0.5">
          <button
            onClick={() => setViewMode('box-plot')}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded-md transition-colors',
              viewMode === 'box-plot'
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Box Plot
          </button>
          <button
            onClick={() => setViewMode('beeswarm')}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded-md transition-colors',
              viewMode === 'beeswarm'
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Beeswarm
          </button>
        </div>
      </div>

      <div className="border rounded-lg p-4 bg-muted/20">
        {viewMode === 'box-plot' ? (
          <TimeBoxPlot boxPlot={boxPlotStats} />
        ) : (
          <Suspense
            fallback={
              <div className="h-[120px] flex items-center justify-center text-sm text-muted-foreground">
                Loading visualization...
              </div>
            }
          >
            <BeeswarmPlot times={beeswarmData} />
          </Suspense>
        )}
      </div>
    </div>
  )
}
