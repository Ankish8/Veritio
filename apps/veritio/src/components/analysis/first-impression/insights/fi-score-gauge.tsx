'use client'

/**
 * First Impression Score Gauge
 *
 * Circular gauge displaying the composite FI score (0-100)
 * with grade indicator and score breakdown.
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Info } from 'lucide-react'
import { ScoreBreakdown } from './score-breakdown'
import type { ScoreBreakdown as ScoreBreakdownType } from '@/lib/algorithms/first-impression-score'

interface FIScoreGaugeProps {
  score: ScoreBreakdownType
  designName?: string
}

export function FIScoreGauge({ score, designName }: FIScoreGaugeProps) {
  // Calculate SVG circle parameters
  const radius = 70
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (score.totalScore / 100) * circumference

  // Get color based on score
  const getScoreColor = (value: number) => {
    if (value >= 80) return { stroke: '#22c55e', text: 'text-green-600', bg: 'bg-green-100' }
    if (value >= 60) return { stroke: '#eab308', text: 'text-yellow-600', bg: 'bg-yellow-100' }
    if (value >= 40) return { stroke: '#f97316', text: 'text-orange-600', bg: 'bg-orange-100' }
    return { stroke: '#ef4444', text: 'text-red-600', bg: 'bg-red-100' }
  }

  const colors = getScoreColor(score.totalScore)

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">First Impression Score</CardTitle>
            <CardDescription>
              {designName ? `Score for ${designName}` : 'Overall composite score'}
            </CardDescription>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="cursor-help">
                  <Info className="h-3 w-3 mr-1" />
                  How it&apos;s calculated
                </Badge>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-medium mb-2">Score Formula</p>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  <li>• Response Rate (30%)</li>
                  <li>• Positive Sentiment (30%)</li>
                  <li>• Engagement Quality (40%)</li>
                </ul>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center">
          {/* Circular Gauge */}
          <div className="relative w-48 h-48">
            <svg className="w-full h-full transform -rotate-90">
              {/* Background circle */}
              <circle
                cx="96"
                cy="96"
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth="12"
                className="text-muted"
              />
              {/* Progress circle */}
              <circle
                cx="96"
                cy="96"
                r={radius}
                fill="none"
                stroke={colors.stroke}
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            {/* Score text in center */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-4xl font-bold ${colors.text}`}>
                {score.totalScore}
              </span>
              <span className="text-sm text-muted-foreground">out of 100</span>
              <Badge className={`mt-1 ${colors.bg} ${colors.text} border-0`}>
                Grade: {score.grade}
              </Badge>
            </div>
          </div>

          {/* Grade description */}
          <p className="text-sm text-muted-foreground text-center mt-2">
            {score.gradeDescription}
          </p>

          {/* Score Breakdown */}
          <ScoreBreakdown score={score} className="w-full mt-6" />
        </div>
      </CardContent>
    </Card>
  )
}
