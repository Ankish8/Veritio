import type { StepConfig } from 'motia'
import { z } from 'zod'
import { authMiddleware } from '../../../middlewares/auth.middleware'
import { errorHandlerMiddleware } from '../../../middlewares/error-handler.middleware'
import type { ApiHandlerContext, ApiRequest } from '../../../lib/motia/types'
import { validateRequest } from '../../../lib/api/validate-request'

const querySchema = z.object({
  url: z.string().url(),
})

/**
 * Middleware that reads auth token from query parameter for iframe requests.
 * Iframes can't send custom headers, so the frontend passes the token as ?token=...
 * This sets the Authorization header so authMiddleware can verify it.
 */
async function queryTokenMiddleware(req: any, _ctx: any, next: () => Promise<any>) {
  if (req.headers['authorization'] || req.headers['x-user-id']) {
    return next()
  }

  const token = req.queryParams?.token || req.query?.token
  if (token) {
    req.headers['authorization'] = `Bearer ${token}`
  }

  return next()
}

export const config = {
  name: 'ProxyWebsitePreview',
  triggers: [{
    type: 'http',
    method: 'GET',
    path: '/api/live-website/proxy',
    middleware: [queryTokenMiddleware, authMiddleware, errorHandlerMiddleware],
  }],
  enqueues: [],
} satisfies StepConfig

/**
 * Proxy endpoint for iframe website preview.
 *
 * Many websites block iframe embedding via X-Frame-Options or CSP headers.
 * This proxy fetches the page server-side and serves it without those headers,
 * injecting a <base> tag so relative URLs still resolve against the original domain.
 *
 * Auth required to prevent abuse as an open proxy.
 */
export const handler = async (req: ApiRequest, { logger }: ApiHandlerContext) => {
  const validation = validateRequest(querySchema, req.queryParams, logger)
  if (!validation.success) return validation.response

  const { url } = validation.data

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
      signal: controller.signal,
    })

    clearTimeout(timeout)

    const contentType = response.headers.get('content-type') || 'text/html'

    // Non-HTML content — don't proxy (avoid serving large binaries)
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
      return {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=60',
        },
        body: `<!DOCTYPE html><html><body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui;color:#666"><p>This URL returned non-HTML content (${contentType})</p></body></html>`,
      }
    }

    let html = await response.text()

    // Enforce a reasonable size limit (5MB)
    if (html.length > 5 * 1024 * 1024) {
      return {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        },
        body: '<!DOCTYPE html><html><body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui;color:#666"><p>Page too large to preview</p></body></html>',
      }
    }

    // Inject <base> tag to fix relative URLs (images, CSS, JS load from original domain)
    const origin = new URL(url).origin
    const baseTag = `<base href="${origin}/">`

    // Fix SPA routers: patch history.replaceState/pushState to handle cross-origin URLs.
    // The iframe loads from localhost via proxy, but site scripts may call replaceState
    // with the original domain URL, causing SecurityError. This strips the original origin
    // from URLs so they become valid relative paths.
    const realPath = (() => { try { const u = new URL(url); return u.pathname + u.search + u.hash } catch { return '/' } })()
    const spaFixScript = `<script>(function(){var O=${JSON.stringify(origin)},P=${JSON.stringify(realPath)};` +
      `var _hr=history.replaceState.bind(history),_hp=history.pushState.bind(history);` +
      `function _fu(u){if(u==null)return u;if(typeof u==='string'&&u.indexOf(O)===0)return u.slice(O.length)||'/';return u}` +
      `history.replaceState=function(s,t,u){try{return _hr(s,t,_fu(u))}catch(e){}};` +
      `history.pushState=function(s,t,u){try{return _hp(s,t,_fu(u))}catch(e){}};` +
      `try{_hr(null,'',P)}catch(e){}` +
      `})()</script>`

    // Only inject if the page doesn't already have a <base> tag
    if (!/<base\s/i.test(html)) {
      if (/<head[^>]*>/i.test(html)) {
        html = html.replace(/<head[^>]*>/i, (match) => `${match}${baseTag}${spaFixScript}`)
      } else {
        html = baseTag + spaFixScript + html
      }
    }

    // Remove any meta X-Frame-Options tags
    html = html.replace(/<meta[^>]*http-equiv\s*=\s*["']?X-Frame-Options["']?[^>]*>/gi, '')

    return {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
      },
      body: html,
    }
  } catch (error: any) {
    logger.error('Proxy fetch failed', { url, error: error?.message })

    const message = error?.name === 'AbortError'
      ? 'Website took too long to respond'
      : 'Could not reach the website'

    return {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
      body: `<!DOCTYPE html><html><body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui;color:#666"><p>${message}</p></body></html>`,
    }
  }
}
