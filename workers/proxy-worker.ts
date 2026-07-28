/**
 * Cloudflare Worker — Reverse Proxy for Live Website Testing
 *
 * Serves /p/** on whichever host the worker is deployed to — currently
 * optimal-proxy.veritio.workers.dev (see NEXT_PUBLIC_PROXY_WORKER_URL). Nothing
 * here may hardcode the proxy hostname; derive it from the request instead.
 *
 * URL structure: /p/{studyId}/{snippetId}/{base64Origin}/{path}?{query}
 * - base64Origin = btoa('https://target.com')
 * - path = path on the target site (e.g., /pricing)
 *
 * Pipeline:
 * 1. Parse URL → extract studyId, snippetId, targetOrigin, path+query
 * 2. Fetch target URL, forwarding safe headers
 * 3. Strip restrictive security headers (CSP, X-Frame-Options, etc.)
 * 4. For HTML: inject config block + companion script, rewrite links
 * 5. For non-HTML: strip CSP headers and pass through
 */

import { RRWEB_RECORD_JS } from '../apps/veritio/src/services/snippet/rrweb-record-embed'
import { RRWEB_SNAPSHOT_JS } from '../apps/veritio/src/services/snippet/rrweb-snapshot-embed'
import { generateProxyCompanionJs } from '../apps/veritio/src/services/snippet/proxy-companion'

interface Env {
  VERITIO_API_BASE: string
  SUPABASE_URL: string
  SUPABASE_SERVICE_KEY: string
}

// ============================================================================
// Companion script — generated from proxy-companion.ts source of truth.
// The script reads config from window.__VT_PROXY injected per-request.
// Events are POSTed to VERITIO_API_BASE/api/snippet/{snippetId}/events.
// ============================================================================
const COMPANION_SCRIPT = generateProxyCompanionJs()

const SAFE_REQUEST_HEADERS = [
  'accept',
  'accept-language',
  // Do NOT forward accept-encoding — the worker calls response.text() which does
  // not decompress gzip/brotli. Without this header, origins return plain text.
  'user-agent',
  'cache-control',
  'if-modified-since',
  'if-none-match',
]

const STRIPPED_RESPONSE_HEADERS = [
  'content-security-policy',
  'content-security-policy-report-only',
  'x-frame-options',
  'x-content-type-options',
  'cross-origin-opener-policy',
  'cross-origin-embedder-policy',
  'cross-origin-resource-policy',
  'permissions-policy',
  // The worker decompresses the body via response.text(), so the original
  // content-encoding no longer applies. Forwarding it causes the browser to
  // try to decompress already-decompressed content → blank page.
  'content-encoding',
  'transfer-encoding',
]

// Static subresource extensions eligible for edge caching (see fetch below).
// Cache-cookie/no-store concerns can't be checked before the fetch, so we gate
// on the request only; Cloudflare still honors origin no-store/private when
// cacheEverything picks up the response, and per-user assets shouldn't share a
// static extension without cache-busting anyway.
const STATIC_EXT_RE = /\.(css|js|mjs|png|jpg|jpeg|gif|webp|avif|svg|ico|woff|woff2|ttf|otf|mp4|webm|mp3)$/i

/** Returns true if the URL points to localhost or 127.0.0.1 */
function isLocalhostUrl(url: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(url)
}

/** Snippet ids are alphanumeric + dashes/underscores; reject anything else before
 *  interpolating into a PostgREST filter or trusting it as a path segment. */
const SNIPPET_ID_RE = /^[a-zA-Z0-9_-]+$/

/**
 * SSRF defense-in-depth. The proxy only ever fetches the PUBLIC website a study
 * is configured to test, so any origin that resolves to loopback, a private/CGNAT
 * range, link-local / cloud-metadata (169.254.0.0/16), or an internal-only suffix
 * is illegitimate and must never be fetched. Returns true if the origin is blocked.
 */
