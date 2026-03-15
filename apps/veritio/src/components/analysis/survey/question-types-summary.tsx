'use client'

import { useMemo } from 'react'
import { BarChart3 } from 'lucide-react'
import type { StudyFlowQuestionRow } from '@veritio/study-types'

const QUESTION_TYPE_LABELS: Record<string, string> = {
  single_line_text: 'Short Text',
  multi_line_text: 'Long Text',
  multiple_choice: 'Multiple Choice',
  opinion_scale: 'Opinion Scale',
  yes_no: 'Yes/No',
  nps: 'NPS',
  matrix: 'Matrix',
  ranking: 'Ranking',
  unknown: 'Other',
}

interface QuestionTypeSummaryItem {
  type: string
  label: string
  count: number
}

function buildQuestionTypeSummary(flowQuestions: StudyFlowQuestionRow[]): QuestionTypeSummaryItem[] | null {
  if (!flowQuestions || flowQuestions.length === 0) return null

  const surveyQuestions = flowQuestions.filter(q => q.section === 'survey')

  const typeCounts: Record<string, number> = {}
  surveyQuestions.forEach(q => {
    const type = q.question_type || 'unknown'
    typeCounts[type] = (typeCounts[type] || 0) + 1
  })

  return Object.entries(typeCounts)
    .map(([type, count]) => ({
      type,
      label: QUESTION_TYPE_LABELS[type] || type,
      count,
    }))
    .sort((a, b) => b.count - a.count)
}

interface QuestionTypesSummaryProps {
  flowQuestions: StudyFlowQuestionRow[]
}

export function QuestionTypesSummary({ flowQuestions }: QuestionTypesSummaryProps) {
  const summary = useMemo(() => buildQuestionTypeSummary(flowQuestions), [flowQuestions])

  if (!summary || summary.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <BarChart3 className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">
          No survey questions configured yet.
        </p>
      </div>
    )
  }

  const totalQuestions = summary.reduce((sum, s) => sum + s.count, 0)

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Your survey has <span className="font-medium text-foreground">{totalQuestions} questions</span> across{' '}
        <span className="font-medium text-foreground">{summary.length} types</span>.
      </p>
      <div className="space-y-2">
        {summary.slice(0, 5).map(item => (
          <div key={item.type} className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{item.label}</span>
            <span className="text-sm font-medium">{item.count}</span>
          </div>
        ))}
        {summary.length > 5 && (
          <p className="text-xs text-muted-foreground text-center pt-2">
            +{summary.length - 5} more types
          </p>
        )}
      </div>
    </div>
  )
}
