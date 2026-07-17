import { normalizeSnippetFile } from '@/services/snippet/snippet-path'
import { unwrapMotiaJavaScriptResponse } from './motia-javascript-response'

const SNIPPET_ID_PATTERN = /^[a-zA-Z0-9_-]+$/

function javascriptResponse(body: string, status: number) {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': status === 200 ? 'public, max-age=300' : 'no-store',
    },
  })
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ snippetFile: string }> }
) {
  const { snippetFile } = await params
  const snippetId = normalizeSnippetFile(snippetFile)

  if (!SNIPPET_ID_PATTERN.test(snippetId)) {
    return javascriptResponse('/* Invalid snippet ID */', 400)
  }

  const backendBase = (process.env.MOTIA_BACKEND_URL || 'http://localhost:4000').replace(/\/$/, '')

  try {
    const upstream = await fetch(
      `${backendBase}/api/snippet/${encodeURIComponent(snippetId)}.js`,
      { cache: 'no-store' }
    )
    const upstreamBody = await upstream.text()
    const javascript = unwrapMotiaJavaScriptResponse(
      upstreamBody,
      upstream.headers.get('content-type')
    )

    return javascriptResponse(javascript, upstream.status)
  } catch (error) {
    console.error('Failed to serve live website snippet JavaScript', error)
    return javascriptResponse('/* Unable to load Veritio snippet */', 502)
  }
}