function isBlockedProxyOrigin(origin: string): boolean {
  let u: URL
  try {
    u = new URL(origin)
  } catch {
    return true
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return true
  if (u.username || u.password) return true // no embedded credentials
  const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) return true
  if (host === '0.0.0.0' || host === '::' || host === '::1') return true
  const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (v4) {
    const a = Number(v4[1]), b = Number(v4[2])
    if (a === 127 || a === 10 || a === 0) return true
    if (a === 169 && b === 254) return true // link-local / cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    if (a === 100 && b >= 64 && b <= 127) return true // CGNAT
  }
  // IPv6 unique-local (fc00::/7) and link-local (fe80::/10)
  if (/^f[cd][0-9a-f]{0,2}:/.test(host) || host.startsWith('fe80:')) return true
  return false
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    // API proxy: forward /api/* to backend so companion script avoids CORS/mixed-content
    if (url.pathname.startsWith('/api/')) {
      // CORS preflight — needed when companion calls localhost directly via directApiBase
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: {
            'access-control-allow-origin': '*',
            'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'access-control-allow-headers': 'content-type',
            'access-control-max-age': '86400',
          },
        })
      }

      // Handle snapshot uploads directly in the worker (endpoint not yet deployed to production)
      const snapshotMatch = url.pathname.match(/^\/api\/snippet\/([^/]+)\/snapshot$/)
      if (snapshotMatch && request.method === 'POST' && env.SUPABASE_URL && env.SUPABASE_SERVICE_KEY) {
        return handleSnapshotUpload(request, env, snapshotMatch[1])
      }

      const apiOverride = url.searchParams.get('__api')
      const apiBase = (apiOverride && isLocalhostUrl(apiOverride)) ? apiOverride : env.VERITIO_API_BASE
      const apiUrl = apiBase + url.pathname
      const headers = new Headers({ 'content-type': 'application/json' })
      try {
        const resp = await fetch(apiUrl, {
          method: request.method,
          headers,
          body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
        })
        const respHeaders = new Headers(resp.headers)
        respHeaders.set('access-control-allow-origin', '*')
        return new Response(resp.body, { status: resp.status, headers: respHeaders })
      } catch {
        return new Response('API proxy error', { status: 502 })
      }
    }

    // Only handle /p/* routes
    if (!url.pathname.startsWith('/p/')) {
      return new Response('Not found', { status: 404 })
    }

    // Parse: /p/{studyId}/{snippetId}/{base64Origin}/{...path}
    const parts = url.pathname.slice(3).split('/') // remove leading '/p/'
    if (parts.length < 3) {
      return new Response('Invalid proxy URL', { status: 400 })
    }

    const [studyId, snippetId, base64Origin, ...pathParts] = parts

    if (!SNIPPET_ID_RE.test(snippetId)) {
      return new Response('Invalid snippet id', { status: 400 })
    }

    let targetOrigin: string
    try {
      targetOrigin = atob(base64Origin)
      // Validate it's a real origin
      new URL(targetOrigin)
    } catch {
      return new Response('Invalid origin encoding', { status: 400 })
    }

    // SSRF defense-in-depth: never fetch internal/loopback/metadata origins.
    if (isBlockedProxyOrigin(targetOrigin)) {
      return new Response('Origin not allowed', { status: 403 })
    }

    const path = '/' + pathParts.join('/')
    const targetUrl = targetOrigin + path + (url.search || '')
    // proxyBase derived from request so it works on any hostname (workers.dev or custom domain)
    const proxyBase = `${url.protocol}//${url.host}`

    // Build forwarded request — only pass safe headers
    const forwardHeaders = new Headers()
    for (const name of SAFE_REQUEST_HEADERS) {
      const val = request.headers.get(name)
      if (val) forwardHeaders.set(name, val)
    }

    // Forward cookies for session-based sites
    const cookie = request.headers.get('cookie')
    if (cookie) forwardHeaders.set('cookie', cookie)

    // Edge-cache static subresources (css/js/fonts/images/media). cf options
    // must be set at fetch time, so cacheability is decided by the request:
    // GET + a static file extension on the target path, and no auth header
    // (authorized requests may return per-user bodies). HTML fetches are never
    // cached — they carry per-session injected config and must stay fresh.
    const isStaticGet =
      request.method === 'GET' &&
      !request.headers.get('authorization') &&
      STATIC_EXT_RE.test(new URL(targetUrl).pathname)
    const cf = isStaticGet ? { cacheEverything: true, cacheTtl: 3600 } : undefined

    let targetResponse: Response
    try {
      targetResponse = await fetch(targetUrl, {
        method: request.method,
        headers: forwardHeaders,
        body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
        redirect: 'manual', // handle redirects ourselves
        ...(cf ? { cf } : {}),
      })
    } catch {
      return new Response('Failed to fetch target URL', { status: 502 })
    }

    // Route API calls through the proxy to avoid CORS/mixed-content from the browser.
    // The companion script uses proxyBase as its API base, and the worker's /api/* route
    // forwards to the real backend. Pass __api override so local dev still works.
    // Computed before redirect handling because that path needs isLocalApi too.
    const apiOverride = url.searchParams.get('__api')
    const rawApiBase = (apiOverride && isLocalhostUrl(apiOverride)) ? apiOverride : (env.VERITIO_API_BASE || 'https://your-app-domain.com')
    const apiQuery = rawApiBase !== env.VERITIO_API_BASE ? `?__api=${encodeURIComponent(rawApiBase)}` : ''
    // When __api points to localhost, the worker can't reach it (Cloudflare edge → localhost fails).
    // Tell the companion to call localhost directly from the browser instead.
    const isLocalApi = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(rawApiBase)
    const directApiBase = isLocalApi ? rawApiBase.replace(/\/$/, '') : ''

    // Handle redirects — rewrite Location through proxy
    if (targetResponse.status >= 300 && targetResponse.status < 400) {
      const location = targetResponse.headers.get('location')
      if (location) {
        const rewritten = rewriteUrl(location, targetOrigin, studyId, snippetId, base64Origin, proxyBase)
        // Run redirects through the normal header pipeline. This used to build a
        // fresh Headers holding only `location`, which discarded Set-Cookie on
        // every 3xx — and login/consent flows are exactly where targets set
        // their session cookie (POST → 302 + Set-Cookie), so those silently
        // failed for participants.
        const headers = buildResponseHeaders(targetResponse.headers, targetOrigin, isLocalApi)
        headers.set('location', rewritten)
        return new Response(null, { status: targetResponse.status, headers })
      }
    }

    const contentType = targetResponse.headers.get('content-type') || ''
    const isHtml = contentType.includes('text/html')

    // Build clean response headers — only strip Secure cookie flag in local dev
    const responseHeaders = buildResponseHeaders(targetResponse.headers, targetOrigin, isLocalApi)

    if (!isHtml) {
      return new Response(targetResponse.body, {
        status: targetResponse.status,
        headers: responseHeaders,
      })
    }

    // HTML gets a script injected, so the origin's content-length no longer
    // matches the transformed body. Drop it — the transformed response streams
    // with chunked encoding (no content-length), which is correct.
    responseHeaders.delete('content-length')

    // For HTML: inject companion script + rewrite links
    const proxyPath = `/p/${studyId}/${snippetId}/${base64Origin}`

    // Extract session ID, variant ID, and participant session token from query params
    // (passed on first load by player). These must be in the config because redirects
    // strip query params — the companion can't rely on location.search after a 3xx.
    const sessionId = url.searchParams.get('__sess') || ''
    const variantId = url.searchParams.get('__variant') || ''
    const participantToken = url.searchParams.get('__veritio_session') || ''
    const shareCode = url.searchParams.get('__veritio_share') || ''

    const configScript = buildConfigScript({
      studyId,
      snippetId,
      apiBase: proxyBase,
      apiQuery,
      proxyBase,
      proxyPath,
      targetOrigin,
      sessionId,
      directApiBase,
      variantId,
      participantToken,
      shareCode,
    })

    // Shared script-tag blob injected by both the streaming and buffered paths.
    const scriptTag = buildInjectedScriptTag(configScript)

    // Attribute rewriters (link/asset URL → proxy). Shared by both paths.
    const withAttrRewriters = (rw: HTMLRewriter) =>
      rw
        .on('a[href]', new AttrRewriter('href', targetOrigin, studyId, snippetId, base64Origin, proxyBase))
        .on('form[action]', new AttrRewriter('action', targetOrigin, studyId, snippetId, base64Origin, proxyBase))
        .on('link[href]', new AttrRewriter('href', targetOrigin, studyId, snippetId, base64Origin, proxyBase))
        .on('script[src]', new AttrRewriter('src', targetOrigin, studyId, snippetId, base64Origin, proxyBase))
        .on('img[src]', new AttrRewriter('src', targetOrigin, studyId, snippetId, base64Origin, proxyBase))
        .on('source[src]', new AttrRewriter('src', targetOrigin, studyId, snippetId, base64Origin, proxyBase))
        .on('video[src]', new AttrRewriter('src', targetOrigin, studyId, snippetId, base64Origin, proxyBase))

    // Buffered fallback (opt-in via ?__buffered=1): read the whole body, inject
    // the script via string replacement, then run it through the attribute
    // rewriter. Kept as an escape hatch so a streaming-rewriter edge case on a
    // specific site can be worked around without a deploy.
    if (url.searchParams.get('__buffered') === '1') {
      const html = await targetResponse.text()
      const injectedHtml = html.replace(/<head([^>]*)>/i, `<head$1>${scriptTag}`)
      return withAttrRewriters(new HTMLRewriter()).transform(
        new Response(injectedHtml, {
          status: targetResponse.status,
          headers: responseHeaders,
        })
      )
    }

    // Streaming path (default): inject the script via HTMLRewriter element
    // handlers instead of buffering the whole body. lol-html (HTMLRewriter's
    // engine) tokenizes <script> content as raw text, so page scripts that
    // contain HTML strings pass through untouched — no need to buffer to avoid
    // mis-parsing them.
    //
    // Injection point: prepend into <head> so our scripts run before the
    // page's own scripts. Fallback for pages with no <head> (rare/malformed):
    // an onDocument end handler appends the blob at document end if the head
    // handler never fired. document-end append fires exactly once, after all
    // element handlers, so the flag is reliably set by then.
    const injectState = { injected: false }
    const rewriter = withAttrRewriters(new HTMLRewriter())
      .on('head', {
        element(el) {
          el.prepend(scriptTag, { html: true })
          injectState.injected = true
        },
      })
      .onDocument({
        end(end) {
          if (!injectState.injected) end.append(scriptTag, { html: true })
        },
      })

    return rewriter.transform(
      new Response(targetResponse.body, {
        status: targetResponse.status,
        headers: responseHeaders,
      })
    )
  },
}

