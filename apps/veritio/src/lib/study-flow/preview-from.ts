import type { FlowStep, StudyFlowQuestion } from '@veritio/study-types/study-flow-types'

export type PreviewFromTarget =
  | { kind: 'section'; id: string }
  | { kind: 'question'; id: string }
  | { kind: 'task'; id: string }

const TARGET_PATTERN = /^(section|question|task):([a-z0-9_-]{1,100})$/i

const SECTION_TO_STEP: Record<string, FlowStep> = {
  welcome: 'welcome',
  agreement: 'agreement',
  screening: 'screening',
  identifier: 'identifier',
  pre_study: 'pre_study',
  instructions: 'instructions',
  activity: 'activity',
  prototype_settings: 'activity',
  survey: 'survey',
  post_study: 'post_study',
  thank_you: 'thank_you',
  rejected: 'rejected',
  closed: 'closed',
}

export function parsePreviewFrom(value: string | null | undefined): PreviewFromTarget | null {
  if (!value) return null
  const match = TARGET_PATTERN.exec(value)
  if (!match) return null
  return {
    kind: match[1].toLowerCase() as PreviewFromTarget['kind'],
    id: match[2],
  }
}

export function serializePreviewFrom(target: PreviewFromTarget): string {
  return `${target.kind}:${target.id}`
}

export function resolvePreviewSection(id: string): FlowStep | null {
  return SECTION_TO_STEP[id] || null
}

export function findPreviewQuestion(
  questionId: string,
  sections: {
    screening: StudyFlowQuestion[]
    pre_study: StudyFlowQuestion[]
    survey: StudyFlowQuestion[]
    post_study: StudyFlowQuestion[]
  }
): { step: FlowStep; question: StudyFlowQuestion } | null {
  for (const [step, questions] of Object.entries(sections) as Array<
    [FlowStep, StudyFlowQuestion[]]
  >) {
    const question = questions.find((candidate) => candidate.id === questionId)
    if (question) return { step, question }
  }
  return null
}

export function includeForcedPreviewQuestion(
  allQuestions: StudyFlowQuestion[],
  visibleQuestions: StudyFlowQuestion[],
  previewQuestionId: string | null
): StudyFlowQuestion[] {
  if (!previewQuestionId || visibleQuestions.some((question) => question.id === previewQuestionId)) {
    return visibleQuestions
  }

  const forced = allQuestions.find((question) => question.id === previewQuestionId)
  if (!forced) return visibleQuestions

  const allPositions = new Map(allQuestions.map((question, index) => [question.id, index]))
  return [...visibleQuestions, forced].sort(
    (left, right) => (allPositions.get(left.id) ?? 0) - (allPositions.get(right.id) ?? 0)
  )
}
