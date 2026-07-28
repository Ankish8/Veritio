#!/usr/bin/env bun
/**
 * Static analysis for plpgsql functions.
 *
 * Postgres only checks a function body's *syntax* at CREATE time. Anything that
 * needs the schema (column types, ON CONFLICT targets, RETURN QUERY shapes,
 * INSERT arity) is resolved on first execution, so a migration can apply
 * cleanly and leave an RPC that throws on every call. That is exactly how
 * complete_participant_if_under_response_cap shipped with a jsonb/json CASE and
 * silently broke every participant submission for a month.
 *
 * plpgsql_check prepares every statement in every function against the live
 * schema and reports what would fail. This script runs it over all public
 * plpgsql functions inside a transaction that is always rolled back, so it is
 * safe to point at production.
 *
 * Usage:
 *   bun run scripts/check-db-functions.ts
 *       Sweep the database as it stands.
 *
 *   bun run scripts/check-db-functions.ts --migration supabase/migrations/x.sql [...]
 *       Apply the migration(s) in the throwaway transaction first, then sweep.
 *       This is the pre-deploy gate: it validates a migration against the real
 *       schema without ever committing it.
 *
 *   bun run scripts/check-db-functions.ts --warnings
 *       Also print (but do not fail on) warning-level findings.
 *
 * Exit codes: 0 clean or skipped, 1 error-level findings, 2 could not check.
 */

import { readFileSync } from 'node:fs'
import { Client } from 'pg'

interface Finding {
  fn: string
  level: 'error' | 'warning' | 'other'
  text: string
}

const args = process.argv.slice(2)
const showWarnings = args.includes('--warnings')
const migrations = args.reduce<string[]>((acc, arg, i) => {
  if (arg === '--migration' || arg === '-m') {
    const file = args[i + 1]
    if (file && !file.startsWith('-')) acc.push(file)
  }
  return acc
}, [])

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.log('⏭  DATABASE_URL is not set — skipping plpgsql function check.')
  console.log('   Set it to run the check (it never writes: everything is rolled back).')
  process.exit(0)
}

// Every function body is prepared against the schema. Trigger functions need a
// relation to resolve NEW/OLD, so pass one of the tables the trigger is on;
// relid 0 is correct for everything else.
const SWEEP_SQL = `
  SELECT p.oid::regprocedure::text AS fn, f.finding
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    CROSS JOIN LATERAL plpgsql_check_function(
      p.oid,
      COALESCE((SELECT t.tgrelid FROM pg_trigger t WHERE t.tgfoid = p.oid LIMIT 1), 0)
    ) AS f(finding)
   WHERE n.nspname = 'public'
     AND p.prolang = (SELECT oid FROM pg_language WHERE lanname = 'plpgsql')
   ORDER BY 1
`

function classify(text: string): Finding['level'] {
  if (text.startsWith('error:')) return 'error'
  if (text.startsWith('warning:')) return 'warning'
  return 'other'
}

const client = new Client({ connectionString })

try {
  await client.connect()
} catch (err) {
  console.error(`❌ Could not connect to the database: ${(err as Error).message}`)
  process.exit(2)
}

let findings: Finding[] = []

try {
  await client.query('BEGIN')

  try {
    await client.query('CREATE EXTENSION IF NOT EXISTS plpgsql_check')
  } catch (err) {
    console.error(`❌ plpgsql_check is unavailable: ${(err as Error).message}`)
    console.error('   Without it these bugs are only found by a participant hitting them.')
    await client.query('ROLLBACK')
    await client.end()
    process.exit(2)
  }

  for (const file of migrations) {
    console.log(`📄 Applying ${file} (will be rolled back)…`)
    try {
      await client.query(readFileSync(file, 'utf8'))
    } catch (err) {
      console.error(`\n❌ ${file} failed to apply: ${(err as Error).message}`)
      await client.query('ROLLBACK')
      await client.end()
      process.exit(1)
    }
  }

  const { rows } = await client.query<{ fn: string; finding: string }>(SWEEP_SQL)
  findings = rows.map((r) => ({ fn: r.fn, level: classify(r.finding), text: r.finding }))
} finally {
  // The transaction exists only to keep CREATE EXTENSION and any --migration
  // out of the real schema.
  await client.query('ROLLBACK').catch(() => {})
  await client.end().catch(() => {})
}

const errors = findings.filter((f) => f.level === 'error')
const warnings = findings.filter((f) => f.level === 'warning')
const checked = new Set(findings.map((f) => f.fn))

function print(group: Finding[]) {
  let current = ''
  for (const f of group) {
    if (f.fn !== current) {
      current = f.fn
      console.log(`\n  ${current}`)
    }
    console.log(`    ${f.text.replace(/\n/g, '\n    ')}`)
  }
}

if (errors.length > 0) {
  console.error(`\n❌ ${errors.length} error-level finding(s) — these functions throw when called:`)
  print(errors)
  if (showWarnings && warnings.length > 0) {
    console.log(`\n⚠️  ${warnings.length} warning(s):`)
    print(warnings)
  }
  console.error('\nFix the function before deploying. Postgres will not catch this for you.')
  process.exit(1)
}

if (showWarnings && warnings.length > 0) {
  console.log(`⚠️  ${warnings.length} warning-level finding(s):`)
  print(warnings)
}

const suffix = migrations.length > 0 ? ` with ${migrations.length} migration(s) applied` : ''
console.log(`✅ No plpgsql function errors${suffix}.`)
if (checked.size > 0) console.log(`   (${checked.size} function(s) had findings; none error-level)`)
process.exit(0)