// ============================================================================
// Snapshot Upload Handler (runs at edge, bypasses production backend)
// ============================================================================

const CORS_HEADERS = { 'access-control-allow-origin': '*', 'content-type': 'application/json' }
const MAX_SNAPSHOTS_PER_STUDY = 50

async function handleSnapshotUpload(request: Request, env: Env, snippetId: string): Promise<Response> {
  try {
    if (!SNIPPET_ID_RE.test(snippetId)) {
      return Response.json({ error: 'Invalid snippet id' }, { status: 400, headers: CORS_HEADERS })
    }
    const body = await request.json() as {
      pageUrl?: string
      snapshot?: Record<string, unknown>
      viewportWidth?: number
      viewportHeight?: number
      pageWidth?: number
      pageHeight?: number
    }

    if (!body.pageUrl || !body.snapshot) {
      return Response.json({ error: 'Missing pageUrl or snapshot' }, { status: 400, headers: CORS_HEADERS })
    }

    const sb = (path: string, init?: RequestInit) =>
      fetch(`${env.SUPABASE_URL}${path}`, {
        ...init,
        headers: {
          'content-type': 'application/json',
          apikey: env.SUPABASE_SERVICE_KEY,
          authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
          prefer: 'return=representation',
          ...(init?.headers as Record<string, string> || {}),
        },
      })

    // Look up study by snippetId
    const studyRes = await sb(
      `/rest/v1/studies?select=id&settings-%3EsnippetId=eq."${snippetId}"&limit=1`
    )
    const studies = await studyRes.json() as { id: string }[]
    if (!studies?.length) {
      return Response.json({ error: 'Snippet not found' }, { status: 404, headers: CORS_HEADERS })
    }
    const studyId = studies[0].id

    // Dedup check: already have a snapshot for this page?
    const existRes = await sb(
      `/rest/v1/live_website_page_screenshots?select=id&study_id=eq.${studyId}&page_url=eq.${encodeURIComponent(body.pageUrl)}&snapshot_path=not.is.null&limit=1`
    )
    const existing = await existRes.json() as { id: string }[]
    if (existing?.length) {
      return Response.json({ success: true, skipped: true }, { status: 200, headers: CORS_HEADERS })
    }

    // Rate limit
    const countRes = await sb(
      `/rest/v1/live_website_page_screenshots?select=id&study_id=eq.${studyId}&snapshot_path=not.is.null`,
      { headers: { prefer: 'count=exact' } as any }
    )
    const countHeader = countRes.headers.get('content-range')
    const totalCount = countHeader ? parseInt(countHeader.split('/')[1] || '0') : 0
    if (totalCount >= MAX_SNAPSHOTS_PER_STUDY) {
      return Response.json({ error: 'Snapshot limit reached' }, { status: 429, headers: CORS_HEADERS })
    }

    // Upload snapshot JSON to Supabase Storage
    const snapshotJson = JSON.stringify(body.snapshot)
    const encoder = new TextEncoder()
    const snapshotBytes = encoder.encode(snapshotJson)
    if (snapshotBytes.length > 5 * 1024 * 1024) {
      return Response.json({ error: 'Snapshot too large' }, { status: 400, headers: CORS_HEADERS })
    }

    // Simple hash for filename (first 16 chars of hex)
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(body.pageUrl))
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const urlHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16)
    const storagePath = `${studyId}/${urlHash}.json`

    const uploadRes = await fetch(
      `${env.SUPABASE_URL}/storage/v1/object/live-website-snapshots/${storagePath}`,
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
          'content-type': 'application/json',
          'x-upsert': 'true',
        },
        body: snapshotJson,
      }
    )
    if (!uploadRes.ok) {
      const errText = await uploadRes.text()
      return Response.json({ error: 'Storage upload failed', detail: errText }, { status: 500, headers: CORS_HEADERS })
    }

    const publicUrl = `${env.SUPABASE_URL}/storage/v1/object/public/live-website-snapshots/${storagePath}`

    // Check if row already exists (may have screenshot_path from image upload)
    const rowRes = await sb(
      `/rest/v1/live_website_page_screenshots?select=id&study_id=eq.${studyId}&page_url=eq.${encodeURIComponent(body.pageUrl)}&limit=1`
    )
    const existingRows = await rowRes.json() as { id: string }[]

    const rowData = {
      snapshot_path: publicUrl,
      viewport_width: body.viewportWidth || null,
      viewport_height: body.viewportHeight || null,
      page_width: body.pageWidth || null,
      page_height: body.pageHeight || null,
    }

    let dbRes: Response
    if (existingRows?.length) {
      dbRes = await sb(
        `/rest/v1/live_website_page_screenshots?id=eq.${existingRows[0].id}`,
        { method: 'PATCH', body: JSON.stringify(rowData) }
      )
    } else {
      dbRes = await sb(
        `/rest/v1/live_website_page_screenshots`,
        {
          method: 'POST',
          body: JSON.stringify({ study_id: studyId, page_url: body.pageUrl, ...rowData }),
        }
      )
    }

    if (!dbRes.ok) {
      const errText = await dbRes.text()
      // Race condition: another request may have inserted
      if (errText.includes('23505')) {
        return Response.json({ success: true, skipped: true }, { status: 200, headers: CORS_HEADERS })
      }
      return Response.json({ error: 'DB write failed', detail: errText }, { status: 500, headers: CORS_HEADERS })
    }

    return Response.json({ success: true }, { status: 201, headers: CORS_HEADERS })
  } catch (e: any) {
    return Response.json({ error: 'Snapshot handler error', message: e?.message }, { status: 500, headers: CORS_HEADERS })
  }
}

