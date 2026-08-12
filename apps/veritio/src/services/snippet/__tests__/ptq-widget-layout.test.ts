import { describe, expect, it } from 'vitest'
import { generateProxyCompanionJs } from '../proxy-companion'
import { generateSnippetJs } from '../live-website-snippet'

/**
 * Regression guard: the post-task question panel renders inside
 * .__vt_expanded_body, which is capped at 500px with overflow:hidden. The
 * question list carried its own max-height:50vh, so on a tall viewport the list
 * alone outgrew the parent and the footer holding Continue was clipped off with
 * no way to scroll to it — participants could not submit and were stuck.
 */
const SOURCES: Array<[string, string]> = [
  ['proxy companion', generateProxyCompanionJs()],
  ['installed snippet', generateSnippetJs('snip', 'study', 'https://api.example.com')],
]

describe.each(SOURCES)('%s post-task question panel', (_name, source) => {
  it('does not give the question list a viewport height of its own', () => {
    expect(source).not.toContain('max-height:50vh')
  })

  it('makes the panel a flex column that owns its height', () => {
    expect(source).toContain('.__vt_expanded_body.__vt_ptq_shell {')
    expect(source).toContain('display:flex;flex-direction:column;max-height:min(78vh,560px)')
  })

  it('lets only the question list scroll, so the footer stays pinned', () => {
    expect(source).toContain('.__vt_ptq_shell .__vt_ptq_body { flex:1 1 auto;min-height:0;max-height:none; }')
    expect(source).toContain('.__vt_ptq_shell .__vt_ptq_footer { flex-shrink:0; }')
  })

  it('applies the shell class to the rendered panel', () => {
    expect(source).toContain('__vt_expanded_body expanded __vt_ptq_shell')
  })

  // Equal specificity with .__vt_expanded_body.expanded, so source order decides.
  it('declares the shell rule after the 500px expanded cap', () => {
    expect(source.indexOf('.__vt_expanded_body.__vt_ptq_shell {'))
      .toBeGreaterThan(source.indexOf('.__vt_expanded_body.expanded {'))
  })
})
