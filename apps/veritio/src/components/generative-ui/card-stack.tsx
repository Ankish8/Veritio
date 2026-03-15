'use client'

import { cn } from '@/lib/utils'

interface CardStackProps {
  items?: Array<{ label: string; description?: string; category?: string }>
  action?: string
  propStatus?: Record<string, 'streaming' | 'complete'>
  onStateChange?: (state: any) => void
}

function SkeletonCard() {
  return (
    <div className="flex flex-col gap-1.5 py-2">
      <div className="animate-pulse bg-muted rounded h-3 w-3/4" />
      <div className="animate-pulse bg-muted rounded h-2.5 w-full" />
    </div>
  )
}

export function CardStack({ items, action, propStatus }: CardStackProps) {
  const isStreaming = propStatus?.items === 'streaming'
  const hasItems = items && items.length > 0

  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground">
          {hasItems ? `${items.length} card${items.length === 1 ? '' : 's'}` : 'Cards'}
        </span>
        {action && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
            {action}
          </span>
        )}
      </div>

      {!hasItems && isStreaming && (
        <div className="divide-y divide-border">
          <SkeletonCard />
          <SkeletonCard />
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
                className={cn('flex items-start gap-2 py-2 first:pt-0 last:pb-0', isPulsing && 'animate-pulse')}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-foreground truncate">{item.label}</span>
                    {item.category && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">
                        {item.category}
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
                  )}
                </div>
              </div>
            )
          })}

          {isStreaming && (
            <div className="pt-2">
              <SkeletonCard />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
