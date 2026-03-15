'use client'


import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Users, Clock, MessageSquare, TrendingUp } from 'lucide-react'
import type {
  FirstImpressionResultsResponse,
  DesignMetric,
} from '@/services/results/first-impression'
import { calculateFirstImpressionScore, type ScoreInput } from '@/lib/algorithms/first-impression-score'
import {
  analyzeElementRecognition,
  calculateRecallRate,
  DEFAULT_UI_ELEMENTS,
} from '@/lib/algorithms/element-recognition'
import { FIScoreGauge } from './fi-score-gauge'
import { RecallRateCard } from './recall-rate-card'
import { ElementRecognitionChart } from './element-recognition-chart'

interface InsightsTabProps {
  data: FirstImpressionResultsResponse
  designs: DesignMetric[]
  selectedDesignId: string | null
  onSelectDesign: (id: string) => void
}

export function InsightsTab({
  data,
  designs,
  selectedDesignId,
  onSelectDesign,
}: InsightsTabProps) {
  const { responses } = data

  // Get selected design
  const selectedDesign = useMemo(() => {
    if (selectedDesignId) {
      return designs.find(d => d.designId === selectedDesignId) || designs[0]
    }
    return designs[0]
  }, [selectedDesignId, designs])

  // Get text responses for selected design (for recall analysis)
  const textResponses = useMemo(() => {
    if (!selectedDesign) return []

    const designResponses = responses.filter(r => r.design_id === selectedDesign.designId)

    // Get only text responses
    return designResponses
      .filter(r => typeof r.response_value === 'string' && r.response_value.length > 0)
      .map(r => r.response_value as string)
  }, [responses, selectedDesign])

  // Check if there are any text-type questions for this design
  const hasTextQuestions = useMemo(() => {
    if (!selectedDesign) return false
    return selectedDesign.questionMetrics.some(q =>
      ['short_text', 'long_text', 'single_line_text', 'multi_line_text'].includes(q.type)
    )
  }, [selectedDesign])

  // Calculate First Impression Score
  const fiScore = useMemo(() => {
    if (!selectedDesign) return null

    // Get average rating if available
    const ratingQuestions = selectedDesign.questionMetrics.filter(
      q => ['rating', 'scale', 'opinion_scale', 'nps', 'slider'].includes(q.type)
    )
    const avgRating = ratingQuestions.length > 0 && ratingQuestions[0].avgRating
      ? ratingQuestions[0].avgRating
      : undefined

    const scoreInput: ScoreInput = {
      totalParticipants: selectedDesign.exposureCount,
      totalResponses: selectedDesign.questionMetrics.reduce((sum, q) => sum + q.responseCount, 0),
      avgResponseTimeMs: selectedDesign.avgQuestionTimeMs,
      expectedResponseTimeMs: 5000, // Expected 5 seconds for first impression
      avgRating,
      maxRating: 5,
    }

    return calculateFirstImpressionScore(scoreInput)
  }, [selectedDesign])

  // Calculate Recall Rate
  const recallData = useMemo(() => {
    return calculateRecallRate(textResponses, DEFAULT_UI_ELEMENTS)
  }, [textResponses])

  // Analyze Element Recognition
  const elementRecognition = useMemo(() => {
    return analyzeElementRecognition(textResponses, DEFAULT_UI_ELEMENTS)
  }, [textResponses])

  if (!designs.length) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            No designs have been configured for this study.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Design Selector */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground">Design</span>
        <Select value={selectedDesign?.designId} onValueChange={onSelectDesign}>
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="Select design" />
          </SelectTrigger>
          <SelectContent>
            {designs.map((design) => (
              <SelectItem key={design.designId} value={design.designId}>
                {design.designName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedDesign && (
        <>
          {/* Row 1: FI Score Gauge | Quick Stats 2x2 */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Left: FI Score Gauge */}
            {fiScore && (
              <FIScoreGauge
                score={fiScore}
                designName={selectedDesign.designName}
              />
            )}

            {/* Right: Quick Stats 2x2 */}
            <div className="grid grid-cols-2 gap-3">
              <QuickStatCard
                icon={<Users className="h-4 w-4" />}
                label="Total Exposures"
                value={selectedDesign.exposureCount.toString()}
                subtext={`${selectedDesign.exposurePercentage.toFixed(0)}% distribution`}
              />
              <QuickStatCard
                icon={<MessageSquare className="h-4 w-4" />}
                label="Response Rate"
                value={`${(selectedDesign.questionMetrics[0]?.responseRate || 0).toFixed(0)}%`}
                subtext="of participants responded"
              />
              <QuickStatCard
                icon={<Clock className="h-4 w-4" />}
                label="Avg. Response Time"
                value={`${(selectedDesign.avgQuestionTimeMs / 1000).toFixed(1)}s`}
                subtext="per question"
              />
              <QuickStatCard
                icon={<TrendingUp className="h-4 w-4" />}
                label="Engagement"
                value={fiScore ? `${fiScore.engagementScore}` : 'N/A'}
                subtext="engagement score"
              />
            </div>
          </div>

          {/* Row 2: Recall Rate | Element Recognition */}
          {hasTextQuestions ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <RecallRateCard
                recallRate={recallData.recallRate}
                totalRecalling={recallData.totalRecalling}
                totalResponses={recallData.totalResponses}
                threshold={recallData.threshold}
              />
              <ElementRecognitionChart
                results={elementRecognition}
                totalResponses={textResponses.length}
              />
            </div>
          ) : (
            <Card>
              <CardContent className="py-8">
                <div className="text-center text-muted-foreground">
                  <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p className="font-medium text-sm">Recall Rate and Element Recognition Unavailable</p>
                  <p className="text-xs mt-1.5 max-w-md mx-auto">
                    These metrics require text-type questions (short text or long text).
                    Configure text questions for your designs to enable recall and element recognition analysis.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

// Quick Stat Card Component
interface QuickStatCardProps {
  icon: React.ReactNode
  label: string
  value: string
  subtext: string
}

function QuickStatCard({ icon, label, value, subtext }: QuickStatCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          {icon}
          <span className="text-xs font-medium">{label}</span>
        </div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground">{subtext}</div>
      </CardContent>
    </Card>
  )
}
