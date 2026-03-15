/**
 * Shared question utilities for first-impression analysis.
 *
 * Extracted from question-responses-tab.tsx and analysis-tab.tsx
 * to share between single-design views and comparison views.
 */

import type { WordData } from '@/components/analysis/first-impression/word-cloud/word-cloud-visualization'

// ---------- Stop words ----------

export const DEFAULT_STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
  'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought',
  'used', 'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you',
  'your', 'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself',
  'she', 'her', 'hers', 'herself', 'it', 'its', 'itself', 'they', 'them',
  'their', 'theirs', 'themselves', 'what', 'which', 'who', 'whom', 'this',
  'that', 'these', 'those', 'am', 'been', 'being', 'having', 'doing', 'just',
  'very', 'really', 'also', 'so', 'than', 'too', 'only', 'same', 'into',
  'about', 'over', 'such', 'no', 'not', 'yes', 'all', 'any', 'both', 'each',
  'few', 'more', 'most', 'other', 'some', 'nor', 'own', 'even', 'if',
  'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'because',
  'like', 'dont', 'didnt', 'dont', 'cant', 'wont', 'isnt', 'arent', 'wasnt',
  'werent', 'hasnt', 'havent', 'hadnt', 'doesnt', 'didnt', 'wouldnt', 'couldnt',
  'shouldnt', 'mightnt', 'mustnt', 'im', 'youre', 'hes', 'shes', 'its', 'were',
  'theyre', 'ive', 'youve', 'weve', 'theyve', 'id', 'youd', 'hed', 'shed',
  'wed', 'theyd', 'ill', 'youll', 'hell', 'shell', 'well', 'theyll',
])

// ---------- Question type helpers ----------

const QUESTION_TYPE_LABELS: Record<string, string> = {
  short_text: 'Short Text',
  long_text: 'Long Text',
  single_line_text: 'Short Text',
  multi_line_text: 'Long Text',
  single_choice: 'Single Choice',
  multiple_choice: 'Multiple Choice',
  yes_no: 'Yes/No',
  image_choice: 'Image Choice',
  rating: 'Rating',
  scale: 'Scale',
  opinion_scale: 'Opinion Scale',
  nps: 'NPS',
  slider: 'Slider',
}

export function formatQuestionType(type: string): string {
  return QUESTION_TYPE_LABELS[type] || type
}

const TEXT_TYPES = new Set(['short_text', 'long_text', 'single_line_text', 'multi_line_text'])
const CHOICE_TYPES = new Set(['single_choice', 'multiple_choice', 'yes_no', 'image_choice'])
const NUMERIC_TYPES = new Set(['rating', 'scale', 'opinion_scale', 'nps', 'slider'])

export function isTextQuestion(type: string): boolean {
  return TEXT_TYPES.has(type)
}

export function isChoiceQuestion(type: string): boolean {
  return CHOICE_TYPES.has(type)
}

export function isNumericQuestion(type: string): boolean {
  return NUMERIC_TYPES.has(type)
}

export type ComparisonStrategy = 'numeric' | 'categorical' | 'text' | 'incompatible'

export function getComparisonStrategy(type: string): ComparisonStrategy {
  if (isNumericQuestion(type)) return 'numeric'
  if (isChoiceQuestion(type)) return 'categorical'
  if (isTextQuestion(type)) return 'text'
  return 'incompatible'
}

// ---------- Value extraction ----------

export function extractNumericValue(responseValue: any): number | null {
  if (typeof responseValue === 'number') return responseValue
  if (typeof responseValue === 'string') {
    const parsed = parseFloat(responseValue)
    return isNaN(parsed) ? null : parsed
  }
  return null
}

export function extractCategoricalValues(responseValue: any): string[] {
  if (Array.isArray(responseValue)) return responseValue.map(String)
  if (typeof responseValue === 'string') return [responseValue]
  if (typeof responseValue === 'boolean') return [responseValue ? 'Yes' : 'No']
  if (typeof responseValue === 'number') return [String(responseValue)]
  return []
}

// ---------- Word cloud data builder ----------

export function buildWordData(
  responses: Array<{ response_value: any }>,
  stopWords: Set<string>,
): WordData[] {
  const wordCounts = new Map<string, number>()

  for (const response of responses) {
    const text = response.response_value as string
    if (!text || typeof text !== 'string') continue

    const words = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))

    for (const word of words) {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1)
    }
  }

  const sortedWords = Array.from(wordCounts.entries())
    .map(([text, count]) => ({ text, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 50)

  if (sortedWords.length === 0) return []

  const totalCount = sortedWords.reduce((sum, w) => sum + w.count, 0)
  const maxCount = sortedWords[0].count
  const minCount = sortedWords[sortedWords.length - 1].count

  return sortedWords.map(word => ({
    text: word.text,
    count: word.count,
    percentage: (word.count / totalCount) * 100,
    size: minCount === maxCount
      ? 28
      : 14 + ((word.count - minCount) / (maxCount - minCount)) * 42,
  }))
}
