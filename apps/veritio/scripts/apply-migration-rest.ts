#!/usr/bin/env bun
/**
 * Apply ping() migration using Supabase REST API with service role
 */

import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

async function applyMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing required environment variables')
    process.exit(1)
  }

  console.log('📦 Applying ping() function migration via Supabase REST API')
  console.log('━'.repeat(60))

  // Create admin client with service role
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  // Read the migration SQL
  const migrationPath = './supabase/migrations/20260121130000_add_health_check_ping_function.sql'
  const migrationSql = readFileSync(migrationPath, 'utf-8')

  // Split into individual statements
  const statements = migrationSql
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--'))

  console.log(`📝 Executing ${statements.length} SQL statements...`)
  console.log('')

  try {
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i] + ';'

      if (stmt.includes('CREATE OR REPLACE FUNCTION ping()')) {
        console.log(`   [${i + 1}/${statements.length}] Creating ping() function...`)
      } else if (stmt.includes('GRANT EXECUTE')) {
        console.log(`   [${i + 1}/${statements.length}] Granting permissions...`)
      } else if (stmt.includes('COMMENT')) {
        console.log(`   [${i + 1}/${statements.length}] Adding documentation...`)
      }

      // Try to execute via RPC if available
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({ query: stmt }),
      })

      if (!response.ok && response.status !== 404) {
        const error = await response.text()
        console.error(`   ❌ Failed: ${error}`)
        throw new Error(`SQL execution failed: ${error}`)
      }
    }

    console.log('')
    console.log('✅ Migration statements prepared')
    console.log('')
    console.log('🧪 Testing ping() function...')

    // Test the new function
    const { data, error } = await supabase.rpc('ping')

    if (error) {
      // Function doesn't exist yet - need manual application
      console.log('⚠️  ping() function not yet available via REST API')
      console.log('')
      console.log('📋 Manual migration required. Run this SQL in Supabase Dashboard:')
      console.log('━'.repeat(60))
      console.log(migrationSql)
      console.log('━'.repeat(60))
      console.log('')
      console.log('🔗 https://supabase.com/dashboard/project/_/sql/new')
      process.exit(1)
    }

    console.log(`✅ Ping test successful: "${data}"`)
    console.log('')
    console.log('🎉 Health check optimization complete!')
    console.log('   Expected latency: 831ms → <50ms')

  } catch (error: any) {
    console.error('❌ Migration error:', error.message)
    console.log('')
    console.log('📋 Please apply this SQL manually in Supabase Dashboard:')
    console.log('━'.repeat(60))
    console.log(migrationSql)
    console.log('━'.repeat(60))
    process.exit(1)
  }
}

applyMigration().catch(console.error)
