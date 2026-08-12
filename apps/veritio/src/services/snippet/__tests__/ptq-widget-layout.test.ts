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

  // The panel used to hand the list `padding:0 20px` inline, which beat the
  // class and left the first question touching the title and the last one
  // touching the footer.
  it('does not strip the question list padding inline', () => {
    expect(source).not.toContain("data-ptq-body=\"1\" style=\"padding:0 20px")
    expect(source).toContain('.__vt_ptq_body { overflow-y:auto;padding:12px 20px 16px;')
  })

  // The drag handle above already draws a hairline; a second one 37px below it
  // reads as a rendering glitch rather than structure.
  it('draws one divider above the question list, not two', () => {
    expect(source).toContain('.__vt_ptq_header { padding:12px 20px 10px;flex-shrink:0; }')
  })

  it('shows a scroll shadow only while there is something off-screen', () => {
    expect(source).toContain('.__vt_ptq_shell.__vt_more_above .__vt_ptq_header')
    expect(source).toContain('.__vt_ptq_shell.__vt_more_below .__vt_ptq_footer')
  })
})

/**
 * The collapsed pill put the drag grip flush against the "View task" button —
 * measured 0px between them — inside a pill whose own padding was 16px left and
 * 12px right. It read as broken rather than compact.
 */
describe.each(SOURCES)('%s collapsed task pill', (_name, source) => {
  it('keeps the drag grip clear of the button next to it', () => {
    expect(source).toContain('display:flex;align-items:center;justify-content:space-between;gap:10px;')
  })

  it('balances the pill padding around its contents', () => {
    expect(source).toContain('border-radius:16px;padding:8px 12px 8px 14px;')
  })

  // The grip/button gap now comes from the header, so the old compensating
  // margin on the progress label would double it.
  it('does not double-space the progress label', () => {
    expect(source).not.toContain('__vt_progress" style="margin-right:8px;"')
  })
})