// ============================================================================
// Header Utilities
// ============================================================================

function buildResponseHeaders(original: Headers, targetOrigin: string, isLocalDev: boolean = false): Headers {
  const headers = new Headers()

  original.forEach((value, name) => {
    const lower = name.toLowerCase()
    if (STRIPPED_RESPONSE_HEADERS.includes(lower)) return
    // Set-Cookie is handled separately below. forEach() joins repeated headers
    // with ", ", which is unsplittable for cookies because their own values
    // contain commas (e.g. "Expires=Wed, 21 Oct 2026 ..."), so reading it here
    // would mangle any response setting more than one cookie.
    if (lower === 'set-cookie') return

    headers.set(name, value)
  })

  // Copy cookies through individually, dropping the target's Domain attribute so
  // each becomes host-only for whatever host is serving the proxy.
  //
  // The Domain used to be rewritten to a hardcoded `proxy.veritio.io`, which
  // silently broke every cookie the target set with a Domain attribute: the
  // worker is served from optimal-proxy.veritio.workers.dev, and RFC 6265
  // requires a cookie's Domain to domain-match the setting host, so browsers
  // rejected them outright. Target sites depending on cookies (login state,
  // carts, consent banners) misbehaved mid-test.
  //
  // Host-only is the right default for a reverse proxy: it always matches
  // whichever host serves the worker (workers.dev, a future custom domain, or
  // localhost) with nothing hardcoded. Cross-subdomain sharing on the target is
  // not meaningfully lost — every target origin is funnelled through this single
  // proxy host via the /p/{...}/{b64Origin}/ path.
  const setCookies =
    typeof original.getSetCookie === 'function'
      ? original.getSetCookie()
      : (original.get('set-cookie') ? [original.get('set-cookie') as string] : [])

  for (const cookie of setCookies) {
    let rewritten = cookie.replace(/;\s*domain=[^;]+/gi, '')
    // Only strip the Secure flag when proxying to a localhost API (local dev over HTTP)
    if (isLocalDev) {
      rewritten = rewritten.replace(/;\s*secure/gi, '')
    }
    headers.append('set-cookie', rewritten)
  }

  // Add CORS headers so the companion script can make requests
  headers.set('access-control-allow-origin', '*')

  // Prevent caching of proxied HTML so script updates take effect immediately
  headers.set('cache-control', 'no-store, no-cache, must-revalidate')

  return headers
}

