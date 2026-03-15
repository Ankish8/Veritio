/**
 * Strip piping HTML from question text for display in results/analysis views.
 *
 * Converts:
 * - <span data-piping-reference="true" ...>[placeholder]</span> → [placeholder]
 * - Other HTML tags → plain text (when stripAllHtml=true)
 *
 * Use this whenever displaying question_text in analysis/results contexts
 * where the raw piping HTML would otherwise show.
 */

/**
 * Strip piping reference spans and optionally all HTML from question text.
 * Keeps the inner text content of piping spans (which is the placeholder).
 *
 * @param text - The text containing piping HTML
 * @param stripAllHtml - If true, strips all HTML tags. If false, only strips piping spans. Default: true
 *
 * @example
 * // Input: 'You mentioned <span data-piping-reference="true">[primary reason]</span>. Tell us more.'
 * // Output (stripAllHtml=true): 'You mentioned [primary reason]. Tell us more.'
 * // Output (stripAllHtml=false): 'You mentioned [primary reason]. Tell us more.' (preserves other HTML)
 */
export function stripPipingHtml(text: string | null | undefined, stripAllHtml: boolean = true): string {
  if (!text) return ''

  // First, replace piping spans with their inner text content
  // Match: <span ... data-piping-reference="true" ...>content</span>
  let result = text.replace(
    /<span[^>]*data-piping-reference="true"[^>]*>(.*?)<\/span>/gi,
    '$1'
  )

  // Also handle the reverse attribute order
  result = result.replace(
    /<span[^>]*data-question-id="[^"]*"[^>]*data-piping-reference="true"[^>]*>(.*?)<\/span>/gi,
    '$1'
  )

  if (stripAllHtml) {
    // Strip any remaining HTML tags (like <p>, <strong>, etc.)
    result = result.replace(/<[^>]*>/g, '')

    // Clean up multiple whitespace
    result = result.replace(/\s+/g, ' ').trim()
  }

  return result
}

/**
 * Process HTML content to strip piping spans while preserving other HTML.
 * Use this for dangerouslySetInnerHTML contexts where you want to keep formatting.
 *
 * @example
 * // Input: '<p>You mentioned <span data-piping-reference="true">[reason]</span>.</p>'
 * // Output: '<p>You mentioned [reason].</p>'
 */
export function stripPipingSpansOnly(html: string | null | undefined): string {
  return stripPipingHtml(html, false)
}

/**
 * Check if text contains piping HTML that needs stripping.
 */
export function hasPipingHtml(text: string | null | undefined): boolean {
  if (!text) return false
  return /data-piping-reference="true"/.test(text)
}
