/**
 * Element Recognition Algorithm
 *
 * Analyzes text responses to identify which UI elements
 * participants noticed and remembered.
 */

export interface UIElement {
  id: string
  name: string
  keywords: string[] // Keywords that indicate this element was noticed
  category: 'branding' | 'navigation' | 'content' | 'action' | 'visual'
}

export interface ElementRecognitionResult {
  element: UIElement
  mentionCount: number
  percentage: number // Percentage of responses mentioning this element
  sampleResponses: string[] // First 3 responses mentioning this element
}

/**
 * Default UI elements to track in first impression tests
 */
export const DEFAULT_UI_ELEMENTS: UIElement[] = [
  {
    id: 'logo',
    name: 'Logo',
    keywords: ['logo', 'brand', 'icon', 'symbol', 'emblem', 'mark', 'branding'],
    category: 'branding',
  },
  {
    id: 'headline',
    name: 'Headline',
    keywords: ['headline', 'title', 'heading', 'header', 'main text', 'big text', 'tagline', 'slogan'],
    category: 'content',
  },
  {
    id: 'cta',
    name: 'Call-to-Action',
    keywords: ['button', 'cta', 'call to action', 'sign up', 'get started', 'learn more', 'buy', 'subscribe', 'click'],
    category: 'action',
  },
  {
    id: 'navigation',
    name: 'Navigation',
    keywords: ['menu', 'nav', 'navigation', 'links', 'tabs', 'sidebar', 'header links'],
    category: 'navigation',
  },
  {
    id: 'image',
    name: 'Hero Image',
    keywords: ['image', 'photo', 'picture', 'graphic', 'illustration', 'hero', 'banner', 'visual'],
    category: 'visual',
  },
  {
    id: 'color',
    name: 'Color Scheme',
    keywords: ['color', 'colour', 'blue', 'red', 'green', 'purple', 'orange', 'yellow', 'dark', 'light', 'bright', 'colorful'],
    category: 'visual',
  },
  {
    id: 'form',
    name: 'Form/Input',
    keywords: ['form', 'input', 'field', 'text box', 'search', 'email', 'signup form', 'login'],
    category: 'action',
  },
  {
    id: 'pricing',
    name: 'Pricing',
    keywords: ['price', 'pricing', 'cost', 'dollar', '$', 'free', 'plan', 'subscription', 'pay'],
    category: 'content',
  },
]

/**
 * Analyze text responses for element recognition
 */
export function analyzeElementRecognition(
  responses: string[],
  elements: UIElement[] = DEFAULT_UI_ELEMENTS
): ElementRecognitionResult[] {
  const results: ElementRecognitionResult[] = []

  for (const element of elements) {
    const matchingResponses: string[] = []

    for (const response of responses) {
      const lowerResponse = response.toLowerCase()

      // Check if any keyword matches
      const hasMatch = element.keywords.some(keyword =>
        lowerResponse.includes(keyword.toLowerCase())
      )

      if (hasMatch) {
        matchingResponses.push(response)
      }
    }

    results.push({
      element,
      mentionCount: matchingResponses.length,
      percentage: responses.length > 0
        ? (matchingResponses.length / responses.length) * 100
        : 0,
      sampleResponses: matchingResponses.slice(0, 3),
    })
  }

  // Sort by mention count (descending)
  return results.sort((a, b) => b.mentionCount - a.mentionCount)
}

/**
 * Calculate overall recall rate
 *
 * Recall rate = percentage of participants who mentioned
 * at least one key element in their response
 */
export function calculateRecallRate(
  responses: string[],
  elements: UIElement[] = DEFAULT_UI_ELEMENTS
): {
  recallRate: number
  totalRecalling: number
  totalResponses: number
  threshold: 'excellent' | 'good' | 'needs_improvement' | 'poor'
} {
  let recallingCount = 0

  for (const response of responses) {
    const lowerResponse = response.toLowerCase()

    // Check if response mentions any element
    const mentionsAnyElement = elements.some(element =>
      element.keywords.some(keyword =>
        lowerResponse.includes(keyword.toLowerCase())
      )
    )

    if (mentionsAnyElement) {
      recallingCount++
    }
  }

  const recallRate = responses.length > 0
    ? (recallingCount / responses.length) * 100
    : 0

  // Determine threshold
  let threshold: 'excellent' | 'good' | 'needs_improvement' | 'poor'
  if (recallRate >= 80) {
    threshold = 'excellent'
  } else if (recallRate >= 60) {
    threshold = 'good'
  } else if (recallRate >= 40) {
    threshold = 'needs_improvement'
  } else {
    threshold = 'poor'
  }

  return {
    recallRate,
    totalRecalling: recallingCount,
    totalResponses: responses.length,
    threshold,
  }
}

/**
 * Get color class for recall rate threshold
 */
export function getRecallRateColor(threshold: string): string {
  switch (threshold) {
    case 'excellent':
      return 'text-green-600'
    case 'good':
      return 'text-blue-600'
    case 'needs_improvement':
      return 'text-yellow-600'
    case 'poor':
      return 'text-red-600'
    default:
      return 'text-muted-foreground'
  }
}

/**
 * Get background color class for recall rate threshold
 */
export function getRecallRateBackgroundColor(threshold: string): string {
  switch (threshold) {
    case 'excellent':
      return 'bg-green-100 dark:bg-green-900/20'
    case 'good':
      return 'bg-blue-100 dark:bg-blue-900/20'
    case 'needs_improvement':
      return 'bg-yellow-100 dark:bg-yellow-900/20'
    case 'poor':
      return 'bg-red-100 dark:bg-red-900/20'
    default:
      return 'bg-muted'
  }
}
