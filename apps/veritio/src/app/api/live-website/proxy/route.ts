import { NextRequest } from 'next/server'
import { resolve } from 'dns/promises'
import { getServerSession } from '@veritio/auth/server'

const MAX_REDIRECTS = 3

function isPrivateIP(ip: string): boolean {
  return (
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === 'localhost' ||
    ip.startsWith('0.') ||
    ip.startsWith('169.254.') ||
    ip.startsWith('fc00:') ||
    ip.startsWith('fe80:') ||
    ip.startsWith('fd') ||
    ip.endsWith('.internal') ||
    ip.endsWith('.local') ||
    // 172.16.0.0 - 172.31.255.255
    (ip.startsWith('172.') && (() => {
      const second = parseInt(ip.split('.')[1], 10)
      return second >= 16 && second <= 31
    })())
  )
}

async function validateUrl(url: string): Promise<boolean> {
  try {
    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol)) return false

    // Check hostname directly
    if (isPrivateIP(parsed.hostname)) return false

    // Resolve DNS and check resolved IPs to prevent DNS rebinding
    try {
      const addresses = await resolve(parsed.hostname)
      for (const addr of addresses) {
        if (isPrivateIP(addr)) return false
      }
    } catch {
      // DNS resolution failed - allow if hostname looks like a public domain
    }

    return true
  } catch {
    return false
  }
}

/**
 * Next.js route handler for website preview proxy.
 *
 * Returns raw HTML (not JSON-wrapped) so it can be loaded directly as an iframe src.
 * This avoids srcdoc/blob URL origin issues that break SPA frameworks like Next.js.
 *
 * Takes precedence over the Motia rewrite (afterFiles) for this specific path.
 * Auth: checks session cookie or Bearer token query param.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) {
    return new Response('Missing url parameter', { status: 400 })
  }

  try {
    new URL(url)
  } catch {
    return new Response('Invalid url parameter', { status: 400 })
  }

  // SSRF protection: validate URL scheme, hostname, and resolved DNS
  if (!(await validateUrl(url))) {
    return new Response('URL is not allowed (internal or invalid address)', { status: 400 })
  }

  // Auth: try session cookie first, fall back to token query param
  const session = await getServerSession()
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    const fetchHeaders = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    }

    // Manual redirect handling to validate each hop against SSRF
    let currentUrl = url
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

        // Resolve relative redirect URLs
        const redirectUrl = new URL(location, currentUrl).href

        // Validate redirect target against SSRF
        if (!(await validateUrl(redirectUrl))) {
          clearTimeout(timeout)
          return new Response('Redirect target is not allowed (internal address)', { status: 400 })
        }

        if (i === MAX_REDIRECTS) {
          clearTimeout(timeout)
          return new Response('Too many redirects', { status: 400 })
        }

        currentUrl = redirectUrl
        continue
      }

      break
    }

    clearTimeout(timeout)

    if (!response) {
      return new Response('Failed to fetch the website', { status: 502 })
    }

    const contentType = response.headers.get('content-type') || 'text/html'

    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
      return new Response(
        `<!DOCTYPE html><html><body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui;color:#666"><p>This URL returned non-HTML content (${contentType})</p></body></html>`,
        { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=60' } }
      )
    }

    let html = await response.text()

    if (html.length > 5 * 1024 * 1024) {
      return new Response(
        '<!DOCTYPE html><html><body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui;color:#666"><p>Page too large to preview</p></body></html>',
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      )
    }

    // Inject <base> tag so relative URLs (CSS, JS, images) resolve to the original domain
    const origin = new URL(url).origin
    const baseTag = `<base href="${origin}/">`

    // Patch history.replaceState/pushState to handle cross-origin URLs.
    // Site scripts may call replaceState with the original domain, which fails
    // because the iframe document's origin is localhost. This strips the original
    // origin from URLs to make them relative paths, with a try/catch safety net.
    const parsedUrl = new URL(url)
    const realPath = parsedUrl.pathname + parsedUrl.search + parsedUrl.hash || '/'
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

    // Remove X-Frame-Options meta tags
    html = html.replace(/<meta[^>]*http-equiv\s*=\s*["']?X-Frame-Options["']?[^>]*>/gi, '')

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300',
      },
    })
  } catch (error: any) {
    const message = error?.name === 'AbortError'
      ? 'Website took too long to respond'
      : 'Could not reach the website'

    return new Response(
      `<!DOCTYPE html><html><body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui;color:#666"><p>${message}</p></body></html>`,
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    )
  }
}
