'use client'

import { cn } from '@/lib/utils'

interface AgreementBadgeProps {
  score: number
}

export function AgreementBadge({ score }: AgreementBadgeProps) {
  const color =
    score >= 80 ? 'bg-green-500' :
    score >= 60 ? 'bg-green-400' :
    score >= 40 ? 'bg-yellow-400' :
    score >= 20 ? 'bg-orange-400' :
    'bg-red-400'

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium">{score}%</span>
      <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full', color)} style={{ width: `${score}%` }} />
      </div>
    </div>
  )
}
