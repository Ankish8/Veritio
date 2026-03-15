'use client'

import { cn } from '@/lib/utils'

interface QuestionListProps {
  items?: Array<{ type?: string; text: string; options?: Array<{ label: string }> }>
  action?: string
  propStatus?: Record<string, 'streaming' | 'complete'>
  onStateChange?: (state: any) => void
}

function formatQuestionType(type: string): string {
  return type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function SkeletonQuestion() {
  return (
    <div className="flex gap-2 py-2">
      <div className="animate-pulse bg-muted rounded-full h-4 w-4 shrink-0 mt-0.5" />
      <div className="flex-1 flex flex-col gap-1.5">
        <div className="animate-pulse bg-muted rounded h-3 w-5/6" />
        <div className="animate-pulse bg-muted rounded h-2.5 w-2/3" />
      </div>
    </div>
  )
}

export function QuestionList({ items, action, propStatus }: QuestionListProps) {
  const isStreaming = propStatus?.items === 'streaming'
  const hasItems = items && items.length > 0

  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground">
          {hasItems ? `${items.length} question${items.length === 1 ? '' : 's'}` : 'Questions'}
        </span>
        {action && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
            {action}
          </span>
        )}
      </div>

      {!hasItems && isStreaming && (
        <div className="divide-y divide-border">
          <SkeletonQuestion />
          <SkeletonQuestion />
        </div>
      )}

      {hasItems && (
        <div className="divide-y divide-border">
          {items.map((item, index) => {
            const isLast = index === items.length - 1
            const isPulsing = isLast && isStreaming

            return (
              <div
                key={index}
                className={cn('flex gap-2 py-2 first:pt-0 last:pb-0', isPulsing && 'animate-pulse')}
              >
                <span className="text-[10px] font-medium text-muted-foreground bg-muted rounded-full h-4 w-4 flex items-center justify-center shrink-0 mt-0.5">
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-medium text-foreground">{item.text}</span>
                    {item.type && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">
                        {formatQuestionType(item.type)}
                      </span>
                    )}
                  </div>
                  {item.options && item.options.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      {item.options.map((o) => o.label).join(', ')}
                    </p>
                  )}
                </div>
              </div>
            )
          })}

          {isStreaming && (
            <div className="pt-2">
              <SkeletonQuestion />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
