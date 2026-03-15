'use client'

import { useMemo, Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Layers } from 'lucide-react'
import type { CardSortResponse, Participant, Card as CardType } from '@veritio/study-types'

import {
  LazyResponsiveContainer,
  LazyBarChart,
  LazyBar,
  LazyXAxis,
  LazyYAxis,
  LazyTooltip,
  ChartLoadingSkeleton,
  ChartWrapper,
} from '@/components/ui/lazy-charts'

import { CompletionDisplay, TimeDisplay, DeviceInfoDisplay } from '@/components/analysis/shared'
import { CHART_COLORS } from '@/lib/colors'

interface ResultsOverviewProps {
  stats: {
    totalParticipants: number
    completedParticipants: number
    abandonedParticipants: number
    completionRate: number
    avgCompletionTimeMs: number
  }
  responses?: CardSortResponse[]
  participants?: Participant[]
  cards?: CardType[]
  standardizations?: { standardizedName: string; originalNames: string[]; agreementScore: number }[]
}

function CategoriesCreatedChart({ responses }: { responses?: CardSortResponse[] }) {
  const { chartData, totalCategories, medianCategories } = useMemo(() => {
    if (!responses || responses.length === 0) {
      return { chartData: [], totalCategories: 0, medianCategories: 0 }
    }

    const categoryCounts: Record<number, number> = {}
    const perParticipantCounts: number[] = []
    let total = 0

    for (const r of responses) {
      const numCategories = (r.custom_categories as string[] | null)?.length || 0
      categoryCounts[numCategories] = (categoryCounts[numCategories] || 0) + 1
      perParticipantCounts.push(numCategories)
      total += numCategories
    }

    perParticipantCounts.sort((a, b) => a - b)
    const median = perParticipantCounts[Math.floor(perParticipantCounts.length / 2)]

    const chartData = Object.entries(categoryCounts)
      .map(([num, count]) => ({
        categories: parseInt(num),
        count,
        percentage: Math.round((count / responses.length) * 100)
      }))
      .sort((a, b) => a.categories - b.categories)

    return { chartData, totalCategories: total, medianCategories: median }
  }, [responses])

  if (chartData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Layers className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">
          We're just waiting for some participant data to come through — check back soon!
        </p>
      </div>
    )
  }

  const maxCategory = Math.max(...chartData.map(d => d.categories))
  const chartMap = new Map(chartData.map(d => [d.categories, d]))
  const CAP = 30
  const isCapped = maxCategory > CAP
  const fillLimit = Math.min(maxCategory, CAP)
  const filledData = []
  for (let i = 0; i <= fillLimit; i++) {
    filledData.push(chartMap.get(i) || { categories: i, count: 0, percentage: 0 })
  }
  if (isCapped) {
    let overflowCount = 0
    for (const d of chartData) {
      if (d.categories > CAP) overflowCount += d.count
    }
    const overflowPercentage = responses ? Math.round((overflowCount / responses.length) * 100) : 0
    filledData.push({ categories: CAP + 1, count: overflowCount, percentage: overflowPercentage })
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Your participants created a <span className="font-medium text-foreground">total of {totalCategories} categories</span>, with a <span className="font-medium text-foreground">median of {medianCategories} categories</span> each.
      </p>
      <ChartWrapper height={220} className="h-[180px] sm:h-[200px] lg:h-[220px]">
        <Suspense fallback={<ChartLoadingSkeleton height={200} />}>
          <LazyResponsiveContainer width="100%" height="100%">
            <LazyBarChart data={filledData} margin={{ top: 10, right: 10, left: 0, bottom: 25 }} barCategoryGap="20%">
              <LazyXAxis
                dataKey="categories"
                axisLine={{ stroke: CHART_COLORS.axisStroke }}
                tickLine={false}
                tick={{ fontSize: 11, fill: CHART_COLORS.tickFill }}
                tickFormatter={(value) => isCapped && value === CAP + 1 ? `${CAP}+` : String(value)}
                label={{
                  value: 'Number of categories',
                  position: 'bottom',
                  offset: 10,
                  style: { fontSize: 14, fill: CHART_COLORS.tickFill }
                }}
              />
              <LazyYAxis
                domain={[0, 100]}
                ticks={[0, 20, 40, 60, 80, 100]}
                axisLine={{ stroke: CHART_COLORS.axisStroke }}
                tickLine={false}
                tick={{ fontSize: 11, fill: CHART_COLORS.tickFill }}
                label={{
                  value: '% of participants',
                  angle: -90,
                  position: 'insideLeft',
                  offset: 10,
                  style: { fontSize: 11, fill: CHART_COLORS.tickFill, textAnchor: 'middle' }
                }}
                width={50}
              />
              <LazyTooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload
                    const label = isCapped && data.categories === CAP + 1 ? `${CAP}+ categories` : `${data.categories} categories`
                    return (
                      <div className="bg-popover border rounded-md px-3 py-2 shadow-md">
                        <p className="text-sm font-medium">{label}</p>
                        <p className="text-xs text-muted-foreground">{data.count} participants ({data.percentage}%)</p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <LazyBar dataKey="percentage" fill={CHART_COLORS.barDefault} radius={[2, 2, 0, 0]} />
            </LazyBarChart>
          </LazyResponsiveContainer>
        </Suspense>
      </ChartWrapper>
      {isCapped && (
        <p className="text-xs text-muted-foreground text-center">Categories beyond 30 grouped together</p>
      )}
    </div>
  )
}

