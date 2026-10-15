'use client'

import { useState, useCallback, useRef } from 'react'
import type { AiFollowupConfig, FollowupQuestionType, FollowupQuestionConfig } from '@veritio/study-types/study-flow-types'

type Phase = 'idle' | 'evaluating' | 'showing'

type AiFollowupEnabledConfig = { aiFollowup?: AiFollowupConfig; [key: string]: unknown }

/** Set by useParticipantSession when the study is opened in preview mode. */
const PREVIEW_PARTICIPANT_ID = 'preview-participant'
const EVALUATE_TIMEOUT_MS = 10000

interface FollowupState {
  phase: Phase
  followupQuestion: string | null
  followupQuestionId: string | null
  parentQuestionId: string | null
  followupType: FollowupQuestionType
  followupConfig: FollowupQuestionConfig | null
}

const IDLE_STATE: FollowupState = {
  phase: 'idle',
  followupQuestion: null,
  followupQuestionId: null,
  parentQuestionId: null,
  followupType: 'text',
  followupConfig: null,
}

interface FollowupTurn {
  question: string
  answer: string
}

/** Everything needed to ask the next probe for one parent question. */
interface ProbeSession {
  parentQuestionId: string
  questionText: string
  questionType?: string
  answer: string
  responseContext: string | null
  /** Probes already answered, oldest first. */
  turns: FollowupTurn[]
  current: {
    question: string
    id: string | null
    type: FollowupQuestionType
    config: FollowupQuestionConfig | null
    shownAt: number
  } | null
}

interface UseAiFollowupOptions {
  studyId: string
  participantId: string
}

/**
 * Build a JSON-serialized context string for the backend to parse.
 * The human-readable answer text is sent separately via the `answer` field.
 */
function buildResponseContext(questionType: string, responseValue: unknown): string | null {
  switch (questionType) {
    case 'nps': {
      const val = typeof responseValue === 'object' && responseValue !== null && 'value' in responseValue
        ? (responseValue as { value: number }).value
        : responseValue
      if (typeof val !== 'number') return null
      return JSON.stringify({ value: val })
    }
    case 'opinion_scale':
    case 'slider': {
      if (typeof responseValue !== 'number') return null
      return JSON.stringify({ value: responseValue })
    }
    case 'multiple_choice': {
      if (!responseValue || typeof responseValue !== 'object') return null
      let optionIds: string[] = []
      if ('optionIds' in responseValue) optionIds = (responseValue as { optionIds: string[] }).optionIds
      else if ('optionId' in responseValue) optionIds = [(responseValue as { optionId: string }).optionId]
      else return null
      const otherText = (responseValue as { otherText?: string }).otherText
      return JSON.stringify({
        selectedOptionIds: optionIds,
        isOtherSelected: !!otherText,
        ...(otherText && { otherText }),
      })
    }
    default:
      return null
  }
}

/**
 * Client-side pre-filter: check whether the response matches the trigger condition.
 * The server applies the same rules from the saved config; this only saves a request.
 */
function shouldTriggerFollowup(config: AiFollowupConfig, responseValue: unknown): boolean {
  const condition = config.triggerCondition ?? 'always'

  if (condition === 'always') return true

  if (condition === 'when_other') {
    return !!(responseValue && typeof responseValue === 'object' &&
      'otherText' in responseValue && (responseValue as { otherText?: string }).otherText)
  }

  if (condition === 'specific_options') {
    const triggerIds = config.triggerOptionIds ?? []
    if (triggerIds.length === 0) return true // no specific options configured, allow all

    const selectedIds: string[] = []
    if (responseValue && typeof responseValue === 'object') {
      if ('optionIds' in responseValue) {
        selectedIds.push(...(responseValue as { optionIds: string[] }).optionIds)
      } else if ('optionId' in responseValue) {
        selectedIds.push((responseValue as { optionId: string }).optionId)
      }
    }
    return selectedIds.some((id) => triggerIds.includes(id))
  }

  return true
}

/** Readable form of a follow-up answer, used as context for the next probe. */
function describeFollowupAnswer(type: FollowupQuestionType, answer: unknown, config: FollowupQuestionConfig | null): string {
  if (type === 'multiple_choice' && typeof answer === 'string') {
    return config?.options?.find((o) => o.id === answer)?.label ?? answer
  }
  if (type === 'opinion_scale' && typeof answer === 'number') return `Rated ${answer} out of ${config?.scalePoints ?? 5}`
  if (type === 'yes_no' && typeof answer === 'boolean') return answer ? 'Yes' : 'No'
  return typeof answer === 'string' ? answer : ''
}

/** Wrap a follow-up answer as an object so the respond endpoint's z.record() accepts it. */
function toResponsePayload(type: FollowupQuestionType, answer: unknown): Record<string, unknown> {
  if (type === 'text' && typeof answer === 'string') return { text: answer }
  if (type === 'multiple_choice' && typeof answer === 'string') return { optionId: answer }
  if ((type === 'opinion_scale' && typeof answer === 'number') || (type === 'yes_no' && typeof answer === 'boolean')) {
    return { value: answer }
  }
  if (typeof answer === 'object' && answer !== null) return answer as Record<string, unknown>
  return { text: String(answer ?? '') }
}

