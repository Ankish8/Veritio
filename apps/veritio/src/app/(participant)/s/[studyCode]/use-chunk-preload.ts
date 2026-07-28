'use client'

import { useEffect } from 'react'

/**
 * Warm the lazy chunks this specific study will need, while the participant is
 * still reading the welcome card.
 *
 * The study-type players and the heavier question renderers are intentionally
 * loaded with `next/dynamic` so they stay out of every participant's initial
 * bundle. The downside is that the download only *starts* when the participant
 * clicks "Start" (player) or scrolls onto a ranking/audio question — so the
 * cost lands mid-study, exactly where it is most visible.
 *
 * The SSR payload already tells us the study type and every question type in
 * the study, so we can fetch precisely those chunks up front and nothing else.
 * By the time the participant acts, the code is in the module cache and the
 * transition is instant.
 *
 * These thunks are plain `() => import(...)` closures: the bundler still splits
 * them into their own chunks, so referencing them here does NOT pull the code
 * into the initial bundle. They resolve to the SAME chunks the `dynamic()`
 * wrappers request, so warming one satisfies the other.
 */

type StudyType =
  | 'card_sort'
  | 'tree_test'
  | 'survey'
  | 'prototype_test'
  | 'first_click'
  | 'first_impression'
  | 'live_website_test'

const playerChunkLoaders: Partial<Record<StudyType, () => Promise<unknown>>> = {
  card_sort: () => import('@/components/players/card-sort'),
  tree_test: () => import('@/components/players/tree-test'),
  prototype_test: () => import('@veritio/prototype-test/player'),
  first_click: () => import('@/components/players/first-click'),
  first_impression: () => import('@/components/players/first-impression'),
  live_website_test: () => import('@/components/players/live-website'),
  // survey has no separate activity player — questions render inline
}

const questionChunkLoaders: Record<string, () => Promise<unknown>> = {
  ranking: () => import('@/components/study-flow/player/question-renderers/ranking-question'),
  audio_response: () =>
    import('@/components/study-flow/player/question-renderers/audio-response-question'),
}

/** Run work once the browser is idle, falling back to a short timer. */
function whenIdle(run: () => void): () => void {
  if (typeof window === 'undefined') return () => {}

  const ric = (window as typeof window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
    cancelIdleCallback?: (handle: number) => void
  }).requestIdleCallback

  if (typeof ric === 'function') {
    const handle = ric(run, { timeout: 2000 })
    return () => window.cancelIdleCallback?.(handle)
  }

  const timer = window.setTimeout(run, 200)
  return () => window.clearTimeout(timer)
}

export interface ChunkPreloadOptions {
  studyType: string | null | undefined
  /** Every question type present in the study, from the SSR payload. */
  questionTypes: readonly string[]
  /** Skip when the participant is already past the welcome step. */
  enabled: boolean
}

export function useChunkPreload({ studyType, questionTypes, enabled }: ChunkPreloadOptions) {
  // Join the types so the effect re-runs if the study payload actually changes,
  // without depending on a fresh array identity each render.
  const questionTypeKey = [...new Set(questionTypes)].sort().join(',')

  useEffect(() => {
    if (!enabled || !studyType) return

    const cancel = whenIdle(() => {
      const loaders: Array<() => Promise<unknown>> = []

      const playerLoader = playerChunkLoaders[studyType as StudyType]
      if (playerLoader) loaders.push(playerLoader)

      for (const type of questionTypeKey ? questionTypeKey.split(',') : []) {
        const loader = questionChunkLoaders[type]
        if (loader) loaders.push(loader)
      }

      // Preloading is best-effort: a failed prefetch must not surface to the
      // participant, the real dynamic() import will retry and show its own
      // loading/error state.
      for (const load of loaders) {
        try {
          void load()?.catch(() => {})
        } catch {
          /* ignore */
        }
      }
    })

    return cancel
  }, [enabled, studyType, questionTypeKey])
}

/** Collect the distinct question types across every section of a study. */
export function collectQuestionTypes(
  study: {
    screening_questions?: Array<{ question_type?: string }> | null
    pre_study_questions?: Array<{ question_type?: string }> | null
    post_study_questions?: Array<{ question_type?: string }> | null
    survey_questions?: Array<{ question_type?: string }> | null
  } | null,
): string[] {
  if (!study) return []
  const sections = [
    study.screening_questions,
    study.pre_study_questions,
    study.post_study_questions,
    study.survey_questions,
  ]
  const types = new Set<string>()
  for (const section of sections) {
    for (const question of section || []) {
      if (question?.question_type) types.add(question.question_type)
    }
  }
  return [...types]
}
