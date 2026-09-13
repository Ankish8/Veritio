import { describe, expect, it } from 'vitest'
import { sanitizeLiveWebsiteTaskInstructions, sanitizeLiveWebsiteTasks } from '../sanitize-task-instructions'
import { getSessionManagementCode } from '../shared/session-management'
import { getTaskWidgetCode } from '../shared/widget-rendering'

describe('live website task instruction sanitization', () => {
  it('preserves the supported rich-text subset and safe links', () => {
    const html =
      '<h2>Find pricing</h2><p>Open <strong>Plans</strong>.</p><a href="https://example.com/pricing" target="_blank">Pricing</a>'

    expect(sanitizeLiveWebsiteTaskInstructions(html)).toBe(
      '<h2>Find pricing</h2><p>Open <strong>Plans</strong>.</p><a href="https://example.com/pricing" target="_blank" rel="noopener noreferrer">Pricing</a>'
    )
  })

  it.each([
    ['script', '<p>Safe</p><script>alert(1)</script>', '<p>Safe</p>'],
    [
      'event handler',
      '<p><a href="https://example.com" onclick="alert(1)">Go</a></p>',
      '<p><a href="https://example.com">Go</a></p>',
    ],
    ['javascript URL', '<a href="javascript:alert(1)">Go</a>', '<a href>Go</a>'],
    ['encoded javascript URL', '<a href="&#106;avascript:alert(1)">Go</a>', '<a href>Go</a>'],
    ['data URL', '<a href="data:text/html,<script>alert(1)</script>">Go</a>', '<a href>Go</a>'],
    ['SVG payload', '<svg><a href="javascript:alert(1)"><text>Bad</text></a></svg><p>Safe</p>', '<p>Safe</p>'],
    ['MathML payload', '<math><mtext><img src=x onerror=alert(1)></mtext></math><p>Safe</p>', '<p>Safe</p>'],
    [
      'style payload',
      '<style>@import "https://evil.example"</style><p style="background:url(javascript:alert(1))">Safe</p>',
      '<p>Safe</p>',
    ],
    ['foreign element', '<iframe srcdoc="<script>alert(1)</script>"></iframe><p>Safe</p>', '<p>Safe</p>'],
  ])('removes %s payloads', (_name, input, expected) => {
    expect(sanitizeLiveWebsiteTaskInstructions(input)).toBe(expected)
  })

  it('normalizes non-string instructions and sanitizes task collections', () => {
    expect(
      sanitizeLiveWebsiteTasks([
        { id: 'safe', instructions: '<p>Keep <em>this</em></p>' },
        { id: 'invalid', instructions: null },
      ])
    ).toEqual([
      { id: 'safe', instructions: '<p>Keep <em>this</em></p>' },
      { id: 'invalid', instructions: '' },
    ])
  })

  it('neutralizes malformed mutation-XSS markup', () => {
    const output = sanitizeLiveWebsiteTaskInstructions(
      '<math><mtext><table><mglyph><style><!--</style><img title="--><img src=1 onerror=alert(1)>"></mglyph></table></mtext></math><p>Safe</p>'
    )

    expect(output).toContain('<p>Safe</p>')
    expect(output).not.toMatch(/(?:onerror|javascript:|<img|<math|<style)/i)
  })

  it('does not ship the former regex sanitizer and rejects legacy persisted task HTML', () => {
    const widgetCode = getTaskWidgetCode()
    const sessionCode = getSessionManagementCode()

    expect(widgetCode).not.toContain('function sanitizeHtml')
    expect(widgetCode).not.toContain('.replace(/<script')
    expect(sessionCode).toContain('contentSecurityVersion: 1')
    expect(sessionCode).toContain('existing.contentSecurityVersion === 1')
  })
})
