#!/usr/bin/env bun
/**
 * Apply ping() migration using pg library
 */

import { readFileSync } from 'fs'
import pg from 'pg'

const { Client } = pg

async function applyMigration() {
  // Parse Supabase connection details
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const _supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const dbPassword = process.env.SUPABASE_DB_PASSWORD

  // Try different connection string patterns
  let connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL

  // Build connection string from Supabase URL if needed
  if (!connectionString && supabaseUrl) {
    const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
    connectionString = `postgresql://postgres.${projectRef}:${dbPassword}@aws-0-us-west-1.pooler.supabase.com:6543/postgres`
  }

  if (!connectionString) {
    console.error('❌ Could not determine database connection string')
    console.error('   Tried: DATABASE_URL, SUPABASE_DB_URL, NEXT_PUBLIC_SUPABASE_URL')
    console.error('')
    console.error('📋 Please set one of these environment variables or run SQL manually:')
    console.error('')
    const migrationPath = './supabase/migrations/20260121130000_add_health_check_ping_function.sql'
    const sql = readFileSync(migrationPath, 'utf-8')
    console.log(sql)
    process.exit(1)
  }

  console.log('📦 Applying ping() function migration')
  console.log('━'.repeat(60))
  console.log(`🔗 Connecting to database...`)
  console.log('')

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  })

  try {
    await client.connect()
    console.log('✅ Connected to PostgreSQL')

    // Read migration SQL
    const migrationPath = './supabase/migrations/20260121130000_add_health_check_ping_function.sql'
    const migrationSql = readFileSync(migrationPath, 'utf-8')

    console.log('📝 Executing migration SQL...')

    // Execute the migration
    await client.query(migrationSql)

    console.log('✅ Migration applied successfully!')
    console.log('')
    console.log('🧪 Testing ping() function...')

    // Test the new function
    const result = await client.query('SELECT ping() as response')

    if (result.rows[0]?.response === 'pong') {
      console.log(`✅ Ping test successful: "${result.rows[0].response}"`)
      console.log('')
      console.log('🎉 Health check optimization complete!')
      console.log('   Expected latency: 831ms → <50ms')
    } else {
      console.error('❌ Unexpected ping response:', result.rows)
    }

    await client.end()
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message)

    if (error.message.includes('already exists')) {
      console.log('')
      console.log('ℹ️  Function may already exist. Testing...')

      try {
        const result = await client.query('SELECT ping() as response')
        console.log(`✅ ping() function works: "${result.rows[0]?.response}"`)
      } catch (testError: any) {
        console.error('❌ Function test failed:', testError.message)
      }
    }

    await client.end()
    process.exit(1)
  }
}

applyMigration().catch(console.error)
