'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Sparkles } from 'lucide-react'
import useSWR from 'swr'
import { getAuthFetchInstance } from '@/lib/swr/fetcher'
import { formatFollowupAnswer, type AiFollowupEntry } from '@/lib/ai-followup/format'

interface AiFollowupResponsesPanelProps {
  studyId: string
  questionId: string
  participantId?: string
}

export function AiFollowupResponsesPanel({ studyId, questionId, participantId }: AiFollowupResponsesPanelProps) {
  const [isOpen, setIsOpen] = useState(false)

  const { data } = useSWR<{ followups: Record<string, AiFollowupEntry[]> }>(
    `/api/studies/${studyId}/ai-followups`,
    (url: string) => getAuthFetchInstance()(url).then((r: Response) => r.json())
  )

  const allEntries = data?.followups?.[questionId]
  const entries = participantId
    ? allEntries?.filter((e) => e.participant_id === participantId)
    : allEntries
  if (!entries || entries.length === 0) return null

  return (
    <div className="mt-2 border rounded-lg">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
      >
        {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <Sparkles className="h-3 w-3" />
        AI Follow-up Responses ({entries.length})
      </button>

      {isOpen && (
        <div className="px-3 pb-3 space-y-3">
          {entries.map((entry) => (
            <div key={entry.id} className="text-sm space-y-1 pl-4 border-l-2 border-primary/20">
              <p className="font-medium text-muted-foreground">{entry.question_text}</p>
              {entry.response ? (
                <p>{formatFollowupAnswer(entry) || 'No response'}</p>
              ) : (
                <p className="text-muted-foreground italic">No response recorded</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
