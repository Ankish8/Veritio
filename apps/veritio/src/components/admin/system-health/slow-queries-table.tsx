'use client'

import { AlertTriangle, CheckCircle2, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { toast } from '@/components/ui/sonner'

interface SlowQueriesTableProps {
  queries: Array<{
    query: string
    avg_duration_ms: number
    call_count: number
  }>
}

function getPerformanceColor(ms: number): string {
  if (ms >= 1000) return 'text-red-600'
  if (ms >= 500) return 'text-amber-600'
  if (ms >= 200) return 'text-yellow-600'
  return 'text-emerald-600'
}

function getPerformanceBadge(ms: number): string {
  if (ms >= 1000) return 'CRITICAL'
  if (ms >= 500) return 'SLOW'
  if (ms >= 200) return 'WARNING'
  return 'OK'
}

function getPerformanceBadgeColor(ms: number): string {
  if (ms >= 1000) return 'border-red-200 bg-red-50 text-red-700'
  if (ms >= 500) return 'border-amber-200 bg-amber-50 text-amber-700'
  if (ms >= 200) return 'border-yellow-200 bg-yellow-50 text-yellow-700'
  return 'border-emerald-200 bg-emerald-50 text-emerald-700'
}

function extractTableName(query: string): string {
  const patterns = [
    /FROM\s+"?([^"\s,()]+)"?/i,
    /INTO\s+"?([^"\s,()]+)"?/i,
    /UPDATE\s+"?([^"\s,()]+)"?/i,
    /COPY\s+"?([^"\s,()]+)"?/i,
  ]
  for (const pattern of patterns) {
    const match = query.match(pattern)
    if (match && match[1]) {
      return match[1].replace(/^["']|["']$/g, '').trim()
    }
  }
  return 'N/A'
}

function CopyButton({ query }: { query: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(query)
      setCopied(true)
      toast.success('Query copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy query')
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="ml-2 p-1.5 hover:bg-muted rounded transition-all"
      title="Copy query"
      aria-label="Copy query to clipboard"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-emerald-600" />
      ) : (
        <Copy className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
      )}
    </button>
  )
}

export function SlowQueriesTable({ queries }: SlowQueriesTableProps) {
  const sortedQueries = [...queries].sort((a, b) => b.avg_duration_ms - a.avg_duration_ms)

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
          <h3 className="text-lg font-semibold">Slow Queries</h3>
        </div>
        <span className="text-xs text-muted-foreground">
          {sortedQueries.length} queries &gt;100ms
        </span>
      </div>

      <div className="bg-card border rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Query
                </th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                  Avg Time
                </th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                  Calls
                </th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Table
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sortedQueries.slice(0, 20).map((query, index) => {
                const tableName = extractTableName(query.query)
                return (
                  <tr key={index} className="hover:bg-muted/30 transition-colors group">
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        <code className="text-xs text-muted-foreground block truncate max-w-md group-hover:text-foreground transition-colors font-mono">
                          {query.query}
                        </code>
                        <CopyButton query={query.query} />
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <span className={`text-sm font-semibold ${getPerformanceColor(query.avg_duration_ms)}`}>
                        {query.avg_duration_ms.toFixed(2)}ms
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <span className="text-sm text-foreground">
                        {query.call_count.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-1 text-xs font-semibold border rounded ${getPerformanceBadgeColor(query.avg_duration_ms)}`}
                      >
                        {getPerformanceBadge(query.avg_duration_ms)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs font-mono text-muted-foreground">
                        {tableName}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {sortedQueries.length === 0 && (
          <div className="py-12 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground font-medium">No slow queries detected</p>
          </div>
        )}
      </div>
    </section>
  )
}
