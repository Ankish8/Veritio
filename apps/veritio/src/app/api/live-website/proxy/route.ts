import { NextRequest } from 'next/server'
import { getServerSession } from '@veritio/auth/server'

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

  // Auth: try session cookie first, fall back to token query param
  const session = await getServerSession()
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 })
  }

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
