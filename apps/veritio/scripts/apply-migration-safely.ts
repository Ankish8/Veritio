#!/usr/bin/env bun
/**
 * Safe Migration Script for Monitoring Functions
 *
 * This script:
 * 1. Checks current database state
 * 2. Verifies migration is safe to apply
 * 3. Applies the migration
 * 4. Verifies success
 * 5. Tests the new functions
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials in environment')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function checkDatabaseState() {
  console.log('🔍 Step 1: Checking current database state...\n')

  // Check pg_stat_statements extension
  const { data: _extensions } = await supabase.rpc('dbdev_extension_exists', {
    extension_name: 'pg_stat_statements',
  }).throwOnError().catch(() => ({ data: null }))

  // Alternative check using direct query
  const { data: extCheck } = await supabase
    .from('pg_extension' as any)
    .select('extname')
    .eq('extname', 'pg_stat_statements')
    .single()
    .catch(() => ({ data: null }))

  const hasExtension = !!extCheck
  console.log(hasExtension ? '  ✅ pg_stat_statements extension: EXISTS' : '  ⚠️  pg_stat_statements extension: NOT FOUND')

  // Check if functions exist
  const { data: storageFunc } = await supabase
    .from('pg_proc' as any)
    .select('proname')
    .eq('proname', 'get_storage_metrics')
    .single()
    .catch(() => ({ data: null }))

  const { data: queryFunc } = await supabase
    .from('pg_proc' as any)
    .select('proname')
    .eq('proname', 'get_query_performance_metrics')
    .single()
    .catch(() => ({ data: null }))

  const hasStorageFunc = !!storageFunc
  const hasQueryFunc = !!queryFunc

  console.log(hasStorageFunc ? '  ✅ get_storage_metrics() function: EXISTS' : '  ⚠️  get_storage_metrics() function: NOT FOUND')
  console.log(hasQueryFunc ? '  ✅ get_query_performance_metrics() function: EXISTS' : '  ⚠️  get_query_performance_metrics() function: NOT FOUND')

  return {
    hasExtension,
    hasStorageFunc,
    hasQueryFunc,
    needsMigration: !hasExtension || !hasStorageFunc || !hasQueryFunc,
  }
}

async function applyMigration() {
  console.log('\n📝 Step 2: Applying migration...\n')

  const migrationPath = join(__dirname, '../supabase/migrations/20260125000002_add_monitoring_functions.sql')
  const migrationSQL = readFileSync(migrationPath, 'utf-8')

  console.log('  Migration file:', migrationPath)
  console.log('  SQL length:', migrationSQL.length, 'characters\n')

  // Split SQL by statements (simple split by semicolon followed by newline)
  const statements = migrationSQL
    .split(/;\s*\n/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  console.log(`  Found ${statements.length} SQL statements to execute\n`)

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i]
    const preview = statement.substring(0, 80).replace(/\s+/g, ' ')

    try {
      console.log(`  [${i + 1}/${statements.length}] Executing: ${preview}...`)

      // Execute using raw SQL
      const { error } = await supabase.rpc('exec_sql' as any, { sql: statement + ';' })
        .catch(async () => {
          // Fallback: try using REST API directly
          const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_SERVICE_KEY!,
              'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            },
            body: JSON.stringify({ sql: statement + ';' }),
          })
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${await response.text()}`)
          }
          return { error: null }
        })

      if (error) {
        throw error
      }

      console.log(`    ✅ Success`)
    } catch (err: any) {
      // If error is "already exists", that's OK
      if (err.message?.includes('already exists') || err.message?.includes('duplicate')) {
        console.log(`    ⚠️  Already exists (skipping)`)
      } else {
        console.error(`    ❌ Failed:`, err.message)
        throw err
      }
    }
  }

  console.log('\n  ✅ Migration applied successfully!\n')
}

async function applyMigrationDirect() {
  console.log('\n📝 Step 2: Applying migration (direct approach)...\n')

  const migrationPath = join(__dirname, '../supabase/migrations/20260125000002_add_monitoring_functions.sql')
  const migrationSQL = readFileSync(migrationPath, 'utf-8')

  try {
    // Try to execute the entire migration as one block using Supabase management API
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY!,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ query: migrationSQL }),
    })

    if (response.ok) {
      console.log('  ✅ Migration applied successfully!\n')
      return
    }
  } catch {
    console.log('  Direct execution not available, using statement-by-statement approach...\n')
  }

  // Fallback: execute statement by statement
  await applyMigration()
}

async function verifyMigration() {
  console.log('🔬 Step 3: Verifying migration...\n')

  // Test get_storage_metrics function
  try {
    const { data: storageData, error: storageError } = await supabase.rpc('get_storage_metrics' as any)

    if (storageError) {
      console.error('  ❌ get_storage_metrics() failed:', storageError.message)
      return false
    }

    console.log('  ✅ get_storage_metrics() works!')
    console.log('    Total DB size:', (storageData.total_size_bytes / (1024 * 1024)).toFixed(2), 'MB')
    console.log('    Largest tables:', storageData.largest_tables?.length || 0, 'found')
  } catch (err: any) {
    console.error('  ❌ get_storage_metrics() error:', err.message)
    return false
  }

  // Test get_query_performance_metrics function
  try {
    const { data: queryData, error: queryError } = await supabase.rpc('get_query_performance_metrics' as any)

    if (queryError) {
      console.error('  ❌ get_query_performance_metrics() failed:', queryError.message)
      return false
    }

    console.log('  ✅ get_query_performance_metrics() works!')
    console.log('    Slow queries:', queryData.slow_queries?.length || 0, 'found')
    console.log('    Table scans:', queryData.table_scan_stats?.length || 0, 'found')
  } catch (err: any) {
    console.error('  ❌ get_query_performance_metrics() error:', err.message)
    return false
  }

  console.log('\n  ✅ All functions verified successfully!\n')
  return true
}

async function main() {
  console.log('🚀 Safe Migration Application Script')
  console.log('=====================================\n')
  console.log('Target database:', SUPABASE_URL)
  console.log('Migration: 20260125000002_add_monitoring_functions.sql\n')

  try {
    // Step 1: Check current state
    const state = await checkDatabaseState()

    if (!state.needsMigration) {
      console.log('\n✅ Migration already applied! All functions exist.')
      console.log('\nSkipping migration, proceeding to verification...\n')
    } else {
      console.log('\n⚠️  Migration needed. Proceeding with safe application...\n')

      // Step 2: Apply migration
      await applyMigrationDirect()
    }

    // Step 3: Verify
    const success = await verifyMigration()

    if (success) {
      console.log('🎉 SUCCESS! Migration complete and verified.\n')
      console.log('Next steps:')
      console.log('  1. Reload monitoring dashboard: http://localhost:4001/monitoring')
      console.log('  2. Verify API endpoints return data (not 500 errors)')
      console.log('  3. Check cost tracking section appears at top\n')
      process.exit(0)
    } else {
      console.error('\n❌ Verification failed. Please check errors above.\n')
      process.exit(1)
    }
  } catch (err: any) {
    console.error('\n❌ Migration failed:', err.message)
    console.error('\nPlease apply manually via Supabase SQL Editor:')
    console.error('https://app.supabase.com/project/YOUR_PROJECT_REF/sql/new\n')
    process.exit(1)
  }
}

main()
