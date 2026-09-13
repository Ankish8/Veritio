import { FilterXSS, safeAttrValue } from 'xss'

/**
 * TipTap formatting supported in live-website task instructions. Keeping this
 * list deliberately small prevents researcher-authored content from becoming
 * active content on a participant's browser or on the customer's own site.
 */
const TASK_INSTRUCTION_ALLOWLIST = {
  a: ['href', 'title', 'target'],
  b: [],
  blockquote: [],
  br: [],
  code: [],
  em: [],
  h1: [],
  h2: [],
  h3: [],
  h4: [],
  h5: [],
  h6: [],
  hr: [],
  i: [],
  li: [],
  ol: [],
  p: [],
  pre: [],
  s: [],
  span: [],
  strong: [],
  u: [],
  ul: [],
} satisfies Record<string, string[]>

const taskInstructionFilter = new FilterXSS({
  whiteList: TASK_INSTRUCTION_ALLOWLIST,
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script', 'style', 'svg', 'math', 'iframe', 'object', 'embed'],
  onTagAttr(tag, name, value) {
    if (tag === 'a' && name === 'target') {
      return value.toLowerCase() === '_blank' ? 'target="_blank" rel="noopener noreferrer"' : ''
    }
    return undefined
  },
  safeAttrValue(tag, name, value, cssFilter) {
    const sanitizedValue = safeAttrValue(tag, name, value, cssFilter)

    if (tag !== 'a' || name !== 'href' || !sanitizedValue) {
      return sanitizedValue
    }

    // xss also permits ftp:, tel: and data:image/. Task instructions only need
    // normal web, email, fragment, and relative links.
    return /^(?:https?:\/\/|mailto:|#|\/|\.\.?(?:\/|$))/i.test(sanitizedValue) ? sanitizedValue : ''
  },
})

export function sanitizeLiveWebsiteTaskInstructions(value: unknown): string {
  return taskInstructionFilter.process(typeof value === 'string' ? value : '')
}

export function sanitizeLiveWebsiteTasks<T extends Record<string, unknown>>(tasks: T[]): T[] {
  return tasks.map((task) => ({
    ...task,
    instructions: sanitizeLiveWebsiteTaskInstructions(task.instructions),
  }))
}
