'use client'

import { useCallback, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { useDebouncedEmit } from './use-debounced-emit'

interface StudyDetails {
  title: string
  description?: string
  sortMode?: string
  purpose?: string
  participantRequirements?: string
}

interface DraftStudyDetailsProps {
  title?: string
  description?: string
  sort_mode?: string
  study_type?: string
  purpose?: string
  participant_requirements?: string
  propStatus?: Record<string, 'streaming' | 'complete'>
  onStateChange?: (state: { details: StudyDetails }) => void
}

const SORT_MODE_OPTIONS: Array<{ value: 'open' | 'closed' | 'hybrid'; label: string; description: string }> = [
  { value: 'open', label: 'Open', description: 'Participants create their own categories' },
  { value: 'closed', label: 'Closed', description: 'Participants sort into predefined categories' },
  { value: 'hybrid', label: 'Hybrid', description: 'Predefined categories + participants can create new ones' },
]

export function DraftStudyDetails({
  title: initialTitle,
  description: initialDescription,
  sort_mode: initialSortMode,
  study_type: studyType,
  purpose: initialPurpose,
  participant_requirements: initialParticipantRequirements,
  onStateChange,
}: DraftStudyDetailsProps) {
  const [details, setDetails] = useState<StudyDetails>({
    title: initialTitle ?? '',
    description: initialDescription ?? '',
    sortMode: (initialSortMode as StudyDetails['sortMode']) ?? 'open',
    purpose: initialPurpose ?? '',
    participantRequirements: initialParticipantRequirements ?? '',
  })

  // Sync from incoming props (e.g. when tool result arrives)
  const prevPropsRef = useRef({ initialTitle, initialDescription, initialSortMode, initialPurpose, initialParticipantRequirements })
  /* eslint-disable react-hooks/refs */
  if (
    initialTitle !== prevPropsRef.current.initialTitle ||
    initialDescription !== prevPropsRef.current.initialDescription ||
    initialSortMode !== prevPropsRef.current.initialSortMode ||
    initialPurpose !== prevPropsRef.current.initialPurpose ||
    initialParticipantRequirements !== prevPropsRef.current.initialParticipantRequirements
  ) {
    prevPropsRef.current = { initialTitle, initialDescription, initialSortMode, initialPurpose, initialParticipantRequirements }
    setDetails({
      title: initialTitle ?? '',
      description: initialDescription ?? '',
      sortMode: (initialSortMode as StudyDetails['sortMode']) ?? 'open',
      purpose: initialPurpose ?? '',
      participantRequirements: initialParticipantRequirements ?? '',
    })
  }
  /* eslint-enable react-hooks/refs */

  const debouncedEmit = useDebouncedEmit<{ details: StudyDetails }>(onStateChange)

  const emitChange = useCallback(
    (updated: StudyDetails) => {
      debouncedEmit({
        details: {
          title: updated.title,
          description: updated.description || undefined,
          sortMode: updated.sortMode,
          purpose: updated.purpose || undefined,
          participantRequirements: updated.participantRequirements || undefined,
        },
      })
    },
    [debouncedEmit],
  )

  const updateField = useCallback(
    (field: keyof StudyDetails, value: string) => {
      setDetails((prev) => {
        const updated = { ...prev, [field]: value }
        emitChange(updated)
        return updated
      })
    },
    [emitChange],
  )

  const isCardSort = studyType === 'card_sort'

  return (
    <div className="p-3">
      <span className="text-xs font-medium text-muted-foreground">Study Details</span>

      <div className="mt-2.5 space-y-3">
        {/* Title */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Title *</label>
          <input
            type="text"
            className="w-full text-sm bg-background border border-border rounded-md px-2.5 py-1.5 outline-none focus:border-primary transition-colors"
            value={details.title}
            onChange={(e) => updateField('title', e.target.value)}
            placeholder="Study title..."
            maxLength={100}
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Description</label>
          <textarea
            className="w-full text-sm bg-background border border-border rounded-md px-2.5 py-1.5 outline-none focus:border-primary transition-colors resize-none"
            value={details.description ?? ''}
            onChange={(e) => updateField('description', e.target.value)}
            placeholder="Brief study description..."
            maxLength={500}
            rows={2}
          />
        </div>

        {/* Sort Mode — card_sort only */}
        {isCardSort && (
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Sort Mode</label>
            <div className="flex rounded-md border border-border overflow-hidden bg-muted/50">
              {SORT_MODE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={cn(
                    'flex-1 py-1.5 text-sm font-medium transition-colors',
                    details.sortMode === option.value
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                  onClick={() => updateField('sortMode', option.value)}
                  title={option.description}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {SORT_MODE_OPTIONS.find((o) => o.value === details.sortMode)?.description}
            </p>
          </div>
        )}

        {/* Purpose */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Purpose</label>
          <textarea
            className="w-full text-sm bg-background border border-border rounded-md px-2.5 py-1.5 outline-none focus:border-primary transition-colors resize-none"
            value={details.purpose ?? ''}
            onChange={(e) => updateField('purpose', e.target.value)}
            placeholder="What's the goal of this study?"
            rows={2}
          />
        </div>

        {/* Participant Requirements */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Participant Requirements</label>
          <textarea
            className="w-full text-sm bg-background border border-border rounded-md px-2.5 py-1.5 outline-none focus:border-primary transition-colors resize-none"
            value={details.participantRequirements ?? ''}
            onChange={(e) => updateField('participantRequirements', e.target.value)}
            placeholder="Who should participate? (e.g., age, experience level...)"
            rows={2}
          />
        </div>
      </div>
    </div>
  )
}
