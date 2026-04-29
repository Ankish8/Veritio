import { validateExternalHttpUrl } from '../../lib/security/external-url'

const MAX_REDIRECTS = 3
const MAX_HTML_BYTES = 5 * 1024 * 1024

export interface LiveWebsiteProxyResult {
  status: number
  headers: Record<string, string>
  body: string
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function makeInfoPage(message: string): string {
  return `<!DOCTYPE html><html><body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui;color:#666"><p>${escapeHtml(message)}</p></body></html>`
}

function getFrameAncestors(): string {
  const origins = new Set(['\'self\'', 'http://localhost:4001', 'https://veritio.io', 'https://www.veritio.io'])
  const configured = process.env.NEXT_PUBLIC_APP_URL
  if (configured) {
    try {
      origins.add(new URL(configured).origin)
    } catch {
      // Ignore malformed environment values; the default same-origin/local entries remain.
    }
  }
  return Array.from(origins).join(' ')
}

function proxyHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'X-Robots-Tag': 'noindex, nofollow',
    // The CSP sandbox keeps proxied pages in an opaque origin, while the broad
    // resource sources preserve the live preview behavior users expect.
    'Content-Security-Policy': [
      'sandbox allow-scripts allow-forms allow-popups allow-modals allow-downloads',
      "default-src 'self' http: https: data: blob:",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' http: https:",
      "style-src 'self' 'unsafe-inline' http: https:",
      "img-src 'self' http: https: data: blob:",
      "font-src 'self' http: https: data:",
      "connect-src 'self' http: https: ws: wss:",
      "media-src 'self' http: https: data: blob:",
      "frame-src 'self' http: https:",
      'base-uri http: https:',
      `frame-ancestors ${getFrameAncestors()}`,
    ].join('; '),
    ...extra,
  }
}

export async function createLiveWebsiteProxyResponse(rawUrl: string): Promise<LiveWebsiteProxyResult> {
  const initialValidation = await validateExternalHttpUrl(rawUrl)
  if (!initialValidation.ok || !initialValidation.url) {
    return {
      status: 400,
      headers: proxyHeaders(),
      body: makeInfoPage(initialValidation.error || 'URL is not allowed'),
    }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)

  try {
    const fetchHeaders = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    }

    let currentUrl = initialValidation.url.href
    let response: Response | null = null

    for (let i = 0; i <= MAX_REDIRECTS; i++) {
      response = await fetch(currentUrl, {
        headers: fetchHeaders,
        redirect: 'manual',
        signal: controller.signal,
      })

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location')
        if (!location) break

        const redirectUrl = new URL(location, currentUrl).href
        const redirectValidation = await validateExternalHttpUrl(redirectUrl)
        if (!redirectValidation.ok || !redirectValidation.url) {
          return {
            status: 400,
            headers: proxyHeaders(),
            body: makeInfoPage('Redirect target is not allowed'),
          }
        }

        if (i === MAX_REDIRECTS) {
          return {
            status: 400,
            headers: proxyHeaders(),
            body: makeInfoPage('Too many redirects'),
          }
        }

        currentUrl = redirectValidation.url.href
        continue
      }

      break
    }

    if (!response) {
      return {
        status: 502,
        headers: proxyHeaders(),
        body: makeInfoPage('Failed to fetch the website'),
      }
    }

    const contentType = response.headers.get('content-type') || 'text/html'
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
      return {
        status: 200,
        headers: proxyHeaders(),
        body: makeInfoPage(`This URL returned non-HTML content (${contentType})`),
      }
    }

    let html = await response.text()
    if (html.length > MAX_HTML_BYTES) {
      return {
        status: 200,
        headers: proxyHeaders(),
        body: makeInfoPage('Page too large to preview'),
      }
    }

    const current = new URL(currentUrl)
    const origin = current.origin
    const baseTag = `<base href="${escapeHtml(origin)}/">`
    const realPath = current.pathname + current.search + current.hash || '/'
    const spaFixScript =
      `<script>(function(){var O=${JSON.stringify(origin)},P=${JSON.stringify(realPath)};` +
      `var _hr=history.replaceState.bind(history),_hp=history.pushState.bind(history);` +
      `function _fu(u){if(u==null)return u;if(typeof u==='string'&&u.indexOf(O)===0)return u.slice(O.length)||'/';return u}` +
      `history.replaceState=function(s,t,u){try{return _hr(s,t,_fu(u))}catch(e){}};` +
      `history.pushState=function(s,t,u){try{return _hp(s,t,_fu(u))}catch(e){}};` +
      `try{_hr(null,'',P)}catch(e){}` +
      `})()</script>`

    if (!/<base\s/i.test(html)) {
      if (/<head[^>]*>/i.test(html)) {
        html = html.replace(/<head[^>]*>/i, (match) => `${match}${baseTag}${spaFixScript}`)
      } else {
        html = baseTag + spaFixScript + html
      }
    }

    html = html.replace(/<meta[^>]*http-equiv\s*=\s*["']?X-Frame-Options["']?[^>]*>/gi, '')

    return {
      status: 200,
      headers: proxyHeaders(),
      body: html,
    }
  } catch (error: any) {
    const message = error?.name === 'AbortError'
      ? 'Website took too long to respond'
      : 'Could not reach the website'

    return {
      status: 502,
      headers: proxyHeaders(),
      body: makeInfoPage(message),
    }
  } finally {
    clearTimeout(timeout)
  }
}
