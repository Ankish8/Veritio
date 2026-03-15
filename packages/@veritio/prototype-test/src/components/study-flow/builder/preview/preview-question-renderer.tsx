'use client'

import { useState, useMemo } from 'react'
import { QuestionRenderer } from '@/components/study-flow/player/question-renderers/question-renderer'
import type { StudyFlowQuestion, ResponseValue, MultipleChoiceQuestionConfig } from '@veritio/prototype-test/lib/supabase/study-flow-types'
import { useStudyFlowBuilderStore } from '@veritio/prototype-test/stores'
import { useABTestForQuestion } from '@veritio/prototype-test/hooks/use-ab-tests'

interface PreviewQuestionRendererProps {
  question: StudyFlowQuestion
}
export function PreviewQuestionRenderer({ question }: PreviewQuestionRendererProps) {
  const [value, setValue] = useState<ResponseValue | undefined>(undefined)
  const studyId = useStudyFlowBuilderStore((state) => state.studyId)

  // Get AB test for this question (if any) - uses SWR hook
  const { abTest } = useABTestForQuestion(studyId, question.id)

  // Apply AB test variant A content to the question for preview
  // In the builder preview, we always show variant A
  const previewQuestion = useMemo(() => {
    if (!abTest || !abTest.is_enabled) {
      return question
    }

    const variantContent = abTest.variant_a_content as unknown as Record<string, unknown> | null
    if (!variantContent) {
      return question
    }

    // Merge variant A content into the question
    const mergedQuestion: StudyFlowQuestion = {
      ...question,
      question_text: variantContent.question_text !== undefined
        ? String(variantContent.question_text)
        : question.question_text,
      question_text_html: variantContent.question_text_html !== undefined
        ? String(variantContent.question_text_html)
        : question.question_text_html,
      description: variantContent.description !== undefined
        ? String(variantContent.description)
        : question.description,
    }

    // Merge options if present (for multiple choice questions)
    if (variantContent.options !== undefined && question.config) {
      mergedQuestion.config = {
        ...question.config,
        options: variantContent.options as MultipleChoiceQuestionConfig['options'],
      }
    }

    return mergedQuestion
  }, [question, abTest])

  return (
    <QuestionRenderer
      question={previewQuestion}
      value={value}
      onChange={setValue}
    />
  )
}