export function useAiFollowup({ studyId, participantId }: UseAiFollowupOptions) {
  const [state, setState] = useState<FollowupState>(IDLE_STATE)

  const isPreview = participantId === PREVIEW_PARTICIPANT_ID
  const followupCountRef = useRef<Map<string, number>>(new Map())
  const followupAnswerRef = useRef<unknown>('')
  const sessionRef = useRef<ProbeSession | null>(null)

  const finish = useCallback(() => {
    sessionRef.current = null
    followupAnswerRef.current = ''
    setState(IDLE_STATE)
  }, [])

  /** Ask the server for the next probe. Resolves true when one is shown. */
  const requestProbe = useCallback(
    async (session: ProbeSession): Promise<boolean> => {
      setState((s) => ({ ...s, phase: 'evaluating', parentQuestionId: session.parentQuestionId }))

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), EVALUATE_TIMEOUT_MS)
      try {
        const shared = {
          questionId: session.parentQuestionId,
          answer: session.answer,
          ...(session.responseContext && { responseContext: session.responseContext }),
          ...(session.turns.length > 0 && { thread: session.turns }),
        }
        const res = await fetch(
          `/api/studies/${studyId}/${isPreview ? 'ai-followup-preview' : 'ai-followup-evaluate'}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(
              isPreview
                ? shared
                : {
                    ...shared,
                    participantId,
                    followupPosition: session.turns.length + 1,
                    ...(session.questionText && { questionText: session.questionText.slice(0, 1000) }),
                    ...(session.questionType && { questionType: session.questionType }),
                  }
            ),
            signal: controller.signal,
          }
        )
        if (!res.ok) return false

        const data = await res.json()
        if (!data.shouldFollowUp || !data.followUpQuestion) return false

        const type: FollowupQuestionType = data.followupType ?? 'text'
        const config: FollowupQuestionConfig | null = data.followupConfig ?? null
        session.current = {
          question: data.followUpQuestion,
          id: data.followupQuestionId ?? null,
          type,
          config,
          shownAt: Date.now(),
        }
        sessionRef.current = session
        followupCountRef.current.set(
          session.parentQuestionId,
          (followupCountRef.current.get(session.parentQuestionId) ?? 0) + 1
        )
        followupAnswerRef.current = ''
        setState({
          phase: 'showing',
          followupQuestion: data.followUpQuestion,
          followupQuestionId: data.followupQuestionId ?? null,
          parentQuestionId: session.parentQuestionId,
          followupType: type,
          followupConfig: config,
        })
        return true
      } catch {
        // Fail-open
        return false
      } finally {
        clearTimeout(timeout)
      }
    },
    [studyId, participantId, isPreview]
  )

  const evaluateAndMaybeIntercept = useCallback(
    async (
      questionId: string,
      questionText: string,
      answer: string,
      config: AiFollowupEnabledConfig | undefined,
      questionType?: string,
      responseValue?: unknown
    ): Promise<boolean> => {
      if (!config?.aiFollowup?.enabled || !participantId) return false
      if (!answer || answer.trim().length === 0) return false

      if (responseValue !== undefined && !shouldTriggerFollowup(config.aiFollowup, responseValue)) {
        return false
      }

      const maxFollowups = config.aiFollowup.maxFollowups ?? 2
      if ((followupCountRef.current.get(questionId) ?? 0) >= maxFollowups) return false

      const session: ProbeSession = {
        parentQuestionId: questionId,
        questionText,
        questionType,
        answer,
        responseContext: questionType
          ? buildResponseContext(questionType, responseValue ?? answer)
          : null,
        turns: [],
        current: null,
      }

      const shown = await requestProbe(session)
      if (!shown) finish()
      return shown
    },
    [participantId, requestProbe, finish]
  )

  const submitFollowupAndContinue = useCallback(
    async (
      _questionText: string,
      config: AiFollowupEnabledConfig | undefined,
      onNext: () => void
    ) => {
      const session = sessionRef.current
      const current = session?.current
      if (!session || !current) {
        finish()
        onNext()
        return
      }

      const answer = followupAnswerRef.current

      // Fire-and-forget save. Preview probes are not stored, so there is nothing to attach to.
      if (current.id && !isPreview) {
        fetch(`/api/studies/${studyId}/ai-followup-respond`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            participantId,
            followupQuestionId: current.id,
            responseValue: toResponsePayload(current.type, answer),
            responseTimeMs: Date.now() - current.shownAt,
          }),
        }).catch(() => {})
      }

      const reply = describeFollowupAnswer(current.type, answer, current.config)
      session.turns = [...session.turns, { question: current.question, answer: reply }]
      session.current = null

      // Only open-text replies can be probed again; a structured answer closes the thread.
      const maxFollowups = config?.aiFollowup?.maxFollowups ?? 2
      const canProbeAgain =
        current.type === 'text' &&
        !!config?.aiFollowup?.enabled &&
        reply.trim().length > 0 &&
        (followupCountRef.current.get(session.parentQuestionId) ?? 0) < maxFollowups

      if (canProbeAgain && (await requestProbe(session))) return

      finish()
      onNext()
    },
    [studyId, participantId, isPreview, requestProbe, finish]
  )

  const setFollowupAnswer = useCallback((answer: unknown) => {
    followupAnswerRef.current = answer
  }, [])

  const resetFollowups = useCallback(() => {
    finish()
  }, [finish])

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
