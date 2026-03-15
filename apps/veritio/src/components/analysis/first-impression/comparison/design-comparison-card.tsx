'use client'

/**
 * Design Comparison Card
 *
 * Displays a single design's preview and key metrics
 * with optional winner badge.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Trophy } from 'lucide-react'
import type { DesignWithMetrics } from './comparison-tab'

interface DesignComparisonCardProps {
  design: DesignWithMetrics
  isWinner: boolean
  label: string
}

export function DesignComparisonCard({
  design,
  isWinner,
  label,
}: DesignComparisonCardProps) {
  const responseRate = design.exposureCount > 0
    ? (design.totalResponses / design.exposureCount) * 100
    : 0

  return (
    <Card className={isWinner ? 'ring-2 ring-green-500 ring-offset-2' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {label}
            </Badge>
            <CardTitle className="text-base">{design.name || `Design ${design.position + 1}`}</CardTitle>
          </div>
          {isWinner && (
            <Badge className="bg-green-500 hover:bg-green-600">
              <Trophy className="h-3 w-3 mr-1" />
              Winner
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Design Preview */}
        <div className="aspect-video relative rounded-lg overflow-hidden bg-muted border">
          {design.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={design.image_url}
              alt={design.name || `Design ${design.position + 1}`}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              No preview available
            </div>
          )}
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-3 gap-3 border-t pt-4">
          <div className="text-center">
            <div className="text-lg font-semibold">{design.exposureCount}</div>
            <div className="text-xs text-muted-foreground">Exposures</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold">{responseRate.toFixed(0)}%</div>
            <div className="text-xs text-muted-foreground">Response Rate</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold">{(design.avgResponseTime / 1000).toFixed(1)}s</div>
            <div className="text-xs text-muted-foreground">Avg. Time</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

