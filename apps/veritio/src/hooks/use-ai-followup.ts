'use client'

import { useState, useCallback, useRef } from 'react'
import type { AiFollowupConfig, FollowupQuestionType, FollowupQuestionConfig } from '@veritio/study-types/study-flow-types'

type Phase = 'idle' | 'evaluating' | 'showing'

type AiFollowupEnabledConfig = { aiFollowup?: AiFollowupConfig; [key: string]: unknown }

interface FollowupState {
  phase: Phase
  followupQuestion: string | null
  followupQuestionId: string | null
  parentQuestionId: string | null
  followupType: FollowupQuestionType
  followupConfig: FollowupQuestionConfig | null
}

interface UseAiFollowupOptions {
  studyId: string
  participantId: string
  isPreview?: boolean
}

/**
 * Build a human-readable description of the user's response for the AI evaluator.
 */
/**
 * Build a JSON-serialized context string for the backend to parse.
 * The backend does JSON.parse(responseContext) to extract structured data.
 * The human-readable answer text is sent separately via the `answer` field.
 */
function buildResponseContext(
  questionType: string,
  responseValue: unknown,
  config: Record<string, any>
): string | null {
  switch (questionType) {
    case 'nps': {
      const val = typeof responseValue === 'object' && responseValue !== null && 'value' in responseValue
        ? (responseValue as { value: number }).value
        : responseValue
      if (typeof val !== 'number') return null
      return JSON.stringify({ value: val })
    }
    case 'opinion_scale': {
      if (typeof responseValue !== 'number') return null
      const points = config?.scalePoints ?? 5
      return JSON.stringify({ value: responseValue, min: 1, max: points })
    }
    case 'slider': {
      if (typeof responseValue !== 'number') return null
      const min = config?.minValue ?? 0
      const max = config?.maxValue ?? 100
      return JSON.stringify({ value: responseValue, min, max })
    }
    case 'text':
    case 'single_line_text':
    case 'multi_line_text': {
      if (typeof responseValue === 'string') return responseValue
      return null
    }
    case 'multiple_choice': {
      const options: { id: string; label: string }[] = config?.options ?? []
      const triggerCondition = config?.aiFollowup?.triggerCondition
      const triggerOptionIds = config?.aiFollowup?.triggerOptionIds
      const allowOther = config?.allowOther ?? false

      if (responseValue && typeof responseValue === 'object' && 'optionIds' in responseValue) {
        const resp = responseValue as { optionIds: string[]; otherText?: string }
        const labels = resp.optionIds.map((id) => options.find((o) => o.id === id)?.label ?? id)
        return JSON.stringify({
          selectedOptionIds: resp.optionIds,
          selectedLabels: labels,
          triggerCondition,
          triggerOptionIds,
          allowOther,
          isOtherSelected: !!resp.otherText,
        })
      }
      if (responseValue && typeof responseValue === 'object' && 'optionId' in responseValue) {
        const resp = responseValue as { optionId: string; otherText?: string }
        const label = options.find((o) => o.id === resp.optionId)?.label ?? resp.optionId
        return JSON.stringify({
          selectedOptionIds: [resp.optionId],
          selectedLabels: [label],
          triggerCondition,
          triggerOptionIds,
          allowOther,
          isOtherSelected: !!resp.otherText,
        })
      }
      return null
    }
    case 'yes_no': {
      if (typeof responseValue !== 'boolean') return null
      return responseValue ? 'Yes' : 'No'
    }
    default:
      return null
  }
}

/**
 * Client-side pre-filter: check whether the response matches the trigger condition.
 * Returns true if follow-up evaluation should proceed, false to skip.
 */
