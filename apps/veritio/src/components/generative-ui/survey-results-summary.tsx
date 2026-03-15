'use client'

import { cn } from '@/lib/utils'

interface SurveyResultsSummaryProps {
  totalResponses?: number
  completionRate?: number
  questions?: Array<{ text: string; type?: string; topAnswer?: string; responseCount?: number }>
  propStatus?: Record<string, 'streaming' | 'complete'>
}

function formatQuestionType(type: string): string {
  return type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function SkeletonQuestion() {
  return (
    <div className="flex gap-2 py-1.5">
      <div className="animate-pulse bg-muted rounded-full h-4 w-4 shrink-0 mt-0.5" />
      <div className="flex-1 space-y-1">
        <div className="animate-pulse bg-muted rounded h-3 w-5/6" />
        <div className="animate-pulse bg-muted rounded h-2.5 w-1/2" />
      </div>
    </div>
  )
}

export function SurveyResultsSummary({
  totalResponses,
  completionRate,
  questions,
  propStatus,
}: SurveyResultsSummaryProps) {
  const isStreaming = propStatus?.questions === 'streaming'
  const hasData = totalResponses !== undefined || (questions && questions.length > 0)

  return (
    <div className="rounded-lg border border-border bg-background p-3 space-y-2">
      {!hasData && isStreaming && (
        <div className="space-y-2">
          <div className="flex gap-3">
            <div className="animate-pulse bg-muted rounded h-3 w-20" />
            <div className="animate-pulse bg-muted rounded h-3 w-24" />
          </div>
          <SkeletonQuestion />
          <SkeletonQuestion />
        </div>
      )}

      {!hasData && !isStreaming && (
        <p className="text-xs text-muted-foreground">No data</p>
      )}

      {hasData && (
        <>
          <div className={cn('flex items-center gap-3 flex-wrap', isStreaming && 'animate-pulse')}>
            {totalResponses !== undefined && (
              <div>
                <span className="text-sm font-semibold text-foreground">{totalResponses}</span>
                <span className="text-xs text-muted-foreground ml-1">responses</span>
              </div>
            )}
            {completionRate !== undefined && (
              <div>
                <span className="text-sm font-semibold text-foreground">{completionRate}%</span>
                <span className="text-xs text-muted-foreground ml-1">completion</span>
              </div>
            )}
          </div>

          {questions && questions.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Questions</p>
              <div className="divide-y divide-border">
                {questions.map((q, i) => (
                  <div
                    key={i}
                    className={cn(
                      'flex gap-2 py-1.5 first:pt-0 last:pb-0',
                      i === questions.length - 1 && isStreaming && 'animate-pulse'
                    )}
                  >
                    <span className="text-[10px] font-medium text-muted-foreground bg-muted rounded-full h-4 w-4 flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs text-foreground line-clamp-1">{q.text}</span>
                        {q.type && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">
                            {formatQuestionType(q.type)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {q.topAnswer && (
                          <span className="text-[10px] text-muted-foreground truncate">Top: {q.topAnswer}</span>
                        )}
                        {q.responseCount !== undefined && (
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {q.responseCount} responses
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