function StandardizationSummary({
  standardizations,
  responses,
  cards
}: {
  standardizations?: { standardizedName: string; originalNames: string[]; agreementScore: number }[]
  responses?: CardSortResponse[]
  cards?: CardType[]
}) {
  const summaryData = useMemo(() => {
    if (!standardizations || standardizations.length === 0 || !responses) {
      return null
    }

    const categoryMap = new Map<string, string>()
    standardizations.forEach(s => {
      s.originalNames.forEach(orig => {
        categoryMap.set(orig.toLowerCase(), s.standardizedName)
      })
    })

    const cardCounts = new Map<string, Set<string>>()
    standardizations.forEach(s => {
      cardCounts.set(s.standardizedName, new Set())
    })

    if (cards) {
      for (const card of cards) {
        for (const response of responses) {
          const placements = response.card_placements as Record<string, string>
          const categoryName = placements[card.id]
          if (categoryName) {
            const standardized = categoryMap.get(categoryName.toLowerCase())
            if (standardized) {
              cardCounts.get(standardized)?.add(card.id)
            }
          }
        }
      }
    }

    const categories = standardizations
      .map(s => ({
        name: s.standardizedName,
        mergedCount: s.originalNames.length,
        agreementScore: s.agreementScore,
        cardCount: cardCounts.get(s.standardizedName)?.size || 0,
      }))
      .sort((a, b) => b.agreementScore - a.agreementScore)

    return { categories, totalResponses: responses.length }
  }, [standardizations, responses, cards])

  if (!summaryData || summaryData.categories.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <div className="relative mb-6">
          <div className="w-16 h-16 rounded-lg bg-emerald-100 flex items-center justify-center rotate-[-8deg]">
            <div className="w-10 h-10 rounded bg-emerald-500" />
          </div>
          <div className="absolute top-2 left-4 w-12 h-12 rounded-lg border-2 border-dashed border-muted-foreground/30 rotate-[8deg]" />
        </div>
        <div className="mt-2 space-y-2">
          <p className="text-sm font-medium text-emerald-600">Nothing has been standardized yet</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Standardize categories in the Categories tab to see a summary here.
          </p>
        </div>
      </div>
    )
  }

  const { categories, totalResponses } = summaryData
  const displayCategories = categories.slice(0, 5)
  const hasMore = categories.length > 5

  const getBarColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-600'
    if (score >= 60) return 'bg-emerald-400'
    if (score >= 40) return 'bg-amber-500'
    return 'bg-red-400'
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600'
    if (score >= 60) return 'text-emerald-500'
    if (score >= 40) return 'text-amber-600'
    return 'text-red-500'
  }

  return (
    <div className="flex-1 flex flex-col">
      <p className="text-sm text-muted-foreground mb-4">
        Cards sorted into <span className="font-medium text-foreground">{categories.length} standardized {categories.length === 1 ? 'category' : 'categories'}</span> by {totalResponses} participants.
      </p>

      <div className="flex-1 flex flex-col justify-center">
        <div className="divide-y">
          {displayCategories.map((cat) => (
            <div key={cat.name} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate" title={cat.name}>{cat.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Merged {cat.mergedCount} {cat.mergedCount === 1 ? 'category' : 'categories'} · {cat.cardCount} {cat.cardCount === 1 ? 'card' : 'cards'}
                  </p>
                </div>
                <span className={`text-lg font-semibold tabular-nums shrink-0 ${getScoreColor(cat.agreementScore)}`}>
                  {Math.round(cat.agreementScore)}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full ${getBarColor(cat.agreementScore)}`}
                  style={{ width: `${Math.max(cat.agreementScore, 3)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {hasMore && (
        <p className="text-xs text-muted-foreground text-center mt-3">
          Showing 5 of {categories.length}. View all in Categories tab.
        </p>
      )}

      <div className="flex items-center justify-center gap-1.5 mt-auto pt-4">
        <span className="text-sm text-muted-foreground/70">Low agreement</span>
        <div className="flex h-1.5 w-16 rounded-full overflow-hidden">
          <div className="flex-1 bg-red-400" />
          <div className="flex-1 bg-amber-500" />
          <div className="flex-1 bg-emerald-400" />
          <div className="flex-1 bg-emerald-600" />
        </div>
        <span className="text-sm text-muted-foreground/70">High</span>
      </div>
    </div>
  )
}

export function ResultsOverview({
  stats,
  responses,
  participants,
  cards,
  standardizations
}: ResultsOverviewProps) {
  const times = useMemo(() => {
    if (!responses || responses.length === 0) return []
    return responses
      .filter(r => r.total_time_ms && r.total_time_ms > 0)
      .map(r => r.total_time_ms as number)
  }, [responses])

  const timeMessage = !responses || responses.length === 0
    ? "Here you'll see how long participants take to complete your study."
    : times.length === 0
      ? "Waiting for completion time data."
      : null

  return (
    <div className="space-y-6 sm:space-y-8">
      <section>
        <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Participants</h2>
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Completion</CardTitle>
            </CardHeader>
            <CardContent>
              <CompletionDisplay
                completed={stats.completedParticipants}
                total={stats.totalParticipants}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Time taken</CardTitle>
            </CardHeader>
            <CardContent>
              <TimeDisplay avgMs={stats.avgCompletionTimeMs} times={times} />
              {timeMessage && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  {timeMessage}
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="sm:col-span-2 lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Device Info</CardTitle>
            </CardHeader>
            <CardContent>
              <DeviceInfoDisplay participants={participants as any || []} />
            </CardContent>
          </Card>
        </div>
      </section>

      <section>
        <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Categories</h2>
        <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-10">
          <Card className="md:col-span-2 lg:col-span-7">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Categories created</CardTitle>
            </CardHeader>
            <CardContent>
              <CategoriesCreatedChart responses={responses} />
            </CardContent>
          </Card>

          <Card className="lg:col-span-3 flex flex-col">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Standardization</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <StandardizationSummary
                standardizations={standardizations}
                responses={responses}
                cards={cards}
              />
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
