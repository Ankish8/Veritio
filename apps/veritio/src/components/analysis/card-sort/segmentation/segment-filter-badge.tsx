'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { useSegment } from '@/contexts/segment-context'
import type { SegmentFilter } from '@/stores/segment-store'

function formatValue(filter: SegmentFilter): string {
  if (Array.isArray(filter.value)) {
    if (filter.operator === 'between') {
      return `${filter.value[0]}-${filter.value[1]}`
    }
    return (filter.value as string[]).join(', ')
  }
  return String(filter.value)
}

function formatType(filter: SegmentFilter): string {
  switch (filter.type) {
    case 'status':
      return 'Status'
    case 'url_tag':
      return filter.tagKey || 'URL Tag'
    case 'categories_created':
      return 'Categories'
    case 'question_response':
      return filter.questionText
        ? filter.questionText.slice(0, 20) + (filter.questionText.length > 20 ? '...' : '')
        : 'Question'
    default:
      return filter.type
  }
}

function formatOperator(filter: SegmentFilter): string {
  switch (filter.operator) {
    case 'equals':
      return '='
    case 'not_equals':
      return '≠'
    case 'contains':
      return 'contains'
    case 'greater_than':
      return '>'
    case 'less_than':
      return '<'
    case 'between':
      return 'between'
    case 'in':
      return 'in'
    default:
      return filter.operator
  }
}

interface SegmentFilterBadgeProps {
  filter: SegmentFilter
}

export function SegmentFilterBadge({ filter }: SegmentFilterBadgeProps) {
  const { removeFilter } = useSegment()

  const typeColors: Record<string, string> = {
    status: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
    url_tag: 'bg-purple-100 text-purple-800 hover:bg-purple-200',
    categories_created: 'bg-amber-100 text-amber-800 hover:bg-amber-200',
    question_response: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200',
  }

  return (
    <Badge
      variant="secondary"
      className={`gap-1 pr-1 ${typeColors[filter.type] || ''}`}
    >
      <span className="font-medium">{formatType(filter)}</span>
      <span className="opacity-60">{formatOperator(filter)}</span>
      <span>{formatValue(filter)}</span>
      <Button
        variant="ghost"
        size="sm"
        className="h-4 w-4 p-0 ml-1 hover:bg-transparent"
        onClick={() => removeFilter(filter.id)}
      >
        <X className="h-3 w-3" />
        <span className="sr-only">Remove filter</span>
      </Button>
    </Badge>
  )
}

export function SegmentFilterBadges() {
  const { filters, clearFilters } = useSegment()

  if (filters.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      {filters.map((filter) => (
        <SegmentFilterBadge key={filter.id} filter={filter} />
      ))}
      {filters.length > 1 && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-muted-foreground"
          onClick={clearFilters}
        >
          Clear all
        </Button>
      )}
    </div>
  )
}
