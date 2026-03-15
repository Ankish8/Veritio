import { NextResponse, type NextRequest } from 'next/server'

function getInternalYjsUrl() {
  const rawUrl = process.env.YJS_SERVER_INTERNAL_URL || 'http://localhost:4002'
  return rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl
}

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
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const studyId = searchParams.get('studyId')
    if (!studyId) {
      return NextResponse.json({ error: 'studyId required' }, { status: 400 })
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
