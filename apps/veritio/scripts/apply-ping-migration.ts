#!/usr/bin/env bun
/**
 * Apply ping() function migration to production database
 * Creates a lightweight health check RPC function
 */

import { getMotiaSupabaseClient } from '../src/lib/supabase/motia-client'

async function applyMigration() {
  const supabase = getMotiaSupabaseClient()

  console.log('📦 Applying migration: add_health_check_ping_function')
  console.log('━'.repeat(60))

  // Create the ping function directly
  const sql = `
    CREATE OR REPLACE FUNCTION ping()
    RETURNS TEXT
    LANGUAGE sql
    SECURITY DEFINER
    STABLE
    AS $$
      SELECT 'pong'::TEXT;
    $$;

    GRANT EXECUTE ON FUNCTION ping() TO service_role;
    GRANT EXECUTE ON FUNCTION ping() TO anon;
    GRANT EXECUTE ON FUNCTION ping() TO authenticated;
  `

  // For Supabase, we need to use the REST API or a wrapper RPC
  // Let's test if ping already exists first
  console.log('Testing if ping() function already exists...')
  const { data: existingPing, error: existingError } = await supabase.rpc('ping')

  if (!existingError && existingPing === 'pong') {
    console.log('✅ ping() function already exists and works!')
    console.log(`   Response: "${existingPing}"`)
    return
  }

  console.log('\n⚠️  ping() function not found. Manual migration required.')
  console.log('\n📋 Please run this SQL in your Supabase SQL Editor:')
  console.log('━'.repeat(60))
  console.log(sql)
  console.log('━'.repeat(60))
  console.log('\n🔗 Go to: https://supabase.com/dashboard/project/_/sql/new')
  console.log('\nOr run: supabase db push (with proper credentials)\n')
}

applyMigration().catch(console.error)
