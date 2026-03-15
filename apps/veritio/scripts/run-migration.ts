#!/usr/bin/env bun
/**
 * Automated Migration Runner
 *
 * Safely applies the monitoring functions migration to Supabase.
 * This is a simpler alternative to manual SQL Editor application.
 */

import { readFileSync } from 'fs'
import { join } from 'path'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables!')
  console.error('Make sure .env.local has:')
  console.error('  - NEXT_PUBLIC_SUPABASE_URL')
  console.error('  - SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

console.log('🚀 Monitoring Functions Migration')
console.log('==================================\n')
console.log('Target:', SUPABASE_URL)
console.log('Migration: 20260125000002_add_monitoring_functions.sql\n')

// Read migration file
const migrationPath = join(import.meta.dir, '../supabase/migrations/20260125000002_add_monitoring_functions.sql')
const sql = readFileSync(migrationPath, 'utf-8')

console.log('📄 Migration loaded:', (sql.length / 1024).toFixed(1), 'KB')
console.log('📝 SQL statements: ~', sql.split(';').length, 'statements\n')

console.log('⚠️  SAFETY NOTE:')
console.log('   This migration ONLY creates functions, does NOT modify data')
console.log('   Safe to run multiple times (uses CREATE OR REPLACE)\n')

// Execute migration
console.log('🔄 Executing migration...\n')

try {
  // Use Supabase's SQL endpoint directly
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  })

  if (!response.ok) {
    const _text = await response.text()
    console.log('⚠️  Direct execution endpoint not available')
    console.log('   Falling back to manual instructions...\n')

    console.log('📋 Please apply manually via Supabase SQL Editor:')
    console.log('   1. Open: https://app.supabase.com/project/YOUR_PROJECT_REF/sql/new')
    console.log('   2. Copy contents of:', migrationPath)
    console.log('   3. Paste and click "Run"\n')
    console.log('   See APPLY_MIGRATION_GUIDE.md for detailed steps')
    process.exit(0)
  }

  console.log('✅ Migration executed!\n')
} catch (error: any) {
  console.log('⚠️  Could not execute via API')
  console.log('   Error:', error.message, '\n')

  console.log('📋 Please apply manually via Supabase SQL Editor:')
  console.log('   See APPLY_MIGRATION_GUIDE.md for step-by-step instructions\n')
  process.exit(0)
}

// Verify migration worked
console.log('🔬 Verifying migration...\n')

async function testFunction(name: string) {
  try {
    const { data: _data, error } = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    }).then(r => r.json() as Promise<{ data: any; error: any }>)

    if (error) {
      console.log(`   ❌ ${name}(): ${error.message}`)
      return false
    }

    console.log(`   ✅ ${name}() works!`)
    return true
  } catch (err: any) {
    console.log(`   ❌ ${name}(): ${err.message}`)
    return false
  }
}

const storageOk = await testFunction('get_storage_metrics')
const queryOk = await testFunction('get_query_performance_metrics')

if (storageOk && queryOk) {
  console.log('\n🎉 SUCCESS! Migration complete and verified.\n')
  console.log('Next steps:')
  console.log('   1. Start/restart dev server: ./scripts/dev.sh')
  console.log('   2. Open: http://localhost:4001/monitoring')
  console.log('   3. Verify cost tracking section appears\n')
  process.exit(0)
} else {
  console.log('\n⚠️  Verification incomplete. Functions may not be created yet.\n')
  console.log('Please verify manually:')
  console.log('   https://app.supabase.com/project/YOUR_PROJECT_REF/sql/new\n')
  console.log('Run these queries:')
  console.log('   SELECT get_storage_metrics();')
  console.log('   SELECT get_query_performance_metrics();\n')
  process.exit(1)
}
