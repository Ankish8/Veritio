'use client'

import { memo } from 'react'
import { Pause, CheckCircle2, FileQuestion } from 'lucide-react'

export interface StudyErrorStateProps {
  message?: string
}

function getErrorDisplay(message?: string): {
  title: string
  icon: React.ReactNode
} {
  // Use muted foreground color for all icons to stay theme-neutral
  const iconClass = "h-8 w-8 text-muted-foreground"

  if (!message) {
    return {
      title: 'Study Not Available',
      icon: <FileQuestion className={iconClass} />,
    }
  }

  if (message.toLowerCase().includes('paused')) {
    return {
      title: 'Study Paused',
      icon: <Pause className={iconClass} />,
    }
  }

  if (message.toLowerCase().includes('completed')) {
    return {
      title: 'Study Completed',
      icon: <CheckCircle2 className={iconClass} />,
    }
  }

  if (message.toLowerCase().includes('not yet available')) {
    return {
      title: 'Coming Soon',
      icon: <FileQuestion className={iconClass} />,
    }
  }

  return {
    title: 'Study Not Available',
    icon: <FileQuestion className={iconClass} />,
  }
}

export const StudyErrorState = memo(function StudyErrorState({
  message,
}: StudyErrorStateProps) {
  const { title, icon } = getErrorDisplay(message)

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full bg-card rounded-2xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
          {icon}
        </div>
        <h1 className="text-xl font-semibold text-foreground mb-2">{title}</h1>
        <p className="text-muted-foreground">
          {message || 'This study could not be found or is no longer accepting responses.'}
        </p>
      </div>
    </div>
  )
})
