'use client'

/**
 * Enhanced Response Card Component
 *
 * Expandable card for text responses with:
 * - Click to expand full text
 * - Keyword highlighting from word cloud
 * - Participant metadata on hover
 * - Copy to clipboard button
 * - Tag display and assignment
 */

import { useState, useCallback, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ResponseMetadata } from './response-metadata'
import type {
  FirstImpressionResponse,
  FirstImpressionSession,
  FirstImpressionExposure,
} from '@/services/results/first-impression'

interface ResponseCardProps {
  studyId: string
  response: FirstImpressionResponse
  session: FirstImpressionSession | undefined
  exposure: FirstImpressionExposure | undefined
  designName: string
  highlightWord?: string | null
  onViewParticipant?: (participantId: string) => void
  className?: string
}

export function ResponseCard({
  studyId: _studyId,
  response,
  session,
  exposure,
  designName,
  highlightWord,
  onViewParticipant: _onViewParticipant,
  className,
}: ResponseCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  // Extract text value
  const textValue = useMemo(() => {
    const val = response.response_value
    if (typeof val === 'string') return val
    if (val?.value) return String(val.value)
    return JSON.stringify(val)
  }, [response.response_value])

  // Check if text is long enough to need expansion
  const isLongText = textValue.length > 200

  // Truncated text for collapsed view
  const displayText = useMemo(() => {
    if (expanded || !isLongText) return textValue
    return textValue.slice(0, 200) + '...'
  }, [textValue, expanded, isLongText])

  // Highlight word in text
  const highlightedText = useMemo(() => {
    if (!highlightWord) return displayText

    const regex = new RegExp(`(${highlightWord})`, 'gi')
    const parts = displayText.split(regex)

    return parts.map((part, idx) =>
      regex.test(part) ? (
        <mark key={idx} className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    )
  }, [displayText, highlightWord])

  // Copy to clipboard
  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(textValue)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [textValue])

  return (
    <Card
      className={cn(
        'p-3 transition-all hover:shadow-sm',
        expanded && 'bg-muted/50',
        className
      )}
    >
      <div className="flex items-start gap-3">
        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Text Content */}
          <div
            className={cn(
              'text-sm leading-relaxed',
              !expanded && isLongText && 'cursor-pointer'
            )}
            onClick={() => isLongText && setExpanded(!expanded)}
          >
            <span className="italic text-muted-foreground">&ldquo;</span>
            {highlightedText}
            <span className="italic text-muted-foreground">&rdquo;</span>
          </div>

          {/* Expand/Collapse for long text */}
          {isLongText && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 mt-1 text-xs gap-1"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-3 w-3" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3" />
                  Show more
                </>
              )}
            </Button>
          )}
        </div>

        {/* Actions */}
        <div className="shrink-0 flex items-center gap-1">
          {/* Copy Button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleCopy}
            title={copied ? 'Copied!' : 'Copy to clipboard'}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-600" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </Button>

          {/* Metadata Tooltip */}
          <ResponseMetadata
            session={session}
            exposure={exposure}
            designName={designName}
            submittedAt={response.submitted_at}
            responseTimeMs={response.response_time_ms}
          />
        </div>
      </div>
    </Card>
  )
}

/**
 * Response Card Skeleton for loading states
 */
export function ResponseCardSkeleton() {
  return (
    <Card className="p-3">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
          <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
        </div>
      </div>
    </Card>
  )
}
