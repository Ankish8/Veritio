import type { ReactNode } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

interface SkeletonCardProps {
  children: ReactNode
  spacing?: 2 | 3 | 4
  className?: string
}

const spacingClasses: Record<2 | 3 | 4, string> = {
  2: 'rounded-lg border p-4 space-y-2',
  3: 'rounded-lg border p-4 space-y-3',
  4: 'rounded-lg border p-4 space-y-4',
}

export function SkeletonCard({ children, spacing = 3, className }: SkeletonCardProps): ReactNode {
  const base = spacingClasses[spacing]
  return <div className={className ? `${base} ${className}` : base}>{children}</div>
}

interface SkeletonRepeaterProps {
  count: number
  className?: string
  children: (index: number) => ReactNode
}

export function SkeletonRepeater({ count, className, children }: SkeletonRepeaterProps): ReactNode {
  const items = Array.from({ length: count }, (_, i) => (
    <span key={i}>{children(i)}</span>
  ))

  if (className) {
    return <div className={className}>{items}</div>
  }

  return <>{items}</>
}

interface ButtonDef {
  width: string
}

interface SkeletonHeaderActionsProps {
  titleWidth?: string
  subtitleWidth?: string
  buttons?: ButtonDef[]
  children?: ReactNode
}

/**
 * Shared header pattern with title, optional subtitle, and action buttons.
 * Used by Builder and Results headers.
 */
export function SkeletonHeaderActions({
  titleWidth = 'w-64',
  subtitleWidth = 'w-40',
  buttons,
  children,
}: SkeletonHeaderActionsProps): ReactNode {
  return (
    <div className="animate-fade-in-delayed border-b px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className={`h-8 ${titleWidth}`} />
          <Skeleton className={`h-4 ${subtitleWidth}`} />
        </div>
        {buttons ? (
          <div className="flex gap-2">
            {buttons.map((btn, i) => (
              <Skeleton key={i} className={`h-9 ${btn.width} rounded-md`} />
            ))}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  )
}
