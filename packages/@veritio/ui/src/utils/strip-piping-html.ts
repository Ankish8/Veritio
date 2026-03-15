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

  // Replace piping spans with their inner text content
  // The [^>]* matches any attribute order, so one regex handles all cases
  let result = text.replace(
    /<span[^>]*data-piping-reference="true"[^>]*>(.*?)<\/span>/gi,
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
export function stripPipingSpansOnly(html: string | null | undefined): string {
  return stripPipingHtml(html, false)
}
export function hasPipingHtml(text: string | null | undefined): boolean {
  if (!text) return false
  return /data-piping-reference="true"/.test(text)
}
