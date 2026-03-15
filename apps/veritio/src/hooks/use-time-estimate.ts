import { useMemo } from 'react'
import {
  useCardSortCards,
  useCardSortCategories,
  useTreeTestTasks,
  usePrototypeTestTasks,
  useFirstClickTasks,
  useFirstImpressionDesigns,
  useLiveWebsiteTasks,
} from '@/stores/study-builder'
import {
  useFlowSettings,
  useScreeningQuestions,
  usePreStudyQuestions,
  usePostStudyQuestions,
  useSurveyQuestions,
} from '@/stores/study-flow-builder'
import {
  calculateTimeEstimate,
  formatTimeEstimate,
  isSimpleQuestion,
  isComplexQuestion,
} from '@/lib/utils/time-estimate'
import type { StudyContentCounts } from '@/lib/utils/time-estimate'
import type { StudyType } from '@/components/builders/shared/types'

/** Count post-task questions across tasks (stored as JSON arrays). */
function countPostTaskQuestions(tasks: Array<{ post_task_questions?: unknown }>): number {
  let count = 0
  for (const task of tasks) {
    if (Array.isArray(task.post_task_questions)) {
      count += task.post_task_questions.length
    }
  }
  return count
}

function classifyQuestions(questions: Array<{ question_type: string }>): {
  simple: number
  complex: number
} {
  let simple = 0
  let complex = 0
  for (const q of questions) {
    if (isSimpleQuestion(q.question_type)) simple++
    else if (isComplexQuestion(q.question_type)) complex++
    else simple++ // default unknown types to simple
  }
  return { simple, complex }
}

/** Reactively compute time estimate from builder stores. All selectors are called unconditionally (React rules of hooks). */
export function useTimeEstimate(studyType: StudyType): string {
  const cards = useCardSortCards()
  const categories = useCardSortCategories()
  const treeTestTasks = useTreeTestTasks()
  const prototypeTestTasks = usePrototypeTestTasks()
  const firstClickTasks = useFirstClickTasks()
  const firstImpressionDesigns = useFirstImpressionDesigns()
  const liveWebsiteTasks = useLiveWebsiteTasks()

  const flowSettings = useFlowSettings()
  const screeningQuestions = useScreeningQuestions()
  const preStudyQuestions = usePreStudyQuestions()
  const postStudyQuestions = usePostStudyQuestions()
  const surveyQuestions = useSurveyQuestions()

  return useMemo(() => {
    const screeningClass = classifyQuestions(screeningQuestions)
    const preStudyClass = classifyQuestions(preStudyQuestions)
    const postStudyClass = classifyQuestions(postStudyQuestions)
    const surveyClass = classifyQuestions(surveyQuestions)

    const simpleQuestionCount =
      screeningClass.simple + preStudyClass.simple + postStudyClass.simple + surveyClass.simple
    const complexQuestionCount =
      screeningClass.complex + preStudyClass.complex + postStudyClass.complex + surveyClass.complex

    let postTaskQuestionCount = 0
    let firstImpressionQuestionCount = 0
    if (studyType === 'first_impression') {
      for (const design of firstImpressionDesigns) {
        if (Array.isArray(design.questions)) {
          firstImpressionQuestionCount += design.questions.length
        }
      }
    }

    switch (studyType) {
      case 'tree_test':
        postTaskQuestionCount = countPostTaskQuestions(treeTestTasks)
        break
      case 'prototype_test':
        postTaskQuestionCount = countPostTaskQuestions(prototypeTestTasks)
        break
      case 'first_click':
        postTaskQuestionCount = countPostTaskQuestions(firstClickTasks)
        break
      case 'live_website_test':
        postTaskQuestionCount = countPostTaskQuestions(liveWebsiteTasks)
        break
    }

    postTaskQuestionCount += firstImpressionQuestionCount

    const counts: StudyContentCounts = {
      studyType,
      cardCount: studyType === 'card_sort' ? cards.length : 0,
      categoryCount: studyType === 'card_sort' ? categories.length : 0,
      treeTaskCount: studyType === 'tree_test' ? treeTestTasks.length : 0,
      prototypeTaskCount: studyType === 'prototype_test' ? prototypeTestTasks.length : 0,
      firstClickTaskCount: studyType === 'first_click' ? firstClickTasks.length : 0,
      designCount: studyType === 'first_impression' ? firstImpressionDesigns.length : 0,
      liveWebsiteTaskCount: studyType === 'live_website_test' ? liveWebsiteTasks.length : 0,
      screeningQuestionCount: screeningQuestions.length,
      preStudyQuestionCount: preStudyQuestions.length,
      postStudyQuestionCount: postStudyQuestions.length,
      surveyQuestionCount: surveyQuestions.length,
      simpleQuestionCount,
      complexQuestionCount,
      hasWelcome: flowSettings?.welcome?.enabled ?? false,
      hasThankYou: flowSettings?.thankYou?.enabled ?? false,
      hasInstructions: flowSettings?.activityInstructions?.enabled ?? false,
      postTaskQuestionCount,
    }

    const estimate = calculateTimeEstimate(counts)
    return formatTimeEstimate(estimate)
  }, [
    studyType,
    cards,
    categories,
    treeTestTasks,
    prototypeTestTasks,
    firstClickTasks,
    firstImpressionDesigns,
    liveWebsiteTasks,
    flowSettings,
    screeningQuestions,
    preStudyQuestions,
    postStudyQuestions,
    surveyQuestions,
  ])
}
