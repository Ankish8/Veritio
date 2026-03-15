'use client'

import { useMemo, Suspense } from 'react'
import {
  LazyBarChart,
  LazyBar,
  LazyXAxis,
  LazyYAxis,
  LazyCartesianGrid,
  LazyTooltip,
  LazyResponsiveContainer,
  LazyCell,
  ChartLoadingSkeleton,
} from '@/components/ui/lazy-charts'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle, Copy } from 'lucide-react'
import type { StudyFlowQuestionRow, StudyFlowResponseRow } from '@veritio/study-types'

interface EmailVisualizationProps {
  question: StudyFlowQuestionRow
  responses: StudyFlowResponseRow[]
}

interface DomainData {
  domain: string
  count: number
  percentage: number
}

interface EmailStats {
  totalCount: number
  validCount: number
  invalidCount: number
  duplicateCount: number
  domains: DomainData[]
}

// Simple email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Color palette for domains
const DOMAIN_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-1)',
]

/**
 * Extract domain from email address
 */
function extractDomain(email: string): string | null {
  const parts = email.toLowerCase().trim().split('@')
  if (parts.length === 2 && parts[1]) {
    return parts[1]
  }
  return null
}

/**
 * Check if email is valid
 */
function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim())
}

/**
 * Analyze email responses
 */
function analyzeEmails(responses: StudyFlowResponseRow[]): EmailStats {
  const emails: string[] = []
  const domainCounts = new Map<string, number>()
  let validCount = 0
  let invalidCount = 0

  for (const response of responses) {
    const email = typeof response.response_value === 'string'
      ? response.response_value.trim()
      : ''

    if (!email) continue

    emails.push(email.toLowerCase())

    if (isValidEmail(email)) {
      validCount++
      const domain = extractDomain(email)
      if (domain) {
        domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1)
      }
    } else {
      invalidCount++
    }
  }

  // Count duplicates
  const uniqueEmails = new Set(emails)
  const duplicateCount = emails.length - uniqueEmails.size

  // Sort domains by count and prepare data
  const sortedDomains = Array.from(domainCounts.entries())
    .map(([domain, count]) => ({
      domain,
      count,
      percentage: Math.round((count / validCount) * 100),
    }))
    .sort((a, b) => b.count - a.count)

  // Group smaller domains into "Other" if more than 10 domains
  let domains: DomainData[]
  if (sortedDomains.length > 10) {
    const topDomains = sortedDomains.slice(0, 9)
    const otherDomains = sortedDomains.slice(9)
    const otherCount = otherDomains.reduce((sum, d) => sum + d.count, 0)
    const otherPercentage = Math.round((otherCount / validCount) * 100)

    domains = [
      ...topDomains,
      { domain: 'Other', count: otherCount, percentage: otherPercentage },
    ]
  } else {
    domains = sortedDomains
  }

  return {
    totalCount: responses.length,
    validCount,
    invalidCount,
    duplicateCount,
    domains,
  }
}

/**
 * Visualization for email text responses.
 * Shows domain breakdown and email quality statistics.
 */
export function EmailVisualization({
  question: _question,
  responses,
}: EmailVisualizationProps) {
  const stats = useMemo(() => analyzeEmails(responses), [responses])

  if (responses.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">No responses yet</p>
      </div>
    )
  }

  if (stats.validCount === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">No valid email addresses found</p>
        <p className="text-xs mt-1">
          {stats.invalidCount} response{stats.invalidCount !== 1 ? 's' : ''} are not valid email addresses
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Quality Summary */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <span className="text-sm">
            <span className="font-medium">{stats.validCount}</span>
            <span className="text-muted-foreground"> valid ({Math.round((stats.validCount / stats.totalCount) * 100)}%)</span>
          </span>
        </div>

        {stats.invalidCount > 0 && (
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-500" />
            <span className="text-sm">
              <span className="font-medium">{stats.invalidCount}</span>
              <span className="text-muted-foreground"> invalid</span>
            </span>
          </div>
        )}

        {stats.duplicateCount > 0 && (
          <div className="flex items-center gap-2">
            <Copy className="h-4 w-4 text-orange-500" />
            <span className="text-sm">
              <span className="font-medium">{stats.duplicateCount}</span>
              <span className="text-muted-foreground"> duplicate{stats.duplicateCount !== 1 ? 's' : ''}</span>
            </span>
          </div>
        )}
      </div>

      {/* Domain Type Indicators */}
      <div className="flex flex-wrap gap-2">
        {stats.domains.slice(0, 5).map(({ domain }) => {
          const isPersonal = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'aol.com'].includes(domain.toLowerCase())
          return (
            <Badge
              key={domain}
              variant={isPersonal ? 'secondary' : 'outline'}
              className="text-xs"
            >
              {domain}
              {isPersonal ? ' (Personal)' : ' (Business)'}
            </Badge>
          )
        })}
      </div>

      {/* Domain Breakdown Chart */}
      <div className="h-[300px]" style={{ contain: 'layout' }}>
        <Suspense fallback={<ChartLoadingSkeleton height={300} />}>
          <LazyResponsiveContainer width="100%" height="100%">
            <LazyBarChart
              data={stats.domains}
              layout="vertical"
              margin={{ top: 10, right: 30, left: 100, bottom: 10 }}
            >
              <LazyCartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
              <LazyXAxis
                type="number"
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
                allowDecimals={false}
              />
              <LazyYAxis
                type="category"
                dataKey="domain"
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
                width={90}
              />
              <LazyTooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null
                  const data = payload[0].payload as DomainData
                  return (
                    <div className="bg-popover border border-border rounded-md px-3 py-2 shadow-md">
                      <p className="text-sm font-medium">{data.domain}</p>
                      <p className="text-sm text-muted-foreground">
                        {data.count} email{data.count !== 1 ? 's' : ''} ({data.percentage}%)
                      </p>
                    </div>
                  )
                }}
              />
              <LazyBar dataKey="count" radius={[0, 4, 4, 0]}>
                {stats.domains.map((entry, index) => (
                  <LazyCell
                    key={`cell-${index}`}
                    fill={DOMAIN_COLORS[index % DOMAIN_COLORS.length]}
                  />
                ))}
              </LazyBar>
            </LazyBarChart>
          </LazyResponsiveContainer>
        </Suspense>
      </div>

      {/* Summary text */}
      <p className="text-xs text-muted-foreground text-center">
        {stats.domains.length} unique domain{stats.domains.length !== 1 ? 's' : ''} from {stats.validCount} valid email{stats.validCount !== 1 ? 's' : ''}
      </p>
    </div>
  )
}
