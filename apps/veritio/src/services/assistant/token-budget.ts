/**
 * Token budget enforcement — pure functions for managing context window size.
 *
 * Extracted from build-content-handler.ts to isolate pure logic from the
 * orchestration handler.
 */

import type { ChatCompletionMessageParam } from './openai'

const TOKEN_BUDGET_CHARS = 800_000
const TOOL_RESULT_TRUNCATE_LIMIT = 30_000
const TOOL_RESULT_SUMMARY_LIMIT = 800

interface Logger {
  warn: (msg: string, meta?: Record<string, unknown>) => void
}

/**
 * Compact a parsed JSON object by summarizing arrays and large nested objects.
 * Used by both truncateToolResult and summarizeToolResult with different limits.
 */
export function compactJsonObject(
  parsed: Record<string, unknown>,
  opts: { arrayLimit: number; stringLimit: number },
): Record<string, unknown> {
  const summary: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(parsed)) {
    if (value === null || value === undefined) continue

    if (Array.isArray(value)) {
      if (opts.arrayLimit > 0) {
        summary[key] = { _count: value.length, _sample: value.slice(0, opts.arrayLimit) }
      } else {
        summary[key] = `[${value.length} items]`
      }
    } else if (typeof value === 'object') {
      if (opts.arrayLimit > 0) {
        // truncateToolResult mode: keep small objects, summarize large ones
        const nested = JSON.stringify(value)
        if (nested.length > 2000) {
          summary[key] = { _objectKeys: Object.keys(value as Record<string, unknown>).slice(0, 20), _chars: nested.length }
        } else {
          summary[key] = value
        }
      } else {
        // summarizeToolResult mode: compact nested objects
        const nested = value as Record<string, unknown>
        const compacted: Record<string, unknown> = {}
        let kept = 0
        for (const [nk, nv] of Object.entries(nested)) {
          if (Array.isArray(nv)) {
            compacted[nk] = `[${nv.length} items]`
          } else if (typeof nv !== 'object' || nv === null) {
            compacted[nk] = nv
            kept++
          }
        }
        summary[key] = kept > 0 || Object.keys(compacted).length > 0 ? compacted : '[object]'
      }
    } else {
      summary[key] = typeof value === 'string' && value.length > opts.stringLimit
        ? value.slice(0, opts.stringLimit) + '...'
        : value
    }
  }

  return summary
}

/**
 * Truncate a tool result string for context window safety.
 * Attempts JSON-aware compaction before falling back to raw truncation.
 */
export function truncateToolResult(content: string): string {
  if (content.length <= TOOL_RESULT_TRUNCATE_LIMIT) return content

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(content)
  } catch {
    return content.slice(0, TOOL_RESULT_TRUNCATE_LIMIT) + '... [truncated -- original was ' + content.length + ' chars]'
  }

  const summary = { _truncated: true, _originalChars: content.length, ...compactJsonObject(parsed, { arrayLimit: 3, stringLimit: 500 }) }
  const result = JSON.stringify(summary)
  if (result.length > TOOL_RESULT_TRUNCATE_LIMIT) {
    return result.slice(0, TOOL_RESULT_TRUNCATE_LIMIT) + '... [truncated]'
  }
  return result
}

/**
 * Summarize a tool result for conversation history replay.
 * More aggressive than truncateToolResult — targets ~800 chars.
 */
export function summarizeToolResult(content: string, toolName?: string): string {
  if (content.length <= TOOL_RESULT_SUMMARY_LIMIT) return content

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(content)
  } catch {
    return content.slice(0, TOOL_RESULT_SUMMARY_LIMIT) + '... [truncated]'
  }

  if (parsed.error || parsed.status) return content

  const summary: Record<string, unknown> = { _summarized: true }
  if (toolName) summary._tool = toolName

  Object.assign(summary, compactJsonObject(parsed, { arrayLimit: 0, stringLimit: 200 }))

  const result = JSON.stringify(summary)
  if (result.length > TOOL_RESULT_SUMMARY_LIMIT) {
    return result.slice(0, TOOL_RESULT_SUMMARY_LIMIT) + '... [truncated]'
  }
  return result
}

/**
 * Estimate total character count across all messages in the conversation.
 */
export function estimateTotalChars(messages: ChatCompletionMessageParam[]): number {
  let total = 0
  for (const msg of messages) {
    if (typeof msg.content === 'string') {
      total += msg.content.length
    } else if (Array.isArray(msg.content)) {
      for (const part of msg.content as any[]) {
        if (part.text) total += part.text.length
      }
    }
  }
  return total
}

/**
 * Find and summarize the largest tool result message to reduce context size.
 * Returns true if a message was trimmed, false if nothing could be trimmed.
 */
export function trimLargestToolResult(messages: ChatCompletionMessageParam[]): boolean {
  let largestIdx = -1
  let largestLen = 0
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]
    if ((msg as any).role === 'tool' && typeof msg.content === 'string') {
      if (msg.content.length > largestLen) {
        largestLen = msg.content.length
        largestIdx = i
      }
    }
  }
  if (largestIdx === -1 || largestLen <= 1000) return false

  const msg = messages[largestIdx]
  ;(msg as any).content = summarizeToolResult((msg as any).content, undefined)
  return true
}

/**
 * Enforce a character budget on the message array by iteratively trimming
 * the largest tool results until under budget.
 */
export function enforceTokenBudget(messages: ChatCompletionMessageParam[], logger: Logger): void {
  let totalChars = estimateTotalChars(messages)
  while (totalChars > TOKEN_BUDGET_CHARS) {
    const beforeChars = totalChars
    const trimmed = trimLargestToolResult(messages)
    if (!trimmed) break
    totalChars = estimateTotalChars(messages)
    logger.warn('[build-content] Token budget exceeded, trimmed largest tool result', {
      beforeChars,
      afterChars: totalChars,
      budgetChars: TOKEN_BUDGET_CHARS,
    })
  }
}
