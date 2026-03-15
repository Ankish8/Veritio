import { getMotiaSupabaseClient } from '../lib/supabase/motia-client'

interface AuthUser {
  id: string
  email: string
  name: string | null
  firstName: string | null
  lastName: string | null
}

// Cache user data to reduce database calls (5 minute TTL)
const userCache = new Map<string, { user: AuthUser; expiresAt: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000

export async function getUser(userId: string): Promise<AuthUser | null> {
  const cached = userCache.get(userId)
  if (cached && Date.now() < cached.expiresAt) {
    return cached.user
  }

  const supabase = getMotiaSupabaseClient()

  const { data, error } = await supabase
    .from('user')
    .select('id, email, name, "firstName", "lastName"')
    .eq('id', userId)
    .single()

  if (error || !data) {
    return null
  }

  const user: AuthUser = {
    id: data.id,
    email: data.email,
    name: data.name,
    firstName: data.firstName,
    lastName: data.lastName,
  }

  userCache.set(userId, {
    user,
    expiresAt: Date.now() + CACHE_TTL_MS,
  })

  return user
}

export async function getUserEmail(userId: string): Promise<string | null> {
  const user = await getUser(userId)
  return user?.email ?? null
}

export async function getUserDisplayName(userId: string): Promise<string> {
  const user = await getUser(userId)

  if (!user) {
    return 'User'
  }

  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`
  }

  if (user.firstName) {
    return user.firstName
  }

  if (user.name) {
    return user.name
  }

  if (user.email) {
    return user.email.split('@')[0]
  }

  return 'User'
}

export function clearUserCache(): void {
  userCache.clear()
}
