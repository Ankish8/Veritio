'use client'

import { lazy, Suspense, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { HelpCircle, Loader2 } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { FirstClickResultsResponse } from '@/services/results/first-click'

const RidgelinePlot = lazy(() =>
  import('../visualizations/ridgeline-plot').then(m => ({ default: m.RidgelinePlot }))
)

interface RidgelineSectionProps {
  data: FirstClickResultsResponse
  className?: string
}

export function RidgelineSection({ data, className }: RidgelineSectionProps) {
  const taskTimeSeries = useMemo(() => {
    return data.metrics.taskMetrics.map(task => ({
      taskId: task.taskId,
      label: task.instruction.length > 30 ? task.instruction.slice(0, 30) + '...' : task.instruction,
      times: data.responses
        .filter((r: any) => r.task_id === task.taskId && r.time_to_click_ms && !r.is_skipped)
        .map((r: any) => r.time_to_click_ms as number),
    }))
  }, [data.metrics.taskMetrics, data.responses])

  const tasksWithData = taskTimeSeries.filter(t => t.times.length > 0)

  if (tasksWithData.length < 2) return null

  return (
    <section className={cn(className)}>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-1.5">
            Time Distribution by Task
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/60 cursor-help shrink-0" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="text-xs">Kernel density estimation shows the probability distribution of click times for each task. Wider, flatter curves indicate more variable response times. Tall, narrow peaks indicate consistent performance.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardTitle>
          <CardDescription>
            Kernel density estimation of click times. Wider distributions indicate more variability.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-48">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            }
          >
            <RidgelinePlot tasks={tasksWithData} />
          </Suspense>
        </CardContent>
      </Card>
    </section>
  )
}
