import { NextResponse, NextRequest } from 'next/server'
import { getServerSession } from '@veritio/auth/server'
import { createClient } from '@supabase/supabase-js'
import { checkStudyPermission } from '@/services/permission-service'
import { hasRequiredRole } from '@/lib/supabase/collaboration-types'
import { signYjsToken } from '@/lib/security/yjs-token'

// Module-level singleton to avoid creating a new client on every request
let _supabaseClient: ReturnType<typeof createClient> | null = null

function getSupabaseClient() {
  if (!_supabaseClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseKey) return null
    _supabaseClient = createClient(supabaseUrl, supabaseKey)
  }
  return _supabaseClient
}

async function verifySessionToken(token: string): Promise<{ userId: string; email?: string; name?: string } | null> {
  const supabase = getSupabaseClient()
  if (!supabase) return null

  // Query the session table with user info
  const { data: session, error } = await supabase
    .from('session')
    .select('userId, expiresAt, user:userId(id, email, name)')
    .eq('token', token)
    .single() as { data: { userId: string; expiresAt: string; user: { id: string; email?: string; name?: string } | null } | null; error: unknown }

  if (error || !session) {
    return null
  }

  // Check if session is expired
  const expiresAt = new Date(session.expiresAt).getTime()
  if (expiresAt < Date.now()) {
    return null
  }

  return {
    userId: session.userId,
    email: session.user?.email,
    name: session.user?.name,
  }
}

/** Issues a short-lived JWT for Yjs WebSocket authentication. */
export async function GET(request: NextRequest) {
  try {
    const studyId = request.nextUrl.searchParams.get('studyId')
    if (!studyId) {
      return NextResponse.json({ error: 'studyId required' }, { status: 400 })
    }

    let userId: string | undefined
    let email: string | undefined
    let name: string | undefined

    const session = await getServerSession()

    if (session?.user) {
      userId = session.user.id
      email = session.user.email
      name = session.user.name
    } else {
      const authHeader = request.headers.get('authorization')
      if (authHeader?.startsWith('Bearer ')) {
        const bearerToken = authHeader.replace('Bearer ', '').trim()
        const tokenUser = await verifySessionToken(bearerToken)
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

    const supabase = getSupabaseClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
    }

    const permission = await checkStudyPermission(supabase as any, studyId, userId, 'viewer')
    if (permission.error) {
      const status = permission.error.message === 'Study not found' ? 404 : 500
      return NextResponse.json({ error: permission.error.message }, { status })
    }

    if (!permission.allowed || !permission.userRole) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const docName = `study:${studyId}`
    const token = await signYjsToken({
      userId,
      email,
      name,
      studyId,
      docName,
      role: permission.userRole,
      canWrite: hasRequiredRole(permission.userRole, 'editor'),
    })

    if (!token) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
    }

    return NextResponse.json({ token })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
