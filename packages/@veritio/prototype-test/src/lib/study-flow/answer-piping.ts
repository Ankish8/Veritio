
import type {
  StudyFlowQuestion,
  ResponseValue,
  SingleChoiceResponseValue,
  MultiChoiceResponseValue,
  ScaleResponseValue,
  MatrixResponseValue,
  MultipleChoiceQuestionConfig,
  YesNoQuestionConfig,
  RankingQuestionConfig,
  MatrixQuestionConfig,
} from '../supabase/study-flow-types'
export const PIPING_ID_PATTERN = /\{Q:([a-zA-Z0-9_-]+)\}/g
export const PIPING_READABLE_PATTERN = /\[\[Answer:\s*"([^"]*)"\]\]/g
export const PIPING_TITLE_PATTERN = /@([A-Za-z][A-Za-z0-9_\s]*?)(?=\s|$|[.,!?;:])/g
export const PIPING_HTML_SPAN_PATTERN = /<span[^>]*data-piping-reference="true"[^>]*data-question-id="([^"]+)"[^>]*>.*?<\/span>|<span[^>]*data-question-id="([^"]+)"[^>]*data-piping-reference="true"[^>]*>.*?<\/span>/g

export interface PipingReference {
  type: 'id' | 'title'
  questionId?: string
  questionTitle?: string
  raw: string
  startIndex: number
  endIndex: number
}

export function parsePipingReferences(text: string): PipingReference[] {
  const references: PipingReference[] = []

  // Find ID-based references
  let match: RegExpExecArray | null
  const idPattern = new RegExp(PIPING_ID_PATTERN.source, 'g')
  while ((match = idPattern.exec(text)) !== null) {
    references.push({
      type: 'id',
      questionId: match[1],
      raw: match[0],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    })
  }

  // Find title-based references
  const titlePattern = new RegExp(PIPING_TITLE_PATTERN.source, 'g')
  while ((match = titlePattern.exec(text)) !== null) {
    references.push({
      type: 'title',
      questionTitle: match[1].trim(),
      raw: match[0],
      startIndex: match.index,
      endIndex: match.index + match[0].length,
    })
  }

  // Sort by start index
  return references.sort((a, b) => a.startIndex - b.startIndex)
}

export function hasPipingReferences(text: string): boolean {
  const idPattern = new RegExp(PIPING_ID_PATTERN.source)
  const readablePattern = new RegExp(PIPING_READABLE_PATTERN.source)
  const titlePattern = new RegExp(PIPING_TITLE_PATTERN.source)
  const htmlSpanPattern = new RegExp(PIPING_HTML_SPAN_PATTERN.source)
  return idPattern.test(text) || readablePattern.test(text) || titlePattern.test(text) || htmlSpanPattern.test(text)
}

export function formatResponseForPiping(
  value: ResponseValue | undefined,
  question: StudyFlowQuestion
): string {
  if (value === undefined || value === null) {
    return '[your answer]'
  }

  switch (question.question_type) {
    case 'single_line_text':
    case 'multi_line_text':
      return typeof value === 'string' ? value : '[your answer]'

    case 'multiple_choice':
      return formatMultipleChoiceResponse(value, question)

    case 'yes_no':
      return formatYesNoResponse(value, question)

    case 'opinion_scale':
    case 'nps':
    case 'slider':
      return formatScaleResponse(value)

    case 'ranking':
      return formatRankingResponse(value, question)

    case 'matrix':
      return formatMatrixResponse(value, question)

    default:
      return '[your answer]'
  }
}

function formatMultipleChoiceResponse(
  value: ResponseValue,
  question: StudyFlowQuestion
): string {
  const config = question.config as MultipleChoiceQuestionConfig
  const options = config.options || []

  // Single choice response
  if (typeof value === 'object' && 'optionId' in value) {
    const response = value as SingleChoiceResponseValue
    const option = options.find((o) => o.id === response.optionId)
    return option?.label || '[your answer]'
  }

  // Multi choice response
  if (typeof value === 'object' && 'optionIds' in value) {
    const response = value as MultiChoiceResponseValue
    const selectedLabels = response.optionIds
      .map((id) => options.find((o) => o.id === id)?.label)
      .filter(Boolean) as string[]

    if (response.otherText) {
      selectedLabels.push(response.otherText)
    }

    return selectedLabels.length > 0 ? selectedLabels.join(', ') : '[your answer]'
  }

  return '[your answer]'
}

function formatYesNoResponse(
  value: ResponseValue,
  question: StudyFlowQuestion
): string {
  const config = question.config as YesNoQuestionConfig

  if (typeof value === 'boolean') {
    // Use custom labels if provided
    if (value && config.yesLabel) return config.yesLabel
    if (!value && config.noLabel) return config.noLabel
    return value ? 'Yes' : 'No'
  }

  // Handle object format { value: boolean }
  if (typeof value === 'object' && 'value' in value) {
    const boolValue = (value as unknown as { value: boolean }).value
    if (typeof boolValue === 'boolean') {
      if (boolValue && config.yesLabel) return config.yesLabel
      if (!boolValue && config.noLabel) return config.noLabel
      return boolValue ? 'Yes' : 'No'
    }
  }

  return '[your answer]'
}

function formatScaleResponse(value: ResponseValue): string {
  // Direct number
  if (typeof value === 'number') {
    return String(value)
  }

  // Object format { value: number }
  if (typeof value === 'object' && 'value' in value) {
    const scaleValue = (value as ScaleResponseValue).value
    return typeof scaleValue === 'number' ? String(scaleValue) : '[your answer]'
  }

  return '[your answer]'
}

function formatRankingResponse(
  value: ResponseValue,
  question: StudyFlowQuestion
): string {
  const config = question.config as RankingQuestionConfig

  // RankingResponseValue is string[] (array of ranked item IDs)
  if (Array.isArray(value)) {
    const rankedIds = value as string[]
    const items = config.items || []

    const rankedLabels = rankedIds
      .map((id) => items.find((item) => item.id === id)?.label)
      .filter(Boolean) as string[]

    if (rankedLabels.length === 0) return '[your answer]'

    // Format as numbered list: "1. Item A, 2. Item B, 3. Item C"
    return rankedLabels.map((label, i) => `${i + 1}. ${label}`).join(', ')
  }

  return '[your answer]'
}

function formatMatrixResponse(
  value: ResponseValue,
  question: StudyFlowQuestion
): string {
  const config = question.config as MatrixQuestionConfig

  // MatrixResponseValue is { [rowId]: columnId | columnId[] }
  if (typeof value === 'object' && !Array.isArray(value)) {
    const response = value as MatrixResponseValue
    const rows = config.rows || []
    const columns = config.columns || []

    const formattedParts: string[] = []

    for (const [rowId, columnValue] of Object.entries(response)) {
      const row = rows.find((r) => r.id === rowId)
      if (!row) continue

      // Handle single column or multiple columns
      const columnIds = Array.isArray(columnValue) ? columnValue : [columnValue]
      const columnLabels = columnIds
        .map((cId) => columns.find((c) => c.id === cId)?.label)
        .filter(Boolean)

      if (columnLabels.length > 0) {
        formattedParts.push(`${row.label}: ${columnLabels.join(', ')}`)
      }
    }

    return formattedParts.length > 0 ? formattedParts.join('; ') : '[your answer]'
  }

  return '[your answer]'
}
export function resolvePipingReference(
  ref: PipingReference,
  questions: StudyFlowQuestion[],
  responses: Map<string, ResponseValue>
): string {
  let question: StudyFlowQuestion | undefined

  if (ref.type === 'id' && ref.questionId) {
    question = questions.find((q) => q.id === ref.questionId)
  } else if (ref.type === 'title' && ref.questionTitle) {
    const normalizedTitle = normalizeTitle(ref.questionTitle)
    question = questions.find(
      (q) => normalizeTitle(q.question_text) === normalizedTitle
    )
  }

  if (!question) {
    return ref.type === 'id' ? '[unknown question]' : ref.raw
  }

  const response = responses.get(question.id)
  return formatResponseForPiping(response, question)
}
export function resolveAllPipingReferences(
  text: string,
  questions: StudyFlowQuestion[],
  responses: Map<string, ResponseValue>
): string {
  if (!text || !hasPipingReferences(text)) {
    return text
  }

  let result = text

  // Create lookup maps
  const questionById = new Map(questions.map((q) => [q.id, q]))
  const questionByTitle = new Map(
    questions.map((q) => [normalizeTitle(q.question_text), q])
  )

  // Replace ID-based references {Q:id}
  result = result.replace(
    new RegExp(PIPING_ID_PATTERN.source, 'g'),
    (match, questionId) => {
      const question = questionById.get(questionId)
      if (!question) return '[unknown question]'

      const response = responses.get(questionId)
      return formatResponseForPiping(response, question)
    }
  )

  // Replace readable format [[Answer: "Question text"]]
  result = result.replace(
    new RegExp(PIPING_READABLE_PATTERN.source, 'g'),
    (match, questionText) => {
      const normalizedText = normalizeTitle(questionText)
      const question = questionByTitle.get(normalizedText)
      if (!question) return '[unknown question]'

      const response = responses.get(question.id)
      return formatResponseForPiping(response, question)
    }
  )

  // Replace title-based references
  result = result.replace(
    new RegExp(PIPING_TITLE_PATTERN.source, 'g'),
    (match, title) => {
      const normalizedTitle = normalizeTitle(title)
      const question = questionByTitle.get(normalizedTitle)
      if (!question) return match // Keep original if no match

      const response = responses.get(question.id)
      return formatResponseForPiping(response, question)
    }
  )

  // Replace HTML span piping references (from TipTap editor)
  // These look like: <span data-piping-reference="true" data-question-id="xxx">Question preview</span>
  // The regex has two alternations, so questionId is in group 1 or group 2 depending on attribute order
  result = result.replace(
    new RegExp(PIPING_HTML_SPAN_PATTERN.source, 'g'),
    (match, questionId1, questionId2) => {
      const questionId = questionId1 || questionId2
      const question = questionById.get(questionId)
      if (!question) return '[unknown question]'

      const response = responses.get(questionId)
      return formatResponseForPiping(response, question)
    }
  )

  return result
}
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/<[^>]*>/g, '') // Strip HTML tags
    .replace(/\s+/g, ' ')
    .trim()
}
const SECTION_ORDER: Record<string, number> = {
  screening: 0,
  pre_study: 1,
  survey: 2,
  post_study: 3,
}
export function getAvailableQuestionsForPiping(
  currentQuestionPosition: number,
  allQuestions: StudyFlowQuestion[],
  currentSection?: string
): StudyFlowQuestion[] {
  const currentSectionOrder = currentSection ? SECTION_ORDER[currentSection] ?? 999 : -1

  return allQuestions
    .filter((q) => {
      const qSectionOrder = SECTION_ORDER[q.section] ?? 999

      // If we know the current section, use proper cross-section logic
      if (currentSection) {
        // Questions from earlier sections are always available
        if (qSectionOrder < currentSectionOrder) {
          return true
        }
        // Questions from the same section with lower position are available
        if (qSectionOrder === currentSectionOrder && q.position < currentQuestionPosition) {
          return true
        }
        return false
      }

      // Fallback: simple position-based filtering (legacy behavior)
      return q.position < currentQuestionPosition
    })
    .sort((a, b) => {
      // Sort by section order first, then by position within section
      const aOrder = SECTION_ORDER[a.section] ?? 999
      const bOrder = SECTION_ORDER[b.section] ?? 999
      if (aOrder !== bOrder) return aOrder - bOrder
      return a.position - b.position
    })
}
export function generatePipingReference(
  question: StudyFlowQuestion,
  useId: boolean = true
): string {
  if (useId) {
    return `{Q:${question.id}}`
  }
  // Use first few words of question text as title reference
  const titleWords = question.question_text
    .replace(/<[^>]*>/g, '')
    .split(/\s+/)
    .slice(0, 3)
    .join(' ')
  return `@${titleWords}`
}

export function getPipingPreview(
  question: StudyFlowQuestion,
  response?: ResponseValue
): string {
  if (!response) {
    const plainText = question.question_text.replace(/<[^>]*>/g, '')
    return `[${plainText.slice(0, 30)}${plainText.length > 30 ? '...' : ''}]`
  }
  return formatResponseForPiping(response, question)
}
