'use client'

/**
 * Text Statistics Panel
 *
 * Displays statistics about text responses:
 * - Total responses count
 * - Response rate
 * - Average word count
 * - Average character count
 * - Top keywords with frequency
 */

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { FileText, Hash, Type, BarChart3 } from 'lucide-react'
import type { FirstImpressionResponse } from '@/services/results/first-impression'

interface WordData {
  text: string
  size: number
  count: number
  percentage: number
}

interface TextStatsPanelProps {
  responses: FirstImpressionResponse[]
  wordData: WordData[]
  totalResponseCount: number
}

export function TextStatsPanel({
  responses,
  wordData,
  totalResponseCount,
}: TextStatsPanelProps) {
  // Calculate text statistics
  const stats = useMemo(() => {
    const validResponses = responses.filter(r => {
      const text = r.response_value as string
      return text && typeof text === 'string' && text.trim().length > 0
    })

    // Word and character counts
    let totalWords = 0
    let totalChars = 0

    for (const response of validResponses) {
      const text = response.response_value as string
      const words = text.trim().split(/\s+/).filter(w => w.length > 0)
      totalWords += words.length
      totalChars += text.length
    }

    const avgWordCount = validResponses.length > 0
      ? totalWords / validResponses.length
      : 0
    const avgCharCount = validResponses.length > 0
      ? totalChars / validResponses.length
      : 0

    // Response rate
    const responseRate = totalResponseCount > 0
      ? (validResponses.length / totalResponseCount) * 100
      : 0

    return {
      totalResponses: validResponses.length,
      responseRate,
      avgWordCount,
      avgCharCount,
      totalWords,
      totalUniqueWords: wordData.length,
    }
  }, [responses, wordData, totalResponseCount])

  // Top 10 keywords
  const topKeywords = useMemo(() => {
    return wordData.slice(0, 10)
  }, [wordData])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Text Statistics</CardTitle>
        <CardDescription>
          Analysis of text responses
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Response Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            icon={<FileText className="h-4 w-4" />}
            label="Responses"
            value={stats.totalResponses.toString()}
            subtext={`${stats.responseRate.toFixed(0)}% rate`}
          />
          <StatCard
            icon={<Hash className="h-4 w-4" />}
            label="Total Words"
            value={stats.totalWords.toLocaleString()}
            subtext={`${stats.totalUniqueWords} unique`}
          />
          <StatCard
            icon={<Type className="h-4 w-4" />}
            label="Avg. Words"
            value={stats.avgWordCount.toFixed(1)}
            subtext="per response"
          />
          <StatCard
            icon={<BarChart3 className="h-4 w-4" />}
            label="Avg. Length"
            value={stats.avgCharCount.toFixed(0)}
            subtext="characters"
          />
        </div>

        {/* Top Keywords */}
        <div>
          <h4 className="text-sm font-medium mb-3">Top Keywords</h4>
          {topKeywords.length > 0 ? (
            <div className="space-y-2">
              {topKeywords.map((keyword, idx) => (
                <KeywordRow
                  key={keyword.text}
                  rank={idx + 1}
                  word={keyword.text}
                  count={keyword.count}
                  percentage={keyword.percentage}
                  maxPercentage={topKeywords[0]?.percentage || 100}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No keywords found
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Stat Card Component
interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string
  subtext: string
}

function StatCard({ icon, label, value, subtext }: StatCardProps) {
  return (
    <div className="p-3 rounded-lg bg-muted/50 space-y-1">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="text-xl font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground">{subtext}</div>
    </div>
  )
}

// Keyword Row Component
interface KeywordRowProps {
  rank: number
  word: string
  count: number
  percentage: number
  maxPercentage: number
}

function KeywordRow({ rank, word, count, percentage, maxPercentage }: KeywordRowProps) {
  const relativeWidth = maxPercentage > 0 ? (percentage / maxPercentage) * 100 : 0

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground w-5 text-right shrink-0">
        {rank}.
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium truncate">{word}</span>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="outline" className="text-xs">
              {count}
            </Badge>
            <span className="text-xs text-muted-foreground w-12 text-right">
              {percentage.toFixed(1)}%
            </span>
          </div>
        </div>
        <Progress value={relativeWidth} className="h-1.5" />
      </div>
    </div>
  )
}
