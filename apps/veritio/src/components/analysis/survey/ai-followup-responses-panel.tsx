'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Sparkles } from 'lucide-react'
import useSWR from 'swr'
import { getAuthFetchInstance } from '@/lib/swr/fetcher'
import { followupStats, formatFollowupAnswer, isFollowupSkipped, type AiFollowupEntry } from '@/lib/ai-followup/format'

const INITIAL_VISIBLE = 20

interface AiFollowupResponsesPanelProps {
  studyId: string
  questionId: string
  participantId?: string
}

export function AiFollowupResponsesPanel({ studyId, questionId, participantId }: AiFollowupResponsesPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showAll, setShowAll] = useState(false)

  const { data } = useSWR<{ followups: Record<string, AiFollowupEntry[]> }>(
    `/api/studies/${studyId}/ai-followups`,
    (url: string) => getAuthFetchInstance()(url).then((r: Response) => r.json())
  )

  const allEntries = data?.followups?.[questionId]
  const entries = participantId
    ? allEntries?.filter((e) => e.participant_id === participantId)
    : allEntries
  if (!entries || entries.length === 0) return null

  const stats = followupStats(entries)
  const visible = showAll ? entries : entries.slice(0, INITIAL_VISIBLE)
  const summary = [
    `${stats.answered} answered`,
    stats.skipped > 0 ? `${stats.skipped} skipped` : null,
    stats.unanswered > 0 ? `${stats.unanswered} no response` : null,
  ].filter(Boolean).join(' · ')

  return (
    <div className="mt-2 border rounded-lg">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
      >
        {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <Sparkles className="h-3 w-3" />
        AI Follow-ups ({stats.asked})
        <span className="ml-auto font-normal">{summary}</span>
      </button>

      {isOpen && (
        <div className="px-3 pb-3 space-y-3">
          {visible.map((entry) => (
            <div key={entry.id} className="text-sm space-y-1 pl-4 border-l-2 border-primary/20">
              <p className="font-medium text-muted-foreground">{entry.question_text}</p>
              {isFollowupSkipped(entry) ? (
                <p className="text-muted-foreground italic">Skipped by participant</p>
              ) : entry.response ? (
                <p>{formatFollowupAnswer(entry) || 'No response'}</p>
              ) : (
                <p className="text-muted-foreground italic">No response recorded</p>
              )}
            </div>
          ))}
          {!showAll && entries.length > INITIAL_VISIBLE && (
            <button
              type="button"
              onClick={() => setShowAll(true)}
              className="text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Show {entries.length - INITIAL_VISIBLE} more
            </button>
          )}
        </div>
      )}
    </div>
  )
}
