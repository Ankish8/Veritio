'use client'

/**
 * Response Drill Content
 *
 * Panel content for the FloatingActionBar right panel showing all responses
 * containing a selected word. Used when clicking a word in the word cloud.
 *
 * Features:
 * - Highlighted word in each response
 * - Participant metadata
 * - Navigation between responses
 * - Copy response functionality
 */

import { useMemo, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  MessageSquare,
  User,
  Clock,
} from 'lucide-react'
import {
  resolveParticipantDisplay,
  extractDemographicsFromMetadata,
} from '@/lib/utils/participant-display'
import type { ParticipantDisplaySettings } from '@veritio/study-types/study-flow-types'
import type { FirstImpressionResponse } from '@/services/results/first-impression'

interface ResponseDrillContentProps {
  word: string
  responses: FirstImpressionResponse[]
  totalResponses: number
  participants: any[]
  /** Display settings for participant identifiers (null = anonymous/P{n} mode) */
  displaySettings?: ParticipantDisplaySettings | null
}

export function ResponseDrillContent({
  word,
  responses,
  totalResponses,
  participants,
  displaySettings = null,
}: ResponseDrillContentProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Build participant lookup: id → { participant, 1-based index }
  const participantMap = useMemo(() => {
    const map = new Map<string, { participant: any; index: number }>()
    participants.forEach((p, idx) => {
      map.set(p.id, { participant: p, index: idx + 1 })
    })
    return map
  }, [participants])

  // Resolve display for a participant
  const getParticipantDisplay = useCallback((participantId: string) => {
    const entry = participantMap.get(participantId)
    if (!entry) return { primary: `P?`, secondary: null }
    const demographics = extractDemographicsFromMetadata(entry.participant.metadata)
    return resolveParticipantDisplay(displaySettings, {
      index: entry.index,
      demographics,
    })
  }, [participantMap, displaySettings])

  // Handle copy
  const handleCopy = useCallback(async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }, [])

  // Navigation
  const goToPrevious = useCallback(() => {
    setCurrentIndex(prev => Math.max(0, prev - 1))
  }, [])

  const goToNext = useCallback(() => {
    setCurrentIndex(prev => Math.min(responses.length - 1, prev + 1))
  }, [responses.length])

  if (responses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <MessageSquare className="h-12 w-12 mb-4 opacity-50" />
        <p>No responses found</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Summary */}
      <div className="px-4 py-3 border-b text-sm text-muted-foreground">
        Found in {responses.length} of {totalResponses} responses
        ({((responses.length / totalResponses) * 100).toFixed(1)}%)
      </div>

      {/* Navigation Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="text-sm text-muted-foreground">
          Response {currentIndex + 1} of {responses.length}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={goToPrevious}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={goToNext}
            disabled={currentIndex === responses.length - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Response List */}
      <ScrollArea className="flex-1">
        <div className="space-y-3 p-4">
          {responses.map((response, idx) => {
            const display = getParticipantDisplay(response.participant_id)
            const isActive = idx === currentIndex
            const text = response.response_value as string

            return (
              <ResponseCard
                key={response.id}
                response={response}
                text={text}
                word={word}
                participantDisplay={display}
                isActive={isActive}
                isCopied={copiedId === response.id}
                onCopy={() => handleCopy(text, response.id)}
                onClick={() => setCurrentIndex(idx)}
              />
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}

/** Empty state shown when no word is selected */
export function ResponseDrillEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground px-4 text-center">
      <MessageSquare className="h-12 w-12 mb-4 opacity-50" />
      <p className="font-medium">No word selected</p>
      <p className="text-sm mt-1">
        Click a word in the word cloud to see all responses containing it.
      </p>
    </div>
  )
}

// Response Card Component
interface ResponseCardProps {
  response: FirstImpressionResponse
  text: string
  word: string
  participantDisplay: { primary: string; secondary: string | null }
  isActive: boolean
  isCopied: boolean
  onCopy: () => void
  onClick: () => void
}

function ResponseCard({
  response,
  text,
  word,
  participantDisplay,
  isActive,
  isCopied,
  onCopy,
  onClick,
}: ResponseCardProps) {
  // Highlight the word in the text
  const highlightedText = useMemo(() => {
    if (!word || !text) return text

    const regex = new RegExp(`(${escapeRegExp(word)})`, 'gi')
    const parts = text.split(regex)

    return parts.map((part, idx) => {
      if (part.toLowerCase() === word.toLowerCase()) {
        return (
          <mark
            key={idx}
            className="bg-yellow-200 dark:bg-yellow-900 px-0.5 rounded"
          >
            {part}
          </mark>
        )
      }
      return part
    })
  }, [text, word])

  return (
    <div
      className={`
        p-4 rounded-lg border transition-all cursor-pointer
        ${isActive
          ? 'border-primary bg-primary/5 shadow-sm'
          : 'border-border hover:border-primary/50 hover:bg-muted/50'
        }
      `}
      onClick={onClick}
    >
      {/* Participant Info */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm">
          <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="font-medium truncate">{participantDisplay.primary}</span>
            {participantDisplay.secondary && (
              <span className="text-xs text-muted-foreground truncate">{participantDisplay.secondary}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {response.response_time_ms && (
            <Badge variant="outline" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              {(response.response_time_ms / 1000).toFixed(1)}s
            </Badge>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation()
              onCopy()
            }}
          >
            {isCopied ? (
              <Check className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>

      {/* Response Text */}
      <p className="text-sm leading-relaxed">
        &ldquo;{highlightedText}&rdquo;
      </p>
    </div>
  )
}

// Escape special regex characters
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
