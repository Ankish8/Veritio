'use client'

import { useState } from 'react'
import { X, ChevronDown, ChevronUp } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { PendingEvent } from '@/hooks/use-assistant-pending-events'
import { humanizeEventSummary } from '@/hooks/use-assistant-pending-events'

interface PendingEventCardsProps {
  events: PendingEvent[]
  onDismiss: (eventId: string) => void
  onDismissAll: () => void
  onAskAI: (prompt: string) => void
}

/** Capitalize first letter */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/** Build an "Ask AI" prompt — payload is already in the system prompt, so keep this clean */
function buildAskAIPrompt(event: PendingEvent): string {
  const summary = humanizeEventSummary(event)
  return `What happened with my ${event.toolkit} integration? ${summary}`
}

/** Group events by toolkit */
interface EventGroup {
  toolkit: string
  events: PendingEvent[]
  latestAt: string
}

function groupEventsByToolkit(events: PendingEvent[]): EventGroup[] {
  const groupMap = new Map<string, PendingEvent[]>()

  for (const event of events) {
    const existing = groupMap.get(event.toolkit) ?? []
    existing.push(event)
    groupMap.set(event.toolkit, existing)
  }

  return Array.from(groupMap.entries()).map(([toolkit, groupEvents]) => ({
    toolkit,
    events: groupEvents,
    latestAt: groupEvents[0].created_at, // Already sorted desc from API
  }))
}

function SingleEventCard({
  event,
  onDismiss,
  onAskAI,
}: {
  event: PendingEvent
  onDismiss: () => void
  onAskAI: () => void
}) {
  const summary = humanizeEventSummary(event)
  const relativeTime = formatDistanceToNow(new Date(event.created_at), { addSuffix: true })

  return (
    <div className="flex flex-col gap-1 p-2.5 rounded-lg border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
          {capitalize(event.toolkit)}
        </span>
        <button
          type="button"
          onClick={onDismiss}
          className="p-0.5 rounded hover:bg-muted transition-colors flex-shrink-0"
          aria-label="Dismiss"
        >
          <X className="h-3 w-3 text-muted-foreground" />
        </button>
      </div>
      <p className="text-sm text-foreground leading-snug line-clamp-1">{summary}</p>
      <div className="flex items-center justify-between gap-2 mt-0.5">
        <span className="text-[11px] text-muted-foreground">{relativeTime}</span>
        <button
          type="button"
          onClick={onAskAI}
          className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          Ask AI
        </button>
      </div>
    </div>
  )
}

function GroupedEventCard({
  group,
  onDismissGroup,
  onAskAI,
}: {
  group: EventGroup
  onDismissGroup: () => void
  onAskAI: (prompt: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const { toolkit, events } = group
  const _relativeTime = formatDistanceToNow(new Date(group.latestAt), { addSuffix: true })
  const count = events.length

  return (
    <div className="flex flex-col rounded-lg border bg-card shadow-sm overflow-hidden">
      {/* Stacked header */}
      <div className="flex flex-col gap-1 p-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
            {capitalize(toolkit)}
          </span>
          <button
            type="button"
            onClick={onDismissGroup}
            className="p-0.5 rounded hover:bg-muted transition-colors flex-shrink-0"
            aria-label="Dismiss all"
          >
            <X className="h-3 w-3 text-muted-foreground" />
          </button>
        </div>
        <p className="text-sm text-foreground leading-snug">
          {count} new event{count > 1 ? 's' : ''}
        </p>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-0.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? (
              <>Hide <ChevronUp className="h-3 w-3" /></>
            ) : (
              <>Show all <ChevronDown className="h-3 w-3" /></>
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              const summaries = events.map((e) => humanizeEventSummary(e)).join('; ')
              onAskAI(`I have ${count} new ${toolkit} events: ${summaries}. Summarize what happened and suggest next steps.`)
            }}
            className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Ask AI
          </button>
        </div>
      </div>

      {/* Expanded list */}
      {expanded && (
        <div className="border-t divide-y">
          {events.map((event) => {
            const summary = humanizeEventSummary(event)
            const time = formatDistanceToNow(new Date(event.created_at), { addSuffix: true })
            return (
              <div key={event.id} className="flex items-center gap-2 px-2.5 py-1.5">
                <span className="text-xs text-foreground truncate flex-1">{summary}</span>
                <span className="text-[12px] text-muted-foreground flex-shrink-0 whitespace-nowrap">
                  {time}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Stacked visual — subtle bottom bar to indicate stacking */}
      {!expanded && count > 1 && (
        <div className="mx-2 mb-1.5 h-1 rounded-full bg-muted/50 border border-border/50" />
      )}
    </div>
  )
}

export function PendingEventCards({ events, onDismiss, onDismissAll, onAskAI }: PendingEventCardsProps) {
  if (events.length === 0) return null

  const groups = groupEventsByToolkit(events)

  // If total events > 3 and there's only one group, use grouped card
  // If there are multiple groups, show one card per group (max 3)
  const useGrouped = events.length > 2

  if (!useGrouped) {
    // Show individual cards (1-2 events)
    return (
      <div className="flex flex-col gap-2 mx-3 mt-2 flex-shrink-0">
        {events.map((event) => (
          <SingleEventCard
            key={event.id}
            event={event}
            onDismiss={() => onDismiss(event.id)}
            onAskAI={() =>
              onAskAI(buildAskAIPrompt(event))
            }
          />
        ))}
      </div>
    )
  }

  // Grouped view
  return (
    <div className="flex flex-col gap-2 mx-3 mt-2 flex-shrink-0">
      {groups.slice(0, 3).map((group) =>
        group.events.length === 1 ? (
          <SingleEventCard
            key={group.events[0].id}
            event={group.events[0]}
            onDismiss={() => onDismiss(group.events[0].id)}
            onAskAI={() => onAskAI(buildAskAIPrompt(group.events[0]))}
          />
        ) : (
          <GroupedEventCard
            key={group.toolkit}
            group={group}
            onDismissGroup={() => {
              // Dismiss all events in this group
              for (const e of group.events) onDismiss(e.id)
            }}
            onAskAI={onAskAI}
          />
        )
      )}
      {/* Dismiss all link when multiple groups */}
      {events.length > 2 && (
        <button
          type="button"
          onClick={onDismissAll}
          className="text-[11px] text-muted-foreground hover:text-foreground transition-colors text-center py-0.5"
        >
          Dismiss all
        </button>
      )}
    </div>
  )
}
