import React from 'react'
import { cn } from '@/lib/utils'

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return 'just now'
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`
  }

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `${diffInHours}h ago`
  }

  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) {
    return `${diffInDays}d ago`
  }

  const diffInWeeks = Math.floor(diffInDays / 7)
  if (diffInWeeks < 4) {
    return `${diffInWeeks}w ago`
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export const MENTION_REGEX = /@\[([^\]]+)\]\(([^)]+)\)/g

export function renderContentWithMentions(content: string, isOwnerMessage = false) {
  const mentionRegex = new RegExp(MENTION_REGEX.source, MENTION_REGEX.flags)
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  let keyIndex = 0

  while ((match = mentionRegex.exec(content)) !== null) {
    // Add text before mention
    if (match.index > lastIndex) {
      parts.push(
        React.createElement(React.Fragment, { key: `text-${keyIndex++}` },
          content.slice(lastIndex, match.index)
        )
      )
    }

    // Add styled mention - different styling for owner messages (purple bubble)
    const mentionName = match[1]
    parts.push(
      React.createElement('span', {
        key: `mention-${match.index}`,
        className: cn(
          'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-medium text-sm',
          isOwnerMessage
            ? 'bg-primary-foreground/20 text-primary-foreground'
            : 'bg-primary/10 text-primary'
        )
      }, `@${mentionName}`)
    )

    lastIndex = match.index + match[0].length
  }

  // Add remaining text
  if (lastIndex < content.length) {
    parts.push(
      React.createElement(React.Fragment, { key: `text-${keyIndex++}` },
        content.slice(lastIndex)
      )
    )
  }

  return parts.length > 0 ? parts : content
}
