'use client'

import { useMemo } from 'react'
import type { StudyFlowResponseRow } from '@veritio/study-types'
import { STOP_WORDS } from './text-utils'

interface TextStatsPanelProps {
  responses: StudyFlowResponseRow[]
  totalParticipants: number
  onKeywordClick?: (keyword: string) => void
  activeKeyword?: string
}

interface TextStats {
  responseCount: number
  totalParticipants: number
  responseRate: number
  avgWordCount: number
  avgCharCount: number
  topKeywords: Array<{ word: string; count: number }>
}

/**
 * Calculate text statistics from responses
 */
function calculateTextStats(
  responses: StudyFlowResponseRow[],
  totalParticipants: number
): TextStats {
  if (responses.length === 0) {
    return {
      responseCount: 0,
      totalParticipants,
      responseRate: 0,
      avgWordCount: 0,
      avgCharCount: 0,
      topKeywords: [],
    }
  }

  let totalWordCount = 0
  let totalCharCount = 0
  const wordCounts = new Map<string, number>()

  for (const response of responses) {
    const text = response.response_value as string
    if (!text || typeof text !== 'string') continue

    // Count characters (excluding leading/trailing whitespace)
    const trimmedText = text.trim()
    totalCharCount += trimmedText.length

    // Tokenize for word count and keyword extraction
    const words = trimmedText
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 0)

    totalWordCount += words.length

    // Count keywords (filtering stop words and short words)
    for (const word of words) {
      if (word.length > 2 && !STOP_WORDS.has(word)) {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1)
      }
    }
  }

  // Get top 5 keywords
  const topKeywords = Array.from(wordCounts.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  const responseCount = responses.length
  const responseRate = totalParticipants > 0
    ? Math.round((responseCount / totalParticipants) * 100)
    : 0

  return {
    responseCount,
    totalParticipants,
    responseRate,
    avgWordCount: Math.round((totalWordCount / responseCount) * 10) / 10,
    avgCharCount: Math.round((totalCharCount / responseCount) * 10) / 10,
    topKeywords,
  }
}

/**
 * Compact stats panel showing response statistics for text questions.
 * Displays: response count/rate, average word/char count, and top keywords.
 */
export function TextStatsPanel({
  responses,
  totalParticipants,
  onKeywordClick,
  activeKeyword,
}: TextStatsPanelProps) {
  const stats = useMemo(
    () => calculateTextStats(responses, totalParticipants),
    [responses, totalParticipants]
  )

  if (responses.length === 0) {
    return null
  }

  return (
    <div className="border border-border/50 rounded-lg p-4 mb-4 bg-background">
      <div className="flex flex-wrap items-start gap-8">
        {/* Stats grid */}
        <div className="flex gap-6">
          <StatItem
            value={stats.responseCount}
            label="responses"
            subtext={`of ${stats.totalParticipants} · ${stats.responseRate}%`}
          />
          <StatItem
            value={stats.avgWordCount}
            label="avg words"
          />
          <StatItem
            value={stats.avgCharCount}
            label="avg chars"
          />
        </div>

        {/* Keywords */}
        {stats.topKeywords.length > 0 && (
          <div className="flex-1 min-w-[200px]">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5">
              Top Keywords
              {onKeywordClick && (
                <span className="font-normal normal-case tracking-normal ml-1 opacity-60">
                  · click to filter
                </span>
              )}
            </p>
            <div className="flex flex-wrap gap-x-1 gap-y-0.5 text-sm">
              {stats.topKeywords.map(({ word }, index) => {
                const isActive = activeKeyword?.toLowerCase() === word.toLowerCase()
                return (
                  <span key={word} className="inline-flex items-center">
                    {onKeywordClick ? (
                      <button
                        onClick={() => onKeywordClick(isActive ? '' : word)}
                        className={`
                          rounded px-1.5 py-0.5 -mx-1.5 transition-colors
                          ${isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-muted text-foreground/80 hover:text-foreground'
                          }
                        `}
                      >
                        {word}
                      </button>
                    ) : (
                      <span className="text-foreground/80">{word}</span>
                    )}
                    {index < stats.topKeywords.length - 1 && (
                      <span className="text-muted-foreground/40 mx-0.5">·</span>
                    )}
                  </span>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Individual stat display component
 */
function StatItem({
  value,
  label,
  subtext,
}: {
  value: number | string
  label: string
  subtext?: string
}) {
  return (
    <div>
      <p className="text-xl font-semibold tabular-nums">{value}</p>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      {subtext && (
        <p className="text-[11px] text-muted-foreground/70 mt-0.5">{subtext}</p>
      )}
    </div>
  )
}
