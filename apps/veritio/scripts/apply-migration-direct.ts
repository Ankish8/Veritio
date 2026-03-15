#!/usr/bin/env bun
/**
 * Apply ping() migration directly to Supabase PostgreSQL
 */

import { readFileSync } from 'fs'
import postgres from 'postgres'

async function applyMigration() {
  // Get connection string from environment
  const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL

  if (!connectionString) {
    console.error('❌ Missing DATABASE_URL or SUPABASE_DB_URL environment variable')
    process.exit(1)
  }

  console.log('📦 Applying ping() function migration')
  console.log('━'.repeat(60))
  console.log(`🔗 Database: ${connectionString.replace(/:[^:@]+@/, ':****@')}`)
  console.log('')

  try {
    // Create PostgreSQL client
    const sql = postgres(connectionString, {
      ssl: 'require',
      max: 1,
    })

    // Read migration SQL
    const migrationPath = './supabase/migrations/20260121130000_add_health_check_ping_function.sql'
    const migrationSql = readFileSync(migrationPath, 'utf-8')

    console.log('📝 Executing migration SQL...')

    // Execute the migration
    await sql.unsafe(migrationSql)

    console.log('✅ Migration applied successfully!')
    console.log('')
    console.log('🧪 Testing ping() function...')

    // Test the new function
    const result = await sql`SELECT ping() as response`

    if (result[0]?.response === 'pong') {
      console.log(`✅ Ping test successful: "${result[0].response}"`)
      console.log('')
      console.log('🎉 Health check optimization complete!')
      console.log('   Expected latency: 831ms → <50ms')
    } else {
      console.error('❌ Unexpected ping response:', result)
    }

    await sql.end()
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message)
    console.error('')
    console.error('Stack:', error.stack)
    process.exit(1)
  }
}

applyMigration().catch(console.error)
