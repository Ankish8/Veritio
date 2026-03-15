import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { cache } from 'react'
import type { Database } from './types'

/**
 * Internal function to create a fresh server client with cookies.
 * Do not export - use createClient() instead.
 */
async function _createClient() {
  const cookieStore = await cookies()

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )

  return supabase
}

/**
 * Creates a Supabase client with user session from cookies.
 * Uses React cache() to ensure the same client instance is reused within
 * a single request, preventing connection pool exhaustion.
 */
export const createClient = cache(_createClient)

/**
 * Internal function to create a fresh service role client.
 * Do not export - use createServiceRoleClient() instead.
 */
function _createServiceRoleClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured')
  }

  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}

/**
 * Creates a Supabase client with service role key that bypasses RLS.
 * Use sparingly and only for server-side operations that need admin access.
 * IMPORTANT: Never expose this client to the browser.
 *
 * Uses React cache() to ensure the same client instance is reused within
 * a single request, preventing connection pool exhaustion when multiple
 * data fetching functions run in parallel during SSR.
 */
export const createServiceRoleClient = cache(_createServiceRoleClient)
