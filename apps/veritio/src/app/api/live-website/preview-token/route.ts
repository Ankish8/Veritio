import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@veritio/auth/server'
import { validateExternalHttpUrl } from '@/lib/security/external-url'
import { getLivePreviewOrigin, signLivePreviewToken } from '@/lib/security/live-preview-token'

export async function GET(request: NextRequest) {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rawUrl = request.nextUrl.searchParams.get('url')
  if (!rawUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 })
  }

  const validation = await validateExternalHttpUrl(rawUrl)
  if (!validation.ok || !validation.url) {
    return NextResponse.json({ error: validation.error || 'URL is not allowed' }, { status: 400 })
  }

  const signed = await signLivePreviewToken({
    url: validation.url.href,
    sub: session.user.id,
  })

  if (!signed) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const previewOrigin = getLivePreviewOrigin(request.nextUrl.origin)
  const src = new URL('/api/live-website/proxy', previewOrigin)
  src.searchParams.set('previewToken', signed.token)

  return NextResponse.json({
    src: src.toString(),
    expiresAt: signed.expiresAt,
  })
}
