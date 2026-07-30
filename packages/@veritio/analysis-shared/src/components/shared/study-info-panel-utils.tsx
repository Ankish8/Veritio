import { Activity, PauseCircle, CheckCircle, FileText } from 'lucide-react'

export const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return '\u2014'
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/** Date plus time-of-day, for timestamps where "when today" actually matters. */
export const formatDateTime = (dateString: string | null | undefined) => {
  if (!dateString) return '—'
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** Humanises a duration in seconds, e.g. 45s, 4m 5s, 1h 12m. */
export const formatDurationSeconds = (seconds: number | null | undefined) => {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) {
    return '—'
  }
  const total = Math.max(0, Math.round(seconds))
  if (total < 60) return `${total}s`

  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
  }
  const remainingSeconds = total % 60
  return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`
}

/**
 * Turns a BCP-47 tag into a readable language name, falling back to the raw tag
 * when the runtime cannot resolve a display name.
 */
export const formatLanguage = (language: string | null | undefined) => {
  if (!language) return '—'
  try {
    const displayNames = new Intl.DisplayNames(['en'], { type: 'language' })
    return displayNames.of(language) || language
  } catch {
    return language
  }
}

export const formatStudyType = (type: string) => {
  switch (type) {
    case 'card_sort':
      return 'Card Sort'
    case 'tree_test':
      return 'Tree Test'
    case 'survey':
      return 'Survey'
    case 'prototype_test':
      return 'Figma Prototype Test'
    case 'first_click':
      return 'First Click'
    case 'first_impression':
      return 'First Impression'
    case 'live_website_test':
      return 'Web App Test'
    default:
      return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  }
}

export const getStatusConfig = (status: string) => {
  switch (status) {
    case 'active':
      return {
        label: 'Live',
        subtitle: 'Collecting responses',
        bgColor: 'bg-emerald-500/10',
        textColor: 'text-emerald-600',
        dotColor: 'bg-emerald-500',
        iconColor: 'text-emerald-600',
        icon: 'activity' as const,
        animate: true,
      }
    case 'paused':
      return {
        label: 'Paused',
        subtitle: 'Temporarily paused',
        bgColor: 'bg-amber-500/10',
        textColor: 'text-amber-600',
        dotColor: 'bg-amber-500',
        iconColor: 'text-amber-600',
        icon: 'pause' as const,
        animate: false,
      }
    case 'completed':
      return {
        label: 'Completed',
        subtitle: 'Study finished',
        bgColor: 'bg-blue-500/10',
        textColor: 'text-blue-600',
        dotColor: 'bg-blue-500',
        iconColor: 'text-blue-600',
        icon: 'check' as const,
        animate: false,
      }
    default:
      return {
        label: 'Draft',
        subtitle: 'Not yet published',
        bgColor: 'bg-muted',
        textColor: 'text-muted-foreground',
        dotColor: 'bg-muted-foreground',
        iconColor: 'text-muted-foreground',
        icon: 'file' as const,
        animate: false,
      }
  }
}

export const formatDuration = (ms: number) => {
  const seconds = ms / 1000
  if (seconds >= 1) {
    return `${seconds}s`
  }
  return `${ms}ms`
}

export const formatAssignmentMode = (mode: 'random_single' | 'sequential_all') => {
  switch (mode) {
    case 'random_single':
      return 'A/B Testing'
    case 'sequential_all':
      return 'Sequential'
    default:
      return mode
  }
}

export const formatQuestionDisplay = (mode: 'one_per_page' | 'all_on_page') => {
  switch (mode) {
    case 'one_per_page':
      return 'One per page'
    case 'all_on_page':
      return 'All on page'
    default:
      return mode
  }
}

export const formatSortMode = (mode: 'open' | 'closed' | 'hybrid') => {
  switch (mode) {
    case 'open':
      return 'Open Sort'
    case 'closed':
      return 'Closed Sort'
    case 'hybrid':
      return 'Hybrid Sort'
    default:
      return mode
  }
}

export const formatImageScaling = (mode: 'scale_on_small' | 'fit' | 'never_scale') => {
  switch (mode) {
    case 'scale_on_small':
      return 'Scale on small screens'
    case 'fit':
      return 'Fit to screen'
    case 'never_scale':
      return 'Original size'
    default:
      return mode
  }
}

export const formatBoolean = (value: boolean | undefined, trueLabel = 'Yes', falseLabel = 'No') => {
  if (value === undefined) return '\u2014'
  return value ? trueLabel : falseLabel
}

export const getStatusIcon = (iconType: 'activity' | 'pause' | 'check' | 'file', colorClass: string) => {
  switch (iconType) {
    case 'activity':
      return <Activity className={`size-4 ${colorClass} shrink-0`} />
    case 'pause':
      return <PauseCircle className={`size-4 ${colorClass} shrink-0`} />
    case 'check':
      return <CheckCircle className={`size-4 ${colorClass} shrink-0`} />
    case 'file':
      return <FileText className={`size-4 ${colorClass} shrink-0`} />
    default:
      return null
  }
}
