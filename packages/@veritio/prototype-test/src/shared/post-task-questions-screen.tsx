'use client'
import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import type { PostTaskQuestion, TaskMetricsContext } from '@veritio/prototype-test/lib/supabase/study-flow-types'
import type { ResponseValue } from '@veritio/study-types/study-flow-types'
import { evaluateDisplayLogicWithTaskContext } from '@veritio/prototype-test/lib/display-logic-evaluator'
export interface PostTaskQuestionResponse {
  questionId: string
  value: ResponseValue
  responseTimeMs: number | null
}
export interface PostTaskQuestionsScreenProps {
  taskNumber: number
  questions: PostTaskQuestion[]
  taskOutcome?: 'success' | 'failure' | 'abandoned' | 'skipped'
  taskMetrics?: TaskMetricsContext
  onComplete: (responses: PostTaskQuestionResponse[]) => void
  pageMode?: 'one_per_page' | 'all_on_one'
  title?: string
  subtitle?: string
}
export function PostTaskQuestionsScreen({
  taskNumber,
  questions,
  taskOutcome,
  taskMetrics,
  onComplete,
}: PostTaskQuestionsScreenProps) {
  const [responses, setResponses] = useState<Record<string, string>>({})
  const screenMountedAt = useRef<number>(Date.now())
  const hasAutoSkipped = useRef(false)

  const effectiveTaskContext: TaskMetricsContext | undefined = useMemo(() => {
    if (taskMetrics) return taskMetrics
    if (taskOutcome) {
      return {
        outcome: taskOutcome,
        isDirect: undefined,
        clickCount: 0,
        misclickCount: 0,
        backtrackCount: 0,
        totalTimeMs: 0,
        timeToFirstClickMs: 0,
        pathTaken: [],
        pathLength: 0,
      }
    }
    return undefined
  }, [taskMetrics, taskOutcome])

  const responseMap = useMemo(() => {
    const map = new Map<string, ResponseValue>()
    Object.entries(responses).forEach(([id, val]) => map.set(id, val))
    return map
  }, [responses])

  const visibleQuestions = useMemo(() => {
    return questions.filter((q) =>
      evaluateDisplayLogicWithTaskContext(q.display_logic, responseMap, effectiveTaskContext)
    )
  }, [questions, responseMap, effectiveTaskContext])

  // Reset auto-skip flag when task changes
  useEffect(() => {
    hasAutoSkipped.current = false
  }, [taskNumber])

  // Auto-continue when all questions are hidden by display logic
  useEffect(() => {
    if (visibleQuestions.length === 0 && !hasAutoSkipped.current) {
      hasAutoSkipped.current = true
      onComplete([])
    }
  }, [visibleQuestions.length, onComplete])

  const canContinue = useMemo(() => {
    return visibleQuestions.every((q) => {
      const isRequired = q.is_required || q.required
      if (!isRequired) return true
      const response = responses[q.id]
      return response !== undefined && response.trim() !== ''
    })
  }, [visibleQuestions, responses])

  const handleContinue = useCallback(() => {
    const responseArray: PostTaskQuestionResponse[] = visibleQuestions
      .map((q): PostTaskQuestionResponse | null => {
        const value = responses[q.id]
        if (value === undefined) return null
        return {
          questionId: q.id,
          value: value as ResponseValue,
          responseTimeMs: Date.now() - screenMountedAt.current,
        }
      })
      .filter((r): r is PostTaskQuestionResponse => r !== null)
    onComplete(responseArray)
  }, [visibleQuestions, responses, onComplete])

  if (visibleQuestions.length === 0) return null

  return (
    <div
      className="flex-1 flex flex-col min-h-0"
      style={{ backgroundColor: 'var(--style-page-bg)' }}
    >
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto px-6 py-8 max-w-3xl">
          <div
            className="p-6 md:p-8"
            style={{
              backgroundColor: 'var(--style-card-bg)',
              border: '1px solid var(--style-card-border)',
              borderRadius: 'var(--style-radius)',
              boxShadow: 'var(--style-shadow)',
            }}
          >
            <div className="mb-6">
              <h1
                className="text-xl font-semibold tracking-tight"
                style={{ color: 'var(--style-text-primary)' }}
              >
                Task {taskNumber} Feedback
              </h1>
              <p
                className="mt-1 text-sm"
                style={{ color: 'var(--style-text-secondary)' }}
              >
                Please answer these questions about the task you just completed.
              </p>
            </div>

            <div className="space-y-6">
              {visibleQuestions.map((question) => {
                const questionText = question.question_text || question.text || 'Question'
                const isRequired = question.is_required || question.required

                return (
                  <div key={question.id} className="space-y-2">
                    <div className="flex items-start gap-1">
                      <label
                        className="text-base font-medium"
                        style={{ color: 'var(--style-text-primary)' }}
                      >
                        {questionText}
                      </label>
                      {isRequired && (
                        <span className="text-destructive flex-shrink-0">*</span>
                      )}
                    </div>
                    <textarea
                      className="w-full rounded-md border px-3 py-2 text-sm min-h-[80px] resize-y"
                      style={{
                        borderColor: 'var(--style-card-border)',
                        color: 'var(--style-text-primary)',
                        backgroundColor: 'var(--style-page-bg)',
                      }}
                      placeholder="Type your answer..."
                      value={responses[question.id] || ''}
                      onChange={(e) =>
                        setResponses((prev) => ({ ...prev, [question.id]: e.target.value }))
                      }
                    />
                  </div>
                )
              })}
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleContinue}
              disabled={!canContinue}
              className="px-6 py-2 rounded-lg text-white font-medium transition-colors disabled:opacity-50"
              style={{ backgroundColor: 'var(--brand, #2563eb)' }}
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
