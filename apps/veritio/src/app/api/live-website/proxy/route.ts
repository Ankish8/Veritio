import { NextRequest } from 'next/server'
import { getServerSession } from '@veritio/auth/server'
import { verifyLivePreviewToken } from '@/lib/security/live-preview-token'
import { createLiveWebsiteProxyResponse } from '@/services/live-website/proxy-service'

export async function GET(req: NextRequest) {
  const requestedUrl = req.nextUrl.searchParams.get('url') || ''
  let url = requestedUrl
  const previewToken = req.nextUrl.searchParams.get('previewToken')

  if (previewToken) {
    const payload = await verifyLivePreviewToken(previewToken)
    if (!payload) {
      return new Response('Invalid or expired preview token', {
        status: 401,
        headers: { 'Cache-Control': 'no-store' },
      })
    }
    if (requestedUrl && requestedUrl !== payload.url) {
      return new Response('Preview token URL mismatch', {
        status: 401,
        headers: { 'Cache-Control': 'no-store' },
      })
    }
    url = payload.url
  } else {
    const session = await getServerSession()
    if (!session?.user) {
      return new Response('Unauthorized', {
        status: 401,
        headers: { 'Cache-Control': 'no-store' },
      })
    }
  }

  if (!url) {
    return new Response('Missing url parameter', {
      status: 400,
      headers: { 'Cache-Control': 'no-store' },
    })
  }

  const proxied = await createLiveWebsiteProxyResponse(url)
  return new Response(proxied.body, {
    status: proxied.status,
    headers: proxied.headers,
  })
}
