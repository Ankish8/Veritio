import type { StepConfig } from '@/lib/motia/types'
import { z } from 'zod'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import {
  MAX_REDIRECT_HOPS,
  isBlockedProxyOrigin,
} from '../../../lib/live-website/origin-safety'

export const config = {
  name: 'ResolveLiveWebsiteTargetUrl',
  description:
    'Follow a target website URL\'s redirects to find its canonical origin',
  triggers: [
    {
      type: 'http',
      method: 'POST',
      path: '/api/live-website/resolve-target-url',
      middleware: [authMiddleware, errorHandlerMiddleware],
    },
  ],
  enqueues: [],
  flows: ['live-website'],
} satisfies StepConfig

const bodySchema = z.object({
  url: z.string().min(1).max(2048),
})

const REQUEST_TIMEOUT_MS = 8000

/**
 * Resolves the canonical URL a target redirects to, so the builder can store the
 * origin participants will actually land on.
 *
 * Redirects are followed manually rather than with `redirect: 'follow'` so every
 * hop is re-checked against the SSRF blocklist. A public host that 302s to
 * 169.254.169.254 would otherwise be followed straight into cloud metadata.
 *
 * Only the final URL is returned. No response body or header from the target is
 * ever echoed back, which keeps this from becoming a general-purpose fetch proxy
 * for authenticated users.
 */
export const handler = async (req: ApiRequest, _ctx: ApiHandlerContext) => {
  const { url } = bodySchema.parse(req.body)

  let current: string
  try {
    current = new URL(url).toString()
  } catch {
    return { status: 400, body: { error: 'Invalid URL' } }
  }

  if (isBlockedProxyOrigin(current)) {
    return { status: 400, body: { error: 'URL is not a public address' } }
  }

  for (let hop = 0; hop <= MAX_REDIRECT_HOPS; hop++) {
    let response: Response
    try {
      response = await fetch(current, {
        method: 'GET',
        redirect: 'manual',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        headers: {
          // Some sites vary their redirect on UA; look like a real browser.
          'user-agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
          accept: 'text/html,application/xhtml+xml',
        },
      })
    } catch {
      // Unreachable, TLS failure, or timeout. The caller keeps what the
      // researcher typed rather than blocking the save.
      return { status: 200, body: { finalUrl: current, reachable: false } }
    }

    const isRedirect = response.status >= 300 && response.status < 400
    const location = isRedirect ? response.headers.get('location') : null
    if (!location) {
      return { status: 200, body: { finalUrl: current, reachable: true } }
    }

    let next: string
    try {
      next = new URL(location, current).toString()
    } catch {
      return { status: 200, body: { finalUrl: current, reachable: true } }
    }

    // Re-check every hop, not just the origin the researcher supplied.
    if (isBlockedProxyOrigin(next)) {
      return { status: 200, body: { finalUrl: current, reachable: true } }
    }

    if (next === current) {
      return { status: 200, body: { finalUrl: current, reachable: true } }
    }
    current = next
  }

  // Hop budget exhausted (redirect loop). Report where we stopped.
  return { status: 200, body: { finalUrl: current, reachable: true } }
}
