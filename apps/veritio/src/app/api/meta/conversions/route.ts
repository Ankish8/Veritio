import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import {
  getClientIp,
  getCookieValue,
  trackMetaServerEvent,
} from '@/lib/analytics/meta-conversions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  eventName: z.enum(['CompleteRegistration', 'Lead', 'Purchase']),
  eventId: z.string().min(1).max(120),
  email: z.string().email().optional(),
  externalId: z.string().min(1).max(200).optional(),
  eventSourceUrl: z.string().url().optional(),
  customData: z.record(z.unknown()).optional(),
})

function isAllowedOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin')
  if (!origin) return true
  const requestOrigin = req.nextUrl.origin
  const appOrigin = process.env.NEXT_PUBLIC_APP_URL ? new URL(process.env.NEXT_PUBLIC_APP_URL).origin : null
  return origin === requestOrigin || origin === appOrigin
}

export async function POST(req: NextRequest) {
  if (!isAllowedOrigin(req)) {
    return NextResponse.json({ error: 'Origin not allowed' }, { status: 403 })
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid conversion payload', issues: parsed.error.issues },
      { status: 400 },
    )
  }

  const cookieHeader = req.headers.get('cookie')
  const result = await trackMetaServerEvent({
    eventName: parsed.data.eventName,
    eventId: parsed.data.eventId,
    email: parsed.data.email,
    externalId: parsed.data.externalId,
    eventSourceUrl: parsed.data.eventSourceUrl || req.headers.get('referer') || req.nextUrl.origin,
    fbp: getCookieValue(cookieHeader, '_fbp'),
    fbc: getCookieValue(cookieHeader, '_fbc'),
    clientIpAddress: getClientIp(req.headers),
    clientUserAgent: req.headers.get('user-agent'),
    customData: parsed.data.customData,
  })

  return NextResponse.json(result)
}