function shouldTriggerFollowup(
  config: AiFollowupConfig,
  questionType: string,
  responseValue: unknown,
  _questionConfig: Record<string, any>
): boolean {
  const condition = config.triggerCondition ?? 'always'

  if (condition === 'always') return true

  if (condition === 'when_other') {
    if (responseValue && typeof responseValue === 'object') {
      if ('otherText' in responseValue && (responseValue as { otherText?: string }).otherText) return true
    }
    return false
  }

  if (condition === 'specific_options') {
    const triggerIds = config.triggerOptionIds ?? []
    if (triggerIds.length === 0) return true // no specific options configured, allow all

    // Extract selected option IDs from the response
    const selectedIds: string[] = []
    if (responseValue && typeof responseValue === 'object') {
      if ('optionIds' in responseValue) {
        selectedIds.push(...(responseValue as { optionIds: string[] }).optionIds)
      } else if ('optionId' in responseValue) {
        selectedIds.push((responseValue as { optionId: string }).optionId)
      }
    }
    if (typeof responseValue === 'boolean') {
      // yes_no: map boolean to option IDs if configured
      selectedIds.push(responseValue ? 'yes' : 'no')
    }

    return selectedIds.some((id) => triggerIds.includes(id))
  }

  return true
}

export function useAiFollowup({ studyId, participantId, isPreview }: UseAiFollowupOptions) {
  const [state, setState] = useState<FollowupState>({
    phase: 'idle',
    followupQuestion: null,
    followupQuestionId: null,
    parentQuestionId: null,
    followupType: 'text',
    followupConfig: null,
  })

  const followupCountRef = useRef<Map<string, number>>(new Map())
  const followupAnswerRef = useRef<unknown>('')
  const startTimeRef = useRef<number>(0)
  // Refs to avoid stale closures in submitFollowupAndContinue
  const followupQuestionIdRef = useRef<string | null>(null)
  const parentQuestionIdRef = useRef<string | null>(null)
  const followupTypeRef = useRef<FollowupQuestionType>('text')

  const evaluateAndMaybeIntercept = useCallback(
    async (
      questionId: string,
      questionText: string,
      answer: string,
      config: AiFollowupEnabledConfig | undefined,
      questionType?: string,
      responseValue?: unknown
    ): Promise<boolean> => {
      if (!config?.aiFollowup?.enabled || isPreview || !participantId) return false
      if (!answer || answer.trim().length === 0) return false

      // Client-side pre-filter for trigger conditions
      if (questionType && responseValue !== undefined) {
        if (!shouldTriggerFollowup(config.aiFollowup, questionType, responseValue, config as Record<string, any>)) {
          return false
        }
      }

      const currentCount = followupCountRef.current.get(questionId) ?? 0
      const maxFollowups = config.aiFollowup.maxFollowups ?? 2
      if (currentCount >= maxFollowups) return false

      setState((s) => ({ ...s, phase: 'evaluating', parentQuestionId: questionId }))

      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 10000)

        // Build response context for non-text question types
        const responseContext = questionType
          ? buildResponseContext(questionType, responseValue ?? answer, config as Record<string, any>)
          : null

        const res = await fetch(`/api/studies/${studyId}/ai-followup-evaluate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            participantId,
            questionId,
            questionText,
            answer,
            followupPosition: currentCount + 1,
            depthHint: config.aiFollowup.depthHint,
            ...(questionType && { questionType }),
            ...(responseContext && { responseContext }),
          }),
          signal: controller.signal,
        })

        clearTimeout(timeout)

        if (!res.ok) {
          setState((s) => ({ ...s, phase: 'idle' }))
          return false
        }

        const data = await res.json()

        if (data.shouldFollowUp && data.followUpQuestion) {
          followupCountRef.current.set(questionId, currentCount + 1)
          startTimeRef.current = Date.now()
          followupQuestionIdRef.current = data.followupQuestionId
          parentQuestionIdRef.current = questionId

          // Phase 3: capture follow-up type and config from API response
          const fType: FollowupQuestionType = data.followupType ?? 'text'
          const fConfig: FollowupQuestionConfig | null = data.followupConfig ?? null
          followupTypeRef.current = fType

          setState({
            phase: 'showing',
            followupQuestion: data.followUpQuestion,
            followupQuestionId: data.followupQuestionId,
            parentQuestionId: questionId,
            followupType: fType,
            followupConfig: fConfig,
          })
          return true
        }

        setState((s) => ({ ...s, phase: 'idle' }))
        return false
      } catch {
        // Fail-open
        setState((s) => ({ ...s, phase: 'idle' }))
        return false
      }
    },
    [studyId, participantId, isPreview]
  )

  const submitFollowupAndContinue = useCallback(
    async (
      questionText: string,
      config: AiFollowupEnabledConfig | undefined,
      onNext: () => void
    ) => {
      const answer = followupAnswerRef.current
      const responseTimeMs = startTimeRef.current ? Date.now() - startTimeRef.current : undefined

      const currentType = followupTypeRef.current

      // Fire-and-forget submit — use refs to avoid stale closure
      const capturedFollowupId = followupQuestionIdRef.current
      if (capturedFollowupId) {
        // Wrap all responses as objects so z.record(z.unknown()) validation passes
        let responsePayload: Record<string, unknown>
        if (currentType === 'text' && typeof answer === 'string') {
          responsePayload = { text: answer }
        } else if (currentType === 'multiple_choice' && typeof answer === 'string') {
          responsePayload = { optionId: answer }
        } else if (currentType === 'opinion_scale' && typeof answer === 'number') {
          responsePayload = { value: answer }
        } else if (currentType === 'yes_no' && typeof answer === 'boolean') {
          responsePayload = { value: answer }
        } else if (typeof answer === 'object' && answer !== null) {
          responsePayload = answer as Record<string, unknown>
        } else {
          responsePayload = { text: String(answer ?? '') }
        }

        fetch(`/api/studies/${studyId}/ai-followup-respond`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            participantId,
            followupQuestionId: capturedFollowupId,
            responseValue: responsePayload,
            responseTimeMs,
          }),
        }).catch(() => {})
      }

      // For non-text follow-ups, skip recursive chaining — just proceed
      if (currentType !== 'text') {
        setState({
          phase: 'idle',
          followupQuestion: null,
          followupQuestionId: null,
          parentQuestionId: null,
          followupType: 'text',
          followupConfig: null,
        })
        followupAnswerRef.current = ''
        followupTypeRef.current = 'text'
        onNext()
        return
      }

      // Text follow-ups: check if we should do another follow-up
      const parentId = parentQuestionIdRef.current
      const answerStr = typeof answer === 'string' ? answer : ''
      if (parentId && config?.aiFollowup?.enabled) {
        const currentCount = followupCountRef.current.get(parentId) ?? 0
        const maxFollowups = config.aiFollowup.maxFollowups ?? 2
        if (currentCount < maxFollowups && answerStr.trim().length > 0) {
          const intercepted = await evaluateAndMaybeIntercept(
            parentId,
            questionText,
            answerStr,
            config
          )
          if (intercepted) return
        }
      }

      // Done with follow-ups, proceed
      setState({
        phase: 'idle',
        followupQuestion: null,
        followupQuestionId: null,
        parentQuestionId: null,
        followupType: 'text',
        followupConfig: null,
      })
      followupAnswerRef.current = ''
      followupTypeRef.current = 'text'
      onNext()
    },
    [studyId, participantId, evaluateAndMaybeIntercept]
  )

  const setFollowupAnswer = useCallback((answer: unknown) => {
    followupAnswerRef.current = answer
  }, [])

  const resetFollowups = useCallback(() => {
    setState({
      phase: 'idle',
      followupQuestion: null,
      followupQuestionId: null,
      parentQuestionId: null,
      followupType: 'text',
      followupConfig: null,
    })
    followupAnswerRef.current = ''
    followupQuestionIdRef.current = null
    parentQuestionIdRef.current = null
    followupTypeRef.current = 'text'
  }, [])

  return {
    phase: state.phase,
    followupQuestion: state.followupQuestion,
    followupQuestionId: state.followupQuestionId,
    followupType: state.followupType,
    followupConfig: state.followupConfig,
    evaluateAndMaybeIntercept,
    submitFollowupAndContinue,
    setFollowupAnswer,
    resetFollowups,
  }
}
