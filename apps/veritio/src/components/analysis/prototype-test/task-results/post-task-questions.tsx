'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import type { PostTaskQuestion } from '@veritio/study-types'

interface StoredResponse {
  questionId: string
  value: unknown
  responseTimeMs?: number | null
}

interface PostTaskQuestionsProps {
  responses: Record<string, unknown>[]
  questions: PostTaskQuestion[]
  className?: string
}

function formatResponseValue(value: unknown, questionType: string): string {
  if (value === null || value === undefined) return ''

  switch (questionType) {
    case 'multiple_choice':
      if (Array.isArray(value)) {
        return value.join(', ')
      }
      return String(value)

    case 'matrix':
      if (typeof value === 'object' && value !== null) {
        return Object.entries(value as Record<string, string>)
          .map(([row, col]) => `${row}: ${col}`)
          .join('; ')
      }
      return String(value)

    case 'ranking':
      if (Array.isArray(value)) {
        return value.map((item, i) => `${i + 1}. ${item}`).join(', ')
      }
      return String(value)

    case 'constant_sum':
      if (typeof value === 'object' && value !== null) {
        return Object.entries(value as Record<string, number>)
          .map(([item, val]) => `${item}: ${val}`)
          .join(', ')
      }
      return String(value)

    case 'semantic_differential':
      if (typeof value === 'object' && value !== null) {
        return JSON.stringify(value)
      }
      return String(value)

    case 'opinion_scale':
    case 'nps':
    case 'slider':
      return String(value)

    case 'yes_no':
      if (typeof value === 'boolean') {
        return value ? 'Yes' : 'No'
      }
      return String(value)

    default:
      if (typeof value === 'string') {
        return value
      }
      if (typeof value === 'object') {
        return JSON.stringify(value)
      }
      return String(value)
  }
}

function isDistributionQuestion(questionType: string): boolean {
  return [
    'single_choice',
    'multiple_choice',
    'yes_no',
    'opinion_scale',
    'nps',
    'image_choice',
  ].includes(questionType)
}

export function PostTaskQuestions({
  responses,
  questions,
  className,
}: PostTaskQuestionsProps) {
  const aggregatedQuestions = useMemo(() => {
    if (responses.length === 0 || questions.length === 0) return []

    const responsesByQuestionId = new Map<string, unknown[]>()

    for (const rawResponse of responses) {
      const response = rawResponse as unknown as StoredResponse
      const questionId = response.questionId
      if (!questionId) continue

      const existing = responsesByQuestionId.get(questionId) || []
      existing.push(response.value)
      responsesByQuestionId.set(questionId, existing)
    }

    const result: Array<{
      questionId: string
      questionText: string
      questionType: string
      answers: string[]
      rawValues: unknown[]
    }> = []

    for (const question of questions) {
      const values = responsesByQuestionId.get(question.id)
      if (!values || values.length === 0) continue

      const answers = values.map(v => formatResponseValue(v, question.question_type))

      result.push({
        questionId: question.id,
        questionText: question.question_text || question.text || 'Unknown question',
        questionType: question.question_type || question.type || 'single_line_text',
        answers: answers.filter(a => a !== ''),
        rawValues: values,
      })
    }

    return result
  }, [responses, questions])

  if (aggregatedQuestions.length === 0) {
    return null
  }

  return (
    <div className={cn('space-y-4', className)}>
      <h3 className="text-lg font-semibold">Post-task Questions</h3>

      {aggregatedQuestions.map((q, index) => {
        const showDistribution = isDistributionQuestion(q.questionType)

        const answerCounts = new Map<string, number>()
        for (const answer of q.answers) {
          answerCounts.set(answer, (answerCounts.get(answer) || 0) + 1)
        }
        const sortedAnswers = Array.from(answerCounts.entries())
          .sort((a, b) => b[1] - a[1])
        const maxCount = Math.max(...sortedAnswers.map(([, count]) => count))

        return (
          <Card key={q.questionId}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <span className="text-muted-foreground">Question {index + 1}</span>
                <span className="text-xs text-muted-foreground/70 capitalize">
                  ({q.questionType.replace(/_/g, ' ')})
                </span>
              </CardTitle>
              <p className="text-base">{q.questionText}</p>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground mb-3">
                {q.answers.length} response{q.answers.length !== 1 ? 's' : ''}
              </div>

              {q.answers.length > 0 && (
                <div className="space-y-2">
                  {showDistribution ? (
                    sortedAnswers.map(([answer, count]) => {
                      const percentage = Math.round((count / q.answers.length) * 100)
                      return (
                        <div key={answer} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="truncate flex-1 mr-4">{answer}</span>
                            <span className="text-muted-foreground shrink-0 tabular-nums">
                              {count} ({percentage}%)
                            </span>
                          </div>
                          <Progress
                            value={(count / maxCount) * 100}
                            className="h-2"
                          />
                        </div>
                      )
                    })
                  ) : (
                    sortedAnswers.map(([answer, count]) => (
                      <div
                        key={answer}
                        className="flex items-start justify-between py-2 text-sm border-b last:border-0"
                      >
                        <span className="flex-1 mr-4 whitespace-pre-wrap">{answer}</span>
                        {count > 1 && (
                          <span className="text-muted-foreground shrink-0 tabular-nums">
                            ×{count}
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
