import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

export function createMotiaSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set')
  }

  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        'Connection': 'keep-alive',
      },
    },
  })
}

let supabaseClient: ReturnType<typeof createMotiaSupabaseClient> | null = null

export function getMotiaSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = createMotiaSupabaseClient()
  }
  return supabaseClient
}
