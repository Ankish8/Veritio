import { NextResponse, type NextRequest } from 'next/server'

function getInternalYjsUrl() {
  const rawUrl = process.env.YJS_SERVER_INTERNAL_URL || 'http://localhost:4002'
  return rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl
}

// ---------------------------------------------------------------------------
// In-memory rate limiter (IP-based)
// ---------------------------------------------------------------------------
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT = 10
const RATE_WINDOW = 60_000 // 1 minute

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW })
    return false
  }

  entry.count += 1
  return entry.count > RATE_LIMIT
}

// UUID v4 format check
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * POST /api/yjs/prewarm?studyId=...
 *
 * Triggers the Yjs server to load the study document into memory before the
 * WebSocket connection is established. Called fire-and-forget from the builder
 * page on mount so the document is hot by the time the WS syncs.
 *
 * Returns 200 immediately — the actual document loading happens async on
 * the Yjs server. No need to await it from the browser.
 *
 * Auth is skipped intentionally: prewarm is idempotent (only loads a doc by
 * study UUID into memory) and the internal Yjs API key gates the actual
 * server-side call. Removing getServerSession() saves ~100-300ms.
 *
 * Rate-limited to 10 requests per minute per IP and studyId must be a valid UUID.
 */
export async function POST(request: NextRequest) {
  try {
    // --- Rate limiting ---
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown'

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Try again later.' },
        { status: 429 }
      )
    }

    const { searchParams } = new URL(request.url)
    const studyId = searchParams.get('studyId')
    if (!studyId) {
      return NextResponse.json({ error: 'studyId required' }, { status: 400 })
    }

    // --- Validate studyId is a UUID ---
    if (!UUID_RE.test(studyId)) {
      return NextResponse.json({ error: 'Invalid studyId format' }, { status: 400 })
    }

    const docName = `study:${studyId}`
    const yjsUrl = getInternalYjsUrl()
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }

    const apiKey = process.env.YJS_INTERNAL_API_KEY
    if (apiKey) {
      headers['x-internal-api-key'] = apiKey
    }

    // Fire-and-forget — return 200 immediately, let Yjs load the doc in background.
    // By the time the WS connection completes its handshake + sync protocol, the
    // document will already be loaded in memory.
    fetch(`${yjsUrl}/prewarm`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ docName }),
      signal: AbortSignal.timeout(8000),
    }).catch(() => {
      // Prewarm is best-effort — Yjs cold sync will handle it if this fails
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
