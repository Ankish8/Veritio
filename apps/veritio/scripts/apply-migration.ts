#!/usr/bin/env bun
/**
 * Apply ping() function migration to production database
 * This is a one-time script to create the health check RPC function
 */

import { readFileSync } from 'fs'
import { getMotiaSupabaseClient } from '../src/lib/supabase/motia-client'

async function applyMigration() {
  const supabase = getMotiaSupabaseClient()

  // Read the migration file
  const migrationPath = './supabase/migrations/20260121130000_add_health_check_ping_function.sql'
  const sql = readFileSync(migrationPath, 'utf-8')

  console.log('📦 Applying migration: add_health_check_ping_function')
  console.log('━'.repeat(60))

  // Execute the migration
  const { data: _data, error } = await supabase.rpc('exec_sql', { sql })

  if (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }

  console.log('✅ Migration applied successfully')
  console.log('')
  console.log('Testing ping() function...')

  // Test the new ping function
  const { data: pingResult, error: pingError } = await supabase.rpc('ping')

  if (pingError) {
    console.error('❌ Ping test failed:', pingError)
    process.exit(1)
  }

  console.log(`✅ Ping response: "${pingResult}"`)
  console.log('')
  console.log('🎉 Health check optimization complete!')
}

applyMigration().catch(console.error)