// ============================================================================
// URL Rewriting
// ============================================================================

function rewriteUrl(
  url: string,
  targetOrigin: string,
  studyId: string,
  snippetId: string,
  base64Origin: string,
  proxyBase: string = 'https://your-proxy-worker.workers.dev'
): string {
  if (!url) return url

  const proxyPath = `/p/${studyId}/${snippetId}/${base64Origin}`

  try {
    // Already pointing at proxy — leave alone
    if (url.startsWith(proxyBase)) return url

    // Absolute URL on target origin
    if (url.startsWith(targetOrigin)) {
      return proxyBase + proxyPath + url.slice(targetOrigin.length)
    }

    // Protocol-relative
    const noProto = targetOrigin.replace(/^https?:/, '')
    if (url.startsWith('//' + noProto.replace(/^\/\//, ''))) {
      return proxyBase + proxyPath + url.slice(('//' + noProto.replace(/^\/\//, '')).length)
    }

    // Root-relative path
    if (url.startsWith('/') && !url.startsWith('//')) {
      return proxyBase + proxyPath + url
    }
  } catch {
    // pass
  }

  // Cross-origin or data: — leave alone
  return url
}

// ============================================================================
// HTMLRewriter Handlers
// ============================================================================

class AttrRewriter {
  private attr: string
  private targetOrigin: string
  private studyId: string
  private snippetId: string
  private base64Origin: string
  private proxyBase: string

  constructor(attr: string, targetOrigin: string, studyId: string, snippetId: string, base64Origin: string, proxyBase: string) {
    this.attr = attr
    this.targetOrigin = targetOrigin
    this.studyId = studyId
    this.snippetId = snippetId
    this.base64Origin = base64Origin
    this.proxyBase = proxyBase
  }

  element(element: Element) {
    const val = element.getAttribute(this.attr)
    if (!val) return
    const rewritten = rewriteUrl(val, this.targetOrigin, this.studyId, this.snippetId, this.base64Origin, this.proxyBase)
    if (rewritten !== val) {
      element.setAttribute(this.attr, rewritten)
    }
  }
}

// ============================================================================
// Script Tag Builder
// ============================================================================

// Permission-blocking shim — runs before site scripts to auto-deny prompts.
const PERM_BLOCK =
  'try{navigator.getInstalledRelatedApps&&(navigator.getInstalledRelatedApps=function(){return Promise.resolve([])});window.Notification&&(window.Notification.requestPermission=function(){return Promise.resolve("denied")});navigator.permissions&&navigator.permissions.query&&function(){var o=navigator.permissions.query.bind(navigator.permissions);navigator.permissions.query=function(d){return d&&(d.name==="notifications"||d.name==="push"||d.name==="geolocation"||d.name==="camera"||d.name==="microphone")?Promise.resolve({state:"denied",onchange:null}):o(d)}}()}catch(e){}'

/**
 * Escapes any literal `</script` sequence inside an inline-JS blob. A raw
 * `</script>` in inline JS terminates the surrounding <script> element early,
 * breaking injection. The rrweb/companion bundles don't currently contain one,
 * but buildConfigScript embeds untrusted per-request values (targetOrigin,
 * sessionId, tokens) via JSON.stringify, which does NOT escape `/`, so a
 * crafted value could smuggle one in. Escaping `<` → `<\/` is safe: the
 * browser's JS parser treats `<\/script>` as the string `</script>`.
 */
function escapeScriptClose(js: string): string {
  return js.replace(/<\/(script)/gi, '<\\/$1')
}

/**
 * Builds the full inline-script blob injected into proxied HTML. Both the
 * streaming and buffered paths call this so they inject identical content.
 * Order: rrweb-record IIFE, rrweb-snapshot IIFE (sets window.__rrwebSnapshot),
 * then perm-blocker + per-request config + companion in a single script.
 */
function buildInjectedScriptTag(configScript: string): string {
  const inline = escapeScriptClose(`${PERM_BLOCK};${configScript};${COMPANION_SCRIPT}`)
  return `<script>${RRWEB_RECORD_JS}</script><script>${RRWEB_SNAPSHOT_JS}</script><script>${inline}</script>`
}

// ============================================================================
// Config Script Builder
// ============================================================================

function buildConfigScript(cfg: {
  studyId: string
  snippetId: string
  apiBase: string
  apiQuery: string
  proxyBase: string
  proxyPath: string
  targetOrigin: string
  sessionId: string
  directApiBase: string
  variantId: string
  participantToken: string
  shareCode: string
}): string {
  return `window.__VT_PROXY = ${JSON.stringify(cfg)};`
}
