'use client'

/**
 * PDF Render Page - Question Response
 *
 * Renders a single question's response visualization for PDF capture.
 */

import { useEffect, useState } from 'react'
import { QuestionDisplay } from '@/components/analysis/card-sort/questionnaire/question-display'
import type { StudyFlowQuestionRow, StudyFlowResponseRow, Participant } from '@veritio/study-types'

interface QuestionRenderProps {
  params: Promise<{ studyId: string; questionId: string }>
  searchParams: Promise<{ token?: string }>
}

export default function QuestionRenderPage({
  params,
  searchParams,
}: QuestionRenderProps) {
  const [question, setQuestion] = useState<StudyFlowQuestionRow | null>(null)
  const [responses, setResponses] = useState<StudyFlowResponseRow[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [allQuestions, setAllQuestions] = useState<StudyFlowQuestionRow[]>([])
  const [allResponses, setAllResponses] = useState<StudyFlowResponseRow[]>([])
  const [questionIndex, setQuestionIndex] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const { studyId, questionId } = await params
        const { token } = await searchParams

        if (!token) {
          setError('Missing access token')
          setLoading(false)
          return
        }

        // Fetch survey results data from API
        const response = await fetch(`/api/studies/${studyId}/survey-results`, {
          headers: {
            'X-PDF-Render-Token': token,
          },
        })

        if (!response.ok) {
          const errData = await response.json()
          setError(errData.message || 'Failed to fetch data')
          setLoading(false)
          return
        }

        const result = await response.json()

        // Find the specific question
        const questions = result.flowQuestions || []
        const targetQuestion = questions.find((q: StudyFlowQuestionRow) => q.id === questionId)

        if (!targetQuestion) {
          setError(`Question ${questionId} not found`)
          setLoading(false)
          return
        }

        // Calculate question index
        const index = questions.findIndex((q: StudyFlowQuestionRow) => q.id === questionId) + 1

        setQuestion(targetQuestion)
        setResponses(result.flowResponses || [])
        setParticipants(result.participants || [])
        setAllQuestions(questions)
        setAllResponses(result.flowResponses || [])
        setQuestionIndex(index)
        setLoading(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        setLoading(false)
      }
    }

    loadData()
  }, [params, searchParams])

  // Signal ready when component is rendered
  useEffect(() => {
    if (!loading && (question || error)) {
      // Wait for Recharts to finish rendering
      const timer = setTimeout(() => {
        ;(window as unknown as { __PDF_READY__: boolean }).__PDF_READY__ = true
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [loading, question, error])

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '600px',
          color: '#64748b',
        }}
      >
        Loading question...
      </div>
    )
  }

  if (error) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '600px',
          color: '#ef4444',
        }}
      >
        Error: {error}
      </div>
    )
  }

  if (!question) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '600px',
          color: '#64748b',
        }}
      >
        Question not found
      </div>
    )
  }

  return (
    <div
      data-pdf-chart={`question-${question.id}`}
      data-pdf-title={question.question_text || `Question ${questionIndex}`}
    >
      <QuestionDisplay
        question={question}
        responses={responses}
        participants={participants}
        questionIndex={questionIndex}
        filteredParticipantIds={null}
        hideEmptyResponses={false}
        flowQuestions={allQuestions}
        flowResponses={allResponses}
      />
    </div>
  )
}
