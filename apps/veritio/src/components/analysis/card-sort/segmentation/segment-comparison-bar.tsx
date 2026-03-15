'use client'

import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { X, GitCompare, ArrowRight, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSegment } from '@/contexts/segment-context'
import {
  calculateSegmentStatistics,
  formatDuration,
  formatCompletionRate,
  formatNpsScore,
  getNpsColorClass,
} from '@/lib/segment-statistics'
import type { Participant, StudyFlowResponseRow } from '@veritio/study-types'

interface SegmentComparisonBarProps {
  participants: Participant[]
  flowResponses?: StudyFlowResponseRow[]
  responses?: Array<{ participant_id: string; total_time_ms?: number | null }>
  npsQuestionId?: string
}

function DeltaIndicator({
  value,
  higherIsBetter = true,
  suffix = '',
}: {
  value: number
  higherIsBetter?: boolean
  suffix?: string
}) {
  if (Math.abs(value) < 0.1) {
    return (
      <span className="text-xs text-muted-foreground flex items-center gap-1">
        <Minus className="h-3 w-3" />
        same
      </span>
    )
  }

  const isPositive = value > 0
  const isGood = higherIsBetter ? isPositive : !isPositive

  return (
    <span
      className={cn(
        'text-xs flex items-center gap-1',
        isGood ? 'text-emerald-600' : 'text-red-600'
      )}
    >
      {isPositive ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      {isPositive ? '+' : ''}
      {value.toFixed(1)}
      {suffix}
    </span>
  )
}

export function SegmentComparisonBar({
  participants,
  flowResponses = [],
  responses = [],
  npsQuestionId,
}: SegmentComparisonBarProps) {
  const {
    savedSegments,
    activeSegmentId,
    filteredParticipantIds,
    comparisonSegmentId,
    comparisonParticipantIds,
    isComparing,
    setComparisonSegment,
  } = useSegment()

  const activeSegment = savedSegments.find((s) => s.id === activeSegmentId)
  const comparisonSegment = savedSegments.find((s) => s.id === comparisonSegmentId)

  const primaryStats = useMemo(() => {
    const filteredParticipants = filteredParticipantIds
      ? participants.filter((p) => filteredParticipantIds.has(p.id))
      : participants

    return calculateSegmentStatistics({
      participants: filteredParticipants,
      flowResponses,
      npsQuestionId,
      responses: responses.filter((r) =>
        filteredParticipantIds ? filteredParticipantIds.has(r.participant_id) : true
      ),
    })
  }, [participants, filteredParticipantIds, flowResponses, npsQuestionId, responses])

  const comparisonStats = useMemo(() => {
    if (!comparisonParticipantIds) return null

    const compParticipants = participants.filter((p) =>
      comparisonParticipantIds.has(p.id)
    )

    return calculateSegmentStatistics({
      participants: compParticipants,
      flowResponses,
      npsQuestionId,
      responses: responses.filter((r) =>
        comparisonParticipantIds.has(r.participant_id)
      ),
    })
  }, [participants, comparisonParticipantIds, flowResponses, npsQuestionId, responses])

  const availableForComparison = savedSegments.filter(
    (s) => s.id !== activeSegmentId
  )

  const handleComparisonChange = (segmentId: string) => {
    setComparisonSegment(segmentId === '__clear__' ? null : segmentId)
  }

  if (!activeSegmentId) {
    return null
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="py-4">
        <div className="flex items-start gap-6">
          <div className="flex items-center gap-3">
            <GitCompare className="h-5 w-5 text-primary" />
            <div className="space-y-1">
              <div className="text-sm font-medium">Compare with</div>
              <Select
                value={comparisonSegmentId || '__none__'}
                onValueChange={handleComparisonChange}
              >
                <SelectTrigger className="w-[200px] h-8 text-xs">
                  <SelectValue placeholder="Select segment..." />
                </SelectTrigger>
                <SelectContent>
                  {comparisonSegmentId && (
                    <SelectItem value="__clear__" className="text-muted-foreground">
                      Clear comparison
                    </SelectItem>
                  )}
                  <SelectItem value="__none__" disabled className="text-muted-foreground">
                    Select segment...
                  </SelectItem>
                  {availableForComparison.map((segment) => (
                    <SelectItem key={segment.id} value={segment.id}>
                      {segment.name}
                    </SelectItem>
                  ))}
                  {availableForComparison.length === 0 && (
                    <SelectItem value="__empty__" disabled>
                      No other segments available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Participants</div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-sm font-medium">
                  {primaryStats.participantCount}
                </Badge>
                {isComparing && comparisonStats && (
                  <>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <Badge variant="secondary" className="text-sm font-medium">
                      {comparisonStats.participantCount}
                    </Badge>
                    <DeltaIndicator
                      value={comparisonStats.participantCount - primaryStats.participantCount}
                    />
                  </>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Completion Rate</div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {formatCompletionRate(primaryStats.completionRate)}
                </span>
                {isComparing && comparisonStats && (
                  <>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">
                      {formatCompletionRate(comparisonStats.completionRate)}
                    </span>
                    <DeltaIndicator
                      value={comparisonStats.completionRate - primaryStats.completionRate}
                      suffix="%"
                    />
                  </>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Avg. Time</div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {formatDuration(primaryStats.averageTimeSeconds)}
                </span>
                {isComparing && comparisonStats && (
                  <>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">
                      {formatDuration(comparisonStats.averageTimeSeconds)}
                    </span>
                    <DeltaIndicator
                      value={comparisonStats.averageTimeSeconds - primaryStats.averageTimeSeconds}
                      higherIsBetter={false}
                      suffix="s"
                    />
                  </>
                )}
              </div>
            </div>

            {npsQuestionId && (
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">NPS Score</div>
                <div className="flex items-center gap-2">
                  {primaryStats.npsScore !== undefined ? (
                    <span
                      className={cn(
                        'text-sm font-medium',
                        getNpsColorClass(primaryStats.npsScore)
                      )}
                    >
                      {formatNpsScore(primaryStats.npsScore)}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                  {isComparing && comparisonStats && (
                    <>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      {comparisonStats.npsScore !== undefined ? (
                        <span
                          className={cn(
                            'text-sm font-medium',
                            getNpsColorClass(comparisonStats.npsScore)
                          )}
                        >
                          {formatNpsScore(comparisonStats.npsScore)}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                      {primaryStats.npsScore !== undefined &&
                        comparisonStats.npsScore !== undefined && (
                          <DeltaIndicator
                            value={comparisonStats.npsScore - primaryStats.npsScore}
                          />
                        )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {isComparing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setComparisonSegment(null)}
              className="text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="flex items-center gap-4 mt-3 pt-3 border-t text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span>{activeSegment?.name || 'Current segment'}</span>
          </div>
          {isComparing && comparisonSegment && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-muted-foreground" />
              <span>{comparisonSegment.name}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
