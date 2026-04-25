import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { code } = await req.json()

  if (!code || typeof code !== 'string') {
    return NextResponse.json({ error: 'Code is required' }, { status: 400 })
  }

  const cookieStore = await cookies()
  cookieStore.set('__invite_code', code.trim().toUpperCase(), {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  })

  return NextResponse.json({ success: true })
}
