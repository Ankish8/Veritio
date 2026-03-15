'use client'

import { useState, useEffect, useCallback } from 'react'
import type { PostTaskQuestion } from '@veritio/study-types'
import {
  PostTaskQuestionsScreen,
  type PostTaskQuestionResponse,
} from '@/components/players/shared/post-task-questions-screen'

interface InitMessage {
  type: 'lwt-ptq-init'
  taskId: string
  taskNumber: number
  questions: PostTaskQuestion[]
  branding?: {
    primaryColor?: string
    logoUrl?: string
  }
}

export function WidgetQuestionsClient() {
  const [initialized, setInitialized] = useState(false)
  const [questions, setQuestions] = useState<PostTaskQuestion[]>([])
  const [taskNumber, setTaskNumber] = useState(1)

  // Apply iframe body styling
  useEffect(() => {
    document.body.style.margin = '0'
    document.body.style.overflow = 'hidden'
    document.body.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  }, [])

  // Signal ready and listen for init message from parent
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data as InitMessage
      if (!data || data.type !== 'lwt-ptq-init') return

      // Apply branding CSS variables
      if (data.branding?.primaryColor) {
        const root = document.documentElement
        const color = data.branding.primaryColor
        root.style.setProperty('--brand', color)
        root.style.setProperty('--brand-light', `color-mix(in srgb, ${color} 15%, transparent)`)
        root.style.setProperty('--brand-subtle', `color-mix(in srgb, ${color} 5%, transparent)`)
      }

      setQuestions(data.questions)
      setTaskNumber(data.taskNumber)
      setInitialized(true)
    }

    window.addEventListener('message', handleMessage)

    // Signal to parent that the iframe is ready
    window.parent.postMessage({ type: 'lwt-ptq-ready' }, '*')

    return () => window.removeEventListener('message', handleMessage)
  }, [])

  const handleComplete = useCallback((responses: PostTaskQuestionResponse[]) => {
    window.parent.postMessage(
      {
        type: 'lwt-ptq-complete',
        responses: responses.map((r) => ({ questionId: r.questionId, value: r.value })),
      },
      '*'
    )
  }, [])

  if (!initialized) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-pulse text-sm text-muted-foreground">Loading questions...</div>
      </div>
    )
  }

  return (
    <PostTaskQuestionsScreen
      questions={questions}
      taskNumber={taskNumber}
      onComplete={handleComplete}
    />
  )
}
