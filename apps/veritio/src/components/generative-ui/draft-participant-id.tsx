'use client'

import { useCallback, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { useDebouncedEmit } from './use-debounced-emit'

interface DemographicField {
  fieldType: string
  enabled: boolean
  required: boolean
}

interface ParticipantIdState {
  type: 'anonymous' | 'demographic_profile'
  fields: DemographicField[]
}

interface DraftParticipantIdProps {
  participantId?: {
    type?: string
    demographicProfile?: {
      fields?: DemographicField[]
    }
  }
  propStatus?: Record<string, 'streaming' | 'complete'>
  onStateChange?: (state: { participantId: ParticipantIdState }) => void
}

const FIELD_CATEGORIES: Array<{ label: string; fields: Array<{ type: string; label: string }> }> = [
  {
    label: 'Basic',
    fields: [
      { type: 'name', label: 'Full Name' },
      { type: 'email', label: 'Email Address' },
      { type: 'phone', label: 'Phone Number' },
      { type: 'age', label: 'Age' },
      { type: 'gender', label: 'Gender' },
      { type: 'country', label: 'Country' },
    ],
  },
  {
    label: 'Professional',
    fields: [
      { type: 'company', label: 'Company' },
      { type: 'job_title', label: 'Job Title' },
      { type: 'department', label: 'Department' },
      { type: 'industry', label: 'Industry' },
      { type: 'experience_level', label: 'Experience Level' },
    ],
  },
  {
    label: 'Tech',
    fields: [
      { type: 'device_type', label: 'Device Type' },
      { type: 'browser', label: 'Browser' },
      { type: 'os', label: 'Operating System' },
    ],
  },
  {
    label: 'Education',
    fields: [
      { type: 'education_level', label: 'Education Level' },
      { type: 'field_of_study', label: 'Field of Study' },
    ],
  },
]

const DEFAULT_FIELDS: DemographicField[] = FIELD_CATEGORIES.flatMap((cat) =>
  cat.fields.map((f) => ({ fieldType: f.type, enabled: false, required: false })),
)

function getFieldState(fields: DemographicField[], fieldType: string): DemographicField {
  return fields.find((f) => f.fieldType === fieldType) ?? { fieldType, enabled: false, required: false }
}

export function DraftParticipantId({ participantId, propStatus, onStateChange }: DraftParticipantIdProps) {
  const initialType = (participantId?.type as 'anonymous' | 'demographic_profile') ?? 'anonymous'
  const initialFields = participantId?.demographicProfile?.fields ?? DEFAULT_FIELDS

  const [state, setState] = useState<ParticipantIdState>({
    type: initialType,
    fields: initialFields,
  })

  // Sync from incoming props
  const prevPropsRef = useRef(participantId)
  // eslint-disable-next-line react-hooks/refs
  if (participantId && participantId !== prevPropsRef.current) {
    // eslint-disable-next-line react-hooks/refs
    prevPropsRef.current = participantId
    setState({
      type: (participantId.type as 'anonymous' | 'demographic_profile') ?? 'anonymous',
      fields: participantId.demographicProfile?.fields ?? DEFAULT_FIELDS,
    })
  }

  const debouncedEmit = useDebouncedEmit<{ participantId: ParticipantIdState }>(onStateChange)

  const emitChange = useCallback(
    (updated: ParticipantIdState) => {
      debouncedEmit({ participantId: updated })
    },
    [debouncedEmit],
  )

  const handleTypeChange = useCallback(
    (type: 'anonymous' | 'demographic_profile') => {
      setState((prev) => {
        const updated = { ...prev, type }
        emitChange(updated)
        return updated
      })
    },
    [emitChange],
  )

  const handleFieldToggle = useCallback(
    (fieldType: string) => {
      setState((prev) => {
        const fields = prev.fields.map((f) =>
          f.fieldType === fieldType ? { ...f, enabled: !f.enabled, required: !f.enabled ? f.required : false } : f,
        )
        // If the field doesn't exist, add it
        if (!fields.find((f) => f.fieldType === fieldType)) {
          fields.push({ fieldType, enabled: true, required: false })
        }
        const updated = { ...prev, fields }
        emitChange(updated)
        return updated
      })
    },
    [emitChange],
  )

  const handleRequiredToggle = useCallback(
    (fieldType: string) => {
      setState((prev) => {
        const fields = prev.fields.map((f) =>
          f.fieldType === fieldType ? { ...f, required: !f.required } : f,
        )
        const updated = { ...prev, fields }
        emitChange(updated)
        return updated
      })
    },
    [emitChange],
  )

  const isStreaming = propStatus?.participantId === 'streaming'

  return (
    <div className="p-3">
      <span className="text-xs font-medium text-muted-foreground">Participant Identifier</span>

      {/* Type Selector */}
      <div className="mt-2.5 mb-4">
        <div className="flex rounded-md border border-border overflow-hidden bg-muted/50">
          <button
            type="button"
            className={cn(
              'flex-1 py-1.5 text-sm font-medium transition-colors',
              state.type === 'anonymous'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
            onClick={() => handleTypeChange('anonymous')}
          >
            Anonymous
          </button>
          <button
            type="button"
            className={cn(
              'flex-1 py-1.5 text-sm font-medium transition-colors',
              state.type === 'demographic_profile'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
            onClick={() => handleTypeChange('demographic_profile')}
          >
            Demographic Profile
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {state.type === 'anonymous'
            ? 'No identifying information collected from participants.'
            : 'Collect demographic fields from participants before the study.'}
        </p>
      </div>

      {/* Demographic fields */}
      {state.type === 'demographic_profile' && (
        <div className="space-y-4">
          {FIELD_CATEGORIES.map((cat) => (
            <div key={cat.label}>
              <span className="text-xs font-medium text-muted-foreground/60 uppercase tracking-wider">{cat.label}</span>
              <div className="mt-1.5 space-y-1">
                {cat.fields.map((field) => {
                  const fieldState = getFieldState(state.fields, field.type)
                  return (
                    <div key={field.type} className="flex items-center justify-between py-1">
                      <button
                        type="button"
                        className="flex items-center gap-2 text-sm text-foreground"
                        onClick={() => handleFieldToggle(field.type)}
                      >
                        <div
                          className={cn(
                            'h-4 w-4 rounded border transition-colors flex items-center justify-center',
                            fieldState.enabled
                              ? 'bg-primary border-primary'
                              : 'border-border bg-background',
                          )}
                        >
                          {fieldState.enabled && (
                            <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        {field.label}
                      </button>
                      {fieldState.enabled && (
                        <button
                          type="button"
                          className={cn(
                            'text-xs px-1.5 py-0.5 rounded transition-colors',
                            fieldState.required
                              ? 'bg-primary/10 text-primary font-medium'
                              : 'text-muted-foreground hover:text-foreground',
                          )}
                          onClick={() => handleRequiredToggle(field.type)}
                        >
                          {fieldState.required ? 'Required' : 'Optional'}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {isStreaming && (
        <div className="mt-2 text-xs text-muted-foreground animate-pulse">Configuring...</div>
      )}
    </div>
  )
}
