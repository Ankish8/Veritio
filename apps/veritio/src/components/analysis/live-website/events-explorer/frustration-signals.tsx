'use client'

import { memo } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Flame, Info } from 'lucide-react'
import { truncateUrl, type RageClickElement } from './utils'

interface FrustrationSignalsProps {
  rageClicksByElement: RageClickElement[]
}

function FrustrationSignalsBase({ rageClicksByElement }: FrustrationSignalsProps) {
  if (rageClicksByElement.length === 0) return null

  const top5 = rageClicksByElement.slice(0, 5)

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Flame className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-medium text-sm">Frustration Signals</h3>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[280px]">
              <p className="text-xs">Elements where participants repeatedly clicked in frustration. Rage clicks indicate confusion, broken interactions, or unresponsive UI.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className="space-y-2.5">
        {top5.map((item) => (
          <div
            key={item.elementSelector}
            className="flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-medium truncate">{item.label}</span>
              <span className="text-sm text-muted-foreground truncate">
                {truncateUrl(item.pageUrl, 40)}
              </span>
            </div>
            <Badge variant="secondary" className="shrink-0 text-sm">
              {item.count} rage click{item.count !== 1 ? 's' : ''} &middot; {item.uniqueParticipants} participant{item.uniqueParticipants !== 1 ? 's' : ''}
            </Badge>
          </div>
        ))}
      </div>
    </Card>
  )
}

export const FrustrationSignals = memo(FrustrationSignalsBase)
