import { NextResponse, type NextRequest } from 'next/server'
import { getServerSession } from '@veritio/auth/server'
import {
  issueYjsTokenForUser,
  verifyYjsBearerSessionToken,
} from '@/services/yjs-token-service'

/** Issues a short-lived JWT for Yjs WebSocket authentication. */
export async function GET(request: NextRequest) {
  try {
    const studyId = request.nextUrl.searchParams.get('studyId')
    if (!studyId) {
      return NextResponse.json({ error: 'studyId required' }, { status: 400 })
    }

    let userId: string | undefined
    let email: string | undefined
    let name: string | null | undefined

    const session = await getServerSession()

    if (session?.user) {
      userId = session.user.id
      email = session.user.email
      name = session.user.name
    } else {
      const authHeader = request.headers.get('authorization')
      if (authHeader?.startsWith('Bearer ')) {
        const bearerToken = authHeader.replace('Bearer ', '').trim()
        const tokenUser = await verifyYjsBearerSessionToken(bearerToken)
        if (tokenUser) {
          userId = tokenUser.userId
          email = tokenUser.email
          name = tokenUser.name
        }
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await issueYjsTokenForUser(studyId, {
      userId,
      email,
      name,
    })
    if (!result.ok) {
      return NextResponse.json(result.body, { status: result.status })
    }

    return NextResponse.json({ token: result.token })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
