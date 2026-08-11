import { describe, expect, it } from 'vitest'
import { generateSnippetJs } from '../live-website-snippet'

/**
 * Regression guard: a task with a blank target_url inherits the study's website
 * URL. The installed snippet used to skip navigation entirely in that case, so
 * task 1 launched on the website URL and every later task simply resumed
 * wherever the previous task ended, which is not what the builder promises.
 */
const SOURCE = generateSnippetJs('snip-1', 'study-1', 'https://api.example.com')

const WEBSITE_URL = 'https://target.example.com/outbound-dialer'

/**
 * Lifts the advance-to-next-task navigation decision out of the generated
 * script. The snippet is one large IIFE that boots timers and network calls on
 * load, so the branch is exercised directly instead. Throws if the markers move
 * rather than silently testing nothing.
 */
function loadAdvanceDecision() {
  const startMarker = 'var nextTask = tasks[currentTaskIndex];'
  const endMarker = '      saveFullSession();'
  const start = SOURCE.indexOf(startMarker)
  const end = SOURCE.indexOf(endMarker, start)
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Could not slice the snippet advance branch — markers moved.')
  }
  const body = SOURCE.slice(start, end)

  const factory = new Function(
    `return function (currentHref, websiteUrl, taskTargetUrl) {
       var tasks = [{ target_url: taskTargetUrl }];
       var currentTaskIndex = 0;
       var studySettings = { websiteUrl: websiteUrl };
       var parsed = new URL(currentHref);
       var location = { origin: parsed.origin, pathname: parsed.pathname };
       ${body}
         return nextStart;
       }
       return null;
     };`,
  )
  return factory() as (
    currentHref: string,
    websiteUrl: string | null,
    taskTargetUrl: string,
  ) => string | null
}

describe('installed snippet starting page on task advance', () => {
  const nextNavigation = loadAdvanceDecision()

  it('returns the participant to the website URL when the task start is blank', () => {
    expect(nextNavigation('https://target.example.com/campaigns/new', WEBSITE_URL, '')).toBe(
      WEBSITE_URL,
    )
  })

  it('stays put when already on the inherited starting page', () => {
    expect(nextNavigation(WEBSITE_URL, WEBSITE_URL, '')).toBeNull()
  })

  it('ignores a trailing slash rather than reloading the same page', () => {
    expect(nextNavigation(`${WEBSITE_URL}/`, WEBSITE_URL, '')).toBeNull()
  })

  it('prefers an explicit per-task starting page', () => {
    expect(
      nextNavigation(WEBSITE_URL, WEBSITE_URL, 'https://target.example.com/campaigns'),
    ).toBe('https://target.example.com/campaigns')
  })

  it('does not navigate when neither a task start nor a website URL is known', () => {
    expect(nextNavigation('https://target.example.com/anywhere', null, '')).toBeNull()
  })
})
