'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Sparkles } from 'lucide-react'
import useSWR from 'swr'
import { getAuthFetchInstance } from '@/lib/swr/fetcher'

interface AiFollowupEntry {
  id: string
  participant_id: string
  parent_question_id: string
  question_text: string
  trigger_reason: string | null
  position: number
  model_used: string
  created_at: string
  followup_question_type?: string
  followup_question_config?: {
    options?: { id: string; label: string }[]
    scalePoints?: number
    leftLabel?: string
    rightLabel?: string
  } | null
  response: {
    id: string
    response_value: Record<string, unknown>
    response_time_ms: number | null
    created_at: string
  } | null
}

interface AiFollowupResponsesPanelProps {
  studyId: string
  questionId: string
  participantId?: string
}

function renderResponseValue(entry: AiFollowupEntry): string {
  if (!entry.response) return ''
  const val = entry.response.response_value
  const type = entry.followup_question_type || 'text'

  switch (type) {
    case 'multiple_choice': {
      const optionId = typeof val === 'string' ? val : (val?.optionId as string) ?? (val?.text as string)
      const options = entry.followup_question_config?.options
      if (options && optionId) {
        const match = options.find((o) => o.id === optionId)
        if (match) return match.label
      }
      return String(optionId ?? 'No response')
    }
    case 'opinion_scale': {
      const rating = val?.rating ?? val?.value ?? val?.text
      const scalePoints = entry.followup_question_config?.scalePoints ?? 5
      return rating != null ? `Rated ${rating} / ${scalePoints}` : 'No response'
    }
    case 'yes_no': {
      const answer = val?.answer ?? val?.value ?? val?.text
      if (answer === true || answer === 'true' || answer === 'yes') return 'Yes'
      if (answer === false || answer === 'false' || answer === 'no') return 'No'
      return String(answer ?? 'No response')
    }
    default:
      return (val?.text as string) || 'No response'
  }
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
                <p>{renderResponseValue(entry)}</p>
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
