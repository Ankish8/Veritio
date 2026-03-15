'use client'

/**
 * Recall Rate Card
 *
 * Displays the recall rate metric with color-coded thresholds
 * showing what percentage of participants remembered key elements.
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Brain, CheckCircle2, AlertCircle, XCircle } from 'lucide-react'
import {
  getRecallRateColor,
  getRecallRateBackgroundColor,
} from '@/lib/algorithms/element-recognition'

interface RecallRateCardProps {
  recallRate: number
  totalRecalling: number
  totalResponses: number
  threshold: 'excellent' | 'good' | 'needs_improvement' | 'poor'
}

export function RecallRateCard({
  recallRate,
  totalRecalling,
  totalResponses,
  threshold,
}: RecallRateCardProps) {
  const getThresholdIcon = () => {
    switch (threshold) {
      case 'excellent':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case 'good':
        return <CheckCircle2 className="h-5 w-5 text-blue-600" />
      case 'needs_improvement':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />
      case 'poor':
        return <XCircle className="h-5 w-5 text-red-600" />
    }
  }

  const getThresholdLabel = () => {
    switch (threshold) {
      case 'excellent':
        return 'Excellent recall'
      case 'good':
        return 'Good recall'
      case 'needs_improvement':
        return 'Needs improvement'
      case 'poor':
        return 'Poor recall'
    }
  }

  const getThresholdDescription = () => {
    switch (threshold) {
      case 'excellent':
        return 'Most participants clearly remember key design elements'
      case 'good':
        return 'Majority of participants noticed important elements'
      case 'needs_improvement':
        return 'Consider making key elements more prominent'
      case 'poor':
        return 'Key elements are not being noticed - significant changes needed'
    }
  }

  const colorClass = getRecallRateColor(threshold)
  const bgClass = getRecallRateBackgroundColor(threshold)

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-base">Recall Rate</CardTitle>
        </div>
        <CardDescription>
          Participants who remembered key elements
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Main Rate Display */}
          <div className={`rounded-lg p-4 ${bgClass}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className={`text-3xl font-bold ${colorClass}`}>
                  {recallRate.toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">
                  {totalRecalling} of {totalResponses} responses
                </div>
              </div>
              {getThresholdIcon()}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress
              value={recallRate}
              className="h-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Threshold Info */}
          <div className="flex items-start gap-2 pt-2 border-t">
            <Badge
              variant="outline"
              className={`${colorClass} shrink-0`}
            >
              {getThresholdLabel()}
            </Badge>
            <p className="text-xs text-muted-foreground">
              {getThresholdDescription()}
            </p>
          </div>

          {/* Threshold Legend */}
          <div className="grid grid-cols-4 gap-1 pt-2 border-t">
            <ThresholdLegend color="bg-red-500" label="<40%" />
            <ThresholdLegend color="bg-yellow-500" label="40-59%" />
            <ThresholdLegend color="bg-blue-500" label="60-79%" />
            <ThresholdLegend color="bg-green-500" label="80%+" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ThresholdLegend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`w-full h-1.5 rounded-full ${color}`} />
      <span className="text-[12px] text-muted-foreground">{label}</span>
    </div>
  )
}
