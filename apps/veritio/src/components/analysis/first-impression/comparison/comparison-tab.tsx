'use client'


import { useState, useMemo, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ArrowLeftRight, AlertCircle, Download } from 'lucide-react'
import type {
  FirstImpressionResultsResponse,
  FirstImpressionDesign,
  FirstImpressionResponse,
} from '@/services/results/first-impression'

// Extended design type with computed metrics
export interface DesignWithMetrics extends FirstImpressionDesign {
  exposureCount: number
  totalResponses: number
  avgResponseTime: number
  responses: FirstImpressionResponse[]
}
import { DesignComparisonCard } from './design-comparison-card'
import { ComparisonMetrics } from './comparison-metrics'
import { QuestionComparisonSection } from './question-comparison-section'
import { calculateChiSquareSignificance } from '@/lib/algorithms/statistical-significance'

interface ComparisonTabProps {
  results: FirstImpressionResultsResponse
}

export function ComparisonTab({ results }: ComparisonTabProps) {
  const { designs, responses } = results

  // Get designs with metrics
  const designsWithMetrics = useMemo(() => {
    return designs.map(design => {
      const designResponses = responses.filter(r => r.design_id === design.id)
      const designParticipants = new Set(designResponses.map(r => r.participant_id))

      // Calculate metrics
      const exposureCount = designParticipants.size
      const totalResponses = designResponses.length
      const avgResponseTime = designResponses.length > 0
        ? designResponses.reduce((sum, r) => sum + (r.response_time_ms || 0), 0) / designResponses.length
        : 0

      return {
        ...design,
        exposureCount,
        totalResponses,
        avgResponseTime,
        responses: designResponses,
      }
    })
  }, [designs, responses])

  // State for selected designs
  const [designAId, setDesignAId] = useState<string>(designsWithMetrics[0]?.id || '')
  const [designBId, setDesignBId] = useState<string>(designsWithMetrics[1]?.id || designsWithMetrics[0]?.id || '')

  // Get selected designs
  const designA = useMemo(() =>
    designsWithMetrics.find(d => d.id === designAId),
    [designsWithMetrics, designAId]
  )
  const designB = useMemo(() =>
    designsWithMetrics.find(d => d.id === designBId),
    [designsWithMetrics, designBId]
  )

  // Calculate statistical significance
  const significance = useMemo(() => {
    if (!designA || !designB) return null

    // Use chi-square test for response rate comparison
    return calculateChiSquareSignificance(
      designA.totalResponses,
      designA.exposureCount,
      designB.totalResponses,
      designB.exposureCount
    )
  }, [designA, designB])

  // Determine winner
  const winner = useMemo(() => {
    if (!designA || !designB || !significance?.isSignificant) return null

    const responseRateA = designA.exposureCount > 0
      ? designA.totalResponses / designA.exposureCount
      : 0
    const responseRateB = designB.exposureCount > 0
      ? designB.totalResponses / designB.exposureCount
      : 0

    if (responseRateA > responseRateB) return designA.id
    if (responseRateB > responseRateA) return designB.id
    return null
  }, [designA, designB, significance])

  // Swap designs
  const handleSwap = () => {
    setDesignAId(designBId)
    setDesignBId(designAId)
  }

  // Export comparison data to CSV
  const handleExportCSV = useCallback(() => {
    if (!designA || !designB) return

    const responseRateA = designA.exposureCount > 0
      ? (designA.totalResponses / designA.exposureCount * 100).toFixed(1)
      : '0'
    const responseRateB = designB.exposureCount > 0
      ? (designB.totalResponses / designB.exposureCount * 100).toFixed(1)
      : '0'

    // Build CSV content
    const rows = [
      ['Design Comparison Report'],
      ['Generated', new Date().toISOString()],
      [''],
      ['Metric', designA.name || `Design ${designA.position + 1}`, designB.name || `Design ${designB.position + 1}`, 'Difference'],
      ['Exposure Count', designA.exposureCount, designB.exposureCount, designA.exposureCount - designB.exposureCount],
      ['Total Responses', designA.totalResponses, designB.totalResponses, designA.totalResponses - designB.totalResponses],
      ['Response Rate (%)', responseRateA, responseRateB, (parseFloat(responseRateA) - parseFloat(responseRateB)).toFixed(1)],
      ['Avg Response Time (ms)', designA.avgResponseTime.toFixed(0), designB.avgResponseTime.toFixed(0), (designA.avgResponseTime - designB.avgResponseTime).toFixed(0)],
      [''],
      ['Statistical Analysis'],
      ['P-Value', significance?.pValue?.toFixed(4) || 'N/A'],
      ['Confidence Level', significance?.confidenceLevel || 'N/A'],
      ['Statistically Significant', significance?.isSignificant ? 'Yes' : 'No'],
      ['Winner', winner === designA.id ? (designA.name || `Design ${designA.position + 1}`) : winner === designB.id ? (designB.name || `Design ${designB.position + 1}`) : 'None'],
    ]

    const csvContent = rows.map(row => row.join(',')).join('\n')

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `design-comparison-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }, [designA, designB, significance, winner])

  if (designs.length < 2) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <AlertCircle className="h-12 w-12 mb-4 opacity-50" />
          <p className="text-lg font-medium">Comparison Not Available</p>
          <p className="text-sm">At least 2 designs are required for comparison.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Compact Design Selectors */}
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Design A</label>
          <Select value={designAId} onValueChange={setDesignAId}>
            <SelectTrigger>
              <SelectValue placeholder="Select design" />
            </SelectTrigger>
            <SelectContent>
              {designsWithMetrics.map(design => (
                <SelectItem
                  key={design.id}
                  value={design.id}
                  disabled={design.id === designBId}
                >
                  {design.name || `Design ${design.position + 1}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button variant="outline" size="icon" onClick={handleSwap} className="shrink-0">
          <ArrowLeftRight className="h-4 w-4" />
        </Button>

        <div className="flex-1">
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Design B</label>
          <Select value={designBId} onValueChange={setDesignBId}>
            <SelectTrigger>
              <SelectValue placeholder="Select design" />
            </SelectTrigger>
            <SelectContent>
              {designsWithMetrics.map(design => (
                <SelectItem
                  key={design.id}
                  value={design.id}
                  disabled={design.id === designAId}
                >
                  {design.name || `Design ${design.position + 1}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleExportCSV}
              disabled={!designA || !designB}
              className="shrink-0"
            >
              <Download className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Export CSV</TooltipContent>
        </Tooltip>
      </div>

      {/* Design Comparison Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {designA && (
          <DesignComparisonCard
            design={designA}
            isWinner={winner === designA.id}
            label="Design A"
          />
        )}
        {designB && (
          <DesignComparisonCard
            design={designB}
            isWinner={winner === designB.id}
            label="Design B"
          />
        )}
      </div>

      {/* Detailed Metrics Comparison */}
      {designA && designB && (
        <ComparisonMetrics
          designA={designA}
          designB={designB}
          winner={winner}
        />
      )}

      {/* Question-by-Question Comparison */}
      {designA && designB && (
        <QuestionComparisonSection
          designA={designA}
          designB={designB}
          results={results}
        />
      )}
    </div>
  )
}
