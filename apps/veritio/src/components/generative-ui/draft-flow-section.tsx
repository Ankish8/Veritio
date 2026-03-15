'use client'

import { useCallback, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { useDebouncedEmit } from './use-debounced-emit'

/** Strip HTML tags from AI-generated content, preserving line breaks from block elements */
function stripHtml(html: string | undefined): string {
  if (!html) return ''
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
    .replace(/<\/?(p|div|h[1-6]|li|ul|ol|blockquote)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

interface FlowSectionState {
  sectionType: string
  enabled: boolean
  title: string
  message: string
  // Welcome
  includeStudyTitle?: boolean
  includeDescription?: boolean
  includePurpose?: boolean
  includeParticipantRequirements?: boolean
  showIncentive?: boolean
  // Agreement
  agreementText?: string
  rejectionTitle?: string
  rejectionMessage?: string
  redirectUrl?: string
  // Thank you
  redirectDelay?: number
  // Instructions
  part1?: string
  part2?: string
}

interface DraftFlowSectionProps {
  sectionType?: string
  enabled?: boolean
  title?: string
  message?: string
  includeStudyTitle?: boolean
  includeDescription?: boolean
  includePurpose?: boolean
  includeParticipantRequirements?: boolean
  showIncentive?: boolean
  agreementText?: string
  rejectionTitle?: string
  rejectionMessage?: string
  redirectUrl?: string
  redirectDelay?: number
  part1?: string
  part2?: string
  // Study details for welcome toggles (read-only, from DB)
  _studyTitle?: string
  _studyDescription?: string
  _studyPurpose?: string
  _studyParticipantRequirements?: string
  propStatus?: Record<string, 'streaming' | 'complete'>
  onStateChange?: (state: { flowSection: FlowSectionState }) => void
}

const SECTION_LABELS: Record<string, string> = {
  welcome: 'Welcome Message',
  agreement: 'Participant Agreement',
  thank_you: 'Thank You Message',
  instructions: 'Activity Instructions',
}

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <div>
      <button type="button" className="flex items-center justify-between w-full py-1.5 group" onClick={() => onChange(!checked)}>
        <span className="text-sm text-foreground">{label}</span>
        <div className={cn('relative h-5 w-9 rounded-full transition-colors shrink-0 ml-3', checked ? 'bg-primary' : 'bg-muted')}>
          <div className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform', checked ? 'translate-x-4' : 'translate-x-0.5')} />
        </div>
      </button>
      {checked && hint && (
        <p className="text-xs text-muted-foreground ml-0.5 -mt-0.5 mb-1">{hint}</p>
      )}
    </div>
  )
}

export function DraftFlowSection(props: DraftFlowSectionProps) {
  const sectionType = props.sectionType ?? 'welcome'
  const [state, setState] = useState<FlowSectionState>({
    sectionType,
    enabled: props.enabled ?? true,
    title: stripHtml(props.title),
    message: stripHtml(props.message),
    includeStudyTitle: props.includeStudyTitle,
    includeDescription: props.includeDescription,
    includePurpose: props.includePurpose,
    includeParticipantRequirements: props.includeParticipantRequirements,
    showIncentive: props.showIncentive,
    agreementText: stripHtml(props.agreementText),
    rejectionTitle: stripHtml(props.rejectionTitle),
    rejectionMessage: stripHtml(props.rejectionMessage),
    redirectUrl: props.redirectUrl,
    redirectDelay: props.redirectDelay,
    part1: stripHtml(props.part1),
    part2: stripHtml(props.part2),
  })

  // Sync from incoming props
  const prevPropsRef = useRef(props)
  /* eslint-disable react-hooks/refs */
  if (props !== prevPropsRef.current) {
    const p = props
    const prev = prevPropsRef.current
    if (
      p.sectionType !== prev.sectionType ||
      p.enabled !== prev.enabled ||
      p.title !== prev.title ||
      p.message !== prev.message
    ) {
      prevPropsRef.current = p
      setState({
        sectionType: p.sectionType ?? 'welcome',
        enabled: p.enabled ?? true,
        title: stripHtml(p.title),
        message: stripHtml(p.message),
        includeStudyTitle: p.includeStudyTitle,
        includeDescription: p.includeDescription,
        includePurpose: p.includePurpose,
        includeParticipantRequirements: p.includeParticipantRequirements,
        showIncentive: p.showIncentive,
        agreementText: stripHtml(p.agreementText),
        rejectionTitle: stripHtml(p.rejectionTitle),
        rejectionMessage: stripHtml(p.rejectionMessage),
        redirectUrl: p.redirectUrl,
        redirectDelay: p.redirectDelay,
        part1: stripHtml(p.part1),
        part2: stripHtml(p.part2),
      })
    }
  }
  /* eslint-enable react-hooks/refs */

  const debouncedEmit = useDebouncedEmit<{ flowSection: FlowSectionState }>(props.onStateChange)

  const emitChange = useCallback(
    (updated: FlowSectionState) => {
      debouncedEmit({ flowSection: updated })
    },
    [debouncedEmit],
  )

  const updateField = useCallback(
    (field: keyof FlowSectionState, value: unknown) => {
      setState((prev) => {
        const updated = { ...prev, [field]: value }
        emitChange(updated)
        return updated
      })
    },
    [emitChange],
  )

  const sectionLabel = SECTION_LABELS[sectionType] ?? sectionType

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground">{sectionLabel}</span>
        <Toggle checked={state.enabled} onChange={(v) => updateField('enabled', v)} label="" />
      </div>

      <div className={cn('space-y-3', !state.enabled && 'opacity-40 pointer-events-none')}>
        {/* Title */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Title</label>
          <input
            type="text"
            className="w-full text-sm bg-background border border-border rounded-md px-2.5 py-1.5 outline-none focus:border-primary transition-colors"
            value={state.title}
            onChange={(e) => updateField('title', e.target.value)}
            placeholder={`${sectionLabel} title...`}
          />
        </div>

        {/* Message — for welcome, agreement, thank_you */}
        {sectionType !== 'instructions' && (
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Message</label>
            <textarea
              className="w-full text-sm bg-background border border-border rounded-md px-2.5 py-1.5 outline-none focus:border-primary transition-colors resize-none"
              value={state.message}
              onChange={(e) => updateField('message', e.target.value)}
              placeholder="Message content..."
              rows={3}
            />
          </div>
        )}

        {/* Welcome-specific toggles */}
        {sectionType === 'welcome' && (
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground mb-1 block">Include in Welcome</label>
            <Toggle checked={state.includeStudyTitle ?? false} onChange={(v) => updateField('includeStudyTitle', v)} label="Study Title" hint={props._studyTitle} />
            <Toggle checked={state.includeDescription ?? false} onChange={(v) => updateField('includeDescription', v)} label="Description" hint={props._studyDescription} />
            <Toggle checked={state.includePurpose ?? false} onChange={(v) => updateField('includePurpose', v)} label="Purpose" hint={props._studyPurpose} />
            <Toggle checked={state.includeParticipantRequirements ?? false} onChange={(v) => updateField('includeParticipantRequirements', v)} label="Participant Requirements" hint={props._studyParticipantRequirements} />
            <Toggle checked={state.showIncentive ?? false} onChange={(v) => updateField('showIncentive', v)} label="Show Incentive" hint="Shows the incentive card to participants" />
          </div>
        )}

        {/* Agreement-specific */}
        {sectionType === 'agreement' && (
          <>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Agreement Text</label>
              <textarea
                className="w-full text-sm bg-background border border-border rounded-md px-2.5 py-1.5 outline-none focus:border-primary transition-colors resize-none"
                value={state.agreementText ?? ''}
                onChange={(e) => updateField('agreementText', e.target.value)}
                placeholder="The agreement participants must accept..."
                rows={3}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Rejection Title</label>
              <input
                type="text"
                className="w-full text-sm bg-background border border-border rounded-md px-2.5 py-1.5 outline-none focus:border-primary transition-colors"
                value={state.rejectionTitle ?? ''}
                onChange={(e) => updateField('rejectionTitle', e.target.value)}
                placeholder="Title if participant declines..."
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Rejection Message</label>
              <textarea
                className="w-full text-sm bg-background border border-border rounded-md px-2.5 py-1.5 outline-none focus:border-primary transition-colors resize-none"
                value={state.rejectionMessage ?? ''}
                onChange={(e) => updateField('rejectionMessage', e.target.value)}
                placeholder="Message shown when declining..."
                rows={2}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Redirect URL</label>
              <input
                type="text"
                className="w-full text-sm bg-background border border-border rounded-md px-2.5 py-1.5 outline-none focus:border-primary transition-colors"
                value={state.redirectUrl ?? ''}
                onChange={(e) => updateField('redirectUrl', e.target.value)}
                placeholder="https://..."
              />
            </div>
          </>
        )}

        {/* Thank you-specific */}
        {sectionType === 'thank_you' && (
          <>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Redirect URL</label>
              <input
                type="text"
                className="w-full text-sm bg-background border border-border rounded-md px-2.5 py-1.5 outline-none focus:border-primary transition-colors"
                value={state.redirectUrl ?? ''}
                onChange={(e) => updateField('redirectUrl', e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Redirect Delay (seconds)</label>
              <input
                type="number"
                className="w-full text-sm bg-background border border-border rounded-md px-2.5 py-1.5 outline-none focus:border-primary transition-colors"
                value={state.redirectDelay ?? 0}
                onChange={(e) => updateField('redirectDelay', Number(e.target.value))}
                min={0}
                max={60}
              />
            </div>
            <Toggle checked={state.showIncentive ?? false} onChange={(v) => updateField('showIncentive', v)} label="Show Incentive Confirmation" />
          </>
        )}

        {/* Instructions-specific */}
        {sectionType === 'instructions' && (
          <>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Instructions (Part 1)</label>
              <textarea
                className="w-full text-sm bg-background border border-border rounded-md px-2.5 py-1.5 outline-none focus:border-primary transition-colors resize-none"
                value={state.part1 ?? ''}
                onChange={(e) => updateField('part1', e.target.value)}
                placeholder="Instructions shown before the activity..."
                rows={3}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Instructions (Part 2, optional)</label>
              <textarea
                className="w-full text-sm bg-background border border-border rounded-md px-2.5 py-1.5 outline-none focus:border-primary transition-colors resize-none"
                value={state.part2 ?? ''}
                onChange={(e) => updateField('part2', e.target.value)}
                placeholder="Additional instructions (optional)..."
                rows={2}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
