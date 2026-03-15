// Re-export from @veritio/study-types for type compatibility
// Services import Database from @veritio/study-types, so the supabase clients
// must use the same Database type to avoid SupabaseClient<Database> mismatches.
export * from '@veritio/study-types'
